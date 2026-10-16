# Architecture Review — index.html + thank-you.html

**Scope:** `/home/tumbleweed/Applications/Play-Site/Career-Site/index.html` (3246 lines), `thank-you.html` (166 lines). Single-page static resume site, no build step. All CSS in `<style>`, all JS inline across 3 script blocks, no modules, no external app JS (Three.js/GSAP/ScrollTrigger via CDN).

**Lens:** coupling, cohesion, design patterns, SOLID, layering, dependency direction.

Severity: HIGH / MEDIUM / LOW. All refs are file:line.

---

## HIGH

### H1 — Runtime crash in Three.js map: EXTRA_PINS references a city key that doesn't exist
`index.html:2275` `{ city: 'Mobile', label: 'Mobile, AL' }` — but `CITIES` map (`index.html:2248-2259`) has **no `Mobile` key**. The `EXTRA_PINS.forEach` at `index.html:2310-2320` dereferences `CITIES[pin.city].lon` (`index.html:2311`) → `TypeError`, thrown inside the map IIFE before `container.classList.add('is-enhanced')` / `animate()` run (`index.html:2573-2574`).

Downstream effect: the canvas is appended (`index.html:2183`) but never rendered; the crash propagates past the IIFE and the outer `_sc.classList.add('is-enhanced')` (`index.html:2588`) still fires, collapsing the accessible `#career-locations` fallback into the 1px clip strip (`index.html:278`, `index.html:266-274`). Net result: dead visual area, no map, no labels, no text fallback.

Architecture note beyond the bug: **two parallel data tables (`CITIES`, `EXTRA_PINS`) coupled by key reference with no validation**, and the defensive `if (!a || !b) return;` guard that protects `CAREER_PATH` line lookups (`index.html:2380`) is absent for `EXTRA_PINS`. Same dependency pattern, inconsistent enforcement. Fix belongs in a data layer (validate keys once), not inline.

### H2 — Career-path data duplicated in 3 places with silent drift
Same chronologic career data exists as:
- HTML a11y fallback list `#career-locations` (`index.html:1741-1746`)
- JS `CAREER_PATH` array (`index.html:2262-2270`)
- Timeline `<article>` elements (`index.html:1858-1949`)

Content already disagrees: fallback lists Austin `2015–2019` as one stop (`index.html:1744`), `CAREER_PATH` splits Austin into `2015-2016` + `2016-2019` (`index.html:2266-2267`), timeline shows `Dec 2016 – Apr 2019` (`index.html:1887`). Any date/role edit requires touching all three sources; nothing enforces consistency. DRY / single-source-of-truth violation. This is the highest-value refactor target: render the timeline and the a11y fallback from one data array.

### H3 — Palette/token contract broken: 4 copies of color data, only one reacts to theme/style toggles
The design system (terracotta/teal per `index.html:82`) is encoded in:
1. CSS `:root` custom props (`index.html:79-101`) + `[data-style]` override blocks (`index.html:124-169`)
2. JS `BRAND` map read once from CSS vars (`index.html:2148-2153`)
3. JS `SKILLS` array hex colors + `CAT_COLORS` map (`index.html:2602-2644`, `2649-2656`)
4. Inline `style="color:#…"` on skill-category h3s (`index.html:1967`, `1976`, `1985`, `1994`, `2003`, `2012`) and cert badges (`index.html:2042-2057`)

The `[data-style]` / `[data-theme]` toggles swap CSS tokens, but:
- The 2D skill ring draws hardcoded hex strings → never follows style/theme changes.
- The Three.js map resolves `BRAND` **once at init**; the comment at `index.html:2140` ("Re-resolve on theme/style change") describes behavior that **does not exist** — no re-resolve code anywhere. Switching Graphite Steel / Industrial Ochre leaves the map on the initial palette while the rest of the page changes.

Result: the theme layer's dependency direction (CSS → JS consumption) is sound, but the contract is partially wired; the documented intent is stale. Skill ring + map should read the same CSS-variable source the page uses.

---

## MEDIUM

### M1 — Skill data duplicated HTML ↔ JS
35 skills exist as `<span class="skill-tag">` (`index.html:1967-2018`) and again in the JS `SKILLS` array (`index.html:2602-2644`). Adding/editing a skill touches two layers plus up to three color sources (H3). Same single-source violation as H2, smaller blast radius.

### M2 — Monolithic inline JS: ~1000 lines, 3 script blocks, no module boundaries
`index.html:2120-3104` (Three.js scene, 2D skill ring, GSAP animations) + `index.html:3109-3232` (nav/scrollspy/back-to-top/theme/style). Five unrelated subsystems (3D map, 2D canvas, animation, form validation, chrome) in one file with no separation. SRP violated per block: the skill-ring block (`index.html:2591-3007`) also owns the IntersectionObserver, contact-form validation, and resize handling. No internal interfaces — subsystems interact only through globals and the DOM.

