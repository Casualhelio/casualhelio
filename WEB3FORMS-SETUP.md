# Contact-form spam protection (Web3Forms + hCaptcha)

The contact form (`contact.html`) posts to **Web3Forms**, which emails each
submission to the account that owns the `access_key`. Because the site is fully
static (no backend), a third-party handler like this is required.

## What's implemented (free — already in the code)

**Zero-config hCaptcha** is wired into the form. It needs **no account, no keys,
and no paid plan** — Web3Forms injects its own managed hCaptcha site key and
validates the token server-side. A bot that skips the captcha gets rejected.

Implemented in:
- `contact.html` — `<div class="h-captcha" data-captcha="true">` above the submit
  button + `<script src="https://web3forms.com/client/script.js">` before `</body>`.
  The existing `js/contact-form.js` handler is unchanged: `FormData` automatically
  includes the `h-captcha-response` token, which Web3Forms verifies.
- **CSP** — `https://web3forms.com`, `https://hcaptcha.com`, `https://*.hcaptcha.com`
  added to `script-src` / `connect-src` / `frame-src` in the `<meta>` (contact.html),
  the HTTP headers (`.htaccess`, `_headers`, `vercel.json`), and the `components.js`
  fallback. Verified rendering with **zero CSP violations**.

> On `localhost` hCaptcha shows a yellow "localhost detected" warning — that is
> expected and disappears on the real `nest.mn` domain.

Combined with the existing honeypot field, this stops the large majority of spam
at **$0**.

## Free vs. Pro — the facts (verified June 2026)

| Feature | Plan |
|---|---|
| Submit endpoint, 250 submissions/mo, 30-day storage, honeypot, custom redirect | **Free** |
| **hCaptcha captcha** (incl. zero-config, no keys) — *what we used* | **Free** |
| **Domain / "Restrict to Domain" restriction** | **Pro (paid)** |
| Programmatic submission-retrieval **API**, webhooks, file uploads | **Pro (paid)** |

Notes:
- The form only uses the **free submit endpoint** (`api.web3forms.com/submit`).
  The Pro "API access" (pulling submissions into another app) is **not needed**.
- "Lock the key to nest.mn" requires **Pro**. We skipped it — and it matters less
  than captcha anyway, since origin/domain checks are spoofable by non-browser
  clients while a verified captcha token is not.

## Optional follow-ups (your call, not required)

1. **Own the account (free).** Sign up at https://web3forms.com with the email
   where you want submissions delivered, then confirm the `access_key` in
   `contact.html` line 204 (`684f67e5-…`) belongs to **your** account — so you
   control the delivery inbox and can rotate the key if it's ever abused.
   *(First, just submit a test message and check the key already delivers to the
   right inbox; if it does, there may be nothing to change.)*
2. **Pro domain restriction** — only if you subscribe; then set Allowed Domains
   to `nest.mn, www.nest.mn` in the dashboard. Otherwise ignore.
