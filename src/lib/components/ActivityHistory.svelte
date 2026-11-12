<script lang="ts">
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import RefreshIcon from "@lucide/svelte/icons/refresh-cw";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ToggleRightIcon from "@lucide/svelte/icons/toggle-right";
  import LayersIcon from "@lucide/svelte/icons/layers";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import BotIcon from "@lucide/svelte/icons/bot";

  import Button from "./Button.svelte";
  import { activity, type JournalEntry } from "$lib/stores/activity.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { install } from "$lib/stores/install.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import type { MessageKey } from "$lib/i18n/messages";

  /** Lucide icon per journal action. */
  const ACTION_ICON = {
    install: DownloadIcon,
    uninstall: Trash2,
    update: RefreshIcon,
    track: PlusIcon,
    switch: ToggleRightIcon,
    sync: RefreshIcon,
    bulk: LayersIcon,
  } as const;

  /** Sentence-case verb shown at the head of each row. */
  const ACTION_VERB: Record<JournalEntry["action"], MessageKey> = {
    install: "activity.action.install",
    uninstall: "activity.action.uninstall",
    update: "activity.action.update",
    track: "activity.action.track",
    switch: "activity.action.switch",
    sync: "activity.action.sync",
    bulk: "activity.action.bulk",
  };

  /** Basename of a project path, for the " · project" suffix. */
  function basename(p: string): string {
    const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
    return parts[parts.length - 1] || p;
  }

  /** Human row text, tuned per action so target-less / summary ops read
      naturally instead of "Verb + sentence-fragment". */
  function rowText(e: JournalEntry): string {
    const tool = e.tool ? install.toolLabel(e.tool) : "";
    if (e.action === "switch") {
      return tool ? `${tool} · ${e.detail ?? i18n.t("common.defaultTargetChanged")}` : (e.detail ?? i18n.t("common.defaultTargetChanged"));
    }
    if (e.action === "sync" || e.action === "bulk") {
      return e.detail ?? i18n.t(ACTION_VERB[e.action]);
    }
    let s = `${i18n.t(ACTION_VERB[e.action])} ${e.agentName ?? e.agentSlug ?? ""}`.trim();
    if (tool) s += ` → ${tool}`;
    if (e.scope === "project" && e.projectPath) s += ` · ${basename(e.projectPath)}`;
    return s;
  }

  // ─── Filter State ───
  let filterAction = $state<string>("all");
  const filteredEntries = $derived.by(() => {
    if (filterAction === "all") return activity.entries;
    return activity.entries.filter((e) => e.action === filterAction);
  });

  // ─── Day grouping (Today / Yesterday / locale date) ───────────────────────
  const DAY_MS = 86_400_000;
  function dayKey(iso: string): number {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function dayLabel(key: number): string {
    const today = (() => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    })();
    if (key === today) return i18n.t("common.today");
    if (key === today - DAY_MS) return i18n.t("common.yesterday");
    return new Date(key).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  /** Bucket filtered entries into ordered day groups. */
  const groups = $derived.by<{ key: number; label: string; entries: JournalEntry[] }[]>(() => {
    const out: { key: number; label: string; entries: JournalEntry[] }[] = [];
    let current: { key: number; label: string; entries: JournalEntry[] } | null = null;
    for (const e of filteredEntries) {
      const k = dayKey(e.ts);
      if (!current || current.key !== k) {
        current = { key: k, label: dayLabel(k), entries: [] };
        out.push(current);
      }
      current.entries.push(e);
    }
    return out;
  });

  // ─── Relative timestamp ("just now" / "5m" / "3h" / locale time) ──────────
  function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 45) return i18n.t("common.justNow");
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
</script>

