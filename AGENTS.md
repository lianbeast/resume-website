# Career Site — AGENTS.md

## Project Description
Static personal career/portfolio site for **Syed Rahid Ahmed**, Sr. Switch Technician (Telecom Operations & RAN/Transport Specialist). Hosted on GitHub Pages at `https://lianbeast.github.io/resume-website/` with custom domain `rahid.persipico.com`. No build step, no framework — pure HTML, inline CSS, vanilla JS. Deploy = push `main`.

**Purpose**: Convert recruiter attention into hiring conversation. The visual argument *is* the professional argument — topology visualizations prove network thinking. Carrier-grade composure, not flash.

---

## Tech Stack
- **Runtime**: Static files served via `http-server` (dev) / GitHub Pages (prod)
- **3D/Animation**: Three.js (r128 via CDN) + GSAP/ScrollTrigger (desktop-only, gated `matchMedia`)
- **Forms**: Formspree (`https://formspree.io/f/mdekbpja`) with honeypot + client validation
- **Fonts**: Outfit (display/body) + JetBrains Mono (technical) injected async via `theme.js`
- **Testing**: Puppeteer + chrome-launcher (scripts in `scripts/`)
- **CI**: Lighthouse CI (`lhci autorun`) with assertions in `lighthouseci.config.js`

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
node scripts/restore.test.cjs    # index.html, resume-preview.html, thank-you.html
node scripts/immersive.test.cjs  # immersive-preview.html
node scripts/bold-resume.test.cjs # bold-resume-preview.html
```

---

## Architecture Overview

### Page Inventory
| File | Purpose |
|------|---------|
| `index.html` | Main homepage — approved resume-style layout |
| `immersive-preview.html` | Immersive 3D career journey (Three.js map + skill ring) |
| `bold-resume-preview.html` | Bold editorial resume treatment |
| `resume-preview.html` | Earlier resume-style preview (reference) |
| `wheel-v2.html` | Standalone 3D skill wheel (search, pause, list fallback) |
| `thank-you.html` | Contact form confirmation |

### Core Architecture
- **Single self-contained artifact**: `index.html` inlines CSS + loads `app.js`, `nav.js`, `theme.js`, `states.js` — no bundler
- **Theme system**: Light (Carbon Ivory) + Dark (Graphite) via `data-theme` attribute, persisted in `localStorage`; `theme.js` injects fonts async
- **CSP**: Single source in `config.json`, served via test server inferred by GitHub Pages headers
- **Motion**: Three.js + GSAP fully gated by `prefers-reduced-motion` — falls back to static scene, never blank
- **Mobile-first**: `100dvh` units, safe-area insets, `viewport-fit=cover`, debounced resize (150ms), 44px touch targets
- **Print-safe**: Hierarchy legibility preserved when printed PDF

---

## Key Files & Directories

```
├── index.html                    # Main entry point (inline CSS + scripts)
├── immersive-preview.html        # 3D career journey
├── bold-resume-preview.html      # Editorial resume
├── wheel-v2.html                 # Skill wheel standalone
├── thank-you.html                # Form confirmation
├── config.json                   # CSP header (single source truth)
├── theme.js                      # Theme toggle, font injection, motion gating
├── app.js                        # Core logic: Three.js map, skill ring, form, counters
├── nav.js                        # Hamburger drawer, focus management, scrollspy
├── states.js                     # US state polygons (lon/lat, RDP-simplified)
├── lighthouseci.config.js        # LHCI assertions (perf ≥0.9, a11y ≥0.9, CLS ≤0.1, FID ≤200ms)
├── scripts/                      # Puppeteer test scripts
│   ├── restore.test.cjs
│   ├── immersive.test.cjs
│   ├── bold-resume.test.cjs
│   └── run-lhci.sh
├── assets/
│   ├── design-tokens.css         # :root + dark theme CSS custom properties
│   ├── design-tokens.json        # Machine-readable tokens
│   ├── og-image.png              # Social preview
│   └── demo/                     # Demo GIF/MP4
├── DESIGN.md                     # Design spec (Impeccable output)
├── PRODUCT.md                    # Product spec (users, positioning, constraints, brand)
├── HANDOFF.md                    # Mobile optimization summary + Lighthouse results
├── COLOR_DIRECTIONS.md           # Four palette directions (Direction 1 = committed)
├── SRA-Resume.pdf                # Resume PDF (alias SRA-Resume-072926.pdf)
└── robots.txt                    # Allow all, sitemap reference
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

**Typography**: Outfit 300–700 (display/body) + JetBrains Mono 400/500 (labels, tokens). No third typeface.

**Key Rules**:
- Terracotta is the single primary accent (≤10% surface); rarity is its strength
- Hover/active shadows tinted with terracotta (`rgba(194,65,12,a)`), never neutral black
- Glass cards flat at rest; ambient shadow appears as response to state
- JetBrains Mono reserved strictly for technical tokens: protocol names, section kickers, tag labels, date stamps

---

## Coding Conventions

### Commits
Conventional-ish: `feat:`, `fix:`, `chore:`, `polish:` — see git log

### CSP
Single source in `config.json`; never hardcode in HTML

### Evidence Integrity
Never fabricate employers, certifications, protocols, dates, or skill taxonomy (PRODUCT.md §41)

### Motion
Always respect `prefers-reduced-motion`; content never gated on animation

### Accessibility
WCAG AA target: ≥4.5:1 body, ≥3:1 large text; keyboard-reachable; no hue-alone encoding

### No Framework Patterns
No React/Vue/Svelte idioms; vanilla DOM, event delegation, CSS custom properties

---

## Notable Constraints

1. **Topology material** visual system (hub nodes, signal trails, cross-connections) IS the argument
2. **Carrier-grade composure** — restraint over performance; motion enhances, never shouts
3. **Proof over adjectives** — specificity (years, employers, certs, protocols) carries the page
4. **One self-contained artifact** — portable, forwardable, no build step to break in transit
5. **Single accent discipline** — terracotta ≤10% surface; rarity is its strength

---

## Deployment

- **Platform**: GitHub Pages (publishes `main` branch automatically)
- **Domain**: `rahid.persipico.com` (CNAME)
- **Contact Form**: Formspree (`https://formspree.io/f/mdekbpja`)
- **Live URL**: https://lianbeast.github.io/resume-website/ | https://rahid.persipico.com
- **LinkedIn**: https://linkedin.com/in/syedrahidahmed
