# 260605_phase0-fork-rebrand

## Objective
Fork the hivework-app scaffold into a new app, "Hivework", as the foundation for an
app-store-for-AI-agents over the hivework repo.

## Outcome
- ✅ `cargo check` green · `vite build` green
- ✅ Rebranded: productName "Hivework", id `com.hivework.app`, window title,
  CSP (re-pointed to GitHub hosts), Cargo/lib/main, app.html, keychain service id.

## Files Modified
- `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`,
  `src/app.html`, `src-tauri/src/github/auth.rs` (KEYCHAIN_SERVICE + its 2 guard tests).
- `src-tauri/data/*` — restored brew's real bundled data so brew-domain tests stay green until
  that domain retires.

## Notes
- Reference clones kept read-only: `/tmp/hivework-app-inspect`, `/tmp/hivework-inspect`.
- Methodology + architecture captured in `memory-bank/{projectbrief,systemPatterns,contracts,decisions}.md`.
