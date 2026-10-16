# Unified Code Review — Career-Site (index.html + thank-you.html)

**Date:** 2026-08-01  
**Scope:** `index.html` (3246 lines), `thank-you.html` (166 lines)  
**Lenses:** Architecture · Performance · Style (Security pending — static site, no backend)

---

## Executive Summary

| Severity | Count | Top Issues |
|----------|-------|------------|
| **CRITICAL** | 4 | Runtime crash (`Mobile` key), fallback defeat, duplicate data sources (career, skills, palette) |
| **HIGH** | 8 | Render-blocking JS/fonts, off-screen WebGL burn, O(n²) per-frame, no cache headers |
| **MEDIUM** | 12 | Global leaks, stale tokens, drift, per-frame allocations |
| **SUGGESTIONS** | 8 | Three.js→Canvas, GSAP→IO, dead code, indentation |

**Verdict:** The site works for visitors with fast desktop connections and CDN access. On mobile/cold-cache/reduced-motion or if CDN is blocked, it delivers broken visuals (map crash), invisible fallbacks, and continuous battery drain. Architecture has deep DRY violations (3-4 copies of career data, skills, palette, bio). The fixes are structural but targeted: one data array per concept, IO-gated render loops, `defer`/lazy-load, and Cache-Control headers.

---

## CRITICAL — Must Fix Before Merge

| ID | Finding | File:Line | Lens |
|----|---------|-----------|------|
| **C1** | `EXTRA_PINS` references `Mobile` — key missing from `CITIES` → `TypeError` crashes map init; downstream: canvas appended but never rendered, `is-enhanced` added anyway, a11y fallback hidden | `index.html:2275` (pins), `2248-2259` (CITIES), `2311` (crash), `2588` (fallback defeat) | Arch H1, Style C1 |
| **C2** | Career-path data in **3 copies** with silent drift: HTML fallback (1741-1746), JS CAREER_PATH (2262-2270), Timeline articles (1858-1949). Austin dates already disagree across all three. | `index.html:1741-1746`, `2262-2270`, `1858-1949` | Arch H2 |
| **C3** | Palette in **4 copies** — CSS tokens, JS BRAND map, JS SKILLS/CAT_COLORS, inline h3 colors. Theme/style toggles only affect CSS; skill ring + map never re-read tokens. | `index.html:79-101`, `2148-2153`, `2602-2644`, `1967-2012` | Arch H3 |
| **C4** | Unconditional `is-enhanced` (2587-2588) defeats reduced-motion/no-THREE guards. If CDN blocked, fallback stays hidden. | `index.html:2131-2133`, `2572-2573`, `2587-2588` | Style C3 |

---

## HIGH — User-Visible Impact (LCP / FPS / Battery / Revalidation)

| ID | Finding | File:Line | Lens | Expected Impact |
|----|---------|-----------|------|-----------------|
| **H1** | Three.js (150 KB gz) + GSAP + ScrollTrigger all sync in `<head>`, no `defer` | `index.html:61-71` | Perf 1.1 | +500-1500 ms LCP cold-cache mobile |
| **H2** | Google Fonts render-blocking on both pages; thank-you pulls full 7-weight suite (JetBrains unused) | `index.html:58`, `thank-you.html:28` | Perf 1.2 | +100-400 ms FP; thank-you wastes 150-300 KB |
| **H3** | Three.js rAF loop renders every frame forever; only pauses on hidden tab, not off-screen. Full-viewport WebGL at 2× dpr. | `index.html:2549-2570` | Perf 2.1 | Continuous 20-60 fps GPU/CPU burn; mobile battery drain |
| **H4** | `findCrossLinks()` O(n²) runs per frame (~350k string ops/sec) — result is constant after init | `index.html:2757`, `2664-2675` | Perf 4.1 | Main-thread jank on mid-range mobile when skills visible |
| **H5** | No Cache-Control headers in netlify.toml — og-image (78 KB) + resume PDF revalidate every visit | `netlify.toml:8-13` | Perf 3.1 | +1 RTT + 78 KB revalidation on repeat views |
| **H6** | Two duplicate pins (`Memphis`, `Birmingham`, `Atlanta`, `Montgomery` in both `CITIES` + `EXTRA_PINS`) | `index.html:2255-2259`, `2274-2278` | Style C2 | Double geometry + DOM labels after C1 fix |
| **H7** | Per-frame allocation churn: `project()` arrays (50/frame), `Vector3` (10/frame), `curPos` map (41/frame), gradients (30/frame) | `index.html:2171`, `2471-2484`, `2728-2745` | Perf 2.3, 2.4 | Thousands of short-lived objects/frame → GC pressure |
| **H8** | Skill ring rAF loop never stops (ticks 60×/s forever even if user never scrolls to skills) | `index.html:2995-3007` | Perf 2.2 | Idle CPU wakeups on mobile |

---

## MEDIUM — Sustained Waste / Maintainability / Drift

