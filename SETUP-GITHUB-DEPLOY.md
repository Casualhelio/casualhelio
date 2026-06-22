# Deploying: GitHub → cPanel (pull-based)

Your host blocks all inbound FTP/SSH from outside machines, so GitHub can't push
to the server. Instead, **cPanel pulls the site from GitHub** (an outbound HTTPS
connection, which your host allows). This file is not published to the website.

---

## One-time setup

### 1. Make the GitHub repo public
cPanel clones over HTTPS, which is simplest with a public repo. The repo contains
only the static website (already public at nest.mn) — there are no passwords or
keys in it, so public is safe.
- GitHub repo → **Settings → General → Danger Zone → Change repository visibility
  → Make public** → confirm.

### 2. Create the repository in cPanel
- cPanel → **Git Version Control** → **Create**.
- Toggle **"Clone a Repository"** ON.
- **Clone URL:** `https://github.com/Casualhelio/casualhelio.git`
- **Repository Path:** leave the suggested path (e.g. `repositories/casualhelio`).
  ⚠️ Do NOT set it to `public_html` — the deploy step copies files there for you.
- **Create**. cPanel downloads the repo.

### 3. First deploy
- On the new repo's row click **Manage** → open the **Pull or Deploy** tab.
- Click **Update from Remote** (gets the latest code), then **Deploy HEAD Commit**
  (runs `.cpanel.yml`, copying the site into `public_html`).
- Visit https://nest.mn and hard-refresh (Ctrl+Shift+R).

---

## Every time you want to publish a change
1. Edit files locally, then push to GitHub:
   ```bash
   git add -A
   git commit -m "describe what changed"
   git push
   ```
2. cPanel → **Git Version Control → Manage → Pull or Deploy** →
   **Update from Remote**, then **Deploy HEAD Commit**.

That second step is the only manual part (your host can't be auto-triggered from
outside). It takes ~10 seconds. Remember to bump the `?v=` cache number when you
change anything in `css/` or `js/` — see DEPLOY.md.

### Optional: make it hands-off with a cron job
cPanel → **Cron Jobs** can run a command on a schedule (e.g. every 15 min) to pull
and deploy automatically, so you'd only need to push to GitHub. Ask and I'll set
up the exact command — it pulls the repo and re-runs the `.cpanel.yml` deploy.

## Troubleshooting
- **Clone fails / "could not read Username":** the repo is still private — redo step 1.
- **Deploy runs but site unchanged:** make sure you clicked **Update from Remote**
  *before* **Deploy HEAD Commit**.
- **"cp: command not found" or path errors:** the server account home may differ from
  `/home/nestmn`; tell me the path shown in cPanel and I'll adjust `.cpanel.yml`.
