<script lang="ts">
  /**
   * CatalogFirstRun.svelte — First-launch Welcome & Onboarding Wizard.
   *
   * Shown once on fresh install when no catalog choice has been saved
   * (`catalog.configured === false`).
   *
   * 1. Highlighted 1-Click Instant Setup (Bundled 345 Agents)
   * 2. Automated ~/.hivework Managed Setup
   * 3. Developer Custom Local Git Clone
   */
  import { errorText } from "$lib/types";
  import { onMount } from "svelte";
  import { open as openDialog } from "@tauri-apps/plugin-dialog";
  import FolderGit2 from "@lucide/svelte/icons/folder-git-2";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Package from "@lucide/svelte/icons/package";
  import Search from "@lucide/svelte/icons/search";
  import Check from "@lucide/svelte/icons/check";
  import Zap from "@lucide/svelte/icons/zap";
  import Bot from "@lucide/svelte/icons/bot";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Layers from "@lucide/svelte/icons/layers";

  import { catalog } from "$lib/stores/catalog.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import type { CatalogCandidate } from "$lib/types";

  let expanded = $state<"clone" | null>(null);
  let manage = $state(true);

  onMount(() => void catalog.detect(false));

  async function choose(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(i18n.t("firstRun.error"), errorText(e));
    }
  }

  async function pickFolder() {
    const picked = await openDialog({ directory: true, multiple: false, title: i18n.t("catalog.chooseCloneTitle") });
    if (typeof picked === "string") {
      await choose(() => catalog.useClone(picked, manage), i18n.t("firstRun.usingClone"));
    }
  }

  function useCandidate(c: CatalogCandidate) {
    void choose(() => catalog.useClone(c.path, manage), i18n.t("firstRun.usingPath", { path: c.path }));
  }
</script>

