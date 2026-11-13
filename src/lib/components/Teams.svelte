<script lang="ts">
  /**
   * Teams — Multi-agent squad orchestration & team management.
   * Features:
   *  - Top Connected AI Tools & Harnesses status bar
   *  - Multi-Agent Squads grid with visual member avatar flow & 1-click deploy
   *  - Team details inspector with playbook examples & member roster
   *  - Active Team (Loadout) with Agentfile export/import and save team
   */
  import { errorText } from "$lib/types";
  import { onMount, type Component } from "svelte";
  import EmptyState from "./EmptyState.svelte";
  import Pill from "./Pill.svelte";
  import Modal from "./Modal.svelte";
  import Button from "./Button.svelte";
  import Input from "./Input.svelte";
  import InstallModal from "./InstallModal.svelte";
  import StarterPrompt from "./StarterPrompt.svelte";

  import UploadIcon from "@lucide/svelte/icons/upload";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import SaveIcon from "@lucide/svelte/icons/bookmark-plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import UsersIcon from "@lucide/svelte/icons/users";
  import RocketIcon from "@lucide/svelte/icons/rocket";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Play from "@lucide/svelte/icons/play";

  import { install, SUPPORTED_TOOLS } from "$lib/stores/install.svelte";
  import { corpus } from "$lib/stores/corpus.svelte";
  import { teams, type SavedTeam } from "$lib/stores/teams.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { resolveCategoryIcon } from "$lib/util/categoryIcon";
  import { i18n } from "$lib/stores/i18n.svelte";
  import type { MessageKey } from "$lib/i18n/messages";
  import { PRESET_TEAMS } from "$lib/data/presetTeams";
  import { TEAM_EXAMPLES } from "$lib/data/playbook";
  import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
  import type { InstalledAgent, Agent } from "$lib/types";

  onMount(() => {
    corpus.ensureLoaded();
    teams.hydrate();
  });

  let tab = $state<"presets" | "current">("presets");
  let busy = $state(false);

  // Managed installs for active team loadout
  const managed = $derived(install.installed.filter((i) => i.state !== "foreign"));
  const managedSlugs = $derived([...new Set(managed.map((m) => m.slug))]);

  const OTHER = "__other";
  const groups = $derived.by(() => {
    const divOf = new Map(corpus.agents.map((a) => [a.slug, a.category]));
    const m = new Map<string, InstalledAgent[]>();
    for (const r of managed) {
      const div = divOf.get(r.slug) ?? OTHER;
      const arr = m.get(div);
      if (arr) arr.push(r);
      else m.set(div, [r]);
    }
    const out = [...m.entries()].map(([slug, rows]) => ({
      slug,
      label: slug === OTHER ? i18n.t("common.other") : corpus.labelOf(slug),
      color: slug === OTHER ? "#94A3B8" : corpus.colorOf(slug),
      icon: slug === OTHER ? "HelpCircle" : corpus.iconOf(slug),
      rows: rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
    out.sort((a, b) => (a.slug === OTHER ? 1 : b.slug === OTHER ? -1 : a.label.localeCompare(b.label)));
    return out;
  });

  let collapsed = $state<Set<string>>(new Set());
  function toggle(slug: string) {
    const next = new Set(collapsed);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    collapsed = next;
  }
  let collapseSeeded = false;
  $effect(() => {
    if (collapseSeeded || groups.length === 0) return;
    collapseSeeded = true;
    collapsed = new Set(groups.map((g) => g.slug));
  });
  const allCollapsed = $derived(groups.length > 0 && groups.every((g) => collapsed.has(g.slug)));
  function toggleAll() {
    collapsed = allCollapsed ? new Set() : new Set(groups.map((g) => g.slug));
  }

  // Deploy modal target
  let deployTarget = $state<{ title: string; agents: string[] } | null>(null);
  function deploy(title: string, agents: string[]) {
    deployTarget = { title, agents };
  }

  function presetLabel(slug: string): string {
    const p = PRESET_TEAMS.find((x) => x.slug === slug);
    return i18n.optional(`preset.${slug}.label`, p?.label ?? slug);
  }
  function presetDescription(slug: string): string {
    const p = PRESET_TEAMS.find((x) => x.slug === slug);
    return i18n.optional(`preset.${slug}.description`, p?.description ?? "");
  }
  function teamExamples(slug: string): string[] {
    const fallback = TEAM_EXAMPLES[slug] ?? [];
    return fallback.map((example, i) => i18n.optional(`teamExample.${slug}.${i + 1}`, example));
  }

  type TeamView = {
    key: string;
    label: string;
    description: string;
    color: string | null;
    icon: Component;
    saved: boolean;
    agents: string[];
    examples: string[];
  };

  function openPreset(p: (typeof PRESET_TEAMS)[number]) {
    tab = "presets";
    ui.selectTeam(`preset:${p.slug}`);
  }
  function openSaved(t: SavedTeam) {
    tab = "presets";
    ui.selectTeam(`saved:${t.id}`);
  }
  function closeDetail() {
    ui.selectTeam(null);
  }

  const openedTeam = $derived.by<TeamView | null>(() => {
    const key = ui.teamsSelected;
    if (!key) return null;
    if (key.startsWith("preset:")) {
      const slug = key.slice("preset:".length);
      const p = PRESET_TEAMS.find((x) => x.slug === slug);
      return p
        ? {
            key,
            label: presetLabel(p.slug),
            description: presetDescription(p.slug),
            color: p.color,
            icon: p.icon,
            saved: false,
            agents: p.agents,
            examples: teamExamples(p.slug),
          }
        : null;
    }
    if (key.startsWith("saved:")) {
      const id = key.slice("saved:".length);
      const t = teams.saved.find((x) => x.id === id);
      return t
        ? {
            key,
            label: t.name,
            description: i18n.t("teams.savedTeamDesc", { count: t.agents.length }),
            color: null,
            icon: UsersIcon as unknown as Component,
            saved: true,
            agents: t.agents,
            examples: [],
          }
        : null;
    }
    return null;
  });

  const TOTHER = "__other";
  const detailGroups = $derived.by(() => {
    if (!openedTeam) return [];
    const present = corpus.agents.filter((a) => openedTeam!.agents.includes(a.slug));
    const m = new Map<string, Agent[]>();
    for (const a of present) {
      const d = a.category || TOTHER;
      const arr = m.get(d);
      if (arr) arr.push(a);
      else m.set(d, [a]);
    }
    const out = [...m.entries()].map(([slug, rows]) => ({
      slug,
      label: slug === TOTHER ? i18n.t("common.other") : corpus.labelOf(slug),
      color: slug === TOTHER ? "#94A3B8" : corpus.colorOf(slug),
      icon: slug === TOTHER ? "HelpCircle" : corpus.iconOf(slug),
      rows: rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
    out.sort((a, b) => (a.slug === TOTHER ? 1 : b.slug === TOTHER ? -1 : a.label.localeCompare(b.label)));
    return out;
  });
  const detailMissing = $derived(
    openedTeam ? openedTeam.agents.length - detailGroups.reduce((n, g) => n + g.rows.length, 0) : 0,
  );
  const detailExamples = $derived(
    openedTeam
      ? openedTeam.examples.length > 0
        ? openedTeam.examples
        : [i18n.t("teams.genericExample", { team: openedTeam.label })]
      : [],
  );

  let teamCollapsed = $state<Set<string>>(new Set());
  function toggleTeamGroup(slug: string) {
    const next = new Set(teamCollapsed);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    teamCollapsed = next;
  }
  let tcInitFor = "";
  $effect(() => {
    const k = openedTeam?.key ?? "";
    if (k === tcInitFor || detailGroups.length === 0) return;
    tcInitFor = k;
    teamCollapsed = new Set(detailGroups.map((g) => g.slug));
  });

  const corpusSlugs = $derived(new Set(corpus.agents.map((a) => a.slug)));
  const installedSlugs = $derived(
    new Set(install.installed.filter((i) => i.state !== "removed").map((i) => i.slug)),
  );
  function teamStats(agents: string[]) {
    const present = agents.filter((s) => corpusSlugs.has(s));
    const deployed = present.filter((s) => installedSlugs.has(s)).length;
    return { count: present.length, deployed };
  }

  // Helper to fetch member agents for avatar display
  function getTeamMembers(slugs: string[]): Agent[] {
    return slugs
      .map((slug) => corpus.agents.find((a) => a.slug === slug || a.slug.endsWith(slug)))
      .filter((a): a is Agent => a != null)
      .slice(0, 4);
  }

  // Connected tools summary
  const toolCards = $derived([
    {
      id: "claudeCode",
      label: "Claude Code",
      detected: install.tools.find((t) => t.tool === "claudeCode" || t.tool === "claude")?.detected ?? false,
      count: install.installed.filter((i) => i.tool === "claudeCode" || i.tool === "claude").length,
    },
    {
      id: "codex",
      label: "Codex",
      detected: install.tools.find((t) => t.tool === "codex")?.detected ?? false,
      count: install.installed.filter((i) => i.tool === "codex").length,
    },
    {
      id: "antigravity",
      label: "Antigravity",
      detected: install.tools.find((t) => t.tool === "antigravity")?.detected ?? false,
      count: install.installed.filter((i) => i.tool === "antigravity").length,
    },
    {
      id: "copilot",
      label: "GitHub Copilot",
      detected: install.tools.find((t) => t.tool === "copilot")?.detected ?? false,
      count: install.installed.filter((i) => i.tool === "copilot").length,
    },
  ]);

  // Save current team
  let saveOpen = $state(false);
  let saveName = $state("");
  function openSave() {
    saveName = "";
    saveOpen = true;
  }
  function confirmSave() {
    if (managedSlugs.length === 0) return;
    const t = teams.save(saveName, managedSlugs);
    saveOpen = false;
    tab = "presets";
    toast.success(
      i18n.t("teams.savedToast", { name: t.name }),
      i18n.count(t.agents.length, "common.agent.one", "common.agent.many"),
    );
  }
  function deleteSaved(t: SavedTeam) {
    teams.remove(t.id);
    toast.success(i18n.t("teams.deletedToast", { name: t.name }));
  }

  // Export / Import
  async function exportLoadout() {
    const path = await saveDialog({
      title: i18n.t("teams.saveAgentfileTitle"),
      defaultPath: "Agentfile.json",
      filters: [{ name: "Agentfile", extensions: ["json"] }],
    });
    if (!path) return;
    busy = true;
    try {
      const n = await install.exportLoadout(path);
      toast.success(i18n.t("teams.exportedToast", { count: n }), path);
    } catch (e) {
      toast.error(i18n.t("teams.exportFailed"), errorText(e));
    } finally {
      busy = false;
    }
  }
  async function importLoadout() {
    const picked = await openDialog({
      title: i18n.t("teams.restoreAgentfileTitle"),
      multiple: false,
      filters: [{ name: "Agentfile", extensions: ["json"] }],
    });
    if (!picked || Array.isArray(picked)) return;
    busy = true;
    try {
      const recs = await install.importLoadout(picked);
      toast.success(i18n.t("teams.restoredToast", { count: recs.length }), picked);
    } catch (e) {
      toast.error(i18n.t("teams.restoreFailed"), errorText(e));
    } finally {
      busy = false;
    }
  }
</script>

<section class="teams-page">
  <!-- Top: Connected AI Tools & Harnesses Bar -->
  <div class="harness-section">
    <div class="sec-title-row">
      <span class="sec-label">Connected AI Tools & Harnesses</span>
      <button class="sec-action" onclick={() => ui.setSection("tools")}>Manage Harnesses →</button>
    </div>
    <div class="harness-grid">
      {#each toolCards as t (t.id)}
        <div class="harness-card" class:active={t.detected}>
          <div class="hc-head">
            <span class="hc-dot" class:online={t.detected}></span>
            <span class="hc-name">{t.label}</span>
            <span class="hc-status">{t.detected ? "Connected" : "Ready"}</span>
          </div>
          <div class="hc-body">
            <span class="hc-count">{t.count} Agents</span>
            <button class="hc-sync" onclick={() => ui.openTools(t.id)}>
              Sync Now
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Header with Tab Navigation -->
  <header class="teams-header">
    <div class="seg" role="tablist" aria-label={i18n.t("teams.view")}>
      <button
        class="seg-btn"
        class:on={tab === "presets"}
        role="tab"
        aria-selected={tab === "presets"}
        onclick={() => { tab = "presets"; ui.selectTeam(null); }}
      >
        <RocketIcon size={14} /> Multi-Agent Squads
      </button>
      <button
        class="seg-btn"
        class:on={tab === "current"}
        role="tab"
        aria-selected={tab === "current"}
        onclick={() => (tab = "current")}
      >
        <UsersIcon size={14} /> {i18n.t("teams.yourTeam")} ({managed.length})
      </button>
    </div>

    {#if tab === "current"}
      <div class="lo-actions">
        {#if managed.length > 0}
          <button class="btn ghost" onclick={toggleAll}>
            {i18n.t(allCollapsed ? "common.expandAll" : "common.collapseAll")}
          </button>
          <button class="btn" onclick={openSave}>
            <SaveIcon size={14} /><span>{i18n.t("teams.saveAsTeam")}</span>
          </button>
        {/if}
        <button class="btn" disabled={busy} onclick={importLoadout}>
          <DownloadIcon size={14} /><span>{i18n.t("teams.restore")}</span>
        </button>
        <button class="btn primary" disabled={busy || managed.length === 0} onclick={exportLoadout}>
          <UploadIcon size={14} /><span>{i18n.t("teams.export")}</span>
        </button>
      </div>
    {/if}
  </header>

  <!-- Content Body -->
  {#if openedTeam}
    <!-- Detail Inspector for Opened Squad -->
    {@const team = openedTeam}
    {@const st = teamStats(team.agents)}
    {@const HeadIcon = team.icon}
    <div class="tdetail">
      <div class="td-back-row">
        <button class="back-btn" onclick={closeDetail}>
          <ArrowLeft size={14} />
          <span>Back to Squads</span>
        </button>
      </div>

      <div class="td-head">
        <span class="td-ic" style={team.color ? `color:${team.color}` : ""}>
          <HeadIcon size={24} />
        </span>
        <div class="td-id">
          <h2 class="td-name">{team.label}</h2>
          <p class="td-desc">{team.description}</p>
        </div>
        <div class="td-actions">
          <span class="td-count">
            {i18n.count(st.count, "common.agent.one", "common.agent.many")}{#if st.deployed > 0} · {i18n.t("common.detectedCount", { count: st.deployed })}{/if}
          </span>
          <button
            class="deploy-btn"
            onclick={() => deploy(i18n.t("teams.deployTeamTitle", { team: team.label }), team.agents)}
          >
            <Play size={13} fill="currentColor" />
            <span>Run / Deploy Squad</span>
          </button>
        </div>
      </div>

      <h3 class="td-sec">{i18n.t("teams.tryThese")}</h3>
      <div class="td-examples">
        {#each detailExamples as ex (ex)}
          <StarterPrompt template={ex} />
        {/each}
      </div>

      <h3 class="td-sec">Squad Roster ({st.count} Agents)</h3>
      <div class="groups">
        {#each detailGroups as g (g.slug)}
          {@const Icon = resolveCategoryIcon(g.icon)}
          {@const isOpen = !teamCollapsed.has(g.slug)}
          <section class="grp">
            <button class="grp-head" onclick={() => toggleTeamGroup(g.slug)} aria-expanded={isOpen}>
              <ChevronDown size={15} class={isOpen ? "grp-chev open" : "grp-chev"} />
              <span class="grp-ic" style="color:{g.color}"><Icon size={15} /></span>
              <span class="grp-label">{g.label}</span>
              <span class="grp-count">{g.rows.length}</span>
            </button>
            {#if isOpen}
              <ul class="rows">
                {#each g.rows as a (a.slug)}
                  <li class="row">
                    <span class="row-emoji">{a.emoji ?? "🧩"}</span>
                    <span class="r-name">{a.name}</span>
                    <span class="r-desc">{a.vibe ?? ""}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
        {#if detailMissing > 0}
          <p class="td-missing">{i18n.t("teams.missingAgents", { count: detailMissing })}</p>
        {/if}
      </div>
    </div>
  {:else if tab === "presets"}
    <!-- Presets & Saved Squads Grid (Matching Mockup) -->
    <div class="squads-scroll">
      {#if teams.saved.length > 0}
        <h2 class="section-title">{i18n.t("teams.savedTeams")}</h2>
        <div class="squads-grid">
          {#each teams.saved as t (t.id)}
            {@const st = teamStats(t.agents)}
            <div class="squad-card" onclick={() => openSaved(t)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") openSaved(t); }}>
              <div class="sc-head">
                <span class="sc-ic saved"><UsersIcon size={20} /></span>
                <div class="sc-info">
                  <span class="sc-title">{t.name}</span>
                  <span class="sc-badge">Saved Squad</span>
                </div>
                <button
                  class="sc-del"
                  title={i18n.t("teams.deleteTeam")}
                  onclick={(e) => { e.stopPropagation(); deleteSaved(t); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p class="sc-desc">{i18n.count(st.count, "common.agent.one", "common.agent.many")}</p>
              <div class="sc-footer">
                <button
                  class="deploy-btn"
                  onclick={(e) => { e.stopPropagation(); deploy(t.name, t.agents); }}
                >
                  <Play size={12} fill="currentColor" />
                  <span>Run Squad</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="squads-grid-wrap">
        <h2 class="section-title">Multi-Agent Squads & Teams</h2>
        <div class="squads-grid">
          {#each PRESET_TEAMS as p (p.slug)}
            {@const st = teamStats(p.agents)}
            {@const Icon = p.icon}
            {@const members = getTeamMembers(p.agents)}
            <div
              class="squad-card"
              onclick={() => openPreset(p)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") openPreset(p); }}
            >
              <div class="sc-head">
                <span class="sc-ic" style="color:{p.color}; border-color: color-mix(in srgb, {p.color} 30%, transparent)">
                  <Icon size={22} />
                </span>
                <div class="sc-info">
                  <span class="sc-title">{presetLabel(p.slug)}</span>
                  <span class="sc-count">{st.count} Active Agents</span>
                </div>
                <span class="sc-status-dot"></span>
              </div>

              <p class="sc-desc">{presetDescription(p.slug)}</p>

              <!-- Connected Squad Member Avatars / Node Flow -->
              <div class="nodes-flow">
                <div class="nodes-line"></div>
                <div class="nodes-avatars">
                  {#each members as m (m.slug)}
                    <div class="node-avatar" title={m.name} style="--node-color: {corpus.colorOf(m.category)}">
                      <span>{m.emoji ?? "🤖"}</span>
                    </div>
                  {/each}
                  {#if p.agents.length > 4}
                    <div class="node-more">+{p.agents.length - 4}</div>
                  {/if}
                </div>
              </div>

              <div class="sc-footer">
                <span class="sc-status">
                  <span class="status-badge {st.deployed > 0 ? 'active' : 'ready'}">
                    {st.deployed > 0 ? `${st.deployed} Installed` : 'Ready'}
                  </span>
                </span>
                <button
                  class="deploy-btn"
                  onclick={(e) => {
                    e.stopPropagation();
                    deploy(presetLabel(p.slug), p.agents);
                  }}
                >
                  <Play size={12} fill="currentColor" />
                  <span>Run Squad</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- "Your team" Tab (Active Loadout) -->
    <div class="current-team-wrap">
      {#if managed.length === 0}
        <EmptyState title={i18n.t("teams.emptyTitle")}>
          {#snippet icon()}<ArchiveIcon size={48} />{/snippet}
          {i18n.t("teams.emptyBody")}
          {#snippet cta()}
            <div class="empty-cta">
              <Button variant="primary" onclick={() => (tab = "presets")}>
                {#snippet icon()}<RocketIcon size={15} />{/snippet}
                {i18n.t("teams.browsePresets")}
              </Button>
              <button class="link-btn" onclick={() => ui.openPlaybook()}>{i18n.t("teams.openPlaybook")}</button>
            </div>
          {/snippet}
        </EmptyState>
      {:else}
        <div class="groups">
          {#each groups as g (g.slug)}
            {@const Icon = resolveCategoryIcon(g.icon)}
            {@const isOpen = !collapsed.has(g.slug)}
            <section class="grp">
              <button class="grp-head" onclick={() => toggle(g.slug)} aria-expanded={isOpen}>
                <ChevronDown size={15} class={isOpen ? "grp-chev open" : "grp-chev"} />
                <span class="grp-ic" style="color:{g.color}"><Icon size={16} /></span>
                <span class="grp-label">{g.label}</span>
                <span class="grp-count">{g.rows.length}</span>
              </button>
              {#if isOpen}
                <ul class="rows">
                  {#each g.rows as r (r.slug + r.tool + (r.projectPath ?? ""))}
                    <li class="row">
                      <span class="r-name">{r.name}</span>
                      <Pill tone="neutral">{install.toolLabel(r.tool)}</Pill>
                      {#if r.projectPath}
                        <span class="r-proj" title={r.projectPath}>{r.projectPath.split("/").pop()}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </section>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<!-- Modals -->
{#if deployTarget}
  <InstallModal
    title={deployTarget.title}
    agentSlugs={deployTarget.agents}
    onClose={() => (deployTarget = null)}
  />
{/if}

{#if saveOpen}
  <Modal open title={i18n.t("teams.saveModalTitle")} defaultFocus="first" onClose={() => (saveOpen = false)}>
    <p class="save-sub">{i18n.t("teams.saveModalBody", { count: managedSlugs.length })}</p>
    <Input bind:value={saveName} placeholder={i18n.t("teams.namePlaceholder")} ariaLabel={i18n.t("teams.nameAria")} />
    {#snippet actions()}
      <Button variant="secondary" modalAction="cancel" onclick={() => (saveOpen = false)}>{i18n.t("common.cancel")}</Button>
      <Button variant="primary" modalAction="confirm" disabled={managedSlugs.length === 0} onclick={confirmSave}>{i18n.t("teams.saveTeam")}</Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .teams-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
    gap: var(--space-4);
  }

  /* 1. Connected AI Tools & Harnesses Top Bar */
  .harness-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .sec-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sec-label {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .sec-action {
    font-size: var(--text-caption);
    color: var(--color-brand);
    background: transparent;
    cursor: pointer;
    font-weight: 500;
  }
  .sec-action:hover { text-decoration: underline; }

  .harness-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
  }
  @media (max-width: 980px) {
    .harness-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .harness-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.15s ease;
  }
  .harness-card:hover {
    border-color: rgba(245, 158, 11, 0.4);
    box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.3);
  }
  .hc-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hc-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-text-muted);
    opacity: 0.5;
  }
  .hc-dot.online {
    background: var(--color-success);
    opacity: 1;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }
  .hc-name {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    flex: 1;
  }
  .hc-status {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .hc-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .hc-count {
    font-size: 12px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .hc-sync {
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    color: var(--color-brand);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .hc-sync:hover {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--color-brand);
  }

  /* 2. Header & Tabs */
  .teams-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .seg {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  .seg-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--text-body-sm);
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }
  .seg-btn:hover { color: var(--color-text-primary); }
  .seg-btn.on {
    background: var(--color-surface-raised);
    color: var(--color-brand);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }
  .lo-actions { display: flex; gap: var(--space-2); }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--text-body-sm);
    cursor: pointer;
  }
  .btn:hover:not(:disabled) { color: var(--color-text-primary); background: var(--color-surface-sunken); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.primary { background: var(--color-brand); color: #0d0c0a; font-weight: 600; border-color: transparent; }
  .btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
  .btn.ghost { border-color: transparent; }

  /* 3. Squads Cards Grid */
  .squads-scroll {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .section-title {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }
  .squads-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }
  .squad-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .squad-card:hover {
    border-color: rgba(245, 158, 11, 0.45);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.35);
    transform: translateY(-2px);
  }

  .sc-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sc-ic {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .sc-ic.saved { color: var(--color-brand); }
  .sc-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .sc-title {
    font-size: var(--text-body);
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .sc-count {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .sc-badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-brand);
    text-transform: uppercase;
  }
  .sc-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-success);
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
  }
  .sc-del {
    width: 26px;
    height: 26px;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-muted);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sc-del:hover {
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger);
  }

  .sc-desc {
    font-size: var(--text-body-sm);
    color: var(--color-text-secondary);
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 38px;
  }

  /* Node avatars flow */
  .nodes-flow {
    position: relative;
    padding: var(--space-2) 0;
  }
  .nodes-line {
    position: absolute;
    top: 50%;
    left: 14px;
    right: 14px;
    height: 1px;
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(34, 197, 94, 0.3) 100%);
    z-index: 1;
  }
  .nodes-avatars {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .node-avatar {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: var(--color-surface);
    border: 1px solid color-mix(in srgb, var(--node-color, var(--color-brand)) 40%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .node-more {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted);
    background: var(--color-surface-sunken);
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--color-border);
  }

  .sc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }
  .status-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }
  .status-badge.ready {
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
  }
  .status-badge.active {
    background: rgba(34, 197, 94, 0.12);
    color: var(--color-success);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .deploy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border-radius: var(--radius-md);
    background: var(--color-brand);
    color: #0d0c0a;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }
  .deploy-btn:hover {
    filter: brightness(1.12);
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
  }

  /* Detail Inspector */
  .tdetail {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .td-back-row { display: flex; }
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-body-sm);
    color: var(--color-brand);
    background: transparent;
    cursor: pointer;
    border: none;
    font-weight: 500;
  }
  .back-btn:hover { text-decoration: underline; }

  .td-head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
  }
  .td-ic {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .td-id { flex: 1; min-width: 0; }
  .td-name { font-size: var(--text-h2); font-weight: 600; color: var(--color-text-primary); margin: 0; }
  .td-desc { font-size: var(--text-body-sm); color: var(--color-text-secondary); margin: 4px 0 0; }
  .td-actions { display: flex; align-items: center; gap: var(--space-3); }
  .td-count { font-size: 12px; color: var(--color-text-muted); }
  .td-sec {
    font-size: var(--text-caption);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: var(--space-2) 0 0;
  }
  .td-examples { display: flex; flex-direction: column; gap: var(--space-2); }
  .td-missing { font-size: 12px; color: var(--color-text-muted); }

  /* Division groups */
  .groups { display: flex; flex-direction: column; gap: var(--space-2); }
  .grp {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    overflow: hidden;
  }
  .grp-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    cursor: pointer;
    text-align: left;
    border: none;
  }
  .grp-head:hover { background: var(--color-surface-sunken); }
  :global(.grp-chev) {
    color: var(--color-text-muted);
    transition: transform 0.15s ease;
    transform: rotate(-90deg);
  }
  :global(.grp-chev.open) { transform: rotate(0deg); }
  .grp-ic { display: inline-flex; }
  .grp-label { flex: 1; font-weight: 600; color: var(--color-text-primary); }
  .grp-count {
    font-size: 11px;
    color: var(--color-text-muted);
    background: var(--color-surface-sunken);
    padding: 1px 7px;
    border-radius: 999px;
  }
  .rows { list-style: none; padding: 4px 0; margin: 0; }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px var(--space-4);
    font-size: var(--text-body-sm);
  }
  .row:hover { background: var(--color-surface-sunken); }
  .row-emoji { font-size: 16px; }
  .r-name { flex: 1; font-weight: 500; color: var(--color-text-primary); }
  .r-desc { font-size: 11px; color: var(--color-text-muted); }
  .r-proj { font-size: 11px; color: var(--color-text-muted); }

  .save-sub { font-size: var(--text-body-sm); color: var(--color-text-secondary); margin-bottom: var(--space-3); }
  .empty-cta { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
  .link-btn { background: transparent; color: var(--color-brand); font-size: var(--text-body-sm); cursor: pointer; border: none; }
  .link-btn:hover { text-decoration: underline; }
</style>
