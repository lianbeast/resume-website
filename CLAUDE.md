# Career Site — CLAUDE.md

## Project Overview
Static personal career/portfolio site for **Syed Rahid Ahmed**, Sr. Switch Technician (Telecom Operations & RAN/Transport). Hosted on **GitHub Pages** at `https://lianbeast.github.io/resume-website/`. No build step, no framework — pure HTML, inline CSS, vanilla JS. Deploy = push to `main`.

**Purpose**: Convert recruiter attention into a hiring conversation. Visual argument *is* the professional argument (topology visualizations = proof of network thinking). Carrier-grade composure, not flash.

---

## Tech Stack
- **Runtime**: Static files served via `http-server` (dev) / GitHub Pages (prod)
- **3D/Animation**: Three.js (r128 via CDN) + GSAP/ScrollTrigger (desktop-only, gated by `matchMedia`)
- **Forms**: Formspree (`https://formspree.io/f/mdekbpja`) with honeypot + client validation
- **Fonts**: Outfit (display/body) + JetBrains Mono (technical) — injected async by `theme.js`
- **Testing**: Puppeteer + chrome-launcher (scripts in `scripts/`)
- **CI**: Lighthouse CI (`lhci autorun`) — assertions in `lighthouseci.config.js`

---

## Commands
```bash
# Development server (port 8080)
npm run dev

# Lighthouse CI (3 runs, assertions in lighthouseci.config.js)
npm run lhci
# or directly
./scripts/run-lhci.sh

# Individual page tests (headless Chrome, intercepts Formspree)
node scripts/restore.test.cjs     # index.html, resume-preview.html, thank-you.html
node scripts/immersive.test.cjs   # immersive-preview.html
node scripts/bold-resume.test.cjs # bold-resume-preview.html
```

---

## Page Inventory
| File | Purpose |
|------|---------|
| `index.html` | Main homepage — approved resume-style layout |
| `immersive-preview.html` | Immersive 3D career journey (Three.js map + skill ring) |
| `bold-resume-preview.html` | Bold editorial resume treatment |
| `resume-preview.html` | Earlier resume-style preview (reference) |
| `wheel-v2.html` | Standalone 3D skill wheel (search, pause, list fallback) |
| `thank-you.html` | Contact form confirmation |

---

## Architecture Notes
- **Single self-contained artifact**: `index.html` inlines CSS + loads `app.js`, `nav.js`, `theme.js`, `states.js` — no bundler
- **Theme system**: Light (Carbon Ivory) + Dark (Graphite) via `data-theme` attribute, persisted in `localStorage`; `theme.js` injects fonts async
- **CSP**: Defined in `config.json`, served via test server and inferred by GitHub Pages headers
- **Motion**: Three.js + GSAP fully gated by `prefers-reduced-motion` — falls back to static scene, never blank
- **Mobile-first**: `100dvh` units, safe-area insets, `viewport-fit=cover`, debounced resize (150ms), 44px touch targets
- **Print-safe**: Hierarchy and legibility preserved when printed to PDF

---

## Key Files & Directories

### Custom Agents

- **ThreeJS-Animator**: Handles Three.js and GSAP animations, ensuring motion respects `prefers-reduced-motion`.
- **Formspree-Validator**: Validates Formspree form integrations, including client-side validation and CSP compliance.
- **Lighthouse-Optimizer**: Runs Lighthouse CI tests and suggests fixes for performance/accessibility issues.
```
├── index.html                 # Main entry point (inline CSS + scripts)
├── immersive-preview.html     # 3D career journey
├── bold-resume-preview.html   # Editorial resume
├── wheel-v2.html              # Skill wheel standalone
├── thank-you.html             # Form confirmation
├── config.json                # CSP header (single source of truth)
├── theme.js                   # Theme toggle, font injection, motion gating
├── app.js                     # Core logic: Three.js map, skill ring, form, counters
├── nav.js                     # Hamburger drawer, focus management
├── states.js                  # US state polygons (lon/lat, RDP-simplified)
├── lighthouseci.config.js     # LHCI assertions (perf ≥0.9, a11y ≥0.9, CLS ≤0.1, FID ≤200ms)
├── scripts/                   # Puppeteer test scripts
├── assets/
│   ├── design-tokens.css      # :root + dark theme CSS custom properties
│   ├── design-tokens.json     # Machine-readable tokens
│   ├── og-image.png           # Social preview
│   └── demo/                  # Demo GIF/MP4
├── DESIGN.md                  # Design spec (Impeccable output)
├── PRODUCT.md                 # Product spec (users, positioning, constraints, brand)
├── HANDOFF.md                 # Mobile optimization summary + Lighthouse results
├── COLOR_DIRECTIONS.md        # Four palette directions (Direction 1 = committed)
├── SRA-Resume.pdf             # Resume PDF (alias of SRA-Resume-072926.pdf)
└── robots.txt                 # Allow all, sitemap reference
```

---

## Design System (Committed: Direction 1 — Solar Graphite Evolution)
| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#c2410c` | CTAs, hub nodes, timeline dots, focus rings |
| Secondary | `#0e7490` | OSS tags, packet trails |
| Tertiary | `#4d7c0f` | RAN/Cellular category, success |
| Light bg | `#f7f5f0` | Carbon Ivory |
| Dark bg | `#161412` | Graphite |

Typography: **Outfit** 300–700 (display/body) + **JetBrains Mono** 400/500 (labels, tokens). No third typeface.

---

## Coding Conventions
- **Commits**: Conventional-ish (`feat:`, `fix:`, `chore:`, `polish:`) — see git log
- **CSP**: Single source in `config.json`; never hardcode in HTML
- **Evidence**: Never fabricate employers, certs, protocols, dates, or skill taxonomy (see PRODUCT.md §41)
- **Motion**: Always respect `prefers-reduced-motion`; content never gated on animation
- **Accessibility**: WCAG AA target; ≥4.5:1 body, ≥3:1 large text; keyboard-reachable; no hue-alone encoding
- **No framework patterns**: No React/Vue/Svelte idioms; vanilla DOM, event delegation, CSS custom properties

---

## Notable Constraints (from PRODUCT.md)
1. **Topology as material** — visual system (hub nodes, signal trails, cross-connections) IS the argument
2. **Carrier-grade composure** — restraint over performance; motion enhances, never shouts
3. **Proof over adjectives** — specificity (years, employers, certs, protocols) carries the page
4. **One self-contained artifact** — portable, forwardable, no build step to break in transit
5. **Single accent discipline** — terracotta ≈≤10% surface; rarity is its strength

---

## Deployment
- **Platform**: GitHub Pages (publishes `main` branch automatically)
- **Domain**: `rahid.persipico.com` (CNAME configured)
- **Contact form**: Formspree endpoint in `config.json` CSP (`connect-src`, `form-action`)
- **Systemd service** (optional): Runs on port 2080 — see README.md for setup

---

## Quick Reference
- **Live URL**: https://lianbeast.github.io/resume-website/
- **Canonical**: https://rahid.persipico.com
- **LinkedIn**: https://linkedin.com/in/syedrahidahmed
- **Formspree**: https://formspree.io/f/mdekbpja