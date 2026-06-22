# Deploy Checklist — Nest Group Website

## What to upload to your web host

### Required files & folders
```
404.html
about.html
article.html
companies.html
contact.html
index.html
investor-relations.html
news.html
robots.txt
sitemap.xml

assets/          ← all images, video, PDFs
css/             ← all stylesheets
js/              ← all scripts

_headers         ← security + cache headers (Netlify / Cloudflare Pages)
vercel.json      ← security + cache headers (Vercel)
.htaccess        ← security + cache headers (Apache / cPanel)
```
Upload all three header files — each host only reads the one that applies to it
and ignores the others, so they are safe to keep together.

### Do NOT upload (already excluded by .gitignore)
- `node_modules/` and `sanity-studio/node_modules/`
- `sanity-studio/` source (Sanity Studio is hosted separately at https://nest-group.sanity.studio/)
- `excel_parser/`, `*.ps1`, `test*.js`, `test_excel.py`
- `excel_content.txt`, `excel_math.txt`, `cleaned_map.txt`, `extracted_paths.txt`
- `index-alt.html`, `admin-translations.html`, `edit.html`, `css/styles-alt.css`
- `world.svg`, `map_new.svg`, `countries.geo.json` (unused experiments)
- `translations_active.csv`, `translations_latest.csv` (translation pipeline only)
- `package.json`, `package-lock.json` (Node only — not needed in production)

## Editing site text yourself (no developer needed)

All fixed wording (headings, buttons, paragraphs, menu) lives in `js/translations.js`
across English / Mongolian / Japanese. You can edit it visually:

1. Open **`edit.html`** (double-click it, or browse to it on a local server) and pick a page.
   The page opens with a navy editor toolbar at the top.
2. **Click any text and type.** Use the **EN / MN / JA** buttons to edit each language.
3. Click **💾 Save**:
   - In **Chrome/Edge over a local web address** (`http://localhost…`) Save writes straight
     to `translations.js`.
   - Otherwise it **downloads** a new `translations.js` — replace the one in your `js/`
     folder with it.
4. **Upload the updated `js/translations.js`** to your host (same place you publish the site).

Notes:
- The editor (`js/edit-mode.js`) is inert unless a URL has `?edit=1`, so it's harmless in
  production, but keep **`edit.html` off the public server** (it's in the “Do NOT upload” list).
- It cannot change the live site by itself — it only produces the file you re-upload.
- After uploading, hard-refresh (`Ctrl+Shift+R`) to see changes. For changes to appear for
  all visitors immediately, bump the `?v=NN` cache version on `translations.js` (see below);
  otherwise they show up once each visitor's browser cache refreshes.
- News **articles** are edited separately in Sanity (see below).

## Hosting

The site is **fully static** — no Node.js or build step required at deploy time.

Recommended hosts:
- **Netlify / Vercel** — drag-and-drop the project root (the `.gitignore` keeps dev files out of the deploy)
- **Cloudflare Pages** — connect a Git repo; framework preset = "None"; build command = empty
- **GitHub Pages** — push to `gh-pages` branch
- **Traditional shared hosting** (cPanel) — upload via SFTP/FTP

## Domain setup

1. Point DNS A/CNAME records to your host
2. Update the canonical URLs if your domain differs from `https://nest.mn/` — search for `nest.mn` across HTML files if you change it
3. Add HTTPS (most hosts auto-provision via Let's Encrypt)

## Sanity Studio (CMS for News)

Already deployed at: **https://nest-group.sanity.studio/**

To re-deploy after schema changes:
```bash
cd sanity-studio
npx sanity deploy
```

## Cache-busting

Every page references CSS/JS with `?v=NN`, all kept at the **same** number so a returning
visitor never gets a stale copy of a shared file. The current version is **v=46**.
After making changes to anything in `js/` or `css/`, bump the version across all 8 HTML files
(replace `46` with the next number, e.g. `47`):
```bash
for f in index.html about.html companies.html contact.html investor-relations.html news.html article.html 404.html; do
  sed -i -E 's/\?v=[0-9]+/?v=47/g' "$f"
done
```

## Pre-deploy checks
- [ ] Open `index.html` locally — hero video plays, stats animate, news loads from Sanity
- [ ] Switch language EN → MN → JP — all sections update
- [ ] Click through every nav link
- [ ] Test the contact form (Web3Forms will email `info@nest.mn`)
- [ ] Open in Chrome DevTools mobile preview (375 × 667) — calculator, footer, map all readable
- [ ] Verify `https://nest.mn/sitemap.xml` returns the sitemap after deployment
- [ ] Test 404 page by visiting a non-existent URL

## Form / API endpoints in use
- **Contact form**: Web3Forms (key in `contact.html`, restrict to `nest.mn` domain in their dashboard)
- **Sanity CMS**: project `ka04oafk`, dataset `production` (read-only public API for news)
- **Currency exchange**: `cdn.moneyconvert.net` (used in calculator)

## Security headers
The Content-Security-Policy is set via `<meta>` in every page `<head>` (with a runtime
fallback in `js/components.js`) and locks scripts/connects to known origins.

The headers that **cannot** be set via `<meta>` — clickjacking protection
(`X-Frame-Options`), MIME-sniffing (`X-Content-Type-Options`), HSTS, `Referrer-Policy`
and `Permissions-Policy` — are now shipped as real HTTP headers via the host config files:
- **Netlify / Cloudflare Pages** → `_headers`
- **Vercel** → `vercel.json`
- **Apache / cPanel** → `.htaccess` (also forces HTTPS and blocks dev files)

After deploying, confirm the headers are live with:
```bash
curl -sI https://nest.mn/ | grep -iE 'x-frame|content-type-options|strict-transport|referrer|permissions'
```

## Cleanup verification (already applied)
- All `?v=` cache versions unified to **46** across the 8 production pages.
- Fixed a broken property-card fallback image in `js/calculator.js`
  (`assets/nest-prop1.jpeg` → `assets/renovations/p1-after.jpg`).
- The only remaining missing-asset reference (`assets/world.svg`) lives in `index-alt.html`,
  which is a dev-only file in the "Do NOT upload" list — not served in production.
