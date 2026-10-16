# Mobile Optimization Handoff

**Last updated:** 2026-09-04
**Project:** /mnt/data/Applications/Play-Site/Career-Site

---

## ✅ All Tasks Complete

### Lighthouse CI — ALL ASSERTIONS PASS (3 runs)
| Metric | Target | Result |
|--------|--------|--------|
| Performance | ≥ 0.9 | **1.0** ✅ (was 0.68) |
| CLS | ≤ 0.1 | **0** ✅ (was 0.71) |
| Max Potential FID | ≤ 200 ms | **41 ms** ✅ (was 402 ms) |
| TBT | — | 0 ms (was 335 ms) |
| TTI | — | 1103 ms (was 3243 ms) |
| Accessibility / Best-practices / SEO | ≥ 0.9 | pass |

### Root-cause fixes (2026-09-04)
1. **CLS 0.71** — `#career-locations` rendered as a visible ~300px block until
   Three.js added `.is-enhanced`, collapsing it and shifting all of `main`.
   Fixed by defaulting the block to its clipped state; JS bail paths (no THREE,
   reduced-motion, no WebGL via new `bail()` in app.js) add `.is-bailed` to
   restore the readable fallback without layout shift.
2. **FID 402 ms** — GSAP eval was one 400 ms main-thread task. GSAP +
   ScrollTrigger now load desktop-only (inline `matchMedia` gate before the
   script tags; mobile/reduced-motion skip scroll animations — reveals render
   visible in CSS, stat counters ship real values in HTML).
3. **Viewport** — `viewport-fit=cover` restored (safe-area insets need it);
   `100dvh` added to body/#scene-container/#hero (no URL-bar reflow).
4. **Resize handler** — Three.js resize debounced 150 ms (URL-bar bursts).
5. **Fonts** — `display=swap` → `display=optional` in theme.js (noscript
   already matched); prevents swap CLS.
6. **iOS input zoom** — form inputs 14px → 16px.
7. **Mobile form UX** — `autocapitalize="sentences"` on subject/message.
8. **Design findings** — 5 pre-existing color/radius ignores persisted per
   prior user request ("all"); `.btn-primary` glow shadow (dark-glow L450)
   replaced with neutral elevation.

### Pre-existing (unchanged, working)
- Hamburger drawer + focus management (nav.js)
- `@media (pointer: coarse)` 44px touch targets
- `@media (hover: hover)` / `(hover: none)` interaction separation
- safe-area insets, content-visibility on sections
