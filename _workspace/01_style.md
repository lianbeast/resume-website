# Style Review — index.html, thank-you.html

Scope: `index.html` (3246 lines), `thank-you.html` (166 lines).
Lens: naming, error handling, comments, consistency, dead code, maintainability.

Severity: **Critical** = behavior-breaking, **Important** = maintainability/consistency, **Suggestion** = polish.

---

## Critical

### 1. `EXTRA_PINS` references city key that does not exist in `CITIES` → runtime crash
- index.html:2273-2279 — `EXTRA_PINS` includes `{ city: 'Mobile', label: 'Mobile, AL' }`.
- index.html:2248-2259 — `CITIES` has no `Mobile` key.
- index.html:2311-2312 — `const c = CITIES[pin.city];` then `project(c.lon, c.lat)` → `TypeError: Cannot read properties of undefined` on first pin.
- Effect: `forEach` aborts at first iteration → remaining pins never added; everything after 2312 (glow texture, city points, path lines, packets, labels, animate loop) never runs. Map renders outline + fill only. Uncaught exception propagates out of `initThreeJSMap`.
- Fix: delete `Mobile` entry or add it to `CITIES`. Verified `Mobile` not defined anywhere in `CITIES`.

### 2. Duplicate pins — `Memphis`, `Birmingham`, `Atlanta`, `Montgomery` in both `CITIES` and `EXTRA_PINS`
- index.html:2255-2259 + 2274-2278. First loop (2295-2307) adds them, second loop (2310-2320) adds them again → duplicate node geometry and duplicate DOM labels. After Critical #1 is fixed, duplicates appear.
- Fix: drop the duplicated keys from `EXTRA_PINS` (or from `CITIES`); `EXTRA_PINS` then only holds genuinely-extra pins.

### 3. Unconditional `is-enhanced` defeats reduced-motion / no-THREE guards
- index.html:2131-2133 — IIFE bails when `THREE` undefined or reduced motion.
- index.html:2572-2573 — inside IIFE, `is-enhanced` added only after successful mount.
- index.html:2587-2588 — top-level code adds `is-enhanced` unconditionally, on every load.
- Effect: if CDN blocked or reduced motion, CSS fallback rule index.html:277-278 (`#scene-container:not(.is-enhanced) ~ #career-locations`) never matches → career-path text list stays visually hidden for exactly the users the fallback targets. Contradicts guard logic at 2131-2133.
- Fix: delete 2587-2588; it duplicates 2573. Guard on the IIFE's actual success path only.

---

## Important

### 4. Stale comment — form endpoint already wired
- index.html:2093 — `<!-- ponytail: client-side only, add Formspree/Netlify endpoint when deploying -->` but fetch POST to `/` exists at 2929. Comment contradicts code. Remove.

### 5. Dead variables / dead selectors
- index.html:2472 — `const ndcX = 1, ndcY = 1; // reuse below` — never used; comment says "reuse below" but nothing below uses them.
- index.html:1532, 1544, 3238-3241 — `.reveal-left`, `.reveal-right`, `.reveal-scale` referenced in reduced-motion + noscript CSS but never used in HTML (only `.reveal` appears in markup, 1816+).
- index.html:1083-1090 — transition list includes `section + section::before`; that pseudo-element is never styled anywhere. Dead selector.
- index.html:898-900 — comments "No section divider gradients…", "No hero blobs needed…" + orphan `#hero { position: relative; }` left over from removed decorations.
- index.html:1293-1295 and 1518-1520 — empty section banners ("REVEAL — GSAP controls these via from() tweens", "SCROLL REVEAL…") with no content. Duplicate, remove both.
- thank-you.html:89 — `.content` sets `padding-top: 60px` then overrides with shorthand `padding: 120px 5% 80px`. First declaration dead.

### 6. Duplicated render-loop boilerplate
- index.html:2544-2570 (Three.js IIFE) and index.html:2989-3007 (skill ring) — identical `pageVisible` / `prevTime` / `visibilitychange` / `requestAnimationFrame` pattern, near-verbatim. Two `animate()`, two `prevTime`, two `pageVisible` in same `<script>` block (different scopes, so no error — but confusing). Extract one shared `visibilitychange` guard.

### 7. Skill-ring data duplication — two sources of truth for color/category
- index.html:2602-2644 — 36 `SKILLS` entries each carry `color` + `desc`; the color is always the category color.
- index.html:2649-2656 — `CAT_COLORS` map holds same category colors. Duplication → drift risk.
- index.html:2604-2644 vs HTML h3 text (1967, 1976, 1985, 1994, 2003, 2012) — JS category labels (`'Switch & Facility Ops'`) differ from HTML (`'Switch & Facility Operations'`). Same concept, two spellings.
- Suggest: derive `color`/`desc` from `CAT_COLORS`; drop per-entry copies.

### 8. Inconsistent resume links across pages + stale files
- index.html:1698, 2109 — `SRA-Resume-072926.pdf`.
- thank-you.html:147 — `SRA_Resume_2026.docx`.
- Repo root holds `SRA_Resume_021726.docx`, `SRA_Resume_2026.docx`, `SRA_Resume_REWRITTEN.docx`, `SRA_Resume_REWRITTEN.md`, `SRA_Resume_FINAL.md` alongside the linked PDF. Two pages link different resume files; several candidate files stale.
- Fix: one canonical resume file, one link target, delete the rest.

