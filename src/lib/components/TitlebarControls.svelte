<script lang="ts">
  import { onMount } from "svelte";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import GithubMarkIcon from "./GithubMarkIcon.svelte";

  import { ui } from "$lib/stores/ui.svelte";
  import { github } from "$lib/stores/github.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";

  /** GitHub connection status indicator state. */
  type GithubChipState = "ok" | "scope-incomplete" | "hidden";
  const githubChipState = $derived.by<GithubChipState>(() => {
    const s = github.status;
    if (!s || !s.signedIn) return "hidden";
    return s.scopes.includes("public_repo") ? "ok" : "scope-incomplete";
  });

  function openGithubSettings() {
    ui.openSettings("github");
  }

  onMount(() => {
    void github.loadStatus();
  });
</script>

<div class="cluster" data-tauri-drag-region="false" role="group" aria-label={i18n.t("titlebar.controls")}>
  {#if githubChipState !== "hidden"}
    <button
      type="button"
      class="ctrl github-chip"
      class:ok={githubChipState === "ok"}
      class:warn={githubChipState === "scope-incomplete"}
      onclick={openGithubSettings}
      title={githubChipState === "ok"
        ? i18n.t("titlebar.githubConnected", { username: github.status?.username ?? "user" })
        : i18n.t("titlebar.githubScopeIncomplete")}
      aria-label={i18n.t("titlebar.githubStatus")}
    >
      <GithubMarkIcon size={14} />
    </button>
  {/if}

  <button
    type="button"
    class="ctrl guide-btn"
    onclick={() => ui.openPlaybook()}
    title={i18n.t("titlebar.playbookTitle")}
    aria-label={i18n.t("titlebar.openPlaybook")}
  >
    <BookOpenIcon size={14} />
    <span class="guide-label">User Guide</span>
  </button>
</div>

<style>
  .cluster {
    position: relative;
    display: inline-flex;
    align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2px 4px;
    gap: 4px;
  }
  .ctrl {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 8px;
    gap: 6px;
    background: transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--motion-duration-fast) var(--motion-ease-out),
                color var(--motion-duration-fast) var(--motion-ease-out);
  }
  .ctrl:hover {
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
  }

  .guide-label {
    font-size: 11px;
    font-weight: 500;
    color: inherit;
  }

  /* GitHub connection-status chip */
  .ctrl.github-chip {
    padding: 0 4px;
  }
  .ctrl.github-chip.ok { color: #16a34a; }
  .ctrl.github-chip.ok:hover { color: #15803d; }
  .ctrl.github-chip.warn { color: #d97706; }
  .ctrl.github-chip.warn:hover { color: #b45309; }
</style>