### M3 — Global namespace pollution across classic scripts
The skill-ring block runs bare at top level (no IIFE) and leaks ~15 names to `window`: `tooltip`, `skillCanvas`, `skillCtx`, `SKILLS`, `CATS`, `CAT_COLORS`, `ringNodes`, `hoveredRing`, `ringOpacity`, `ringActive`, `findCrossLinks`, `initRingNodes`, `drawSkillRing`, `form`, `successMsg`, `animate`, `pageVisible` (`index.html:2593-3007`). Plus `window.camera` (`index.html:2163`), `initThreeJSMap` (`index.html:2124`), `_sc` (`index.html:2587`). Cross-script coupling is implicit via these globals; no import/export, no namespace. `animate` and `pageVisible` are declared twice across blocks (`index.html:2550` vs `2995`, `2544` vs `2990`) — collision-adjacent.

### M4 — GSAP layer reaches into Three.js layer through a global
ScrollTrigger parallax mutates `window.camera.position.y` (`index.html:3090-3099`), relying on the Three.js IIFE having set `window.camera` (`index.html:2163`). Guarded with `if (window.camera)`, so no crash, but it's an implicit cross-subsystem contract: if the map init is removed or renamed, parallax silently dies. Coupling via global handshake rather than a defined interface.

### M5 — `#constellation-interact` is a dead stub
CSS declares `.active` toggling `pointer-events` (`index.html:229-231`); markup comment promises "activates when skills section is in view" (`index.html:1750`). No JS ever adds/removes `.active`. The IntersectionObserver (`index.html:2873-2881`) only flips `ringActive` for the 2D canvas. Leftover raycaster scaffold — dead coupling between a commented intent, unused CSS, and a no-op overlay div.

### M6 — thank-you.html duplicates palette, theme-init, and nav; stale resume link
- Palette subset re-declared in `thank-you.html:33-59` (and `80-82`), theme-init script duplicated (`thank-you.html:126-134`), nav duplicated (`thank-you.html:139-149`). When the index palette changes (as the terracotta→teal migration did per `index.html:82`), thank-you must be edited in lockstep. Cross-file token coupling with no shared source.
- Nav resume link points to `SRA_Resume_2026.docx` (`thank-you.html:147`) while index points to `SRA-Resume-072926.pdf` (`index.html:1698`); thank-you also lacks the `.nav-resume` button styling index has (`index.html:1148-1155`). Same component, divergent behavior across pages.

### M7 — Undefined CSS variable `--surface`
Referenced in `.nav-style-toggle:hover` background (`index.html:1009`) but never defined in `:root` or any `[data-style]` block. Invalid at computed-value time → background silently unset. Token hygiene issue; the theme layer has a dangling reference.

### M8 — Success element reused for error message
`#form-success` (role="status", aria-live, `index.html:2097`) is shown for both success (`index.html:2937`) and failure (`index.html:2942-2944`, recolored). A screen reader announces "Thanks — your message is on its way" styling override when the submit actually failed. Semantics/single-responsibility of the status node is wrong.

---

## LOW

- **L1** — `is-enhanced` added in two places: inside init (`index.html:2573`) and unconditionally outside (`index.html:2588`). The second makes the first redundant and is what hides the fallback when init crashes (H1).
- **L2** — Duplicated render-loop scaffolding: `visibilitychange` listener + `pageVisible` + `prevTime` twice (`index.html:2544-2549` and `2989-2993`). Extract one visibility gate.
- **L3** — Bio/name strings duplicated ~7× across `<title>`, meta description, og:title/description, twitter:title/description, JSON-LD Person (`index.html:6-48`). Any bio edit is 7 edits; DRY violation at the content layer.
- **L4** — `meta name="keywords"` (`index.html:8`) is a deprecated/non-functional SEO signal; contributes to L3 content sprawl.
- **L5** — `.nav-resume` uses `!important` overrides (`index.html:1149-1155`) to fight the base `.nav-links a` styles — specificity patch instead of a clean variant class.

---

## Summary

| Axis | Verdict |
|---|---|
| Coupling | High content-level duplication (career data, skills, palette, bio) — 3-4 copies each. Cross-script coupling via leaked globals + `window.camera`. |
| Cohesion | Low per script block: unrelated subsystems (3D, 2D canvas, animation, forms, chrome) share file and globals. |
| Design patterns | Progressive enhancement (no-JS fallbacks, `is-enhanced`, reduced-motion) is the one deliberate, working pattern. Theme-via-CSS-vars is half-implemented (H3). |
| SOLID | SRP violated per block (M2); OCP/DRY violated by data duplication (H2, M1); DIP violated via `window.camera` global (M4). |
| Layering / dependency direction | CSS tokens → JS consumption is the intended flow but is one-shot (H3). Data tables → geometry has an unvalidated key dependency that crashes (H1). Presentation (GSAP) reaches into render (Three.js) via global handshake (M4). |

**Highest-leverage fixes, in order:**
1. Single career-path data array driving timeline + a11y fallback + map nodes (kills H2, removes H1's sibling data risk).
2. Single skills data array driving HTML tags + ring; validate `EXTRA_PINS` keys against `CITIES` (kills H1, M1).
3. Palette: one CSS-token source; JS re-reads it on `[data-style]`/`[data-theme]` change instead of once (kills H3).
4. Wrap the skill-ring block in an IIFE / module to stop global leakage (M3); rewire GSAP parallax through a defined hook instead of `window.camera` (M4).

A reasonable decomposition ceiling for this static site: 2 external files — `app.js` (IIFE or ES module) and `styles.css` — with the two canvases as separate modules and the nav/theme chrome as a third.
