# Performance Review — index.html + thank-you.html

Date: 2026-08-01
Scope: `index.html` (3246 lines), `thank-you.html` (166 lines), `netlify.toml`, deploy payload.

Severity guide: **[HIGH]** = user-visible LCP/FPS/battery impact. **[MED]** = sustained waste, measurable on mobile. **[LOW]** = cleanup / hardening.

---

## 1. Render blocking

### 1.1 Third-party JS in `<head>` with no `defer` — [HIGH]
- `index.html:61-63` — `three.min.js` r128, ~600 KB raw / ~150 KB gz.
- `index.html:66-68` — `gsap.min.js`, ~71 KB / ~24 KB gz.
- `index.html:69-71` — `ScrollTrigger.min.js`, ~42 KB / ~13 KB gz.

All three are synchronous, in `<head>`. Browser cannot parse body HTML or paint until all three download + execute. On cold cache that is 3 extra RTTs plus ~190 KB gz before first paint.

Expected impact: +500-1500 ms LCP on 3G/cold-cache mobile.
Fix: add `defer` to all three. Better: gate Three.js behind IntersectionObserver (it only powers a background map) and load it when `#scene-container` nears viewport; GSAP/ScrollTrigger could stay `defer`.

### 1.2 Google Fonts stylesheet render-blocking — [HIGH on thank-you, MED on index]
- `index.html:58` and `thank-you.html:28` — identical Google Fonts CSS link, default render-blocking.

The CSS fetch blocks first paint on both pages. `thank-you.html` is a ~50-word confirmation page but pulls the *full* Outfit 5-weight + JetBrains Mono 2-weight suite (7 woff2 files) — enormous relative to the content it shows. JetBrains Mono is never even used in the thank-you page markup.

Expected impact: +100-400 ms first paint per page; thank-you wastes ~150-300 KB download for content that fits in 2 system-font weights.
Fix: `media="print" onload="this.media='all'"` async-font pattern on both; on thank-you.html drop the Google Fonts link entirely and use `system-ui`/`ui-sans-serif` stack, or load a single Outfit weight.

### 1.3 Giant inline `<style>` in head — [MED]
- `index.html:73-1669` — ~90 KB / 1600 lines inline CSS: 3 style-switcher theme palettes, print stylesheet, ~15 decorative keyframes, full responsive rules.

Inline CSS in head always blocks first paint; it is correct that it is inline (no extra request) but ~30 % of it is print styles and style-switcher overrides used by <1 % of visitors. `@media print` block alone is `index.html:1566-1668`.

Expected impact: +50-150 ms parse/cascade on first render.
Fix: move `@media print` and the `[data-style="solar-graphite"]`/`industrial-ochre` override blocks into a small async-injected stylesheet. Print styles don't affect screen first paint at all.

### 1.4 Theme-init script placement — [LOW]
- `index.html:1671-1679`, `thank-you.html:126-134` — small synchronous head script. Correctly placed (avoids FOUC). No change needed; noted for completeness.

---

## 2. Memory leaks / unbounded work

No true growing-memory leak found (no unbounded arrays, no orphaned retained closures that accumulate). The issue class here is **two never-ending rAF loops + sustained per-frame garbage** on a single-page site.

### 2.1 Three.js render loop renders every frame, forever — [HIGH]
- `index.html:2549-2570` — `animate()` runs `requestAnimationFrame(animate)` unconditionally, then `renderer.render(scene, camera)` every frame. Full-viewport WebGL (antialias on, `setPixelRatio(min(dpr,2))` at `index.html:2181`).

It only pauses when the tab is hidden (`pageVisible` at `2544-2547`). Scrolling to the footer or the map never being visible does not stop it. A full-screen WebGL frame at 2× dpr on mobile is the single most expensive repeated cost on the page.

Expected impact: continuous 20-60 fps GPU + CPU burn for the entire session; measurable battery drain on mobile.
Fix: IntersectionObserver on `#scene-container`; cancel/park the rAF (or skip `renderer.render`) while off-screen. Also consider `renderer.setPixelRatio(1)` on mobile — the dotted-line map doesn't need 2×.

### 2.2 Skill-ring rAF loop never stops — [MED]
- `index.html:2995-3007` — second permanent `animate()` loop. When `ringActive` is false and `ringOpacity <= 0`, `drawSkillRing` early-returns at `index.html:2714`, so the body is cheap — but the rAF still ticks 60×/s forever even if the user never scrolls to skills.

Expected impact: idle CPU wakeups; small on desktop, nonzero on mobile.
Fix: drive the loop with an IntersectionObserver start/stop (an IO already exists at `2873-2881` — reuse it to toggle the loop instead of only `ringActive`).

