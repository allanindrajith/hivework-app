<script lang="ts">
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import GlobeIcon from "@lucide/svelte/icons/globe";

  import { ui } from "$lib/stores/ui.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { safeOpenUrl } from "$lib/util/url";
</script>

<div class="cluster" data-tauri-drag-region="false" role="group" aria-label={i18n.t("titlebar.controls")}>
  <button
    type="button"
    class="ctrl web-pill"
    onclick={() => safeOpenUrl("https://hivework.online")}
    title="Open hivework.online"
    aria-label="Open hivework.online"
  >
    <GlobeIcon size={12} />
    <span class="mono-label">hivework.online</span>
  </button>

  <button
    type="button"
    class="ctrl creator-pill"
    onclick={() => safeOpenUrl("https://itsallan.me")}
    title="Built by Allan Indrajith — itsallan.me"
    aria-label="Open itsallan.me"
  >
    <span class="mono-label">itsallan.me</span>
  </button>

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
                color var(--motion-duration-fast) var(--motion-ease-out),
                border-color var(--motion-duration-fast) var(--motion-ease-out);
  }
  .ctrl:hover {
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
  }

  .mono-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
  }

  .ctrl.web-pill {
    color: var(--color-text-secondary);
  }
  .ctrl.web-pill:hover {
    color: var(--color-brand);
  }

  .ctrl.creator-pill {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: var(--radius-full);
    color: var(--color-brand);
    height: 22px;
    padding: 0 9px;
  }
  .ctrl.creator-pill:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: var(--color-brand);
    color: var(--color-brand-hover);
  }

  .guide-label {
    font-size: 11px;
    font-weight: 500;
    color: inherit;
  }
</style>