| ID | Finding | File:Line | Lens |
|----|---------|-----------|------|
| **M1** | Skill data duplicated HTML ↔ JS (35 skills in both places) | `index.html:1967-2018`, `2602-2644` | Arch M1, Style M7 |
| **M2** | ~1000 lines inline JS, 3 blocks, 5 subsystems, no module boundaries | `index.html:2120-3104` | Arch M2 |
| **M3** | Skill-ring block leaks ~15 globals; `animate`/`pageVisible` declared twice | `index.html:2593-3007`, `2550` vs `2995` | Arch M3, Style M6 |
| **M4** | GSAP parallax reaches Three.js via `window.camera` global handshake | `index.html:3090-3099` vs `2163` | Arch M4 |
| **M5** | `#constellation-interact` dead stub — `.active` never toggled | `index.html:229-231`, `2873-2881` | Arch M5 |
| **M6** | thank-you duplicates palette/theme-init/nav; stale resume link (`SRA_Resume_2026.docx` vs index's PDF) | `thank-you.html:33-59`, `126-134`, `147` | Arch M6 |
| **M7** | Undefined CSS var `--surface` used at `.nav-style-toggle:hover` | `index.html:1009` | Arch M7 |
| **M8** | Success element reused for error message (wrong ARIA semantics) | `index.html:2097`, `2937`, `2942-2944` | Arch M8, Style M11 |
| **M9** | thank-you `footer::before` absolute-positioned but footer lacks `position: relative` | `thank-you.html:117-120` | Style M10 |
| **M10** | Mixed `var`/`const` across script blocks | `index.html:3110-3231` vs `2128-2576` | Style M12 |
| **M11** | Broken indentation — skill-ring block looks like it's inside `initThreeJSMap` | `index.html:2591-3007` | Style M13 |
| **M12** | Palette token drift between pages (thank-you missing `--teal*`, `--olive`, `--input-bg`, `--bg-glass`; dark values differ) | `index.html:79-101` vs `thank-you.html:33-46` | Style M15 |
| **M13** | thank-you lacks theme/style toggles + reduced-motion/noscript fallbacks | `thank-you.html:139-149` | Style M16 |
| **M14** | `theme-color` meta never synced on load (dark users get light theme-color) | `index.html:16-17`, `1671-1679` | Style M19 |
| **M15** | Unreferenced assets deployed: `map-desktop-hero.png`, `map-hero-final.png` (265 KB), 5 stale resume files | repo root | Perf 3.3 |

---

## SUGGESTIONS — Polish / Future

| ID | Finding | File:Line | Lens |
|----|---------|-----------|------|
| **S1** | Replace Three.js map (~600 KB) with ~10-15 KB Canvas 2D — biggest weight win | `index.html:61-63`, `2120-2583` | Perf 6.1 |
| **S2** | Replace GSAP+ScrollTrigger (~37 KB gz) with native IntersectionObserver (already used at 2873-2881) | `index.html:66-71`, `3030-3102` | Perf 6.2 |
| **S3** | Self-host woff2 subsets (Outfit 400/500/600/700, JB Mono 400/500) → drop Google Fonts RTT | `index.html:54-58` | Perf 6.3 |
| **S4** | Delete dead selectors: `.reveal-left`, `.reveal-right`, `.reveal-scale`, `section + section::before` | `index.html:1532,1544,1083-1090` | Style M5 |
| **S5** | Remove empty section banners (1293-1295, 1518-1520) | `index.html:1293-1295`, `1518-1520` | Style M5 |
| **S6** | Extract shared `visibilitychange` guard for both rAF loops | `index.html:2544-2549`, `2989-2993` | Perf 2.3, Style M6 |
| **S7** | Fix verbose boolean: `var open = ... === 'true' ? false : true;` | `index.html:3116` | Style M18 |
| **S8** | Inline `classListToggle` wrapper (single call site) | `index.html:2485-2487` | Style M20 |

---

## Strengths (What's Done Well)

| Area | Details |
|------|---------|
| **Progressive Enhancement** | `<noscript>` fallback, reduced-motion guards (Three.js + GSAP), CSS text fallback kept in a11y tree, skip-link, rich `aria-*` on form/tooltip/nav |
| **Theme Init** | Anti-FOUC script in `<head>` runs before paint; `try/catch` on `localStorage` safe under private browsing |
| **Comments** | Generally explain *why*, not *what* (fill rationale, labels/a11y rationale, `is-enhanced` rationale); `ponytail:` convention consistent |
| **Netlify Forms** | Honeypot, `form-name` hidden input + re-appended in JS — correct |
| **Design Tokens** | Consistent CSS custom-property tokens; BEM-style names for career-locations block |

---

## Recommended Fix Order (Highest Leverage First)

1. **Single career-path data array** → drives timeline + a11y fallback + map nodes (kills C1 sibling risk, C2, C4)
2. **Single skills data array** → drives HTML tags + ring; validate `EXTRA_PINS` keys against `CITIES` (kills C1, H6, M1)
3. **`defer`/lazy-load Three.js + GSAP** (H1, H2) + **Cache-Control headers** (H5)
4. **IO-gate both rAF loops** (H3, H7, H8) + extract shared visibility guard (S6)
5. **Palette contract** — one CSS-token source; JS re-reads on `[data-style]`/`[data-theme]` change (C3)
6. **Precompute constant map/skill data** — kill per-frame allocs + O(n²) (H4, H7)
7. **Wrap skill-ring in IIFE/module**; rewire GSAP parallax through defined hook (M3, M4)
8. **Align thank-you with index** — shared tokens, same resume link, theme/style toggles (M6, M12, M13)
9. **Clean up** — delete unreferenced assets, stale resumes, dead code, fix indentation (M15, S4-S8)

---

## Security Notes (Static Site)

- No backend, no auth, no database → injection surface is client-only (XSS via form reflection).
- Form POST goes to Netlify (`/` with `form-name=contact`); Netlify handles sanitization server-side.
- No secrets in code; CDN deps pinned with SRI (`three.min.js`, `gsap.min.js`, `ScrollTrigger.min.js`).
- **Recommendation:** Add `Content-Security-Policy` header in `netlify.toml` (e.g., `script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'none';`).

---

*Security review pending — may add findings if CSP or other client-surface issues are identified.*