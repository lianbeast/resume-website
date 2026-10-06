# Career Site

Static personal website for **Syed Rahid Ahmed** — Sr. Switch Technician,
Telecom Operations & RAN/Transport.

**Live:** <https://rahid.persipico.com>
**Mirror (GitHub Pages):** <https://lianbeast.github.io/resume-website/>

## Experience tiers

The site ships the same resume at three levels of hardware demand. A switcher
(bottom-left on desktop, in-flow at the end of the page on mobile) lets a visitor
pick, remembers the choice, and marks whichever tier suits their device.

| Tier | Page | Loads | For |
|---|---|---|---|
| **Lite** | `lite.html` | **No JavaScript at all** — no Three.js, no GSAP, no CDN, no web fonts. One HTML request plus one cached SVG map. | low-end PCs, slow links, constrained devices |
| **Standard** | `index.html` | CSS + light JS, Three.js US-map hero | most machines |
| **Immersive** | `immersive-preview.html` | Full 3D: extruded lower-48, camera flies city-to-city along the career path | high-end PCs |

### Standard-tier extras

| Page | Purpose |
|---|---|
| `bold-resume-preview.html` | Alternative bold editorial layout |
| `wheel-v2.html` | Standalone 3D skill wheel (search, pause, list fallback) |
| `thank-you.html` | Contact form confirmation page |

## The map

Both the Three.js tiers and the Lite tier describe the same country: career stops
sit at real longitude/latitude, projected with the same constants
(`MAP_CX -98`, `MAP_CY 39.5`). `scripts/build-us-map-svg.py` bakes that projection
into `assets/us-map.svg` ahead of time so the Lite tier needs no geometry script.
Re-run it if the projection constants change — it also prints the percentage pin
positions baked into `lite.html`.

## Local development

```bash
npm run dev        # serve on http://localhost:8080
```

No build step. The site is plain HTML/CSS/JS served straight from the repo root.

## Tests

```bash
npm install                # puppeteer-core + chrome-launcher are needed by the suite
node scripts/restore.test.cjs      # index, lite, thank-you
node scripts/immersive.test.cjs    # immersive 3D tier
node scripts/bold-resume.test.cjs  # bold layout
```

They drive a real Chrome via CDP: runtime errors, horizontal overflow at 390/768/1440,
the skill wheel, reduced-motion and blocked-CDN fallbacks, print styles, no-JS
rendering, and contact-form submission. Formspree requests are intercepted locally —
**no real messages are ever sent**.

## Deployment

GitHub Pages publishes `main` automatically. The contact form posts to Formspree
(`https://formspree.io/f/mdekbpja`); the allowed origins live in
`config.json` under `Content-Security-Policy`.
