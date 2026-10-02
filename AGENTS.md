# Agent & Repository Guide — Career Site

## Project Overview
Static personal career/portfolio site for **Syed Rahid Ahmed**, Senior Switch Technician & Telecom Specialist (Switch Operations, 5G/4G RAN & Transport Engineering). Hosted on **GitHub Pages** at `https://lianbeast.github.io/resume-website/` (canonical: `https://rahid.persipico.com`).

**Core Purpose**: Conversion-focused personal site designed to convert recruiter/hiring manager attention into high-value interview conversations. Proof over adjectives — visual arguments (Three.js network topology maps, interactive 3D skill wheel) serve as concrete proof of technical domain depth.

---

## Commands & Workflows

### Development
```bash
# Start local static server (port 8080 / 8081)
npx http-server -p 8081 -c-1
# or via npm
npm run dev
```

### Testing & Verification
```bash
# Full Lighthouse CI audit (runs 3 passes, enforces assertions)
npm run lhci

# Page-specific Puppeteer browser test suites (headless Chrome)
node scripts/restore.test.cjs     # Tests index.html, resume-preview.html, thank-you.html
node scripts/immersive.test.cjs   # Tests immersive-preview.html
node scripts/bold-resume.test.cjs # Tests bold-resume-preview.html
```

---

## Architecture Overview

1. **No-Build / Vanilla Stack**:
   - Zero bundlers or frameworks — raw HTML, external modularized CSS, and plain ES/vanilla JavaScript.
   - Deploying requires only pushing directly to `main` branch (GitHub Pages).

2. **Modular CSS Structure**:
   - `assets/shared.css`: Global reset, CSS tokens (`:root` / `[data-theme="dark"]`), typography, components (`.glass`, `.btn`, `.card`), navigation, and print rules.
   - `assets/index.css`: Page-specific styles for `index.html` (Hero orbs, floating shapes, timeline hover accents).
   - `assets/resume-preview.css`: Styles for resume preview variant.
   - `assets/bold-resume-preview.css`: Styles for bold editorial layout.
   - `assets/immersive-preview.css`: HUD, journey timeline, and controls for the 3D career journey.
   - `assets/wheel.css`: Standalone skill wheel styling for `wheel-v2.html`.

3. **Modular JS Architecture (`app/`)**:
   - `app/motion.js`: Motion gating wrapper using `matchMedia('(prefers-reduced-motion: reduce)')`.
   - `app/threejs/map.js`: Three.js scene, camera, and US map projection setup.
   - `app/threejs/pins.js`: US state outlines, city nodes, packet trails, and network connections.
   - `app/skill-wheel.js`: Interactive 3D skill constellation wheel with search, filter, and touch handlers.
   - `app/form.js`: Formspree form validation, honeypot handling, and status messaging.
   - `app/animations.js`: GSAP & ScrollTrigger scroll-driven reveals (gated off on mobile / reduced-motion).
   - `app/glass.js`: LiquidGlass WebGL refraction initialization wrapper.
   - `app/init.js`: Core entry point orchestrating module initialization.
   - `theme.js`: Instant theme toggle (`data-theme`), local storage persistence, and non-blocking font injection.
   - `nav.js`: Mobile drawer navigation, aria-expanded state, and keyboard focus trap.

---

## Key File Locations

| Path | Purpose |
|------|---------|
| `index.html` | Primary homepage (resume layout + 3D background map + skill wheel) |
| `immersive-preview.html` | Interactive 3D career journey (HUD + scroll-driven 3D camera path) |
| `bold-resume-preview.html` | Editorial bold typography resume variant |
| `resume-preview.html` | Standard resume preview variant |
| `wheel-v2.html` | Standalone interactive 3D skill wheel |
| `thank-you.html` | Contact form submission confirmation |
| `config.json` | Content-Security-Policy (CSP) headers (single source of truth) |
| `lighthouseci.config.js` | Performance (≥0.9), Accessibility (≥0.9), and CLS (≤0.1) assertions |
| `DESIGN.md` | Authoritative design specification and design system token contract |
| `PRODUCT.md` | Product requirements, brand positioning, and evidence boundaries |

---

## Custom Agents & Specialized Roles

The repository defines custom agent profiles in `.claude/agents/`:

1. **ThreeJS-Animator** (`.claude/agents/threejs-animator.md`):
   - Specialized in Three.js r128 and GSAP/ScrollTrigger scene graph performance.
   - Ensures all animation frames are properly canceled, WebGL contexts disposed, and motion strictly respects `prefers-reduced-motion`.

2. **Formspree-Validator** (`.claude/agents/formspree-validator.md`):
   - Specializes in form security, client-side validation, accessibility (`aria-invalid`, `aria-describedby`), and CSP compliance with `connect-src` / `form-action` for Formspree.

3. **Lighthouse-Optimizer** (`.claude/agents/lighthouse-optimizer.md`):
   - Focuses on Core Web Vitals (LCP, CLS, FID/INP), layout shift elimination, CSS font-display strategies, and zero-CLS progressive enhancement.

---

## Coding Conventions & Guardrails

- **Zero Inline Styles**: External CSS stylesheets only; maintains clean separation and CSP compliance.
- **Strict Evidence Boundaries**: Never invent or alter titles, years, employers, certifications, or technical taxonomy (refer to `PRODUCT.md`).
- **WCAG 2.1 AA Compliance**:
  - Minimum contrast 4.5:1 for body text, 3:1 for large text.
  - Interactive elements must be keyboard accessible with visible focus rings (`:focus-visible`).
  - Screen reader fallbacks (`#career-locations`) must remain synchronized with canvas visualizations.
- **Performance Budget**:
  - Keep CLS ≤ 0.1 by ensuring DOM fallbacks avoid layout shifting when Three.js initializes (`.is-enhanced` class handling).
  - Heavy libraries (GSAP, Three.js) must be deferred or conditionally loaded.
