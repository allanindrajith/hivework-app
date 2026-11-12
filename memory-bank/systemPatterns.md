# System Patterns — Hivework

## 1. Corpus-copy model (source of truth)

```
~/Library/Application Support/com.hivework.app/
├── corpus/                  # our maintained copy of the hivework repo (251 .md)
│   └── <category>/<slug>.md
├── state/
│   ├── corpus-index.json    # slug → CorpusEntry (hashes, category, version)
│   └── installs.json        # the ledger: InstallRecord[]
└── settings.json
```

- **Seed**: a bundled baseline corpus ships inside the app bundle (resources) so first
  launch works offline. On first run it is extracted to `corpus/`.
- **Refresh**: fetch the GitHub tarball
  `https://codeload.github.com/hivework/hivework/tar.gz/refs/heads/main`,
  extract, atomically swap `corpus/`, rebuild `corpus-index.json`. Record the resolved
  commit SHA / tag as `corpus_version`. **No runtime git dependency.**
- The bundled catalog enables immediate offline browsing; refresh updates the local tree.

## 2. Two indexes

### corpus-index.json (upstream truth — rebuilt on every refresh)
Per agent (`slug`): `source_hash` (SHA-256 of canonical `.md`), `frontmatter_hash`,
`body_hash` (split so updates can be classified cosmetic vs substantive), `category`,
`name`, `emoji`, `color`, `vibe`, `description`, `corpus_version`.

### installs.json — the ledger (local-action truth)
Per install action: `slug`, `tool`, `scope` (user|project), `project_path` (for project
scope), `dest` (absolute path written), `source_hash` (corpus version installed from),
`rendered_hash` (SHA-256 of exact bytes written after conversion), `installed_at`,
`corpus_version`.

## 3. Deterministic renderer (Plan B — load-bearing)

Install = **transform frontmatter + write file**, done natively in Rust (no shell/python
at runtime). Each tool has a deterministic converter: `render(agent, tool) -> (bytes, rendered_hash)`.
Determinism is REQUIRED so `rendered_hash` is stable and provenance reconciliation works.
`scripts/convert.sh` in the hivework repo is the **reference spec** (color→hex maps,
`.md`→`.mdc`/TOML, etc.), not a runtime dependency.

## 4. Reconciliation — the 5 states (this is our `brew list`/`brew outdated`)

`reconcile(disk_scan, ledger, corpus_index) -> InstalledAgent[]` classifies each
on-disk agent file:

| State | In ledger | On disk | Test | UI |
|---|---|---|---|---|
| **Current** | ✓ | ✓ | re-render(slug,tool)@current == on-disk bytes | ✓ green |
| **Outdated** | ✓ | ✓ | matches an OLDER render; corpus source_hash advanced | "Update" badge |
| **Modified** | ✓ | ✓ | slug known but bytes match no known render | "Modified — protect" |
| **Removed** | ✓ | ✗ | ledger entry, file gone | "Reinstall?" |
| **Foreign** | ✗ | ✓ | slug unknown to corpus-index | "Adopt?" |

**Provenance is hash-match only — never mutate agent content / never stamp files.**
Identity = slug-from-filename, confirmed by re-rendering against our corpus-index.
"Adopt" pulls a recognized Foreign agent into the ledger. Update classification uses
`body_hash` vs `frontmatter_hash` to label an update *cosmetic* (metadata only) or
*substantive* (prompt body changed).

## 5. Both scopes — fully supported

- **User-global tools** → fixed `~/…` dests, single global state:
  claude-code (`~/.claude/agents/`), gemini-cli (`~/.gemini/agents/`),
  copilot (`~/.github/agents/` + `~/.copilot/agents/`), qwen (`~/.qwen/agents/`),
  codex (`~/.codex/agents/`, TOML), openclaw (`~/.openclaw/hivework/`),
  antigravity (`~/.gemini/antigravity/skills/`).
- **Project-scoped tools** → install into ANY directory, tracked per `project_path`:
  cursor (`.cursor/rules/*.mdc`), windsurf (`.windsurfrules`), aider (`CONVENTIONS.md`),
  opencode (`.opencode/agents/*.md`). The app keeps a **Projects** list; Library/Tools
  show per-project deployment. One agent in five projects = five tracked rows.

## 6. Domain-layer module map (Rust `src-tauri/src/`)

| Module | Role |
|---|---|
| `corpus/` | fetch/extract/index the local catalog copy |
| `render/` | deterministic per-tool converters |
| `install/` | install execution and ledger read/write |
| `commands/` | typed Tauri IPC command handlers |
| `registry/` | embedded tool registry and capability maps |
| `github/` | optional star/watch/repo-stats integration |
| `state/` | app state and safety guards |

## 7. Frontend sections (Svelte 5)

Dashboard · Agents (three-pane catalog + filter) · Tools (detected environments & status) ·
Teams (app presets and user team rosters) · Projects (project-scoped installs) ·
Runbooks (orchestration playbooks) · Activity history. Cmd+K palette, Cmd+0…6 nav.

## 8. Job/streaming model

Long operations stream stdout/stderr via `Channel<Event>` with a global write-lock.
Install, convert, and refresh are the primary streaming operations.
