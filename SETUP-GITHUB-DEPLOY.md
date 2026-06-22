# One-time setup: auto-deploy from GitHub to cPanel

After this is set up, **every time you push to GitHub the live site updates by itself.**
You only do steps 1–5 once. (This file is not published to the website.)

---

## 1. Get an FTP login from cPanel
In cPanel, open **FTP Accounts**. Best practice — create a dedicated one:
- **Add FTP Account** → pick a username (e.g. `deploy`), set a strong password,
  set **Directory** to `public_html`, then **Create FTP Account**.
- Click **Configure FTP Client** next to it and note these three values:
  - **FTP Server** (e.g. `ftp.nest.mn` or a server hostname)
  - **FTP Username** (e.g. `deploy@nest.mn`)
  - the **password** you just set

## 2. Create an empty repo on GitHub
- Go to https://github.com/new
- Name it (e.g. `nest-group-website`), choose **Private**.
- **Do NOT** add a README, .gitignore, or license (the project already has them).
- Click **Create repository** and copy the URL it shows
  (e.g. `https://github.com/yourname/nest-group-website.git`).

## 3. Add your FTP login as GitHub Secrets
In the new repo: **Settings → Secrets and variables → Actions → New repository secret.**
Add these **three** (names must match exactly):

| Secret name    | Value                          |
|----------------|--------------------------------|
| `FTP_SERVER`   | the FTP Server from step 1     |
| `FTP_USERNAME` | the FTP Username from step 1   |
| `FTP_PASSWORD` | the FTP password from step 1   |

Secrets are encrypted and never visible in the code — this is the safe place for them.

## 4. Push the project to GitHub
In a terminal in this folder, run (replace the URL with yours from step 2):
```bash
git remote add origin https://github.com/YOURNAME/nest-group-website.git
git push -u origin main
```
The first push will ask you to sign in to GitHub (a browser window opens) — do it once.

## 5. Watch it deploy
- Open the repo's **Actions** tab. You'll see "Deploy to cPanel" running.
- Green check = the site was uploaded to `public_html`. Visit https://nest.mn to confirm.
- If it's red, click it to read the error (usually a wrong secret — see Troubleshooting).

---

## Everyday use after setup
Edit files → commit → push. That's it:
```bash
git add -A
git commit -m "describe what changed"
git push
```
The site updates within a minute or two. (Remember to bump the `?v=` cache number when you
change anything in `css/` or `js/` — see DEPLOY.md.)

## Troubleshooting
- **Action fails on login / TLS:** open `.github/workflows/deploy.yml` and change
  `protocol: ftps` to `protocol: ftp` (some hosts don't allow secure FTP). Commit & push.
- **Files land in the wrong place:** your site may not be in `public_html`. Change
  `server-dir: public_html/` in `deploy.yml` to the correct folder (e.g. for an addon
  domain it might be `public_html/nest/`). Commit & push.
- **"Missing secret" error:** re-check the three secret names in step 3 (case-sensitive),
  then in the Actions tab use **Re-run jobs**.
