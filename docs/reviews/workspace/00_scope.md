# Code Review Scope

## Project
Career-Site — static personal resume/portfolio site for Syed Rahid Ahmed (Sr. Switch Technician, Telecom Operations).

## Files Under Review
- `index.html` — Main single-page site (~3200 lines). Contains:
  - Inline CSS (~1670 lines): design tokens, glassmorphism, responsive, print styles, animations
  - HTML: hero, stats, about, experience timeline, skills constellation, education/certs, contact form
  - Inline JS (~900 lines): Three.js US map scene, skill ring canvas, GSAP scroll animations, nav/theme handlers, form validation
- `thank-you.html` — Form submission confirmation page (~166 lines)
- `netlify.toml` — Netlify deployment config with security headers
- `style.css` — Unused style selector fragment (not linked from index.html)

## Stack
- Vanilla HTML/CSS/JS (no build step)
- Three.js r128 (CDN) — 3D US map with career path
- GSAP 3.12.5 + ScrollTrigger (CDN) — scroll animations
- Google Fonts (Outfit + JetBrains Mono)
- Netlify Forms for contact form submission

## Key Context
- Site is live at syedrahidahmed.com
- Single-page design with inline everything (no external CSS/JS files except CDN deps)
- Recent session fixes: missing SKILLS array, duplicate init call, stray brace, fallback visibility
