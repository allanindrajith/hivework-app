# landing

Static landing page for Hivework, served at `hivework.online` via Caddy on the build host.

A self-contained static site (no build step) deployed with `rsync`.

## Files

- `index.html` — the page
- `style.css` — design tokens (dark-first, OKLCH, amber accent)
- `hivework.png`, `hivework-dark.png` — hero icon (Hivework app icon)
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- `social-card.png` — 1200×630 Open Graph / Twitter card
- `manifest.json`, `robots.txt`, `sitemap.xml`

Icons are generated from `../hivework-brand-kit/logos-png-transparent/` via `sips`; `favicon.ico` is `../src-tauri/icons/icon.ico`.

> **TODO:** add an app screenshot to `screenshots/` and uncomment the `.section-shots`
> block in `index.html`. Capture the Dashboard (cross-tool coverage) for the strongest shot.

## Deploy

Set `DEPLOY_HOST` to your ssh alias for the build host (kept out of this repo).
From this directory:

```sh
rsync -avz --exclude README.md ./ "$DEPLOY_HOST":Sites/hivework/
```

> ⚠️ **Do NOT add a bare `--delete`.** Once auto-update is enabled this same web
> root also serves `updater.json` (and the signed updater artifacts), which do
> NOT live in this directory. A `--delete` sync from here would wipe the updater
> for every user. If you must prune stale landing files, add `--delete` **with**
> an `--exclude` for `updater.json` and any artifact paths.

Caddy config + DNS (`hivework.online`) are managed on the host.

## Update flow

1. Edit `index.html` / `style.css` locally
2. View locally: `python3 -m http.server -d . 8089` then open `http://localhost:8089`
3. `rsync` to the host when ready (command above)
4. Verify the page loads at `https://hivework.online/` (and, once auto-update ships,
   that `curl -s https://hivework.online/updater.json` still resolves)
