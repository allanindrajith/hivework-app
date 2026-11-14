<script lang="ts">
  /**
   * SettingsSectionAppearance.svelte — Phase 12b
   *
   * Theme radio (Light/Dark/System), default landing dropdown, vibrancy
   * material dropdown. All settings persist via `ui.svelte.ts`
   * localStorage helpers.
   */

  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import Monitor from "@lucide/svelte/icons/monitor";

  import { ui } from "$lib/stores/ui.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import { LOCALES, localeLabels, type Locale } from "$lib/i18n/messages";
  import type { ThemePreference } from "$lib/types";

  function onLocaleChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value as Locale;
    i18n.setLocale(value);
  }
  function pickTheme(t: ThemePreference) { ui.setTheme(t); }
</script>

<div class="section">
  <h2>{i18n.t("settings.appearance.title")}</h2>

  <div class="field">
    <label for="theme-group">{i18n.t("settings.appearance.theme")}</label>
    <div id="theme-group" class="radio-row" role="radiogroup" aria-label={i18n.t("settings.appearance.theme")}>
      <button
        type="button"
        class="radio-btn"
        class:on={ui.theme === "light"}
        role="radio"
        aria-checked={ui.theme === "light"}
        onclick={() => pickTheme("light")}
      >
        <Sun size={14} /> {i18n.t("app.theme.light")}
      </button>
      <button
        type="button"
        class="radio-btn"
        class:on={ui.theme === "dark"}
        role="radio"
        aria-checked={ui.theme === "dark"}
        onclick={() => pickTheme("dark")}
      >
        <Moon size={14} /> {i18n.t("app.theme.dark")}
      </button>
      <button
        type="button"
        class="radio-btn"
        class:on={ui.theme === "system"}
        role="radio"
        aria-checked={ui.theme === "system"}
        onclick={() => pickTheme("system")}
      >
        <Monitor size={14} /> {i18n.t("app.theme.system")}
      </button>
    </div>
    <p class="hint">{i18n.t("settings.appearance.themeHint")}</p>
  </div>

  <div class="field">
    <label for="locale">{i18n.t("settings.appearance.language")}</label>
    <select
      id="locale"
      class="select"
      value={i18n.locale}
      onchange={onLocaleChange}
    >
      {#each LOCALES as locale (locale)}
        <option value={locale}>{localeLabels[locale]}</option>
      {/each}
    </select>
    <p class="hint">{i18n.t("settings.appearance.languageHint")}</p>
  </div>

</div>

<style>
  .section { display: flex; flex-direction: column; gap: var(--space-5); max-width: 520px; }
  h2 {
    font-size: var(--text-h1);
    font-weight: var(--fw-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  label {
    font-size: var(--text-body);
    font-weight: var(--fw-medium);
    color: var(--color-text-primary);
  }
  .hint {
    font-size: var(--text-body-sm);
    color: var(--color-text-muted);
    line-height: var(--lh-snug);
  }
  .radio-row {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
    width: max-content;
  }
  .radio-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--text-body-sm);
    font-weight: var(--fw-medium);
    cursor: pointer;
    transition: background-color var(--motion-duration-fast) var(--motion-ease-out);
  }
  .radio-btn:hover { color: var(--color-text-primary); }
  .radio-btn.on {
    background: rgba(245, 158, 11, 0.14);
    color: var(--color-brand);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }
  .select {
    width: 100%;
    max-width: 260px;
    padding: 6px var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    font-size: var(--text-body);
    font-family: var(--font-sans);
    cursor: pointer;
  }
  .select:focus-visible {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: var(--shadow-focus-ring);
  }

</style>