### 2.3 Per-frame allocation churn in the map loop — [MED]
- `index.html:2169-2173` — `project()` returns a new `[x, y]` array per call.
- `index.html:2489-2511` — `animatePackets()` calls `project()` **twice per packet × 25 packets = 50 array allocs/frame**, ~3 000/s.
- `index.html:2471-2484` — `positionLabels()` runs every frame and allocates a new `new THREE.Vector3()` per city (10/frame), plus reads `window.innerWidth/innerHeight` and writes 10 spans' `style.left/top`.

Expected impact: thousands of short-lived objects/frame → minor GC pressure; `positionLabels` DOM writes every frame even when the map is off-screen.
Fix: precompute all city x/y once at init (they never move; `mapGroup.matrixWorld` is identity — the projection is static). Cache the project() results in `cityNodeData`; only write label positions when the map is visible.

### 2.4 Skill-ring per-frame allocations — [MED]
- `index.html:2728-2735` — `ringNodes.map(...)` builds ~41 new objects/frame for `curPos`.
- `index.html:2745` — `SKILLS.filter(s => s.cat === cat)` re-runs per category per frame (6 scans of a 35-item array each frame).
- `index.html:2749` — `ringNodes.find(...)` O(n) scan per category per frame.
- `index.html:2797` — `skillCtx.createRadialGradient()` per node per frame (~30 gradients/frame).

Expected impact: continuous GC + Canvas2D gradient allocation at ~30-60 fps while the section is in view.
Fix: precompute category skill lists, outer radii, and node base positions at init; update positions from rotation angle only. These are all constant data.

---

## 3. Cache misses

### 3.1 No cache headers in netlify.toml — [MED]
- `netlify.toml:8-13` — only security headers. No `Cache-Control` for static assets.

Netlify's default gives non-hashed assets `public, max-age=0, must-revalidate` — every revisit revalidates `og-image.png`, the resume PDF, and both fonts' CSS. `assets/og-image.png` (78 KB, referenced at `index.html:15,24,35`) re-fetches on each visit.

Expected impact: +1 RTT and 78 KB revalidation on every repeat view.
Fix: add
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/SRA-Resume-072926.pdf"
  [headers.values]
    Cache-Control = "public, max-age=86400"
