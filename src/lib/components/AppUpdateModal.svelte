<script lang="ts">
  import Modal from "./Modal.svelte";
  import Button from "./Button.svelte";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import CheckCircle2 from "@lucide/svelte/icons/circle-check";
  import AlertTriangle from "@lucide/svelte/icons/triangle-alert";
  import Download from "@lucide/svelte/icons/download";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  import { updater } from "$lib/stores/updater.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { safeOpenUrl } from "$lib/util/url";
  import appIcon from "$lib/assets/app-icon.png";
  import appIconDark from "$lib/assets/app-icon-dark.png";

  const RELEASES_URL = "https://github.com/allanindrajith/hivework-app/releases";

  const info = $derived(updater.available);

  function onSkip() {
    if (info) {
      void updater.skip(info.version);
    }
    ui.closeAppUpdateModal();
  }

  function onInstall() {
    if (info) {
      void updater.install(info.version);
    }
  }

  function onRelaunch() {
    void updater.relaunch();
  }

  function openReleasePage() {
    void safeOpenUrl(RELEASES_URL);
  }
</script>

<Modal
  open={ui.appUpdateModalOpen}
  title={info ? i18n.t("updates.indicatorAvailable") : i18n.t("updates.title")}
  onClose={() => ui.closeAppUpdateModal()}
  size="default"
>
  <div class="update-body">
    <div class="hero">
      <img class="brand-mark light" src={appIcon} alt="Hivework" width="64" height="64" />
      <img class="brand-mark dark" src={appIconDark} alt="" aria-hidden="true" width="64" height="64" />
    </div>

    {#if updater.checking}
      <div class="status-box center">
        <LoaderCircle size={28} class="spin" />
        <p class="status-msg">{i18n.t("updates.checking")}</p>
      </div>
    {:else if info}
      <div class="update-info">
        <div class="version-banner">
          <div class="v-title">
            <Sparkles size={18} class="sparkle-icon" />
            <h3>Hivework v{info.version}</h3>
          </div>
          <div class="v-tags">
            <span class="v-tag new">v{info.version}</span>
            <span class="v-tag cur">{i18n.t("about.version")}: v{info.currentVersion}</span>
          </div>
        </div>

        {#if info.notes}
          <div class="notes-box">
            <div class="notes-head">
              <span class="sub-label">{i18n.t("updates.releaseNotes")}</span>
              <button class="link-btn" onclick={openReleasePage}>
                GitHub <ExternalLink size={12} />
              </button>
            </div>
            <div class="notes-content">
              {info.notes}
            </div>
          </div>
        {/if}

        {#if updater.installComplete}
          <div class="status-box success">
            <CheckCircle2 size={20} />
            <div class="status-text">
              <strong>{i18n.t("updates.installComplete")}</strong>
            </div>
          </div>
        {:else if updater.installing}
          <div class="status-box progress">
            <LoaderCircle size={20} class="spin" />
            <div class="status-text">
              <span>{i18n.t("updates.downloading", { version: info.version })}</span>
            </div>
          </div>
        {:else if updater.error}
          <div class="status-box error">
            <AlertTriangle size={20} />
            <div class="status-text">
              <span>{updater.error}</span>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="status-box center up-to-date">
        <CheckCircle2 size={36} class="ok-icon" />
        <h3>{i18n.t("common.upToDate")}</h3>
        <p class="status-msg">Hivework is running the latest available version.</p>
      </div>
    {/if}
  </div>

  {#snippet actions()}
    {#if updater.installComplete}
      <Button variant="primary" onclick={onRelaunch}>
        {i18n.t("common.relaunchNow")}
      </Button>
    {:else if info}
      {#if !updater.installing}
        <Button variant="ghost" onclick={onSkip}>
          {i18n.t("updates.skipVersion")}
        </Button>
        <Button variant="secondary" onclick={() => ui.closeAppUpdateModal()}>
          {i18n.t("common.cancel")}
        </Button>
      {/if}
      <Button
        variant="primary"
        disabled={updater.installing}
        loading={updater.installing}
        onclick={onInstall}
      >
        {#snippet icon()}
          <Download size={14} />
        {/snippet}
        {updater.error ? i18n.t("updates.retryTitle") : i18n.t("updates.install")}
      </Button>
    {:else}
      <Button variant="secondary" disabled={updater.checking} onclick={() => void updater.checkNow()}>
        {i18n.t("updates.checkNow")}
      </Button>
      <Button variant="primary" onclick={() => ui.closeAppUpdateModal()}>
        {i18n.t("common.close")}
      </Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .update-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .hero {
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-1, 4px);
  }
  .brand-mark {
    display: block;
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 6px 14px color-mix(in oklch, black 40%, transparent));
  }
  .brand-mark.dark { display: none; }
  :global([data-theme="dark"]) .brand-mark.light { display: none; }
  :global([data-theme="dark"]) .brand-mark.dark { display: block; }

  .update-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
  }

  .version-banner {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--space-3, 12px);
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
  }
  .v-title {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }
  .v-title h3 {
    margin: 0;
    font-size: var(--text-h2, 16px);
    font-weight: 600;
    color: var(--color-text-primary);
  }
  :global(.sparkle-icon) {
    color: var(--color-brand, #f59e0b);
  }

  .v-tags {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }
  .v-tag {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full, 999px);
    font-family: var(--font-mono, monospace);
  }
  .v-tag.new {
    background: color-mix(in srgb, var(--color-brand) 18%, transparent);
    color: var(--color-brand);
    border: 1px solid color-mix(in srgb, var(--color-brand) 30%, transparent);
  }
  .v-tag.cur {
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .notes-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .notes-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sub-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }
  .link-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--color-text-link, #38bdf8);
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }
  .link-btn:hover { text-decoration: underline; }

  .notes-content {
    padding: var(--space-3, 12px);
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    max-height: 160px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .status-box {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    padding: var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    font-size: 13px;
  }
  .status-box.center {
    flex-direction: column;
    text-align: center;
    padding: var(--space-5, 20px) 0;
  }
  .status-box.progress {
    background: color-mix(in srgb, var(--color-brand) 10%, transparent);
    color: var(--color-brand);
    border: 1px solid color-mix(in srgb, var(--color-brand) 25%, transparent);
  }
  .status-box.success {
    background: color-mix(in srgb, var(--color-success, #22c55e) 12%, transparent);
    color: var(--color-success, #22c55e);
    border: 1px solid color-mix(in srgb, var(--color-success, #22c55e) 30%, transparent);
  }
  .status-box.error {
    background: color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent);
    color: var(--color-danger, #ef4444);
    border: 1px solid color-mix(in srgb, var(--color-danger, #ef4444) 30%, transparent);
  }
  .up-to-date {
    gap: var(--space-2, 8px);
  }
  .up-to-date h3 {
    margin: 0;
    font-size: var(--text-h2, 16px);
    color: var(--color-text-primary);
  }
  :global(.ok-icon) {
    color: var(--color-success, #22c55e);
  }
  .status-msg {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
