# Security Review — index.html + thank-you.html

**Date:** 2026-08-01
**Scope:** `index.html` (3246 lines), `thank-you.html` (166 lines), `netlify.toml`, `package.json`/`package-lock.json`
**Architecture:** Static site, no backend, no DB, no auth. Only server interaction is the Netlify Forms POST (`index.html:2929` → `/`). No user input is reflected back into DOM except through `textContent` (safe). No `innerHTML`/`eval`/`document.write`/`new Function` anywhere.

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| HIGH | 1 | #1 — Dependency: `9remote` install script |
| MEDIUM | 2 | #2 — Missing CSP, #3 — Spoofable form email reply-to |
| LOW | 5 | #4 — Stale-resume info disclosure, #5 — Weak Referrer-Policy, #6 — Netlify form abuse (limited), #7 — no Permissions-Policy (defense-in-depth), #8 — thank-you nav 404 |

**No findings on:** XSS (all dynamic output via `textContent`; no URL-param reflection; no `location`/`URLSearchParams` reads), SQL/command/template injection (no server-side code, no eval sinks), auth/authz (no auth surface — client-side checks only, all server-side validation is Netlify's), secrets (no API keys/tokens in either HTML file; `netlify.toml` has only a placeholder email comment).

---

## HIGH

### #1 — Dependency: `9remote` package ships a binary install script in a deploy with zero server code

* **File:** `package.json:3`, `package-lock.json:548-580`
* **Severity:** HIGH
* **Category:** dependency CVE / supply chain
* **CVSS-style:** 8.1 (AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:N)
* **Description:** `package.json` declares `9remote@^2.0.82` as the **only** dependency. The lockfile pins `node_modules/9remote 2.0.82` with `"hasInstallScript": true` (`package-lock.json:551`) and installs the tarball as `dist/cli.cjs` (line 580). `9remote` is a full remote-desktop / RAT-oriented CLI: its transitive deps include `socket.io`, `node-datachannel`, `node-pty@1.2.0-beta.12` (PTY spawner, also `hasInstallScript`), `web-push`, `edge-tts-node`, `node-screenshots`, `sharp`. A static resume site has no use for any of these.
* **Exploit scenario:** This is a client/CLI package — likely leftover from a previous project (or an accidental `npm init -y` copy). If the Netlify build ever runs `npm install` (`netlify.toml` currently uses a `echo` no-op build, so it won't today), the `9remote` install script executes arbitrary code in the CI/build environment. `9remote`'s API surface (RDP/screen capture, audio, PTY) means a compromised or typosquatted `9remote` release gains screen capture + remote shell on the build host, and any npm token in that environment leaks. Even without a build hook, it's a dormant supply-chain risk: the moment someone wires a real build step, the poison loads.
* **Recommendation:** Delete `9remote` from `package.json` and delete `package.json` + `package-lock.json` entirely if nothing in the site build consumes them (the site is zero-build: `netlify.toml:2`). If a dependency truly is needed, re-scope it to a build-time `devDependencies` and pin exact versions.
* **Confidence:** 9/10. Install-script presence is verified from the lockfile; exploitability is gated on the build actually running `npm install`, hence not CRITICAL.

---

## MEDIUM

### #2 — No Content-Security-Policy header; CDN scripts exempt from a page-level policy

* **File:** `netlify.toml:8-13` (headers block), `index.html:61-71` (CDN script tags)
* **Severity:** MEDIUM
* **Category:** defense-in-depth / XSS mitigation
* **CVSS-style:** 5.3 (AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N)
* **Description:** `netlify.toml` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` but no `Content-Security-Policy`. Both pages rely on inline `<script>` blocks (anti-FOUC init, form JS, nav/theme handlers), which a CSP with `'unsafe-inline'` would already weaken — but the biggest gap is that a compromised `cdnjs.cloudflare.com` (or a MITM on it) would inject script at full privilege: there is no `script-src` restriction. This is the single highest-leverage hardening step for a site that otherwise has no XSS sink.
* **Exploit scenario:** No active exploit today; the risk is conditional — if a stored/reflected XSS vector is ever introduced (or a future dependency like the reCAPTCHA widget the form already references — `index.html:2069` `data-netlify-recaptcha="true"` — loads third-party script), the CSP absence means it executes unimpeded.
* **Recommendation:** Add to `netlify.toml` headers: `Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"`. Verify the Netlify Forms POST to `/` still passes `form-action 'self'` (same-origin POST — it does).
* **Confidence:** 9/10 that the gap exists; exploit requires a future XSS sink, hence MEDIUM.

### #3 — Contact form lets attacker set `name`, `email`, `subject`, `message`; email notifications are spoofable, no rate limiting on submissions

* **File:** `index.html:2069-2096` (form), `2927-2945` (JS POST)
* **Severity:** MEDIUM
* **Category:** input validation / data integrity
* **CVSS-style:** 5.0 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N)
* **Description:** The form fields `name`, `email`, `subject`, `message` are unconstrained (`required` only, no `maxlength`, no server-side validation) and POSTed to Netlify Forms (`/`, `form-name=contact`). Netlify Forms forwards submissions to the site owner's email. Anyone can POST forged submissions (client validation is trivially bypassed — the JS validator at 2902-2922 is purely cosmetic) with a fabricated `email` header, enabling spam/phishing delivered **from the site owner's own domain's notification pipeline**. There is no rate limiting (inherent to Netlify Forms free tier) and no server-side length/sanitization control.
* **Exploit scenario:** Automated script POSTs `name=<script>…</script>&email=victim@corp.com&subject=Urgent&message=…` — the site owner receives a phishing email apparently from a known contact's address; the `name` field content reaches an inbox with no sanitization guarantee. The honeypot (`index.html:2071`, `bot-field`) and `data-netlify-recaptcha="true"` (2069) mitigate naive bots but the reCAPTCHA is **not enforced client-side** (no sitekey script, no token) — the attribute alone does nothing without the reCAPTCHA widget.
* **Recommendation:** (a) Enforce real reCAPTCHA or a server-side function (Netlify Functions — `netlify.toml:3` already declares `functions = "netlify/functions"`) that validates submission rate + field lengths; (b) add `maxlength` on all inputs (`name` 100, `subject` 200, `message` 4000) and mirror in a server function; (c) configure the Netlify email notification `Reply-To`/`from` so the `email` field cannot impersonate senders.
* **Confidence:** 8/10. Form reachability + absence of server-side validation confirmed; the email-notification pipeline itself is Netlify-managed (behavior standard, impact real).

---

## LOW

### #4 — Stale resume content accessible on live domain (information disclosure)

* **File:** `thank-you.html:147` (nav), repo root `SRA_Resume_2026.docx`, `SRA_Resume_021726.docx`, `SRA_Resume_REWRITTEN.docx`
* **Severity:** LOW
* **Category:** data exposure
* **CVSS-style:** 2.6 (AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)
* **Description:** `thank-you.html:147` links `SRA_Resume_2026.docx` while index links the current `SRA-Resume-072926.pdf`. Four resume files (`.docx`/`.pdf`) are served from the domain root with no auth. Stale resumes carry outdated employer/role/dates.
* **Recommendation:** Point thank-you's nav to `SRA-Resume-072926.pdf`; delete the four stale resume artifacts from the deploy.
* **Confidence:** 8/10 (existence), low impact.

### #5 — Referrer-Policy weaker than needed for a public site

* **File:** `netlify.toml:13`
* **Severity:** LOW
* **Category:** defense-in-depth (data leakage)
* **CVSS-style:** 1.9 (AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:L)
* **Description:** `Referrer-Policy: strict-origin-when-cross-origin` leaks the full origin on cross-origin. For a personal site the only outbound link is LinkedIn (`index.html:2106`), which gets the origin — harmless. `no-referrer` or `same-origin` would be strictly tighter.
* **Recommendation:** Change to `same-origin` (drop query-string leakage entirely; no legit cross-origin referrer need).
* **Confidence:** 10/10 it's looser than necessary; low impact.

### #6 — Netlify Forms abuse: forged `form-name`, no server-side whitelist

* **File:** `index.html:2928` (`data.append('form-name', 'contact')`)
* **Severity:** LOW
* **Category:** input validation
* **CVSS-style:** 3.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N)
* **Description:** The `form-name` field is set client-side. Netlify Forms matches it against registered forms; an attacker posting to `/` with arbitrary `form-name` values could hit other registered forms on the same site if any exist. With a single form it's benign.
* **Recommendation:** Covered by #3's server-side function (validate form-name whitelist).
* **Confidence:** 7/10.