```

### 3.2 CDN deps: pinned + SRI — good, no change — [LOW]
- `index.html:61-63,66-71` — pinned versions (`r128`, `3.12.5`) with `integrity` SRI and `crossorigin` — correct cache-friendly CDN practice (cdnjs serves shared-cache hashed URLs). The problem is only that they're render-blocking (see 1.1), not that they're on a CDN.

### 3.3 Unreferenced assets shipped to production — [MED]
- `map-desktop-hero.png` (133 KB), `map-hero-final.png` (132 KB) — repo root, not referenced anywhere in `index.html`/`thank-you.html` (grep confirmed). Deployed, indexed, never displayed.
- `style.css`, `style-selector.html` — unused fragments (per `_workspace/00_scope.md`), deployed.
- Stale resume copies: `SRA_Resume_021726.docx`, `SRA_Resume_2026.docx`, `SRA_Resume_REWRITTEN.docx/.md` — only `SRA-Resume-072926.pdf` (index) and `SRA_Resume_2026.docx` (thank-you:147) are referenced; thank-you links the *old* docx while index links the *new* PDF — inconsistent, and both deploy.
- `package.json`/`package-lock.json` (146 KB) declare `9remote` + native deps — nothing in the site uses them; they ship in the repo but not the deploy (static site, no build). Confusing but not served.

Expected impact: wasted deploy bandwidth and CDN storage; duplicate/stale resume reachable at public URLs.
Fix: delete unreferenced binaries; align thank-you resume link to `SRA-Resume-072926.pdf`.

---

## 4. Bottleneck algorithms

### 4.1 `findCrossLinks()` runs O(n²) every frame — [HIGH]
- Called each frame: `index.html:2757` inside `drawSkillRing`.
- Definition `index.html:2664-2675`: double loop over 35 nodes = ~595 pairs; each pair does 2× `toLowerCase()` and a `LINK_KEYWORDS.some(...)` includes scan (5 keywords). ~5 900 string ops/frame, ~350 000/s while the skills section is visible.

The result depends only on `SKILLS`/`ringNodes`, which are constant after init — the links never change. This is the clearest repeated-computation bottleneck on the page.

Expected impact: measurable main-thread jank on mid-range mobile when skills is in view (it compounds with 4.2's work).
Fix: compute `crossLinks` once after `initRingNodes`; store as `const`; delete the per-frame call.

### 4.2 `drawSkillRing` recomputes constant layout data per frame — [MED]
See 2.4 — `SKILLS.filter`, `ringNodes.find`, `curPos` map, per-node gradients all recomputed each frame from immutable inputs. Combined with 4.1, the per-frame cost of the skills section is ~O(n²) + O(n) allocation when it should be O(rotated positions) with precomputed paint lists.

### 4.3 Scrollspy on every scroll event — [LOW]
- `index.html:3132-3143` — `updateActiveLink()` iterates all 6 sections and 6 nav anchors on every scroll event (passive listener, so no blocking, but runs at scroll frequency). Also forces style reads (`s.offsetTop`).
- Back-to-top visibility toggle `index.html:3148-3150` also runs per scroll event.

Expected impact: negligible (6 iterations), but easy to fold into one rAF-throttled scroll handler.
Fix: throttle with a rAF flag or `IntersectionObserver` for both.

### 4.4 Per-packet `project()` recompute — [MED]
Same root as 2.3: `animatePackets` at `index.html:2496-2497` re-projects the same two segment endpoints for each of 25 packets, every frame, when segment endpoints are static. Cache per-segment `{ax, ay, bx, by}` in `packetData` at init.

---

## 5. Unnecessary allocations — consolidated list

| Location | Allocation | Frequency |
|---|---|---|
| `index.html:2171` `project()` returns `[x,y]` array | 1 array | every call |
| `index.html:2496-2497` project() × 2 in `animatePackets` | 50 arrays | per frame |
| `index.html:2475` `new THREE.Vector3()` in `positionLabels` | 10 objects | per frame |
| `index.html:2728` `ringNodes.map` for `curPos` | ~41 objects | per frame (while active) |
| `index.html:2745` `SKILLS.filter` | 6 arrays | per frame |
| `index.html:2797` `createRadialGradient` | ~30 gradients | per frame |
| `index.html:2664-2675` `findCrossLinks` internals | strings + array | per frame |

None are leaks; all are GC pressure from constant data. Fixes: precompute at init (2.3, 2.4, 4.1, 4.4).

---

## 6. CDN strategy

- Current: cdnjs for Three.js + GSAP (pinned, SRI, shared-cache friendly). Google Fonts for Outfit + JetBrains Mono (preconnect present at `index.html:54-55`). Netlify for first-party. Overall sound. Three concerns:
  1. **Three.js r128 is ~600 KB and drives a scene that is essentially a 2D line map.** The whole map (US outline + 10 points + 25 moving dots, all projected to flat 2D) could be drawn with a plain `<canvas>` in ~10-15 KB of code — dropping the 150 KB-gz Three.js dependency entirely. This is the biggest single weight win available (`index.html:61-63`, scene at `2120-2583`).
  2. **GSAP + ScrollTrigger (~37 KB gz) are used for scroll reveals, underlines, and counters** (`index.html:3030-3102`) — all achievable with the native IntersectionObserver already used elsewhere on the page (`2873-2881`). Dropping GSAP saves ~37 KB gz and one more rAF ticker.
  3. If 1+2 are kept, at minimum make them `defer` (1.1) so they stop blocking first paint.
- Fonts: self-hosting woff2 subsets of Outfit (weights actually used: 400/500/600/700 in body/cards/buttons, 300 mostly unused) + JetBrains Mono 400/500 would cut the Google Fonts RTT and eliminate the render-blocking stylesheet. LOW-MED priority.

---

## 7. thank-you.html specific

- `thank-you.html:28` — full Google Fonts suite for a ~50-word page; JetBrains Mono unused in markup. See 1.2.
- Otherwise clean: no JS beyond theme init, no animation, no images beyond inline SVG favicon. Loads fast once the font issue is addressed.

---

## Priority summary

1. **[HIGH]** `defer`/lazy-load Three.js + GSAP — kills render blocking (`index.html:61-71`).
2. **[HIGH]** Stop off-screen WebGL rendering via IO (`index.html:2549-2570`).
3. **[HIGH]** `findCrossLinks()` once, not per frame (`index.html:2757,2664-2675`).
4. **[MED]** Cache-Control headers in netlify.toml.
5. **[MED]** Precompute map/skill-ring constant data; kill per-frame allocs (`2171`, `2471-2484`, `2728-2745`).
6. **[MED]** Delete unreferenced `map-*-hero.png`, stale resumes, unused style fragments from deploy.
7. **[MED]** Async-load Google Fonts; drop fonts on thank-you.
8. **[LOW]** Throttle scrollspy; stop idle skill-ring rAF when section not in view.
