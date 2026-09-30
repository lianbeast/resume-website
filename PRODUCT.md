# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters and hiring managers sourcing a Sr. Switch Technician (Telecom Operations & RAN/Transport Specialist). They scan fast — seconds to decide "worth a call?" — looking for proof of seniority, scope, and credentials. Context: opened from a job board, LinkedIn, or a forwarded link, often between meetings on a laptop. What they need to confirm in one pass: 15+ years across T-Mobile/Sprint, switch facility operations, 5G NR/LTE RAN/transport, Cisco/Nokia/Ericsson, CCNA-certified. The job to be done: shorten their screening effort to a confident yes.

Secondary: a recruiter who forwards the link to a hiring manager, so the page must travel well (clean metadata, one self-contained file).

## Product Purpose

A single-page personal career site for Syed Rahid Ahmed that converts recruiter attention into a hiring conversation. Success = the visitor reaches the contact section with enough trust to click "Get in Touch" or copy the email. It is a portfolio in the brand register: the design itself signals the same precision and engineering discipline the work does — methodical, hardware-grounded, carrier-grade. Existence justification: a resume is a list; this site is the argument.

## Positioning

The only personal career site where the visual argument *is* the professional argument: the topology visualizations (Three.js career map + skill ring) are not decoration — they are the proof that this person thinks in networks. Graphite nodes, terracotta signal trails, ink clarity. The composure of carrier-grade uptime, not the flash of a product launch. No neighboring resume site uses the actual domain metaphors (hub topology, cross-category skill links, data-packet flows) as the design system itself.

## Operating Context

- **Entry points**: LinkedIn profile link, job-board application, forwarded email, direct URL.
- **Scan time**: 8–15 seconds for initial impression; depth rewarded on scroll.
- **Co-occurring tools**: ATS preview pane, side-by-side with LinkedIn, printed to PDF by recruiter for hiring packet.
- **Environments**: Desktop browser (primary), mobile browser (secondary). No app, no extension.
- **Rituals**: Recruiter opens, scrolls once, either forwards or closes. The page must survive print-to-PDF without losing hierarchy or legibility.

## Capabilities and Constraints

- **Single self-contained file**: `index.html` + inline CSS + `app.js` + `nav.js` + `theme.js` + `states.js`. No build step, no bundler, no framework.
- **Deploy**: GitHub Pages publishes the `main` branch; `netlify.toml` keeps the headers/CSP configuration from the earlier Netlify hosting.
- **Form backend**: Formspree (`https://formspree.io/f/mdekbpja`) with client-side validation in `app.js` and a honeypot field.
- **Motion**: Three.js + GSAP, fully gated by `prefers-reduced-motion` (falls back to static scene, not blank).
- **Themes**: Light (Carbon Ivory) + Dark (Graphite) via `data-theme` attribute, persisted in localStorage.
- **Typography**: Outfit (display/body) + JetBrains Mono (labels, tags, technical tokens). No third typeface.
- **Palette**: Burnt Terracotta primary (#c2410c), Deep Teal secondary (#0e7490), Olive tertiary (#4d7c0f). Two true themes flip the substrate.
- **Assets**: Demo video (GIF/MP4), OG image, design tokens (CSS + JSON), resume PDF, standalone skill wheel (`wheel-v2.html`).
- **Evidence that must not be fabricated**: Specific protocols (SS7/SIGTRAN), employer names (T-Mobile, Sprint, AtoZIT), certs (CCNA, CompTIA A+, Network+), dates, locations, skill taxonomy.

## Brand Commitments

- **Name**: Syed Rahid Ahmed
- **Voice**: Authoritative · Industrial · Precise — methodical like a config, grounded like hardware, reliable like carrier uptime.
- **Anti-jargon**: avoid synergy, seamless, leverage (as verb), revolutionary, rockstar/ninja, passionate.
- **Identity**: SR monogram (alloy bg, amber text), hero name in Outfit 700.

## Evidence on Hand

| Asset | Path | Notes |
|---|---|---|
| Demo GIF | `assets/demo/demo.gif` | 800px wide, embedded in README |
| Demo MP4 | `assets/demo/demo.mp4` | Full-quality walkthrough |
| Preview pages | `immersive-preview.html`, `bold-resume-preview.html`, `resume-preview.html` | Separately published design treatments; `noindex` |
| OG image | `assets/og-image.png` | Social preview |
| Design tokens (CSS) | `assets/design-tokens.css` | `:root` + dark theme |
| Design tokens (JSON) | `assets/design-tokens.json` | Machine-readable |
| Brand guidelines v3.0 | `docs/brand-guidelines.md` | Solar Graphite Evolution |
| Resume PDF | `SRA-Resume-072926.pdf` | Dated version; `SRA-Resume.pdf` alias |
| Resume alias | `SRA-Resume.pdf` | Netlify header + nav/footer links |
| Architecture specs | `docs/superpowers/specs/` | Hosting design + US map design |

Absences that future work must not fabricate: testimonials, client logos, case studies, pricing, licensing, deployment claims beyond "hosted on Netlify".

## Product Principles

1. **Topology as material** — the visual system (hub nodes, signal trails, cross-connections) is the argument that this person thinks in networks; it is not garnish.
2. **Carrier-grade composure** — restraint over performance; motion enhances, never shouts; a recruiter trusts a calm surface the way they'd trust a stable network.
3. **Proof over adjectives** — specificity (years, employers, certs, protocols) carries the page; "15+ years" and "SS7/SIGTRAN" do the work "passionate" can't.
4. **One self-contained artifact** — portable, forwardable, no build step to break in transit; craft within that constraint.
5. **Single accent discipline** — terracotta is the primary saturated color (≲10% surface); rarity is its strength.

## Accessibility & Inclusion

WCAG AA target. Body text ≥4.5:1 contrast; large text ≥3:1. All motion has a `prefers-reduced-motion` path — crossfade or instant, never gate content on animation (Three.js/GSAP fall back to a calm static scene, not a blank canvas). Keyboard-reachable interactive elements (skill ring hover tooltips, contact form). No hue-alone encoding. No special-user accommodations beyond these defaults.