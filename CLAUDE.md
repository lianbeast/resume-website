# Career Site — CLAUDE.md

## Project Overview
Static personal career/portfolio site for **Syed Rahid Ahmed**, Sr. Switch Technician (Telecom Operations & RAN/Transport). Hosted on **GitHub Pages** at `https://lianbeast.github.io/resume-website/`. No build step, no framework — pure HTML, inline CSS, vanilla JS. Deploy = push to `main`.

**Purpose**: Convert recruiter attention into a hiring conversation. Visual argument *is* the professional argument (topology visualizations = proof of network thinking). Carrier-grade composure, not flash.

---

## Architecture Notes
- **Single self-contained artifact**: `index.html` inlines CSS + loads `app.js`, `app/nav.js`, `app/theme.js`, `app/threejs/states.js` — no bundler
- **Theme system**: Light (Carbon Ivory) + Dark (Graphite) via `data-theme` attribute, persisted in `localStorage`; `app/theme.js` injects fonts async
- **CSP**: Defined in `config/security.json` — served as an HTTP header by the test server and embedded as a `<meta http-equiv>` tag on every page for production (GitHub Pages cannot set headers); the meta variant omits `frame-ancestors`, which browsers ignore in meta delivery
- **Motion**: Three.js + GSAP fully gated by `prefers-reduced-motion` — falls back to static scene, never blank
- **Mobile-first**: `100dvh` units, safe-area insets, `viewport-fit=cover`, debounced resize (150ms), 44px touch targets
- **Print-safe**: Hierarchy and legibility preserved when printed to PDF

---

## Coding Conventions
- **Commits**: Conventional-ish (`feat:`, `fix:`, `chore:`, `polish:`) — see git log
- **CSP**: Single source in `config/security.json` (header + meta variants); never hardcode policies in HTML
- **Evidence**: Never fabricate employers, certs, protocols, dates, or skill taxonomy (see docs/PRODUCT.md §41)
- **Motion**: Always respect `prefers-reduced-motion`; content never gated on animation
- **Accessibility**: WCAG AA target; ≥4.5:1 body, ≥3:1 large text; keyboard-reachable; no hue-alone encoding
- **No framework patterns**: No React/Vue/Svelte idioms; vanilla DOM, event delegation, CSS custom properties

---

## Notable Constraints (from docs/PRODUCT.md)
1. **Topology as material** — visual system (hub nodes, signal trails, cross-connections) IS the argument
2. **Carrier-grade composure** — restraint over performance; motion enhances, never shouts
3. **Proof over adjectives** — specificity (years, employers, certs, protocols) carries the page
4. **One self-contained artifact** — portable, forwardable, no build step to break in transit
5. **Single accent discipline** — terracotta ≈≤10% surface; rarity is its strength

---

## Deployment
- **Platform**: GitHub Pages (publishes `main` branch automatically)
- **Domain**: `rahid.persipico.com` (CNAME configured)
- **Contact form**: Formspree endpoint in `config/security.json` CSP (`connect-src`, `form-action`)
- **Systemd service** (optional): Runs on port 2080 — see README.md for setup

---

## Quick Reference
- **Live URL**: https://lianbeast.github.io/resume-website/
- **Canonical**: https://rahid.persipico.com
- **LinkedIn**: https://linkedin.com/in/syedrahidahmed
- **Formspree**: https://formspree.io/f/mdekbpja
