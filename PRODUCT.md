# Product

## Register

brand

## Users

Recruiters and hiring managers sourcing a Senior Network & Telecom Consultant. They scan fast — seconds to decide "worth a call?" — looking for proof of seniority, scope, and credentials. Context: opened from a job board, LinkedIn, or a forwarded link, often between meetings on a laptop. What they need to confirm in one pass: 15+ years in carrier/enterprise telecom, hands on Cisco/Nokia/Ericsson, RAN (GSM/UMTS/LTE) + VoLTE core protocols, currently at T-Mobile. The job to be done: shorten their screening effort to a confident yes.

Secondary: a recruiter who forwards the link to a hiring manager, so the page must travel well (clean metadata, one self-contained file).

## Product Purpose

A single-page personal career site for Syed Rahid Ahmed that converts recruiter attention into a hiring conversation. Success = the visitor reaches the contact section with enough trust to click "Get in Touch" or copy the email. It is a portfolio in the brand register: the design itself signals the same precision and engineering discipline the work does — methodical, hardware-grounded, carrier-grade. Existence justification: a resume is a list; this site is the argument.

## Brand Personality

Authoritative, industrious, precise. Voice mirrors the work: methodical like a config, grounded like hardware, reliable like carrier uptime. Three-word personality: AUTHORITATIVE · INDUSTRIAL · PRECISE. Emotional goal — quiet confidence earned through 15+ years, not asserted. Never flashy, never vague, never "passionate" (show it, don't claim it).

Anti-jargon voice rules (from brand-guidelines): avoid synergy, seamless, leverage (as verb), revolutionary, rockstar/ninja, passionate.

## Anti-references

- Generic SaaS "expert" landing pages — hero-metric template (big number, small label, gradient accent), cream/sand warm-neutral backgrounds, identical icon-card grids. Reads as AI default, not a person.
- Tech-bro portfolio maximalism — neon gradients, gradient-text headings, glass cards everywhere, scrolljacking that disorients a 5-second recruiter skim.
- Corporate-flat recruiter bait — stock iconography, " Areas of Expertise" card grids, Inter-only typography, no texture or material presence.
- Resume-as-PDF rendered to HTML — bullet lists, no argument, no craft.

## Design Principles

1. **Show, don't tell** — proof (years, employers, certs, protocols named with specificity) carries the page, not adjectives. "15+ years" and "SS7/SIGTRAN" do the work "passionate" can't.
2. **Carrier-grade composure** — visual restraint that reads as reliability. Motion enhances, never performs; the page never shouts. A recruiter trusts a calm surface the way they'd trust a stable network.
3. **Hardware has a body** — material presence (alloy, graphite, metallic warmth) signals the work is physical and engineered, not abstract web-app work. Texture and Three.js topology earn their place by resembling the domain.
4. **Skimmable in 8 seconds** — hierarchy serves the recruiter's scan, not the designer's portfolio. Lead with name + title + the one number (15+ years); let depth reward those who scroll.
5. **One self-contained file** — the site is its own artifact: portable, forwardable, no build step to break in transit. Craft within that constraint, not despite it.

## Accessibility & Inclusion

WCAG AA target. Body text ≥4.5:1 contrast; large text ≥3:1. All motion has a `prefers-reduced-motion` path — crossfade or instant, never gate content on animation (Three.js/GSAP fall back to a calm static scene, not a blank canvas). Keyboard-reachable interactive elements (skill ring hover tooltips, contact). No hue-alone encoding. No special-user accommodations beyond these defaults.

## Palette Note (for DESIGN.md)

Token drift unresolved here: `design-tokens.css` + `index.html` meta carry the prior "Ivory & Ink" system (gold #c9950c / ivory #f7f5f0); `docs/brand-guidelines.md` v2.0 (2026-07-01) declares "Solar Graphite" (terracotta #c2410c / carbon ivory #b8b2ab / deep teal #0e7490). Reconciliation belongs in DESIGN.md via `/impeccable document` — capture the live visual system, flag the drift, resolve which is canonical there. PRODUCT.md stays palette-agnostic.
