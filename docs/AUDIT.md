# Website Audit — Syed Rahid Ahmed Career Site

Date: 2026-07-13

## Fixes applied this session

### 1. White text invisible on "Get in Touch" inputs (dark mode)
**Root cause:** Inputs had a hardcoded `background: rgba(254,253,251,0.75)` (near-white) while dark theme set `--text: #f0ede8` (light). Light text on light field = near-invisible.

**Fix:** Introduced a theme-aware token `--input-bg`:
- `:root` (light): `rgba(255,255,255,0.92)`
- `[data-theme="dark"]` + all style variants (solar-graphite, industrial-ochre): `rgba(30,28,26,0.85)` — body `--text` on dark surface, AA contrast restored.

Applied `background: var(--input-bg)` to `.form-group input, .form-group textarea`.
→ `ponytail:` use `--input-bg` only for text fields; if a new surface needs a similar fill, derive from `--bg-glass` not this token.

### 2. Form backend — Netlify Forms (production)
**Root cause:** `<form novalidate>` had no `action` and no submit handler — clicking "Send Message" only faked a success message, no data was sent anywhere.

**Fix:**
- Form attrs: `name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field"`.
- Hidden `form-name` input so Netlify can detect the form at build time.
- Honeypot `bot-field` positioned off-screen (`left:-9999px`) — bots fill it, humans don't; Netlify auto-discards spam. Screen-reader hidden via `aria-hidden` + `tabindex="-1"`.
- Submit handler now does a real `fetch('/', { method:'POST', body: URLSearchParams(FormData) })` to Netlify's built-in endpoint — no server code, no extra dependency.
- Success → form hides, success message shows with concrete copy ("I'll reply within two business days").
- Failure → button re-enables, error message directs to email.
- Email notifications + DB storage configured in **Netlify UI** (Site Settings → Forms → Notifications). Storage is the Netlify Forms dashboard (submissions retained 1 yr on free tier).

### 3. `netlify.toml` added
Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) + null build command (static site). Functions dir declared for future serverless use.

---

## Remaining suggestions (not yet applied)

### High priority
1. **Deploy to Netlify & enable notifications.** After first deploy, Site Settings → Forms → Form notifications → Add → Email → your address. Without this, submissions store in dashboard but don't email.
2. **Add an email link in the failure fallback.** Replace "Please email me directly" with an actual `mailto:` link.
3. **Spam protection beyond honeypot.** Enable Netlify reCAPTCHA (Forms → Settings) if spam volume grows. Honeypot alone catches most bots.

### Medium priority
4. **Verify contrast in all 3 style variants × 2 themes.** `--input-bg` is set per variant, but overall field-border contrast (`--border-glass`) on the dark surface should be checked with a WCAG tool (axe / Lighthouse).
5. **Responsive grid for the form.** Currently `.form-group` uses a 2-col grid on all widths. Add `@media (max-width:600px){ #contact form{ grid-template-columns:1fr } }` if it isn't already responsive.
6. **Pre-hydration theme flash.** Theme/style is set from `localStorage` inside an IIFE — confirm that script runs before first paint (currently in `<body>`, may flash). Move to `<head>` inline if flash is visible.
7. **`prefers-reduced-motion`.** Three.js topology + scroll reveals should respect `@media (prefers-reduced-motion: reduce)` — disable GSAP scrub and `reveal` opacity animations.

### Low priority
8. **Image lazy-loading.** Add `loading="lazy"` to any `<img>` (check assets/); Three.js canvases are JS so unaffected.
9. **Open Graph / meta tags.** Add `og:title`, `og:description`, `og:image` for link previews when shared.
10. **`robots.txt` + `sitemap.xml`.** For search indexing once deployed.
11. **Resume download tracking.** The `.nav-resume` resume link — consider a download CTA + optional analytics.

### Design-system notes
- The Impeccable hook flags 107 `rgba(201,149,12,*)` literals as "outside DESIGN.md palette." DESIGN.md specifies `#c2410c` = `rgb(194,65,12)` for terracotta. `201,149,12` is a *different, warmer* terracotta — possibly an earlier palette remnant. Worth verifying visually whether those shadows should align to the documented `rgba(194,65,12,*)`. Not a functional bug; flagged for the user to decide.

---

## How to deploy
1. Push repo to GitHub (or drag-drop folder into Netlify).
2. Netlify: New site from Git → pick repo → build command empty → publish dir `.`.
3. After first deploy: confirm "contact" form appears under Site → Forms. Send a test submission.
4. Configure email notification (UI step above).
