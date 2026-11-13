<script lang="ts">
  /**
   * EmployeesView — Dedicated workspace for Hivework Autonomous AI Employees.
   *
   * Displays all 8 full-time roles (60 scheduled routines) with capability badges,
   * routine schedules, connected providers, and 1-click hire/install prompts.
   */
  import { errorText } from "$lib/types";
  import Search from "@lucide/svelte/icons/search";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";
  import Clock from "@lucide/svelte/icons/clock";
  import Zap from "@lucide/svelte/icons/zap";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import Terminal from "@lucide/svelte/icons/terminal";
  import X from "@lucide/svelte/icons/x";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  import { AI_EMPLOYEES, type AiEmployee, type EmployeeRoutine } from "$lib/data/employeesCatalog";
  import { toast } from "$lib/stores/toast.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";

  let search = $state("");
  let selectedCategory = $state<string>("all");
  let inspectEmployee = $state<AiEmployee | null>(null);
  let copiedSlug = $state<string | null>(null);

  const categories = [
    { id: "all", label: "All Roles", count: AI_EMPLOYEES.length },
    { id: "growth", label: "Growth & GTM", count: AI_EMPLOYEES.filter(e => e.category === "growth").length },
    { id: "engineering", label: "Engineering & Web", count: AI_EMPLOYEES.filter(e => e.category === "engineering").length },
    { id: "marketing", label: "Marketing & Paid", count: AI_EMPLOYEES.filter(e => e.category === "marketing").length },
    { id: "sales", label: "Sales & CS", count: AI_EMPLOYEES.filter(e => e.category === "sales").length },
    { id: "executive", label: "Executive & Ops", count: AI_EMPLOYEES.filter(e => e.category === "executive").length },
  ];

  const filteredEmployees = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return AI_EMPLOYEES.filter((emp) => {
      const matchCat = selectedCategory === "all" || emp.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.tagline.toLowerCase().includes(q) ||
        emp.highlights.some(h => h.toLowerCase().includes(q)) ||
        emp.routines.some(r => r.id.toLowerCase().includes(r))
      );
    });
  });

  async function copyHirePrompt(emp: AiEmployee) {
    try {
      await navigator.clipboard.writeText(emp.installPrompt);
      copiedSlug = emp.slug;
      toast.success(
        i18n.optional("employees.hiredCopied", `Activation prompt for ${emp.name} copied to clipboard!`)
      );
      setTimeout(() => {
        if (copiedSlug === emp.slug) copiedSlug = null;
      }, 2500);
    } catch (e) {
      toast.error(i18n.t("common.copyFailed"), errorText(e));
    }
  }

  async function copyCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      toast.success("CLI clone & hire command copied to clipboard!");
    } catch (e) {
      toast.error(i18n.t("common.copyFailed"), errorText(e));
    }
  }

  function totalRoutinesCount() {
    return AI_EMPLOYEES.reduce((acc, e) => acc + e.routines.length, 0);
  }
</script>

