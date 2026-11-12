# 261113_hivework_v040_github_ui

## Objective
1. Connect Hivework desktop app (`v0.4.0`) to `https://github.com/allanindrajith/hivework-app`, `https://github.com/allanindrajith/hivework`, and `https://hivework.online/` for Tauri self-updates (`updater.json`), catalog pulls, and external links.
2. Sync the bundled baseline corpus with all 296 unified `hive-*` agents across 18 divisions from `Hivework`.
3. Redesign the desktop UI to match `https://hivework.online/` (`DESIGN.md` Obsidian & Honeycomb Amber design system).

## Outcome
- ✅ Tests: 288 Rust unit tests passing (`0` failed) + `svelte-check` 0 errors, 0 warnings
- ✅ Build: `npm run build` static production bundle succeeded
- ✅ Review: Approved by user

## Files Modified
- `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` — Bumped to `0.4.0`, configured dual updater endpoints (`https://hivework.online/updater.json` + GitHub Releases fallback) and CSP.
- `src-tauri/src/corpus/mod.rs`, `src-tauri/src/render/mod.rs`, `src-tauri/src/install/mod.rs` — Connected to `allanindrajith/hivework`, recursive nested division seeding, `hive-*` slug prefix parity across all transform tools.
- `scripts/build-baseline.mjs`, `static/corpus-baseline.json`, `src-tauri/resources/corpus-baseline/*`, `src-tauri/data/*` — Synced 296 `hive-*` agents across 18 divisions.
- `src/app.html`, `src/lib/styles/tokens.css`, `src/lib/stores/ui.svelte.ts` — Dark Obsidian (`#0d0c0a` / `#171511` / `#2d2920` / `#f59e0b`) default theme.
- `src/routes/+page.svelte`, `src/lib/components/TitlebarControls.svelte`, `src/lib/components/Sidebar.svelte`, `src/lib/components/Dashboard.svelte`, `src/lib/components/AgentsWorkspace.svelte` — Redesigned to match `https://hivework.online/`.