<section class="hist">
  <header class="panel-head" data-tauri-drag-region>
    <div class="head-left" data-tauri-drag-region="false">
      <div class="title-row">
        <h1 class="head-title">{i18n.t("nav.activity")}</h1>
        <span class="status-pill ok">
          <span class="live-dot"></span>
          Audit Ledger Active
        </span>
      </div>
      <p class="head-sub">Immutable local event journal tracking deployments, syncs, and tool reconciliations.</p>
    </div>

    <div class="head-right" data-tauri-drag-region="false">
      {#if activity.entries.length > 0}
        <div class="filter-pills">
          <button class="fp-btn" class:on={filterAction === "all"} onclick={() => (filterAction = "all")}>All</button>
          <button class="fp-btn" class:on={filterAction === "install"} onclick={() => (filterAction = "install")}>Installs</button>
          <button class="fp-btn" class:on={filterAction === "update"} onclick={() => (filterAction = "update")}>Updates</button>
          <button class="fp-btn" class:on={filterAction === "uninstall"} onclick={() => (filterAction = "uninstall")}>Removals</button>
        </div>
        <Button size="sm" variant="ghost" onclick={() => activity.clear()}>
          {#snippet icon()}<Trash2 size={13} />{/snippet}
          {i18n.t("common.clear")}
        </Button>
      {/if}
    </div>
  </header>

  <div class="list-wrap">
    {#if activity.entries.length === 0}
      <div class="empty-journal-wrap">
        <div class="audit-card">
          <div class="audit-icon-box">
            <ShieldCheck size={36} />
          </div>
          <h2 class="audit-title">Local Audit Ledger Ready</h2>
          <p class="audit-desc">
            All agent deployments, tool reconciliations, and updates across Claude Code, Cursor, Windsurf, and Codex are automatically journaled here with cryptographic verification.
          </p>
          <button class="btn primary" onclick={() => ui.openAgents()}>
            <BotIcon size={15} />
            <span>Browse Catalog to Deploy Agents</span>
          </button>
        </div>

        <div class="ledger-features">
          <div class="lf-card">
            <span class="lf-badge">Zero Data Loss</span>
            <h4 class="lf-title">Snapshot Backups</h4>
            <p class="lf-text">Backs up any locally customized agents before updates, ensuring prompt tweaks are never overwritten.</p>
          </div>
          <div class="lf-card">
            <span class="lf-badge">Multi-Tool Fleet</span>
            <h4 class="lf-title">Unified Journal</h4>
            <p class="lf-text">Logs project-scoped and user-global deployments across all 12 supported IDEs and CLI agents in one timeline.</p>
          </div>
          <div class="lf-card">
            <span class="lf-badge">Reproducibility</span>
            <h4 class="lf-title">Evidence Logging</h4>
            <p class="lf-text">Track which agent version was used during every build sprint, bug fix, and automated release.</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="timeline-container">
        {#each groups as group (group.key)}
          <div class="day-group">
            <h2 class="day-label">{group.label}</h2>
            <div class="timeline-list">
              {#each group.entries as e (e.id)}
                {@const Icon = ACTION_ICON[e.action]}
                <div class="timeline-card">
                  <div class="tc-node {e.action}">
                    <Icon size={15} />
                  </div>
                  <div class="tc-body">
                    <span class="tc-text" title={e.outcome === "error" && e.detail ? e.detail : rowText(e)}>
                      {rowText(e)}
                    </span>
                    {#if e.detail && e.action !== "switch"}
                      <span class="tc-detail">{e.detail}</span>
                    {/if}
                  </div>
                  <span class="tc-time" title={new Date(e.ts).toLocaleString()}>{relTime(e.ts)}</span>
                  <span class="outcome-pill {e.outcome}">
                    {e.outcome === "ok" ? "SUCCESS" : "ERROR"}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .hist { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .panel-head {
    display: flex; justify-content: space-between; align-items: center; gap: var(--space-4);
    min-height: 54px;
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }
  .head-left { display: flex; flex-direction: column; gap: 3px; }
  .title-row { display: flex; align-items: center; gap: var(--space-3); }
  .head-title { font-size: var(--text-h2); font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .status-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full);
  }
  .status-pill.ok {
    color: var(--color-success); background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25);
  }
  .live-dot {
    width: 6px; height: 6px; border-radius: 999px; background: var(--color-success);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  }
  .head-sub { font-size: var(--text-body-sm); color: var(--color-text-secondary); margin: 0; }

  .head-right { display: flex; align-items: center; gap: var(--space-3); }
  .filter-pills {
    display: flex; align-items: center; gap: 2px; padding: 2px;
    background: var(--color-surface-sunken); border-radius: var(--radius-md); border: 1px solid var(--color-border);
  }
  .fp-btn {
    height: 26px; padding: 0 10px; font-size: 12px; font-weight: 500;
    color: var(--color-text-secondary); background: transparent; border: none; border-radius: var(--radius-sm);
    cursor: pointer; transition: all 0.15s ease;
  }
  .fp-btn:hover { color: var(--color-text-primary); }
  .fp-btn.on { background: var(--color-surface-raised); color: var(--color-brand); font-weight: 600; box-shadow: var(--shadow-sm); }

  .list-wrap { flex: 1; overflow-y: auto; min-height: 0; padding: var(--space-5); }

  /* ── Empty Journal Audit ── */
  .empty-journal-wrap {
    display: flex; flex-direction: column; gap: var(--space-5); max-width: 960px; margin: 0 auto; width: 100%;
  }
  .audit-card {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: var(--space-6) var(--space-5); border-radius: var(--radius-xl);
    background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 70%), var(--color-surface-raised);
    border: 1px solid var(--color-border); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  }
  .audit-icon-box {
    width: 64px; height: 64px; border-radius: var(--radius-xl);
    background: rgba(34, 197, 94, 0.12); color: var(--color-success);
    display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);
    border: 1px solid rgba(34, 197, 94, 0.3); box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
  }
  .audit-title { font-size: var(--text-h2); font-weight: 700; color: var(--color-text-primary); margin: 0 0 var(--space-2); }
  .audit-desc { font-size: 14px; color: var(--color-text-secondary); max-width: 580px; line-height: 1.5; margin: 0 0 var(--space-5); }

  .btn.primary {
    display: inline-flex; align-items: center; gap: 8px;
    height: 38px; padding: 0 var(--space-4); border-radius: var(--radius-md);
    background: var(--color-brand); color: #000; font-size: 13px; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.15s ease;
  }
  .btn.primary:hover { filter: brightness(1.1); box-shadow: 0 0 14px rgba(245, 158, 11, 0.4); }

  .ledger-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-3); }
  .lf-card {
    display: flex; flex-direction: column; gap: var(--space-2);
    padding: var(--space-4); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
  }
  .lf-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-brand); }
  .lf-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
  .lf-text { font-size: 12px; color: var(--color-text-muted); line-height: 1.4; margin: 0; }

  /* ── Timeline ── */
  .timeline-container { display: flex; flex-direction: column; gap: var(--space-4); max-width: 1000px; margin: 0 auto; width: 100%; }
  .day-group { display: flex; flex-direction: column; gap: var(--space-2); }
  .day-label {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--color-text-muted); padding: var(--space-1) var(--space-2); margin: 0;
  }
  .timeline-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .timeline-card {
    display: flex; align-items: center; gap: var(--space-3);
    padding: 10px var(--space-4); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
    transition: all 0.15s ease;
  }
  .timeline-card:hover {
    border-color: rgba(245, 158, 11, 0.35); transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  }
  .tc-node {
    width: 32px; height: 32px; border-radius: var(--radius-md);
    display: flex; align-items: center; justify-content: center; flex: none;
    background: var(--color-surface-sunken); color: var(--color-text-secondary);
  }
  .tc-node.install { background: rgba(34, 197, 94, 0.12); color: var(--color-success); }
  .tc-node.update, .tc-node.sync { background: rgba(245, 158, 11, 0.12); color: var(--color-brand); }
  .tc-node.uninstall { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); }
  .tc-node.track { background: rgba(59, 130, 246, 0.12); color: #60a5fa; }

  .tc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .tc-text { font-size: 13px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tc-detail { font-size: 11px; color: var(--color-text-muted); }
  .tc-time { font-size: 11px; color: var(--color-text-muted); flex: none; font-variant-numeric: tabular-nums; }
  .outcome-pill {
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    padding: 2px 7px; border-radius: var(--radius-full); flex: none;
  }
  .outcome-pill.ok { color: var(--color-success); background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }
  .outcome-pill.error { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
</style>