<div class="employees-view">
  <!-- Title bar header -->
  <header class="ev-head" data-tauri-drag-region>
    <div class="ev-titles" data-tauri-drag-region="false">
      <div class="ev-head-top">
        <h1 class="ev-title">Autonomous AI Employees</h1>
        <span class="ev-badge-pill">8 Full-Time Roles · {totalRoutinesCount()} Routines</span>
      </div>
      <p class="ev-sub">
        Self-operating local AI employee packages with persistent memory, scheduled routines, and guarded authority gates.
      </p>
    </div>
  </header>

  <div class="ev-scroll">
    <!-- Hero Banner -->
    <div class="ev-hero-banner">
      <div class="ev-hb-content">
        <span class="ev-hb-tag">HIVEWORK · AUTONOMOUS FLEET</span>
        <h3 class="ev-hb-title">Deploy Dedicated AI Employees Into Your Business</h3>
        <p class="ev-hb-desc">
          Unlike solo prompt agents, each AI Employee is an autonomous role kit designed for <strong>Claude Code</strong>, <strong>Codex</strong>, or <strong>Antigravity</strong> with a full routine schedule, verification criteria, and clean workspace separation.
        </p>
      </div>
      <div class="ev-hb-stats">
        <div class="ev-stat">
          <span class="ev-stat-val">8</span>
          <span class="ev-stat-lbl">Employees</span>
        </div>
        <div class="ev-stat">
          <span class="ev-stat-val">{totalRoutinesCount()}</span>
          <span class="ev-stat-lbl">Scheduled Routines</span>
        </div>
        <div class="ev-stat">
          <span class="ev-stat-val">100%</span>
          <span class="ev-stat-lbl">Local & Private</span>
        </div>
      </div>
    </div>

    <!-- Filter and search bar -->
    <div class="ev-toolbar">
      <div class="ev-pills">
        {#each categories as cat}
          <button
            class="ev-pill"
            class:active={selectedCategory === cat.id}
            onclick={() => (selectedCategory = cat.id)}
          >
            <span>{cat.label}</span>
            <span class="ev-pill-count">{cat.count}</span>
          </button>
        {/each}
      </div>

      <div class="ev-search-box">
        <Search size={14} class="ev-search-ic" />
        <input
          type="text"
          bind:value={search}
          placeholder="Filter employees by role, capability, or routine..."
          class="ev-search-input"
        />
        {#if search}
          <button class="ev-search-clear" onclick={() => (search = "")}>
            <X size={12} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Employee Cards Grid -->
    <div class="ev-grid">
      {#each filteredEmployees as emp (emp.slug)}
        {@const isCopied = copiedSlug === emp.slug}
        <article class="ev-card" style="--accent: {emp.accent}">
          <div class="ev-card-top">
            <div class="ev-card-avatar" style="border-color: {emp.accent}">
              <span class="ev-avatar-emoji">{emp.emoji}</span>
            </div>
            <div class="ev-card-meta">
              <div class="ev-card-title-row">
                <h3 class="ev-card-name">{emp.name}</h3>
                <span class="ev-ver-badge">v{emp.version}</span>
              </div>
              <span class="ev-card-role" style="color: {emp.accent}">{emp.role}</span>
            </div>
          </div>

          <p class="ev-card-desc">{emp.tagline}</p>

          <!-- Objective block -->
          <div class="ev-objective-box">
            <span class="ev-obj-label">Objective:</span>
            <span class="ev-obj-text">{emp.objective}</span>
          </div>

          <!-- Routines preview -->
          <div class="ev-routines-preview">
            <div class="ev-routines-head">
              <span class="ev-routines-title">
                <Clock size={12} />
                <span>{emp.routines.length} Routines</span>
              </span>
              <span class="ev-standup-badge">Daily {emp.standupRoutine}</span>
            </div>
            <div class="ev-routine-tags">
              {#each emp.routines.slice(0, 4) as r}
                <span class="ev-rtag" title={`${r.fire} ${r.days} (${r.budget})`}>
                  <span class="ev-rtag-time">{r.fire}</span>
                  <span class="ev-rtag-name">{r.id.replace(/^[a-z]+-/, "")}</span>
                </span>
              {/each}
              {#if emp.routines.length > 4}
                <span class="ev-rtag-more">+{emp.routines.length - 4} more</span>
              {/if}
            </div>
          </div>

          <!-- Harnesses / Capabilities -->
          <div class="ev-harness-row">
            <span class="ev-harness-lbl">Harnesses:</span>
            <div class="ev-harness-pills">
              {#each emp.harnesses.slice(0, 4) as h}
                <span class="ev-hpill">{h}</span>
              {/each}
            </div>
          </div>

          <!-- Actions -->
          <div class="ev-card-actions">
            <button
              class="ev-btn ev-btn-hire"
              onclick={() => copyHirePrompt(emp)}
              title="Copy the full system prompt to hire this employee"
            >
              {#if isCopied}
                <Check size={14} />
                <span>Prompt Copied!</span>
              {:else}
                <Copy size={14} />
                <span>Copy Hire Prompt</span>
              {/if}
            </button>
            <button
              class="ev-btn ev-btn-inspect"
              onclick={() => (inspectEmployee = emp)}
              title="Inspect routines, role charter, and connection configs"
            >
              <Zap size={14} />
              <span>Inspect</span>
            </button>
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>

<!-- Modal / Slide-over Inspector for Employee -->
{#if inspectEmployee}
  {@const emp = inspectEmployee}
  <div
    class="ev-modal-overlay"
    role="presentation"
    onclick={() => (inspectEmployee = null)}
    onkeydown={(e) => { if (e.key === 'Escape') inspectEmployee = null; }}
  >
    <div
      class="ev-modal-box"
      role="dialog"
      aria-modal="true"
      aria-label="{emp.name} inspector"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <header class="ev-modal-head">
        <div class="ev-mhead-info">
          <div class="ev-card-avatar" style="border-color: {emp.accent}; width: 44px; height: 44px; font-size: 22px;">
            <span>{emp.emoji}</span>
          </div>
          <div>
            <div class="ev-mtitle-row">
              <h2 class="ev-mname">{emp.name}</h2>
              <span class="ev-ver-badge">v{emp.version}</span>
            </div>
            <span class="ev-mrole" style="color: {emp.accent}">{emp.role} · Standard {emp.standard}</span>
          </div>
        </div>
        <button class="ev-modal-close" onclick={() => (inspectEmployee = null)}>
          <X size={18} />
        </button>
      </header>

      <div class="ev-modal-body">
        <!-- Quick Hire Command -->
        <div class="ev-code-box">
          <div class="ev-code-head">
            <span>Terminal Hire & Scaffold Command</span>
            <button class="ev-copy-cmd" onclick={() => copyCommand(emp.quickHireCommand)}>
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
          <code class="ev-code-snippet">{emp.quickHireCommand}</code>
        </div>

        <!-- Highlights -->
        <div class="ev-section">
          <h4 class="ev-sec-title">Core Operating Charter</h4>
          <ul class="ev-highlights-list">
            {#each emp.highlights as hl}
              <li>{hl}</li>
            {/each}
          </ul>
        </div>

        <!-- Scheduled Routines -->
        <div class="ev-section">
          <h4 class="ev-sec-title">Scheduled Routines ({emp.routines.length})</h4>
          <div class="ev-routines-table">
            {#each emp.routines as r}
              <div class="ev-rtable-row">
                <div class="ev-rtable-time">
                  <span class="ev-rtime">{r.fire}</span>
                  <span class="ev-rdays">{r.days}</span>
                </div>
                <div class="ev-rtable-info">
                  <div class="ev-rtable-title">
                    <strong>{r.id}</strong>
                    <span class="ev-rbudget">{r.budget}</span>
                    <span class="ev-rbrowser">browser: {r.browser}</span>
                  </div>
                  {#if r.acceptance}
                    <p class="ev-racc"><strong>Acceptance:</strong> {r.acceptance}</p>
                  {/if}
                  {#if r.fallback}
                    <p class="ev-rfallback"><strong>Fallback:</strong> {r.fallback}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Capability Connections -->
        {#if emp.connections.length > 0}
          <div class="ev-section">
            <h4 class="ev-sec-title">Connected Tool & Provider Integrations</h4>
            <div class="ev-connections-grid">
              {#each emp.connections as c}
                <div class="ev-conn-item">
                  <div class="ev-conn-head">
                    <span class="ev-conn-cap">{c.capability}</span>
                    {#if c.readonly}
                      <span class="ev-badge-ro">Read-only</span>
                    {:else}
                      <span class="ev-badge-rw">Guarded Write</span>
                    {/if}
                  </div>
                  <div class="ev-conn-providers">
                    {#each c.providers as p}
                      <span class="ev-conn-prov">{p}</span>
                    {/each}
                  </div>
                  {#if c.held}
                    <p class="ev-conn-held">Gate: {c.held}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <footer class="ev-modal-foot">
        <button class="ev-btn ev-btn-hire" onclick={() => copyHirePrompt(emp)}>
          <Copy size={14} />
          <span>Copy Activation Prompt (INSTALL-PROMPT.md)</span>
        </button>
        <button class="ev-btn ev-btn-close" onclick={() => (inspectEmployee = null)}>
          Close
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .employees-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .ev-head {
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }
  .ev-head-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ev-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .ev-badge-pill {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: var(--color-brand);
    font-weight: 600;
  }
  .ev-sub {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 4px 0 0;
  }

  .ev-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Hero banner */
  .ev-hero-banner {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 20, 20, 0.9) 100%);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: var(--radius-lg, 12px);
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 32px;
  }
  .ev-hb-content {
    max-width: 680px;
  }
  .ev-hb-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-brand);
    display: inline-block;
    margin-bottom: 6px;
  }
  .ev-hb-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--color-text-primary);
  }
  .ev-hb-desc {
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0;
  }
  .ev-hb-stats {
    display: flex;
    gap: 20px;
    flex-shrink: 0;
  }
  .ev-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--color-border);
    padding: 12px 18px;
    border-radius: var(--radius-md, 8px);
    min-width: 90px;
  }
  .ev-stat-val {
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 700;
    color: var(--color-brand);
  }
  .ev-stat-lbl {
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }

  /* Toolbar */
  .ev-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .ev-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ev-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-sunken);
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 120ms ease;
  }
  .ev-pill:hover {
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    border-color: var(--color-border-hover);
  }
  .ev-pill.active {
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.4);
    color: var(--color-brand);
    font-weight: 600;
  }
  .ev-pill-count {
    font-family: var(--font-mono);
    font-size: 10px;
    opacity: 0.8;
  }

  .ev-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    padding: 6px 12px;
    width: 320px;
  }
  :global(.ev-search-ic) {
    color: var(--color-text-tertiary);
  }
  .ev-search-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-text-primary);
    font-size: 12px;
    width: 100%;
  }
  .ev-search-clear {
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 0;
  }

  /* Grid of cards */
  .ev-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 18px;
  }

  .ev-card {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg, 12px);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: all 160ms ease;
    position: relative;
    overflow: hidden;
  }
  .ev-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent);
    opacity: 0.8;
  }
  .ev-card:hover {
    border-color: rgba(245, 158, 11, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .ev-card-top {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ev-card-avatar {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .ev-card-meta {
    flex: 1;
    min-width: 0;
  }
  .ev-card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ev-card-name {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ev-ver-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    color: var(--color-text-tertiary);
  }
  .ev-card-role {
    font-size: 12px;
    font-weight: 600;
    display: block;
    margin-top: 2px;
  }

  .ev-card-desc {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .ev-objective-box {
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 11.5px;
  }
  .ev-obj-label {
    font-weight: 600;
    color: var(--color-text-primary);
    margin-right: 4px;
  }
  .ev-obj-text {
    color: var(--color-text-secondary);
  }

  .ev-routines-preview {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ev-routines-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ev-routines-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ev-standup-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-brand);
  }
  .ev-routine-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ev-rtag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10.5px;
  }
  .ev-rtag-time {
    font-family: var(--font-mono);
    color: var(--color-brand);
    font-weight: 600;
  }
  .ev-rtag-name {
    color: var(--color-text-secondary);
  }
  .ev-rtag-more {
    font-size: 10.5px;
    color: var(--color-text-tertiary);
    align-self: center;
  }

  .ev-harness-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }
  .ev-harness-lbl {
    color: var(--color-text-tertiary);
  }
  .ev-harness-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .ev-hpill {
    font-family: var(--font-mono);
    font-size: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--color-border);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--color-text-secondary);
  }

  .ev-card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--color-border);
  }
  .ev-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: var(--radius-md, 6px);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
    border: 1px solid transparent;
  }
  .ev-btn-hire {
    flex: 1;
    background: var(--color-brand);
    color: #000;
  }
  .ev-btn-hire:hover {
    background: var(--color-brand-hover, #fbbf24);
  }
  .ev-btn-inspect {
    background: var(--color-surface-sunken);
    border-color: var(--color-border);
    color: var(--color-text-primary);
  }
  .ev-btn-inspect:hover {
    background: var(--color-surface);
    border-color: var(--color-border-hover);
  }
  .ev-btn-close {
    background: var(--color-surface-sunken);
    border-color: var(--color-border);
    color: var(--color-text-secondary);
  }

  /* Modal */
  .ev-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .ev-modal-box {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg, 12px);
    width: 100%;
    max-width: 780px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  }
  .ev-modal-head {
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-surface);
  }
  .ev-mhead-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ev-mtitle-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ev-mname {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
  }
  .ev-mrole {
    font-size: 12px;
    font-weight: 600;
  }
  .ev-modal-close {
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 4px;
  }
  .ev-modal-close:hover {
    color: var(--color-text-primary);
  }

  .ev-modal-body {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .ev-code-box {
    background: #000;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
  }
  .ev-code-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .ev-copy-cmd {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    color: var(--color-brand);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 10px;
    cursor: pointer;
  }
  .ev-code-snippet {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: #4ade80;
    word-break: break-all;
    display: block;
  }

  .ev-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ev-sec-title {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-brand);
  }
  .ev-highlights-list {
    margin: 0;
    padding-left: 20px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }

  .ev-routines-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ev-rtable-row {
    display: flex;
    gap: 14px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 10px 12px;
  }
  .ev-rtable-time {
    display: flex;
    flex-direction: column;
    min-width: 60px;
  }
  .ev-rtime {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-brand);
  }
  .ev-rdays {
    font-size: 10.5px;
    color: var(--color-text-tertiary);
  }
  .ev-rtable-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ev-rtable-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
  }
  .ev-rbudget, .ev-rbrowser {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-tertiary);
  }
  .ev-racc, .ev-rfallback {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--color-text-secondary);
  }

  .ev-connections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }
  .ev-conn-item {
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ev-conn-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ev-conn-cap {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }
  .ev-badge-ro {
    font-size: 9.5px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }
  .ev-badge-rw {
    font-size: 9.5px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  .ev-conn-providers {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .ev-conn-prov {
    font-size: 10px;
    background: var(--color-surface);
    padding: 1px 4px;
    border-radius: 2px;
    color: var(--color-text-secondary);
  }
  .ev-conn-held {
    font-size: 10px;
    color: #fbbf24;
    margin: 0;
  }

  .ev-modal-foot {
    padding: 14px 20px;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>
