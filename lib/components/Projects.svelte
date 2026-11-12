<script lang="ts">
  /**
   * Projects — the 4th pillar (Agents / Tools / Teams / Projects). The home for
   * per-project deployments: every folder you've installed agents into.
   *
   * Master/detail (not inline disclosures — a big roster gets unruly):
   *  • List: a row per project (folder · label · path · count). Clicking a row
   *    navigates into its detail via `ui.selectProject(path)` — a nav location,
   *    so the title-bar Back button returns to the list.
   *  • Detail: that project's path, actions (Deploy… · Reveal · Remove from
   *    list), and its roster grouped by division (collapsible), reusing the
   *    division-group pattern from Tools/Teams.
   *
   * "Deploy…" opens the two-pane DeployBrowser scoped to the project (pick an
   * agent, division, or team on the left; install into the project's tools on
   * the right) — so an empty project can be filled.
   */
  import { errorText } from "$lib/types";
  import { onMount } from "svelte";
  import EmptyState from "./EmptyState.svelte";
  import Pill from "./Pill.svelte";
  import Button from "./Button.svelte";
  import Modal from "./Modal.svelte";
  import DeployBrowser from "./DeployBrowser.svelte";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import FolderPlus from "@lucide/svelte/icons/folder-plus";
  import FolderOpen from "@lucide/svelte/icons/folder-open";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import LayersIcon from "@lucide/svelte/icons/layers";
  import Trash2 from "@lucide/svelte/icons/trash-2";

  import { install } from "$lib/stores/install.svelte";
  import { corpus } from "$lib/stores/corpus.svelte";
  import { projects } from "$lib/stores/projects.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { resolveCategoryIcon } from "$lib/util/categoryIcon";
  import { i18n } from "$lib/stores/i18n.svelte";
  import type { InstalledAgent } from "$lib/types";

  onMount(() => {
    corpus.ensureLoaded();
    projects.refresh();
  });

  // ── Per-project roster: rows we (or anyone) deployed into that exact path. ──
  // Keyed by the project's absolute path; null projectPath = global, excluded.
  const rowsByProject = $derived.by(() => {
    const m = new Map<string, InstalledAgent[]>();
    for (const r of install.installed) {
      if (r.state === "removed") continue; // ledger says installed but file gone
      const p = r.projectPath;
      if (p == null) continue; // global scope lives in Teams/Tools, not here
      const arr = m.get(p);
      if (arr) arr.push(r);
      else m.set(p, [r]);
    }
    return m;
  });

  function rosterFor(path: string): InstalledAgent[] {
    return rowsByProject.get(path) ?? [];
  }

  // ── Selected project (detail pane). Resolve against the live list so a stale
  //    path (e.g. removed) falls back to the list rather than an empty detail. ──
  const selected = $derived(projects.list.find((p) => p.path === ui.projectsSelected) ?? null);

  // ── Group the selected project's roster by division (collapsible). ──
  const OTHER = "__other";
  const detailGroups = $derived.by(() => {
    if (!selected) return [];
    const divOf = new Map(corpus.agents.map((a) => [a.slug, a.category]));
    const m = new Map<string, InstalledAgent[]>();
    for (const r of rosterFor(selected.path)) {
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

  // Division groups are CLOSED by default; initialize the collapse set to every
  // division once per project (guarded so installs/removes don't re-collapse).
  let collapsed = $state<Set<string>>(new Set());
  function toggleGroup(slug: string) {
    const next = new Set(collapsed);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    collapsed = next;
  }
  let collapseInitFor: string | null = null;
  $effect(() => {
    const p = ui.projectsSelected;
    // Wait for the roster to populate before seeding (cold corpus load) so the
    // divisions stay closed by default rather than seeding from an empty list.
    if (p === collapseInitFor || detailGroups.length === 0) return;
    collapseInitFor = p;
    collapsed = new Set(detailGroups.map((g) => g.slug));
  });

  // ── Deploy into a project: the two-pane DeployBrowser. ──
  let browseFor = $state<string | null>(null); // project path, or null = closed

  async function reveal(path: string) {
    try {
      await install.revealPath(path);
    } catch (e) {
      toast.error(i18n.t("common.couldNotOpenFolder"), errorText(e));
    }
  }

  // ── Remove a project: a confirm dialog with two choices (#44). ──
  // Snapshot label/count at open time so they stay stable across the async op
  // (reconcile mutates projects.list mid-flight).
  let confirm = $state<{ path: string; label: string; count: number } | null>(null);
  let deleteBusy = $state(false);

  function finishRemove(path: string) {
    confirm = null;
    if (ui.projectsSelected === path) ui.selectProject(null);
  }

  // "Remove from app only" — forget the project; installed files stay on disk.
  async function forgetProject() {
    if (!confirm || deleteBusy) return;
    const { path, label } = confirm;
    deleteBusy = true;
    try {
      await install.forgetProject(path, label);
      projects.unregister(path);
      finishRemove(path);
    } catch (e) {
      toast.error(i18n.t("common.actionFailed"), errorText(e));
    } finally {
      deleteBusy = false;
    }
  }

  // "Remove & uninstall" — delete the agents THIS APP installed here (never the
  // user's own files; uninstall backs up modified files first), then forget.
  async function uninstallAndRemove() {
    if (!confirm || deleteBusy) return;
    const { path } = confirm;
    deleteBusy = true;
    try {
      const targets = rosterFor(path).map((r) => ({ slug: r.slug, tool: r.tool, projectPath: path }));
      if (targets.length > 0) await install.bulk("uninstall", targets);
      projects.unregister(path);
      finishRemove(path);
    } catch (e) {
      toast.error(i18n.t("common.actionFailed"), errorText(e));
    } finally {
      deleteBusy = false;
    }
  }

  let adding = $state(false);
  async function addProject() {
    if (adding) return;
    adding = true;
    try {
      const p = await projects.addViaPicker();
      if (!p) return;
      await projects.refresh();
      ui.selectProject(p); // land in the new project's detail (Deploy… from there)
    } finally {
      adding = false;
    }
  }

  const currentWorkspacePath = "/Users/allanindrajith/AI hackathon/Hivework-app";
</script>

<section class="pr">
  {#if selected}
    <!-- ── Detail ── -->
    <header class="pr-head detail">
      <button class="back-link" onclick={() => ui.selectProject(null)}>← {i18n.t("nav.projects")}</button>
      <span class="dh-ic"><FolderIcon size={20} /></span>
      <div class="dh-id">
        <h2 class="dh-label">{selected.label}</h2>
        <button class="dh-path" title={selected.path} onclick={() => reveal(selected.path)}>{selected.path}</button>
      </div>
      <span class="dh-count">{i18n.count(selected.installedCount, "common.agent.one", "common.agent.many")}</span>
      <button class="btn" onclick={() => reveal(selected.path)}><FolderOpen size={15} /><span>{i18n.t("common.reveal")}</span></button>
      <button class="btn primary" onclick={() => (browseFor = selected.path)}>{i18n.t("teams.deploy")}</button>
      <button class="btn danger-ic" title={i18n.t("projects.removeTitle")} aria-label={i18n.t("projects.removeAria")} onclick={() => (confirm = { path: selected.path, label: selected.label, count: selected.installedCount })}><Trash2 size={15} /></button>
    </header>

    <div class="scroll">
      {#if detailGroups.length === 0}
        <div class="d-empty">
          <LayersIcon size={40} />
          <p>{i18n.t("projects.emptyHere")}</p>
          <Button variant="primary" onclick={() => (browseFor = selected.path)}>{i18n.t("projects.deployDivisionTeam")}</Button>
        </div>
      {:else}
        <div class="groups">
          {#each detailGroups as g (g.slug)}
            {@const Icon = resolveCategoryIcon(g.icon)}
            {@const isOpen = !collapsed.has(g.slug)}
            <section class="grp">
              <button class="grp-head" onclick={() => toggleGroup(g.slug)} aria-expanded={isOpen}>
                <ChevronDown size={15} class={isOpen ? "pr-chev open" : "pr-chev"} />
                <span class="grp-ic" style="color:{g.color}"><Icon size={15} /></span>
                <span class="grp-label">{g.label}</span>
                <span class="grp-count">{g.rows.length}</span>
              </button>
              {#if isOpen}
                <ul class="roster">
                  {#each g.rows as r (r.slug + r.tool)}
                    <li class="r-row">
                      <span class="r-name">{r.name}</span>
                      <Pill tone="neutral">{install.toolLabel(r.tool)}</Pill>
                    </li>
                  {/each}
                </ul>
              {/if}
            </section>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- ── List ── -->
    <header class="pr-head">
      <div class="pr-head-title">
        <h2 class="pr-main-title">{i18n.t("nav.projects")}</h2>
        <span class="pr-count-badge">{i18n.t("projects.count", { count: projects.list.length })}</span>
      </div>
      <div class="pr-actions">
        <button class="btn primary" disabled={adding} onclick={addProject}>
          <FolderPlus size={15} /><span>{i18n.t("projects.add")}</span>
        </button>
      </div>
    </header>

    {#if projects.list.length === 0}
      <div class="scroll empty-wrap">
        <div class="empty-hero">
          <div class="empty-icon-box">
            <FolderIcon size={32} />
          </div>
          <h2 class="empty-title">Deploy AI Agents into your Projects</h2>
          <p class="empty-sub">
            Link any project repository to deploy custom AI agent squads into local tools (Claude Code, Cursor, Windsurf, Codex). Roster configurations stay inside your repository so your team stays in sync.
          </p>
          <div class="empty-actions">
            <button class="btn primary lg" disabled={adding} onclick={() => { projects.register(currentWorkspacePath); ui.selectProject(currentWorkspacePath); }}>
              <FolderPlus size={16} />
              <span>Link Current Workspace ({currentWorkspacePath.split("/").pop()})</span>
            </button>
            <button class="btn secondary lg" disabled={adding} onclick={addProject}>
              <FolderOpen size={16} />
              <span>Browse Folder...</span>
            </button>
          </div>
        </div>

        <div class="blueprints-section">
          <h3 class="bp-heading">Recommended Squad Blueprints for Projects</h3>
          <div class="bp-grid">
            <div class="bp-card">
              <span class="bp-badge">Web Application</span>
              <h4 class="bp-title">Full-Stack Web Squad</h4>
              <p class="bp-desc">Orchestrates architecture, responsive UI components, and strict verification gates.</p>
              <div class="bp-roster">
                <span class="bp-chip">Agents Orchestrator</span>
                <span class="bp-chip">Senior Developer</span>
                <span class="bp-chip">Reality Checker</span>
              </div>
            </div>
            <div class="bp-card">
              <span class="bp-badge">Systems & Cloud</span>
              <h4 class="bp-title">DevOps & Infrastructure</h4>
              <p class="bp-desc">Automates CI/CD, docker workflows, cloud operations, and security hygiene.</p>
              <div class="bp-roster">
                <span class="bp-chip">DevOps Automator</span>
                <span class="bp-chip">Security Reviewer</span>
                <span class="bp-chip">Evidence Collector</span>
              </div>
            </div>
            <div class="bp-card">
              <span class="bp-badge">Product Design</span>
              <h4 class="bp-title">UX & Design Engineering</h4>
              <p class="bp-desc">Designs CSS systems, high-conversion page heroes, and accessible interfaces.</p>
              <div class="bp-roster">
                <span class="bp-chip">UX Architect</span>
                <span class="bp-chip">Brand Guardian</span>
                <span class="bp-chip">Frontend Developer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <ul class="rows">
        {#each projects.list as project (project.path)}
          <li class="proj">
            <div class="proj-card-inner">
              <button class="proj-row" onclick={() => ui.selectProject(project.path)}>
                <span class="proj-ic"><FolderIcon size={20} /></span>
                <span class="proj-body">
                  <span class="proj-label">{project.label}</span>
                  <span class="proj-path" title={project.path}>{project.path}</span>
                </span>
                <span class="proj-count">{i18n.count(project.installedCount, "common.agent.one", "common.agent.many")}</span>
              </button>
              <div class="proj-quick-acts">
                <button class="btn sm" onclick={() => (browseFor = project.path)}>
                  <span>{i18n.t("teams.deploy")}</span>
                </button>
                <button class="btn sm ghost" onclick={() => reveal(project.path)} title={i18n.t("common.reveal")}>
                  <FolderOpen size={14} />
                </button>
                <button class="proj-enter-btn" onclick={() => ui.selectProject(project.path)} title="Open Project Detail">
                  <ChevronRight size={16} class="proj-go" />
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if browseFor !== null}
  <DeployBrowser projectPath={browseFor} onClose={() => (browseFor = null)} />
{/if}

{#if confirm}
  <Modal open title={i18n.t("projects.deleteTitle", { project: confirm.label })} defaultFocus="cancel" onClose={() => (confirm = null)}>
    <p class="del-body">
      {#if (confirm?.count ?? 0) > 0}
        {i18n.t("projects.deleteBody", { project: confirm.label, count: confirm.count })}
      {:else}
        {i18n.t("projects.deleteEmptyBody", { project: confirm.label })}
      {/if}
    </p>
    {#if (confirm?.count ?? 0) > 0}
      <p class="del-note">{i18n.t("projects.deleteExplain")}</p>
    {/if}
    {#snippet actions()}
      <Button variant="secondary" modalAction="cancel" onclick={() => (confirm = null)}>{i18n.t("common.cancel")}</Button>
      {#if (confirm?.count ?? 0) > 0}
        <Button variant="danger" disabled={deleteBusy} onclick={uninstallAndRemove}>
          {i18n.t("projects.deleteUninstall", { count: confirm?.count ?? 0 })}
        </Button>
      {/if}
      <Button variant="primary" modalAction="confirm" disabled={deleteBusy} onclick={forgetProject}>{i18n.t("projects.deleteKeep")}</Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .pr { display: flex; flex-direction: column; height: 100%; min-height: 0; }
  .pr-head {
    flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border);
  }
  .pr-actions { display: flex; gap: var(--space-2); }

  /* ── Detail header ── */
  .pr-head.detail { justify-content: flex-start; gap: var(--space-3); }
  .back-link {
    background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    color: var(--color-text-secondary); font-size: 12px; font-weight: 500; padding: 4px 10px; cursor: pointer;
  }
  .back-link:hover { color: var(--color-text-primary); background: var(--color-surface-sunken); border-color: rgba(245, 158, 11, 0.3); }

  .pr-head-title { display: flex; align-items: center; gap: var(--space-3); }
  .pr-main-title { font-size: var(--text-h2); font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .pr-count-badge {
    font-size: 11px; font-weight: 600; color: var(--color-brand);
    background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: var(--radius-full);
  }

  /* ── Empty Hero & Blueprints ── */
  .empty-wrap { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-6); max-width: 1080px; margin: 0 auto; width: 100%; }
  .empty-hero {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: var(--space-6) var(--space-5); border-radius: var(--radius-xl);
    background: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 70%), var(--color-surface-raised);
    border: 1px solid var(--color-border); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  }
  .empty-icon-box {
    width: 60px; height: 60px; border-radius: var(--radius-lg);
    background: rgba(245, 158, 11, 0.12); color: var(--color-brand);
    display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);
    border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
  }
  .empty-title { font-size: var(--text-h2); font-weight: 700; color: var(--color-text-primary); margin: 0 0 var(--space-2); }
  .empty-sub { font-size: 14px; color: var(--color-text-secondary); max-width: 580px; line-height: 1.5; margin: 0 0 var(--space-5); }
  .empty-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; justify-content: center; }
  .btn.lg { height: 40px; padding: 0 var(--space-4); font-size: 13px; font-weight: 600; border-radius: var(--radius-md); }
  .btn.secondary { background: var(--color-surface-sunken); color: var(--color-text-primary); border: 1px solid var(--color-border); }
  .btn.secondary:hover { border-color: rgba(245, 158, 11, 0.4); background: var(--color-surface-raised); }

  .blueprints-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .bp-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin: 0; }
  .bp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-3); }
  .bp-card {
    display: flex; flex-direction: column; gap: var(--space-2);
    padding: var(--space-4); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
    transition: all 0.15s ease;
  }
  .bp-card:hover { border-color: rgba(245, 158, 11, 0.35); transform: translateY(-1px); }
  .bp-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--color-brand); letter-spacing: 0.04em; }
  .bp-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
  .bp-desc { font-size: 12px; color: var(--color-text-muted); line-height: 1.4; margin: 0; }
  .bp-roster { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .bp-chip { font-size: 11px; color: var(--color-text-secondary); background: var(--color-surface-sunken); padding: 2px 7px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); }

  /* ── Project Rows ── */
  .rows { flex: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .proj { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface-raised); overflow: hidden; transition: all 0.15s ease; }
  .proj:hover { border-color: rgba(245, 158, 11, 0.4); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); }
  .proj-card-inner { display: flex; align-items: center; justify-content: space-between; padding: 6px var(--space-3); }
  .proj-row {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-2) 0; background: transparent; cursor: pointer; text-align: left; border: none;
  }
  .proj-quick-acts { display: flex; align-items: center; gap: 6px; flex: none; }
  .btn.sm { height: 28px; padding: 0 10px; font-size: 12px; }
  .btn.ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
  .btn.ghost:hover { color: var(--color-text-primary); background: var(--color-surface-sunken); }
  .proj-enter-btn { background: transparent; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; display: flex; }
  .proj-enter-btn:hover { color: var(--color-brand); }
  .proj-ic { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.1); color: var(--color-brand); }
  .proj-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .proj-label { font-size: 14px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj-path { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj-count { flex: none; font-size: 12px; font-weight: 600; color: var(--color-brand); background: rgba(245, 158, 11, 0.1); padding: 2px 8px; border-radius: var(--radius-full); white-space: nowrap; margin-right: 8px; }

  /* ── Division groups (detail roster) ── */
  .groups { padding: var(--space-3); display: flex; flex-direction: column; gap: 2px; }
  .grp { display: flex; flex-direction: column; }
  .grp-head {
    display: flex; align-items: center; gap: var(--space-2);
    width: 100%; padding: var(--space-2); border-radius: var(--radius-sm);
    background: transparent; cursor: pointer; text-align: left;
  }
  .grp-head:hover { background: var(--color-surface-sunken); }
  :global(.pr-chev) { color: var(--color-text-muted); transition: transform var(--motion-duration-fast, 120ms) ease; transform: rotate(-90deg); flex: none; }
  :global(.pr-chev.open) { transform: rotate(0deg); }
  .grp-ic { flex: none; display: inline-flex; }
  .grp-label { flex: 1; min-width: 0; font-weight: var(--fw-semibold); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grp-count { flex: none; min-width: 20px; text-align: center; font-size: var(--text-caption); color: var(--color-text-muted); font-variant-numeric: tabular-nums; background: var(--color-surface-sunken); border-radius: var(--radius-full); padding: 1px 7px; }

  .roster { list-style: none; margin: 0; padding: 2px 0 var(--space-2) var(--space-4); display: flex; flex-direction: column; gap: 1px; }
  .r-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); }
  .r-row:hover { background: var(--color-surface-sunken); }
  .r-name { flex: 1; min-width: 0; font-weight: var(--fw-medium); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .d-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); color: var(--color-text-muted); padding: var(--space-6); }
  .d-empty p { font-size: var(--text-body-sm); }

  /* ── Remove-project confirm dialog ── */
  .del-body { color: var(--color-text-primary); font-size: var(--text-body); }
  .del-note { margin-top: var(--space-3); color: var(--color-text-muted); font-size: var(--text-body-sm); line-height: 1.5; }

</style>
