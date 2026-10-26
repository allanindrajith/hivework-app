# Project Brief — Hivework

**Product**: Hivework
**Bundle ID**: `com.hivework.app`
**Repo**: github:hivework/hivework-app
**Author**: Hivework Team
**License**: MIT · No telemetry · No accounts

## One-liner

A native macOS app store for AI agents. Browse, search, install, and **track** the
**210** specialized agent personas (across 16 categories) from
[`hivework/hivework`](https://github.com/hivework/hivework)
across every AI coding tool you use (Claude Code, Cursor, Codex, Gemini CLI, Copilot,
Windsurf, Aider, opencode, qwen, openclaw, antigravity).
(The repo also ships NEXUS playbooks + workflow examples — docs, not agents — a candidate
for a future "Playbooks" section.)

## Thesis

Hivework is a thin, respectful native GUI and state-tracking layer over the AI agent catalog.
Built with Tauri 2, Svelte 5, and Rust, it provides a fast, lightweight desktop experience.

**Core Innovation**: AI coding tools have **no shared registry** — every tool's config dir
is an unmanaged destination. Hivework serves as the unified local database and state tracker:
> "the only tool that tracks your agents across every AI tool you use."

## What it is / isn't

- **Is**: a browser + installer + cross-tool state tracker + team loadout manager for agents.
- **Isn't**: a replacement for the hivework catalog, telemetry-funded, freemium,
  or a runtime that executes agents itself (v1 installs into other tools; it does not run agents).

## Source of truth (the corpus-copy model)

The app maintains its **own local working copy** of the hivework repo in
`~/Library/Application Support/com.hivework.app/corpus/`, seeded from a
bundled baseline and refreshed from the GitHub tarball. From that copy it derives a
hash index (`corpus-index.json`) and renders/install agents into each tool. See
`systemPatterns.md`.

## Architecture Foundation

Tauri 2 shell · Svelte 5 runes frontend · streaming job model
(`run_*_streaming` → `Channel<Event>` + global write-lock) · design system
(`src/lib/styles/tokens.css`, components) · command palette · settings shell ·
window chrome (overlay titlebar + vibrancy) · minisign in-app updater ·
`sign-and-notarize.sh` / `publish-manifest.sh` · AGENTS.md methodology + memory-bank.

## Status

Phase 0 (fork + rebrand) — DONE. See `phases/phase-roadmap.md` and `activeContext.md`.
