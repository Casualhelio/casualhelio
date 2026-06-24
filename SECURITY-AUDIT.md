# Security Audit — nest.mn

- **Date:** 2026-06-24
- **Scope:** Full static website + client-side JS (`index/about/companies/contact/investor-relations/news/article/404`, `js/*`, `css/*`), deploy config (`.cpanel.yml`, `.htaccess`, `_headers`, `vercel.json`), secret hygiene (git history + working tree), Sanity CMS integration, and the Web3Forms contact form.
- **Type:** Defensive review of the owner's own site (static HTML/JS on cPanel/Apache; CMS = Sanity public read-only dataset; forms = Web3Forms).
- **Verdict:** **No critical/high vulnerabilities found.** The site was already well-hardened. Applied defense-in-depth header improvements and documented configuration recommendations.

---

## Findings summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | CSP enforced only via `<meta>` (cannot set `frame-ancestors`); not present as HTTP header | Medium (hardening) | **Fixed** |
| 2 | `X-Permitted-Cross-Domain-Policies` missing from `.htaccess` (the production Apache config) | Low | **Fixed** |
| 3 | Web3Forms `access_key` is public in `contact.html` | Low (by design) | Recommendation (dashboard) |
| 4 | On-page editor (`js/edit-mode.js`) ships to production on every page | Low (gated, not exploitable) | Accepted / noted |
| 5 | Google Fonts CSS loaded without SRI | Informational | Accepted (constrained by CSP) |

---

## What was already secure (verified, no change needed)

- **Secret hygiene — clean.** `deploy_key` / `deploy_key.pub` / `*.pem` / `.env` are **never committed** (verified across full git history) and are correctly listed in `.gitignore`. No API tokens, passwords, or private keys found in history or working tree.
- **Deploy whitelist.** `.cpanel.yml` copies only production files (`css/`, `js/`, `assets/`, and an explicit HTML/robots/sitemap/.htaccess list). Dev/source files (`*.DOCX`, `*.csv`, `*.ps1`, `sanity-studio/`, `website2/`, `test.js`, `edit.html`, `admin-translations.html`, `index-alt.html`) are **not deployed**.
- **Sensitive-file blocking.** `.htaccess` denies `*.ps1 *.py *.csv *.md *.log` and `test/edit/index-alt/admin-translations.{js,html}` even if they were ever uploaded — defense in depth.
- **Transport security.** HTTPS forced via 301 redirect; `Strict-Transport-Security: max-age=31536000; includeSubDomains`; `upgrade-insecure-requests` in CSP.
- **Existing security headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/FLoC disabled), `Cross-Origin-Opener-Policy: same-origin`.
- **Strong baseline CSP `<meta>`** on every deployed page: `default-src 'self'`, `script-src 'self'` (**no `unsafe-inline`**), `object-src 'none'`, `base-uri 'self'`, restricted `connect-src`/`form-action`/`frame-src`. Confirmed **no inline `<script>` blocks and no `on*=` event handlers** in any deployed page, so strict `script-src 'self'` does not break anything.
- **XSS-safe CMS rendering.** `sanityBlocksToHTML()` escapes all text via `escapeHTML()`; news/home cards escape `title`/`excerpt` before interpolation; image URLs come from `urlForSanityImage()` which **strictly regex-validates** the asset ref (`^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$`).
- **No GROQ injection.** `article.js` validates the `?id=` URL param against `^[a-zA-Z0-9_-]+$` *before* interpolating it into the GROQ query. Article IDs in links are validated (`safeArticleId`) and `encodeURIComponent`-encoded.
- **Sanity exposure is benign.** Only the public `projectId`/`dataset` are shipped (required for client-side reads); no write/deploy token is present. The dataset is public read-only.
- **Safe form response handling.** `contact-form.js` writes server responses with `.textContent` (the only `innerHTML` write uses a static, trusted translation string).
- **External links** use `rel="noopener noreferrer"` + `target="_blank"`.
- **Clickjacking JS fallback** (frame-buster) present in `components.js` for legacy browsers.
- **No dangerous sinks:** no `eval`, `new Function`, or `document.write` anywhere in `js/`.

---

## Fixes applied

### 1. Promote CSP to an HTTP header + add `frame-ancestors` (Medium — hardening)
A `<meta>` CSP applies only after the parser reaches the tag and **silently ignores `frame-ancestors`**, so clickjacking was defended only by the (now deprecated-in-modern-browsers) `X-Frame-Options`. Added the **full CSP as an HTTP header** so it applies from the first byte, covers all response types, can't be stripped by injected markup, and enforces `frame-ancestors 'none'`.

- `.htaccess` (primary — cPanel/Apache): added `Header always set Content-Security-Policy "…; frame-ancestors 'none'; …"`.
- `_headers` (Netlify/Cloudflare) and `vercel.json`: same policy added for host parity.
- Policy mirrors the existing per-page `<meta>` (verified zero CSP violations in-browser), with `frame-ancestors 'none'` appended.

### 2. Add `X-Permitted-Cross-Domain-Policies: none` to `.htaccess` (Low)
Present in `_headers` but missing from the actual production Apache config. Added to `.htaccess` and `vercel.json` for parity (blocks Adobe Flash/PDF cross-domain policy abuse).

---

## Recommendations (no code change — owner/dashboard action)

1. **Web3Forms (`contact.html`)** — the `access_key` is necessarily public in client-side forms. In the Web3Forms dashboard: (a) **restrict the key to the `nest.mn` domain**, (b) **enable reCAPTCHA/hCaptcha**, and (c) enable rate limiting, to prevent spam/abuse. A honeypot (`botcheck`) is already in place. *(A TODO comment already notes this in `contact.html`.)*
2. **`js/edit-mode.js`** is gated behind `?edit=1` and is purely client-side (local file save via the File System Access API — no backend, cannot affect other visitors), so it is **not exploitable**. To minimize attack surface, consider excluding it from production builds and loading it only when editing.
3. **HSTS preload** — once you're confident all subdomains are HTTPS-only, consider adding `preload` to the `Strict-Transport-Security` header and submitting to the HSTS preload list.
4. **Dependency hygiene** — periodically run `npm audit` in `sanity-studio/` (the Studio is a dev tool, not deployed, but keep it patched).

---

## Files changed
- `.htaccess` — added `Content-Security-Policy` + `X-Permitted-Cross-Domain-Policies` HTTP headers.
- `_headers` — added `Content-Security-Policy` header.
- `vercel.json` — added `Content-Security-Policy` + `X-Permitted-Cross-Domain-Policies` headers.

*No application/JS code required changes — the client-side code was already XSS- and injection-safe.*