### 9. thank-you.html — `nav-resume` class unstyled
- thank-you.html:147 uses `class="nav-resume"` but its `<style>` block has no `.nav-resume` rule (index.html:1148-1155 defines it with `!important` gradient). Class is a no-op on thank-you page. Either add the rule or drop the class.

### 10. thank-you.html — `footer::before` positioned against wrong ancestor
- thank-you.html:117-120 — `footer::before { position: absolute; top: 0; ... }` but `footer` (116) has no `position: relative`. Index version sets `position: relative` on footer (index.html:847-848). On thank-you, pseudo-element anchors to initial containing block → gradient line renders at viewport top, behind the nav. Copy the `position: relative` from index.

### 11. Form error handling — error shown in success element, no alert semantics
- index.html:2940-2945 — `.catch()` writes the error message into `successMsg` (role="status", gold-colored, id `form-success`). Error should use a distinct element + `role="alert"`; success path already has `aria-live="polite"`.
- index.html:2943 — `successMsg.style.color = 'var(--gold)'` — redundant, gold already applied inline at 2097.
- index.html:2924-2945 — no `type="submit"` re-check if `btn` null; button disabled permanently on success (intended, fine).
- Suggestion: separate `#form-error` element; keep success message honest.

### 12. Mixed declaration style — `var` vs `const`
- index.html:2128-2576 (Three.js IIFE) and 2591-3007 (skill ring) use `const`/`let`.
- index.html:3110-3231 (nav/theme script) uses `var` throughout.
- index.html:1672-1678 theme-init block uses `var`. Inconsistent. Pick one (modern: `const`/`let`).

### 13. Broken indentation — skill-ring block not part of the function it looks like it is
- index.html:2591-3007 — top-level code indented as if inside `initThreeJSMap` (which closes at 2576). Mixed 6-space / 8-space / 0-space levels. Suggests the block was extracted from the function without reformatting. Re-indent or move into the function.

### 14. Duplicated theme-init script (copy-paste)
- index.html:1671-1679 and thank-you.html:126-134 — byte-identical theme-init IIFE. No shared `theme.js`. Acceptable for two static pages, but the palette token sets already drift (see #15) — shared file would stop both.

---

## Suggestions

### 15. Palette token drift between pages
- index.html:79-101 defines `--teal`, `--teal-dark`, `--teal-light`, `--olive`, `--input-bg`, `--text-on-accent`.
- thank-you.html:33-46 defines only a subset (`--bg`, `--bg-card`, `--text`, `--text-dim`, `--gold*`, `--border-glass`, fonts). thank-you is missing `--bg-glass`, `--input-bg`, `--teal*`, `--olive` — and its `--text-dim` differs (`#78716c` vs index `#6e635c`), dark `--border-glass` differs (`rgba(224,106,58,0.08)` vs index `0.12`). Dark-mode colors will not match index. Consolidate tokens.

### 16. thank-you.html — no theme/style toggles
- thank-you.html:139-149 — nav lacks `#theme-toggle` and style dropdown that index.html:1699-1720 has. Also no `prefers-reduced-motion` or `noscript` fallback blocks (index.html:1525-1539, 3234-3243). Feature parity gap; also means dark-mode users get un-persisted init only.

### 17. Empty `catch(e) {}`
- index.html:1674, 3178, 3222, 3226 and thank-you.html:129 — `catch(e) {}` where `e` unused. `catch {}` is terser.

### 18. Verbose boolean
- index.html:3116 — `var open = navToggle.getAttribute('aria-expanded') === 'true' ? false : true;` → `!== 'true'`.

### 19. `theme-color` meta not synced on load
- index.html:16-17 declare theme-color metas; index.html:3223/3227 update them on toggle, but the load-time init (1671-1679) never sets `themeMeta.content`. Dark-mode users on load keep the light theme-color. Sync in init.

### 20. One-call indirection
- index.html:2485-2487 — `classListToggle(el, cls, on)` wraps `el.classList.toggle` with a single call site (2482). Inline it.

### 21. Hex colors duplicated across HTML, CSS, JS
- Category h3 inline colors (index.html:1967, 1976, 1985, 1994, 2003, 2012), CSS `--gold*`/`--teal*` tokens (79-101), and JS `CAT_COLORS` (2649-2656) each hardcode the same palette. Palette changes must be edited in three places.

---

## Strengths

- Progressive enhancement done right: `<noscript>` fallback (index.html:3234-3243), reduced-motion guards in Three.js IIFE (2131-2133) and GSAP (3019-3026), CSS text fallback for the map kept in the a11y tree (264-291), skip-link (1684), rich `aria-*` attributes on form/tooltip/nav.
- Theme-init in `<head>` prevents flash of wrong theme (1671-1679).
- `try/catch` around `localStorage` reads (1674, thank-you 129) — safe under private browsing.
- Comments generally explain why, not what (e.g. 2220-2221 fill rationale, 2456-2460 labels/a11y rationale, 2572-2573 is-enhanced rationale). `ponytail:` convention used consistently (50, 2093).
- Netlify form correctness: honeypot (2071), `form-name` hidden input (2070) + re-appended in JS (2928).
- Consistent CSS custom-property tokens and BEM-style names for the career-locations block (`career-locations__heading`, `.career-locations__list`).

---

## Cross-cutting note

This file covers style only. `_workspace/01_performance.md` already exists (12.9K) — perf lens handled separately. Recommend fixing Critical #1-3 before any merge; they are latent runtime/fallback bugs, not taste.