<div class="scrim">
  <div class="box" role="dialog" aria-modal="true" aria-label="Welcome to Hivework Onboarding">
    <header>
      <div class="badge-row">
        <span class="brand-pill"><Zap size={13} /> Welcome to Hivework</span>
        <span class="version-tag">v0.4.0</span>
      </div>
      <h1>One Canonical AI Workforce</h1>
      <p class="lede">
        Deploy 345 specialized agents across Claude Code, Codex, GitHub Copilot, Antigravity, and 17 AI harnesses. Select your initial catalog source to begin.
      </p>

      <!-- Value Props Highlights -->
      <div class="highlights">
        <div class="hl"><Bot size={14} class="hl-icon" /> <span>345 Specialized Agents</span></div>
        <div class="hl"><Layers size={14} class="hl-icon" /> <span>18 Divisions</span></div>
        <div class="hl"><ShieldCheck size={14} class="hl-icon" /> <span>100% Local & Private</span></div>
      </div>
    </header>

    <div class="cards">
      <!-- 1. Bundled Snapshot (RECOMMENDED) -->
      <button
        class="card primary-choice"
        disabled={catalog.busy}
        onclick={() => choose(() => catalog.useBundled(), i18n.t("catalog.usingBundled"))}
      >
        <div class="badge-rec">RECOMMENDED · 1-CLICK</div>
        <div class="card-inner">
          <div class="icon-wrap gold">
            <Package size={24} />
          </div>
          <div class="ct">
            <div class="title-row">
              <span class="t">Instant Setup (Bundled 345 Agents)</span>
            </div>
            <span class="d">Zero setup required. Launches immediately with all 345 production-tested agents pre-packaged offline.</span>
          </div>
        </div>
      </button>

      <!-- 2. Set one up for me (~/.hivework) -->
      <button
        class="card secondary-choice"
        disabled={catalog.busy}
        onclick={() => choose(() => catalog.provisionManaged(), i18n.t("catalog.setupManaged"))}
      >
        <div class="card-inner">
          <div class="icon-wrap">
            <Sparkles size={22} />
          </div>
          <div class="ct">
            <span class="t">Managed Setup (~/.hivework)</span>
            <span class="d">Initializes a local catalog in ~/.hivework synchronized with the latest upstream git repository.</span>
          </div>
        </div>
      </button>

      <!-- 3. Use my own clone -->
      <div class="card tertiary-choice" class:open={expanded === "clone"}>
        <button class="card-head" onclick={() => (expanded = expanded === "clone" ? null : "clone")}>
          <div class="icon-wrap">
            <FolderGit2 size={22} />
          </div>
          <div class="ct">
            <span class="t">Connect Custom Git Clone</span>
            <span class="d">Point to an existing hivework repository folder on your computer.</span>
          </div>
        </button>

        {#if expanded === "clone"}
          <div class="card-body">
            {#if catalog.detection?.candidates.length}
              <ul class="cands">
                {#each catalog.detection.candidates as c (c.path)}
                  <li>
                    <button class="cand" disabled={catalog.busy} onclick={() => useCandidate(c)}>
                      <div class="cand-main">
                        <span class="cand-path">{c.path}</span>
                        <span class="cand-meta">
                          {i18n.count(c.agentCount, "common.agent.one", "common.agent.many")}{c.hasGit ? " · git" : ""} · {c.kind === "managed" ? "~/.hivework" : i18n.t("common.detected")}
                        </span>
                      </div>
                      <Check size={15} />
                    </button>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="empty">{i18n.t("firstRun.noClone")}</p>
            {/if}

            <label class="manage">
              <input type="checkbox" bind:checked={manage} />
              {i18n.t("firstRun.manage")}
            </label>

            <div class="row-actions">
              <button class="ghost" disabled={catalog.scanning} onclick={() => catalog.detect(true)}>
                <Search size={14} /><span>{catalog.scanning ? i18n.t("common.searching") : i18n.t("catalog.find")}</span>
              </button>
              <button class="ghost" disabled={catalog.busy} onclick={pickFolder}>{i18n.t("catalog.chooseFolder")}</button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <footer>
      <p class="hint">You can change your catalog source anytime in <strong>Settings → Catalog</strong>.</p>
    </footer>

    {#if catalog.error}<p class="err">{catalog.error}</p>{/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: center; justify-content: center;
    background: rgba(10, 9, 8, 0.85);
    backdrop-filter: blur(12px);
  }
  .box {
    width: min(600px, 94vw); max-height: 90vh; overflow-y: auto;
    background: #14120e;
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
    padding: 28px;
    display: flex; flex-direction: column; gap: 20px;
  }
  header {
    display: flex; flex-direction: column; gap: 8px;
  }
  .badge-row {
    display: flex; align-items: center; gap: 10px;
  }
  .brand-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    color: #f59e0b; background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 999px; padding: 3px 10px;
  }
  .version-tag {
    font-family: var(--font-mono, monospace); font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
  header h1 {
    font-size: 24px; font-weight: 700; color: #fff; margin: 4px 0 0 0;
    letter-spacing: -0.02em;
  }
  .lede {
    font-size: 13px; color: rgba(255, 255, 255, 0.65); line-height: 1.5; margin: 0;
  }
  .highlights {
    display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap;
  }
  .hl {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px; padding: 4px 10px;
  }
  :global(.hl-icon) {
    color: #f59e0b;
  }
  .cards {
    display: flex; flex-direction: column; gap: 12px;
  }
  .card {
    border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 10px;
    background: #1a1713; overflow: hidden; position: relative; text-align: left;
    transition: all 0.15s ease;
  }
  .card.primary-choice {
    border-color: rgba(245, 158, 11, 0.5);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(26, 23, 19, 0.95) 100%);
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.08);
  }
  .card.primary-choice:hover:not(:disabled) {
    border-color: #f59e0b;
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, rgba(32, 28, 22, 0.98) 100%);
    transform: translateY(-1px);
  }
  .badge-rec {
    position: absolute; top: 10px; right: 12px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    color: #0d0c0a; background: #f59e0b;
    border-radius: 4px; padding: 2px 7px;
  }
  .card.secondary-choice {
    cursor: pointer;
  }
  .card.secondary-choice:hover:not(:disabled),
  .card.tertiary-choice:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.2);
    background: #201c17;
  }
  .card:disabled { opacity: 0.5; cursor: default; }
  .card-inner {
    display: flex; align-items: flex-start; gap: 14px; padding: 16px;
  }
  .card-head {
    width: 100%; display: flex; align-items: flex-start; gap: 14px;
    padding: 16px; background: transparent; cursor: pointer; text-align: left; color: inherit;
    border: none;
  }
  .icon-wrap {
    width: 40px; height: 40px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
  }
  .icon-wrap.gold {
    background: rgba(245, 158, 11, 0.18); color: #f59e0b;
  }
  .ct {
    display: flex; flex-direction: column; gap: 4px; min-width: 0;
  }
  .title-row {
    display: flex; align-items: center; gap: 8px;
  }
  .ct .t {
    font-size: 14px; font-weight: 600; color: #fff;
  }
  .ct .d {
    font-size: 12px; color: rgba(255, 255, 255, 0.55); line-height: 1.4;
  }
  .card.open { border-color: #f59e0b; }
  .card-body {
    padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px;
  }
  .cands { display: flex; flex-direction: column; gap: 6px; }
  .cand {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px; background: rgba(0, 0, 0, 0.3); cursor: pointer; color: inherit;
  }
  .cand:hover:not(:disabled) { border-color: #f59e0b; color: #f59e0b; }
  .cand-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; text-align: left; }
  .cand-path { font-family: var(--font-mono, monospace); font-size: 11px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cand-meta { font-size: 11px; color: rgba(255, 255, 255, 0.4); }
  .empty { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
  .manage { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.7); }
  .row-actions { display: flex; gap: 8px; }
  .ghost {
    display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px;
    background: transparent; color: rgba(255, 255, 255, 0.8); font-size: 12px; cursor: pointer;
  }
  .ghost:hover:not(:disabled) { color: #fff; background: rgba(255, 255, 255, 0.08); }
  .ghost:disabled { opacity: 0.5; cursor: default; }
  footer {
    display: flex; justify-content: center;
  }
  .hint {
    font-size: 11px; color: rgba(255, 255, 255, 0.4); text-align: center; margin: 0;
  }
  .hint strong { color: rgba(255, 255, 255, 0.6); }
  .err { font-size: 12px; color: var(--color-danger, #ef4444); text-align: center; margin: 0; }
</style>