### #7 — No Permissions-Policy / COOP / CORP headers

* **File:** `netlify.toml:8-13`
* **Severity:** LOW
* **Category:** defense-in-depth
* **CVSS-style:** n/a
* **Description:** `frame-ancestors` is implicitly covered by `X-Frame-Options: DENY`, but `Permissions-Policy` (camera/mic/geolocation) and `Cross-Origin-Opener-Policy` are absent. Low value for a static page with no embedded features.
* **Recommendation:** Add `Permissions-Policy = "camera=(), microphone=(), geolocation=(), usb=()"` to the headers block.
* **Confidence:** 10/10 absence confirmed; exploit value negligible.

### #8 — thank-you page nav "Resume" link is 404-on-deploy risk (broken reference, mirrors #4)

* **File:** `thank-you.html:147`
* **Severity:** LOW
* **Category:** availability/reference integrity (non-security in effect)
* **CVSS-style:** n/a
* **Description:** Points at `SRA_Resume_2026.docx`; index points at `SRA-Resume-072926.pdf`. If stale `.docx` files are pruned from the deploy (per #4), the thank-you nav link 404s.
* **Recommendation:** Same as #4 — unify on `SRA-Resume-072926.pdf`.
* **Confidence:** 9/10.

---

## Explicitly Checked, No Finding

| Area | Result |
|------|--------|
| **XSS (reflected/stored/DOM)** | No `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`, `eval`, `new Function`. All dynamic output uses `textContent` (`index.html:2464-2466`, `2850-2851`, `3072`) — DOM-API safe. No reads of `location`/`URLSearchParams`/`document.cookie`; no URL-param reflection. No user input reaches HTML/attribute context. |
| **XSS via form → thank-you** | Thank-you page (`thank-you.html`) is fully static — renders no submitted data; nothing reflected from query string. No GET params consumed anywhere. |
| **SQL / command / template / NoSQL injection** | No backend, no DB, no shell calls, no templating engine. `netlify/functions/` directory declared in `netlify.toml:3` but **does not exist** — no server code in repo. |
| **Auth / authz** | No auth surface. All validation is client-side (302-2922) and correctly treated as untrusted by the design (server = Netlify). Client-side absence of permission checks is not a vulnerability (per review precedent #8). |
| **Secrets** | No API keys/tokens/passwords in either HTML file. `netlify.toml:17` comment has only a placeholder address (`your@email.com`). `.env`/`*.env` gitignored. |
| **Crypto** | No cryptography in use. SRI (`integrity=`) present and pinned for all 3 CDN scripts (`index.html:62,67,70`); `crossorigin="anonymous"` correct for SRI. No weak-crypto code paths. |
| **CDN supply chain** | `three.js r128`, `gsap 3.12.5`, `ScrollTrigger 3.12.5` pinned with SRI — adequate. Main residual risk is absent CSP (#2). |
| **Clickjacking** | `X-Frame-Options: DENY` present (`netlify.toml:11`). |
| **Tabnabbing** | Only `target="_blank"` link (`index.html:2106`) has `rel="noopener noreferrer"`. |
| **Honeypot / bot mitigation** | Honeypot field present (`index.html:2071`); `data-netlify-recaptcha` attribute present but reCAPTCHA not actually wired (no widget/sitekey) — flagged inside #3. |
| **LocalStorage** | Only theme/style prefs (`index.html:1674,3178-3186,3222-3226`; `thank-you.html:129`), all wrapped in try/catch. Not security-relevant (no sensitive data, no JSON parse of untrusted). |
| **Privacy (PII)** | Form fields are the user's own submission — owner-side PII exposure is the user's own resume (public by design). |
| **Dependency CVEs** | Only `9remote`'s tree (#1). Versions of transitive deps (`sharp 0.33.5`, `socket.io 4.8.3`, `chokidar 3.6.0`) are current; no known-CVSS issue in the used set beyond the supply-chain/install-script concern. |

---

## Recommended Fix Order

1. **Delete `9remote`** (and both `package.json`/`package-lock.json` if the site has no build) — removes the only HIGH.
2. **Add CSP** to `netlify.toml` (#2) — highest-leverage hardening.
3. **Server-side form guard** via Netlify Function or real reCAPTCHA + `maxlength`s (#3, #6).
4. **Unify resume links** to `SRA-Resume-072926.pdf`, delete stale `.docx`s (#4, #8).
5. Tighter `Referrer-Policy`, add `Permissions-Policy` (#5, #7).
