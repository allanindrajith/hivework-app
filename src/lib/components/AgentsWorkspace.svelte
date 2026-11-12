<script lang="ts">
  /**
   * AgentsWorkspace — the modern AI agent app store catalog.
   * Features:
   *  - Top search bar with horizontal Category Filter Pills & Sort Dropdown
   *  - Grid View (rich agent cards with avatar, star rating, tags, Deploy button)
   *  - List View (compact multi-select table)
   *  - Slide-over Agent Detail Inspector with Persona & Deployment Matrix
   */
  import { onMount } from "svelte";
  import SearchIcon from "@lucide/svelte/icons/search";
  import RefreshIcon from "@lucide/svelte/icons/refresh-cw";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import AlertTriangle from "@lucide/svelte/icons/triangle-alert";
  import LayersIcon from "@lucide/svelte/icons/layers";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import LayoutList from "@lucide/svelte/icons/layout-list";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import CheckIcon from "@lucide/svelte/icons/check";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import Rocket from "@lucide/svelte/icons/rocket";

  import Input from "./Input.svelte";
  import Pill from "./Pill.svelte";
  import EmptyState from "./EmptyState.svelte";
  import LoadingState from "./LoadingState.svelte";
  import ResizeHandle from "./ResizeHandle.svelte";
  import PersonaBody from "./PersonaBody.svelte";
  import DeploymentMatrix from "./DeploymentMatrix.svelte";
  import DiffModal from "./DiffModal.svelte";
  import DivisionsLanding from "./DivisionsLanding.svelte";
  import InstallModal from "./InstallModal.svelte";
  import StarterPrompt from "./StarterPrompt.svelte";
  import { divisionPrompt } from "$lib/data/playbook";

  import { corpus } from "$lib/stores/corpus.svelte";
  import { install } from "$lib/stores/install.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import {
    ui,
    DETAIL_PANE_MIN_WIDTH,
    DETAIL_PANE_DEFAULT_WIDTH,
    clampDetailPaneWidth,
  } from "$lib/stores/ui.svelte";
  import { resolveCategoryIcon } from "$lib/util/categoryIcon";
  import { i18n } from "$lib/stores/i18n.svelte";
  import type { MessageKey } from "$lib/i18n/messages";
  import type { Agent, InstalledAgent, InstallState, Tool } from "$lib/types";

  onMount(() => corpus.ensureLoaded());

  let catBtn = $state<HTMLElement>();
  let catMenu = $state<HTMLElement>();
  let bulkBtn = $state<HTMLElement>();
  let bulkMenu = $state<HTMLElement>();
  let sortBtn = $state<HTMLElement>();
  let sortMenu = $state<HTMLElement>();

  function onDocClick(e: MouseEvent) {
    const t = e.target as Node | null;
    if (!t) return;
    if (catMenuOpen && !catBtn?.contains(t) && !catMenu?.contains(t)) catMenuOpen = false;
    if (menuOpen && !bulkBtn?.contains(t) && !bulkMenu?.contains(t)) menuOpen = false;
    if (sortMenuOpen && !sortBtn?.contains(t) && !sortMenu?.contains(t)) sortMenuOpen = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      catMenuOpen = false;
      menuOpen = false;
      sortMenuOpen = false;
    }
  }
  onMount(() => {
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  });

  const installsBySlug = $derived.by(() => {
    const m = new Map<string, InstalledAgent[]>();
    for (const r of install.installed) {
      const a = m.get(r.slug);
      if (a) a.push(r);
      else m.set(r.slug, [r]);
    }
    return m;
  });

  let query = $state("");
  let catMenuOpen = $state(false);
  let sortMenuOpen = $state(false);
  type SortOption = "popular" | "az" | "newest";
  let sortBy = $state<SortOption>("popular");
  let viewMode = $state<"grid" | "list">("grid");

  type Lens = "all" | "attention" | "current" | "outdated" | "foreign" | "removed" | "none";
  const lens: Lens = $derived(ui.agentsLens as Lens);
  function setLens(l: Lens) { ui.setAgentsLens(l); }

  function buckets(slug: string): Set<Lens> {
    const rows = installsBySlug.get(slug) ?? [];
    const s = new Set<Lens>();
    if (rows.length === 0) { s.add("none"); return s; }
    for (const r of rows) {
      if (r.state === "current") s.add("current");
      else if (r.state === "outdated" || r.state === "modified") { s.add("outdated"); s.add("attention"); }
      else if (r.state === "foreign") s.add("foreign");
      else if (r.state === "removed") { s.add("removed"); s.add("attention"); }
    }
    return s;
  }

  const base = $derived(corpus.filtered(ui.agentsCategory, query));
  const visible = $derived(lens === "all" ? base : base.filter((a) => buckets(a.slug).has(lens)));

  const sortedVisible = $derived.by(() => {
    const list = [...visible];
    if (sortBy === "az") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "popular") {
      return list.sort((a, b) => {
        const aInstalls = installsBySlug.get(a.slug)?.length ?? 0;
        const bInstalls = installsBySlug.get(b.slug)?.length ?? 0;
        if (bInstalls !== aInstalls) return bInstalls - aInstalls;
        return a.name.localeCompare(b.name);
      });
    }
    return list;
  });

  const lensCounts = $derived.by<Record<Lens, number>>(() => {
    const c: Record<Lens, number> = { all: base.length, attention: 0, current: 0, outdated: 0, foreign: 0, removed: 0, none: 0 };
    for (const a of base) for (const b of buckets(a.slug)) c[b]++;
    return c;
  });

  const LENSES: { id: Lens; key: MessageKey; tone: string }[] = [
    { id: "all", key: "state.all", tone: "" },
    { id: "attention", key: "state.attention", tone: "warn" },
    { id: "current", key: "state.current", tone: "ok" },
    { id: "outdated", key: "state.outdated", tone: "warn" },
    { id: "foreign", key: "state.foreign", tone: "info" },
    { id: "removed", key: "state.removed", tone: "danger" },
    { id: "none", key: "state.none", tone: "none" },
  ];
  const visibleLenses = $derived(LENSES.filter((f) => f.id === "all" || lensCounts[f.id] > 0));

  $effect(() => {
    if (lens !== "all" && lensCounts[lens] === 0) setLens("all");
  });

  $effect(() => {
    const slug = ui.agentsSelected;
    if (!slug) return;
    const inCorpus = corpus.agents.some((a) => a.slug === slug);
    if (inCorpus && !base.some((a) => a.slug === slug)) ui.selectAgent(null);
  });

  function pickCategory(slug: string | null) {
    ui.setAgentsCategory(slug);
    catMenuOpen = false;
  }
  const categoryLabel = $derived(ui.agentsCategory ? corpus.labelOf(ui.agentsCategory) : i18n.t("agents.allDivisions"));

  const divisionMeta = $derived.by(() => {
    const slug = ui.agentsCategory;
    if (!slug || query.trim() || selectMode) return null;
    const slugs = corpus.agents.filter((a) => a.category === slug).map((a) => a.slug);
    if (slugs.length === 0) return null;
    const label = corpus.labelOf(slug);
    const fallback = divisionPrompt(slug, label);
    const prompt = i18n.optional(`divisionPrompt.${slug}`, fallback, { division: label });
    return { slug, label, color: corpus.colorOf(slug), icon: corpus.iconOf(slug), slugs, prompt };
  });
  let divisionInstallOpen = $state(false);

  function dotTone(s: InstallState): string {
    if (s === "current") return "ok";
    if (s === "outdated" || s === "modified") return "warn";
    if (s === "foreign") return "info";
    return "danger";
  }

  // Detail selection
  let detailStub = $state<Agent | null>(null);
  let detail = $state<Agent | null>(null);
  let detailLoading = $state(false);
  const panelAgent = $derived(detail ?? detailStub);

  $effect(() => {
    const slug = ui.agentsSelected;
    if (!slug) {
      detailStub = null;
      detail = null;
      detailLoading = false;
      return;
    }
    const stub = corpus.agents.find((a) => a.slug === slug) ?? null;
    detailStub = stub;
    if (stub?.body) {
      detail = stub;
      detailLoading = false;
      return;
    }
    detail = null;
    detailLoading = true;
    void corpus.get(slug).then((full) => {
      if (ui.agentsSelected === slug) {
        detail = full;
        detailLoading = false;
      }
    });
  });

  function openAgent(a: Agent) {
    ui.selectAgent(a.slug);
  }
  function closeDetail() {
    ui.selectAgent(null);
  }

  let diffTarget = $state<{ slug: string; tool: Tool; projectPath: string | null; name: string } | null>(null);
  let installOpen = $state(false);

  let selectMode = $state(false);
  let selected = $state<Set<string>>(new Set());
  let menuOpen = $state(false);
  let bulkBusy = $state(false);
  let confirmDelete = $state(false);
  let bulkInstallOpen = $state(false);

  function enterSelect() { selectMode = true; viewMode = "list"; }
  function exitSelect() { selectMode = false; menuOpen = false; selected = new Set(); }
  function toggleRow(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    selected = next;
  }
  const allVisibleSelected = $derived(visible.length > 0 && visible.every((a) => selected.has(a.slug)));
  const someSelected = $derived(selected.size > 0 && !allVisibleSelected);
  function toggleAll() {
    if (allVisibleSelected) selected = new Set();
    else selected = new Set(visible.map((a) => a.slug));
  }

  $effect(() => {
    const live = new Set(corpus.agents.map((a) => a.slug));
    if ([...selected].some((s) => !live.has(s))) {
      selected = new Set([...selected].filter((s) => live.has(s)));
    }
  });

  const selInstalls = $derived([...selected].flatMap((slug) => installsBySlug.get(slug) ?? []));
  const canBulkUpdate = $derived(selInstalls.some((i) => i.state !== "current"));
  const canBulkTrack = $derived(selInstalls.some((i) => i.state === "foreign"));
  const selHasForeign = $derived(selInstalls.some((i) => i.state === "foreign"));

  async function runBulk(action: "update" | "track" | "uninstall", verbKey: MessageKey) {
    let picked = selInstalls;
    if (action === "update") picked = selInstalls.filter((i) => i.state !== "current");
    else if (action === "track") picked = selInstalls.filter((i) => i.state === "foreign");
    const targets = picked.map((i) => ({ slug: i.slug, tool: i.tool, projectPath: i.projectPath }));
    if (targets.length === 0) return;
    menuOpen = false;
    bulkBusy = true;
    try {
      const { ok, fail } = await install.bulk(action, targets);
      const verb = i18n.t(verbKey);
      if (fail === 0) toast.success(i18n.t("agents.bulkSuccess", { verb, count: ok }));
      else toast.error(i18n.t("agents.bulkError", { verb, ok, fail }));
      selected = new Set();
    } finally {
      bulkBusy = false;
    }
  }

  function formatSortLabel(s: SortOption): string {
    if (s === "popular") return "Popular";
    if (s === "az") return "Name A-Z";
    return "Newest";
  }

  let cliCopied = $state(false);
  async function copyCliCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      cliCopied = true;
      toast.success("Copied CLI command to clipboard");
      setTimeout(() => { cliCopied = false; }, 1800);
    } catch {
      toast.error("Could not copy command");
    }
  }
</script>

<section class="ws" class:sel={!!panelAgent}>
  <!-- Main Catalog Pane -->
  <div class="list-pane">
    <div class="lp-head">
      <!-- hivework.online Workforce Eyebrow & Terminal Strip -->
      <div class="hw-strip">
        <div class="hw-strip-left">
          <span class="hw-eyebrow">HIVEWORK · WORKFORCE DIVISIONS</span>
          <div class="hw-stat-pills">
            <span class="hw-stat-pill"><strong>{corpus.agents.length || 296}</strong> Agents</span>
            <span class="hw-stat-pill"><strong>{corpus.tiles.length || 18}</strong> Divisions</span>
            <span class="hw-stat-pill"><strong>17</strong> Harnesses</span>
            <span class="hw-stat-pill"><strong>21</strong> Skills</span>
          </div>
        </div>
        <button
          type="button"
          class="hw-term-pill"
          onclick={() => copyCliCommand("./scripts/install.sh")}
          title="Copy ./scripts/install.sh"
        >
          <span class="hw-term-prompt">&gt;</span>
          <code class="hw-term-cmd">./scripts/install.sh</code>
          {#if cliCopied}
            <CheckIcon size={12} />
          {:else}
            <CopyIcon size={12} />
          {/if}
        </button>
      </div>

      <!-- Search & Controls Bar -->
      <div class="lp-search-row">
        <Input
          bind:value={query}
          variant="search"
          placeholder={i18n.t("agents.searchPlaceholder")}
          ariaLabel={i18n.t("agents.searchLabel")}
        />

        <!-- Sort dropdown -->
        <div class="sort-wrap">
          <button
            class="ghost sort-btn"
            bind:this={sortBtn}
            onclick={() => (sortMenuOpen = !sortMenuOpen)}
          >
            <span>Sort: {formatSortLabel(sortBy)}</span>
            <ChevronDown size={13} />
          </button>
          {#if sortMenuOpen}
            <div class="sort-menu" role="menu" bind:this={sortMenu}>
              <button
                class="sort-opt"
                class:on={sortBy === "popular"}
                onclick={() => { sortBy = "popular"; sortMenuOpen = false; }}
              >
                Popular
              </button>
              <button
                class="sort-opt"
                class:on={sortBy === "az"}
                onclick={() => { sortBy = "az"; sortMenuOpen = false; }}
              >
                Name A-Z
              </button>
              <button
                class="sort-opt"
                class:on={sortBy === "newest"}
                onclick={() => { sortBy = "newest"; sortMenuOpen = false; }}
              >
                Newest
              </button>
            </div>
          {/if}
        </div>

        <!-- View Mode Toggle (Grid vs List) -->
        <div class="view-toggle">
          <button
            class="view-btn"
            class:active={viewMode === "grid"}
            onclick={() => (viewMode = "grid")}
            title="Grid View"
            aria-label="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            class="view-btn"
            class:active={viewMode === "list"}
            onclick={() => (viewMode = "list")}
            title="List View"
            aria-label="List View"
          >
            <LayoutList size={15} />
          </button>
        </div>

        {#if visible.length > 0}
          {#if selectMode}
            <button class="ghost" onclick={exitSelect}>{i18n.t("common.done")}</button>
          {:else}
            <button class="ghost" onclick={enterSelect}>{i18n.t("common.select")}</button>
          {/if}
        {/if}

        <button
          class="ghost icon"
          title={i18n.t("agents.rescanTitle")}
          aria-label={i18n.t("agents.rescanTitle")}
          onclick={() => install.reconcile()}
        >
          <RefreshIcon size={14} />
        </button>
      </div>

      <!-- Category Filter Pills Row -->
      <div class="pills-scroll" role="toolbar" aria-label="Category Filters">
        <button
          class="cat-pill-btn"
          class:active={ui.agentsCategory === null}
          onclick={() => pickCategory(null)}
        >
          <span>All Categories</span>
          <span class="pill-count">{corpus.agents.length}</span>
        </button>

        {#each corpus.tiles as c (c.slug)}
          <button
            class="cat-pill-btn"
            class:active={ui.agentsCategory === c.slug}
            onclick={() => pickCategory(c.slug)}
          >
            <span class="cat-pill-dot" style="background: {corpus.colorOf(c.slug)}"></span>
            <span>{c.label}</span>
            <span class="pill-count">{c.count}</span>
          </button>
        {/each}
      </div>

      <!-- State Lens Filter (All, Current, Attention, etc.) -->
      {#if !selectMode && base.length > 0}
        <div class="seg" role="tablist" aria-label={i18n.t("agents.filterByInstallState")}>
          {#each visibleLenses as f (f.id)}
            <button
              class="seg-btn"
              class:on={lens === f.id}
              role="tab"
              aria-selected={lens === f.id}
              onclick={() => setLens(f.id)}
            >
              {#if f.tone}<span class="seg-dot" data-tone={f.tone}></span>{/if}
              {i18n.t(f.key)}
              <span class="seg-c">{lensCounts[f.id]}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Bulk Selection Bar -->
      {#if selectMode}
        <div class="bulk-bar">
          <input
            type="checkbox"
            class="check"
            checked={allVisibleSelected}
            indeterminate={someSelected}
            onchange={toggleAll}
            aria-label={i18n.t("agents.selectAllVisible")}
          />
          <span class="bulk-count">{i18n.t("common.selected", { count: selected.size })}</span>
          {#if selected.size > 0}
            <div class="bulk-menu-wrap">
              <button class="ghost" bind:this={bulkBtn} disabled={bulkBusy} onclick={() => (menuOpen = !menuOpen)}>
                {bulkBusy ? i18n.t("common.working") : i18n.t("agents.withSelected")}<ChevronDown size={14} />
              </button>
              {#if menuOpen}
                <div class="bulk-menu" role="menu" bind:this={bulkMenu}>
                  <button class="bulk-opt" role="menuitem" onclick={() => { menuOpen = false; bulkInstallOpen = true; }}>
                    <DownloadIcon size={14} /><span>{i18n.t("agents.installSelected")}</span>
                  </button>
                  <div class="bulk-div"></div>
                  <button class="bulk-opt" role="menuitem" disabled={!canBulkUpdate} title={canBulkUpdate ? "" : i18n.t("agents.allSelectedInSync")} onclick={() => runBulk("update", "agents.updatedVerb")}>
                    <RefreshIcon size={14} /><span>{i18n.t("agents.updateSelected")}</span>
                  </button>
                  <button class="bulk-opt" role="menuitem" disabled={!canBulkTrack} title={canBulkTrack ? "" : i18n.t("agents.nothingUntrackedSelection")} onclick={() => runBulk("track", "agents.trackedVerb")}>
                    <PlusIcon size={14} /><span>{i18n.t("agents.trackSelected")}</span>
                  </button>
                  <button class="bulk-opt" class:danger={selHasForeign} role="menuitem" onclick={() => { menuOpen = false; confirmDelete = true; }}>
                    <TrashIcon size={14} /><span>{i18n.t(selHasForeign ? "agents.deleteSelected" : "agents.uninstallSelected")}</span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Agent Catalog Content (Grid or List) -->
    <div class="lp-list">
      {#if divisionMeta}
        {@const Icon = resolveCategoryIcon(divisionMeta.icon)}
        <div class="dov">
          <div class="dov-head">
            <span class="dov-ic" style="color:{divisionMeta.color}"><Icon size={18} /></span>
            <div class="dov-id">
              <span class="dov-name">{divisionMeta.label}</span>
              <span class="dov-sub">{i18n.t("agents.divisionOverview", { count: divisionMeta.slugs.length })}</span>
            </div>
            <button class="dov-deploy" onclick={() => (divisionInstallOpen = true)}>
              <DownloadIcon size={14} /> {i18n.t("agents.deployDivision")}
            </button>
          </div>
          <StarterPrompt template={divisionMeta.prompt} />
        </div>
      {/if}

      {#if corpus.loading && corpus.agents.length === 0}
        <LoadingState rows={6} label={i18n.t("agents.loading")} />
      {:else if corpus.error && corpus.agents.length === 0}
        <EmptyState title={i18n.t("agents.corpusUnavailableTitle")} body={i18n.t("agents.corpusUnavailableBody")}>
          {#snippet icon()}<SearchIcon size={48} />{/snippet}
        </EmptyState>
      {:else if visible.length === 0}
        <EmptyState
          title={lens !== "all"
            ? i18n.t("agents.emptyStateLens", { state: i18n.t(LENSES.find((l) => l.id === lens)?.key ?? "state.all").toLowerCase() })
            : query.trim()
              ? i18n.t("agents.emptySearch", { query: query.trim() })
              : i18n.t("agents.emptyDivision")}
          body={lens !== "all" ? i18n.t("agents.emptyFilteredBody") : i18n.t("agents.emptyBody")}
        >
          {#snippet icon()}<SearchIcon size={48} />{/snippet}
        </EmptyState>
      {:else if viewMode === "grid" && !selectMode}
        <!-- Grid View: Rich Agent Cards Matching Mockup -->
        <div class="agents-grid">
          {#each sortedVisible as a (a.slug)}
            {@const rows = installsBySlug.get(a.slug) ?? []}
            {@const isSel = panelAgent?.slug === a.slug}
            {@const isInstalled = rows.length > 0}
            <div
              class="agent-card"
              class:active={isSel}
              onclick={() => openAgent(a)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") openAgent(a); }}
            >
              <div class="ac-top">
                <div class="ac-avatar" style="--ac-color: {corpus.colorOf(a.category)}">
                  <span>{a.emoji ?? "🤖"}</span>
                </div>
                <div class="ac-meta">
                  <span class="ac-name">{a.name}</span>
                  <div class="ac-tags">
                    <span class="ac-badge" style="color: {corpus.colorOf(a.category)}">
                      {corpus.labelOf(a.category)}
                    </span>
                    <code class="ac-slug">{a.slug}</code>
                  </div>
                </div>
              </div>

              <p class="ac-desc">{a.description || a.vibe || "Production-ready agent for local harnesses."}</p>

              {#if a.vibe}
                <div class="ac-pills">
                  <span class="vibe-pill">{a.vibe}</span>
                  {#if rows.length > 0}
                    <span class="installed-pill">Installed</span>
                  {/if}
                </div>
              {/if}

              <div class="ac-footer">
                <button
                  class="deploy-btn"
                  onclick={(e) => {
                    e.stopPropagation();
                    openAgent(a);
                    installOpen = true;
                  }}
                >
                  <DownloadIcon size={13} />
                  <span>{isInstalled ? "Manage / Reinstall" : "Deploy / Install"}</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- List View -->
        <ul class="rows">
          {#each sortedVisible as a (a.slug)}
            {@const rows = installsBySlug.get(a.slug) ?? []}
            {@const isSel = panelAgent?.slug === a.slug}
            <li class="row" class:active={isSel} class:picked={selectMode && selected.has(a.slug)}>
              {#if selectMode}
                <input
                  type="checkbox"
                  class="check"
                  checked={selected.has(a.slug)}
                  onchange={() => toggleRow(a.slug)}
                  aria-label={`${i18n.t("common.select")} ${a.name}`}
                />
              {/if}
              <button class="row-main" onclick={() => openAgent(a)} aria-current={isSel ? "true" : undefined}>
                <span class="row-emoji" aria-hidden="true">{a.emoji ?? "🧩"}</span>
                <span class="row-text">
                  <span class="row-name truncate">{a.name}</span>
                  {#if a.vibe}<span class="row-vibe truncate">{a.vibe}</span>{/if}
                </span>
                <span class="row-cat" style="color: {corpus.colorOf(a.category)}">{corpus.labelOf(a.category)}</span>
                {#if rows.length > 0}
                  <span class="row-dots" aria-hidden="true">
                    {#each rows as r (r.dest)}
                      <span class="dot" data-tone={dotTone(r.state)} title={`${install.toolLabel(r.tool)} · ${r.state}`}></span>
                    {/each}
                  </span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Detail Slide-Over Inspector Pane -->
  {#if panelAgent}
    <div class="ws-resize">
      <ResizeHandle
        width={ui.detailPaneWidth}
        min={DETAIL_PANE_MIN_WIDTH}
        max={900}
        defaultWidth={DETAIL_PANE_DEFAULT_WIDTH}
        direction="left"
        label={i18n.t("common.resizeDetailPane")}
        onChange={(w) => (ui.detailPaneWidth = clampDetailPaneWidth(w))}
        onCommit={(w) => ui.setDetailPaneWidth(w)}
      />
    </div>

    <aside class="detail-pane" style="width: {ui.detailPaneWidth}px" aria-label={i18n.t("agents.agentDetail")}>
      <div class="dp-bar">
        <button class="dp-close" onclick={closeDetail} aria-label={i18n.t("agents.closeDetail")} title={i18n.t("agents.closeDetail")}>
          <XIcon size={16} />
        </button>
      </div>
      <div class="dp-scroll">
        <PersonaBody agent={panelAgent} loading={detailLoading} onCategory={(slug) => ui.openDivision(slug)}>
          {#snippet headerAction()}
            {#if panelAgent}
              <button class="dp-install" onclick={() => (installOpen = true)}>
                <DownloadIcon size={14} /> {i18n.t("agents.installAgent")}
              </button>
            {/if}
          {/snippet}
          {#snippet deploy()}
            {#if panelAgent}
              <DeploymentMatrix agent={panelAgent} onDiff={(t) => (diffTarget = t)} />
            {/if}
          {/snippet}
        </PersonaBody>
      </div>
    </aside>

    <button class="ws-scrim" aria-label={i18n.t("agents.closeDetail")} onclick={closeDetail}></button>
  {/if}
</section>

<!-- Modals -->
{#if diffTarget}
  <DiffModal
    slug={diffTarget.slug}
    tool={diffTarget.tool}
    projectPath={diffTarget.projectPath}
    name={diffTarget.name}
    onClose={() => (diffTarget = null)}
  />
{/if}

{#if installOpen && panelAgent}
  <InstallModal
    title={i18n.t("agents.installAgentTitle", { name: panelAgent.name })}
    agentSlugs={[panelAgent.slug]}
    onClose={() => (installOpen = false)}
  />
{/if}

{#if bulkInstallOpen && selected.size > 0}
  <InstallModal
    title={i18n.t("agents.installSelectedTitle", { count: selected.size })}
    agentSlugs={[...selected]}
    onClose={() => (bulkInstallOpen = false)}
  />
{/if}

{#if divisionInstallOpen && divisionMeta}
  <InstallModal
    title={i18n.t("agents.installDivisionTitle", { division: divisionMeta.label })}
    agentSlugs={divisionMeta.slugs}
    onClose={() => (divisionInstallOpen = false)}
  />
{/if}

{#if confirmDelete}
  <button class="cd-scrim" aria-label={i18n.t("common.cancel")} onclick={() => (confirmDelete = false)}></button>
  <div class="cd-box" role="alertdialog" aria-modal="true" aria-label={i18n.t("agents.confirmDeleteAria")}>
    <div class="cd-head"><AlertTriangle size={20} /><h2>{i18n.t(selHasForeign ? "agents.confirmDelete" : "agents.confirmUninstall", { count: selected.size })}</h2></div>
    <p class="cd-body">
      {#if selHasForeign}
        {i18n.t("agents.deleteBody", { count: selInstalls.length })}
      {:else}
        {i18n.t("agents.uninstallBody", { count: selInstalls.length })}
      {/if}
    </p>
    <p class="cd-note">{i18n.t("agents.confirmTip")}</p>
    <div class="cd-actions">
      <button class="cd-cancel" onclick={() => (confirmDelete = false)}>{i18n.t("common.cancel")}</button>
      <button class="cd-delete" disabled={bulkBusy} onclick={() => { confirmDelete = false; runBulk("uninstall", selHasForeign ? "agents.deletedVerb" : "agents.uninstalledVerb"); }}>
        <TrashIcon size={14} /> {i18n.t(selHasForeign ? "common.delete" : "common.uninstall")} {selInstalls.length}
      </button>
    </div>
  </div>
{/if}

<style>
  .ws { display: flex; height: 100%; min-height: 0; }

  /* Main List & Grid Pane */
  .list-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
  .lp-head {
    flex: none; padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex; flex-direction: column; gap: var(--space-2);
  }
  .hw-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
    padding-bottom: 4px;
  }
  .hw-strip-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .hw-eyebrow {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-brand);
  }
  .hw-stat-pills {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .hw-stat-pill {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-secondary);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    padding: 2px 8px;
  }
  .hw-stat-pill strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .hw-term-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 10px;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .hw-term-pill:hover {
    border-color: var(--color-brand-active);
    color: var(--color-text-primary);
  }
  .hw-term-prompt {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-brand);
    font-weight: 700;
  }
  .hw-term-cmd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-primary);
  }
  .lp-search-row { display: flex; align-items: center; gap: var(--space-2); }
  .lp-search-row :global(.wrap) { flex: 1; min-width: 0; }

  /* Sort dropdown */
  .sort-wrap { position: relative; }
  .sort-btn { font-size: 12px; }
  .sort-menu {
    position: absolute; top: calc(100% + 4px); right: 0; z-index: 30;
    min-width: 140px; padding: 4px;
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
    border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column; gap: 2px;
  }
  .sort-opt {
    padding: 6px 10px; font-size: var(--text-body-sm);
    text-align: left; background: transparent; color: var(--color-text-secondary);
    border-radius: var(--radius-sm); cursor: pointer;
  }
  .sort-opt:hover { background: var(--color-surface-sunken); color: var(--color-text-primary); }
  .sort-opt.on { color: var(--color-brand); font-weight: 600; }

  /* View toggle (Grid / List) */
  .view-toggle {
    display: flex;
    align-items: center;
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2px;
  }
  .view-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }
  .view-btn:hover { color: var(--color-text-primary); }
  .view-btn.active {
    background: var(--color-surface-raised);
    color: var(--color-brand);
    box-shadow: var(--shadow-xs);
  }

  .ghost {
    display: inline-flex; align-items: center; gap: 6px; flex: none;
    height: 32px; padding: 0 var(--space-3);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    background: transparent; color: var(--color-text-secondary);
    font-size: var(--text-body-sm); cursor: pointer;
  }
  .ghost:hover:not(:disabled) { color: var(--color-text-primary); background: var(--color-surface-sunken); }
  .ghost:disabled { opacity: 0.6; cursor: default; }
  .ghost.icon { padding: 0; width: 32px; justify-content: center; }

  /* Category Filter Pills (Scrollable row matching mockup) */
  .pills-scroll {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }
  .pills-scroll::-webkit-scrollbar { display: none; }

  .cat-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 12px;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    flex: none;
  }
  .cat-pill-btn:hover {
    border-color: rgba(245, 158, 11, 0.4);
    color: var(--color-text-primary);
  }
  .cat-pill-btn.active {
    border-color: var(--color-brand);
    background: rgba(245, 158, 11, 0.12);
    color: var(--color-brand);
    font-weight: 600;
    box-shadow: 0 0 12px -2px rgba(245, 158, 11, 0.25);
  }
  .cat-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }
  .pill-count {
    font-size: 10px;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }

  /* Segmented state lens */
  .seg {
    display: flex; align-items: center; gap: 2px; flex-wrap: wrap; min-width: 0;
    padding: 2px; background: var(--color-surface-sunken);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
  }
  .seg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 24px; padding: 0 10px; border-radius: var(--radius-sm);
    background: transparent; color: var(--color-text-secondary);
    font-size: 12px; cursor: pointer; white-space: nowrap;
  }
  .seg-btn:hover { color: var(--color-text-primary); }
  .seg-btn.on { background: var(--color-surface-raised); color: var(--color-text-primary); box-shadow: var(--shadow-sm); }
  .seg-dot { width: 6px; height: 6px; border-radius: 999px; background: var(--color-text-muted); flex: none; }
  .seg-dot[data-tone="ok"]     { background: var(--color-success); }
  .seg-dot[data-tone="warn"]   { background: var(--color-warning); }
  .seg-dot[data-tone="info"]   { background: var(--color-brand); }
  .seg-dot[data-tone="danger"] { background: var(--color-danger); }
  .seg-c { color: var(--color-text-muted); font-variant-numeric: tabular-nums; font-size: 11px; }

  /* Bulk selection */
  .bulk-bar { display: flex; align-items: center; gap: var(--space-2); }
  .bulk-count { font-size: var(--text-body-sm); color: var(--color-brand); font-weight: 600; }
  .bulk-menu-wrap { position: relative; margin-left: auto; }
  .bulk-menu {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 30;
    min-width: 280px; padding: 4px;
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
    border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column; gap: 1px;
  }
  .bulk-opt {
    display: flex; align-items: center; gap: var(--space-2);
    padding: 8px 10px; border-radius: var(--radius-sm);
    background: transparent; color: var(--color-text-primary);
    font-size: var(--text-body-sm); text-align: left; cursor: pointer;
  }
  .bulk-opt:hover:not(:disabled) { background: var(--color-surface-sunken); }
  .bulk-opt:disabled { opacity: 0.4; cursor: default; }
  .bulk-opt.danger { color: var(--color-danger); }
  .bulk-div { height: 1px; margin: 4px 0; background: var(--color-border); }
  .check { accent-color: var(--color-brand); cursor: pointer; width: 15px; height: 15px; flex: none; }

  /* Catalog Scroll Container */
  .lp-list { flex: 1; overflow-y: auto; min-height: 0; padding: var(--space-4); }

  /* Grid View: Responsive Agent Cards */
  .agents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }
  .agent-card {
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
  .agent-card:hover {
    border-color: var(--color-brand-active);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.45);
    transform: translateY(-2px);
  }
  .agent-card.active {
    border-color: var(--color-brand);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%), var(--color-surface-raised);
    box-shadow: 0 0 0 1px var(--color-brand);
  }

  .ac-top { display: flex; align-items: center; gap: 12px; }
  .ac-avatar {
    width: 44px; height: 44px; border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--ac-color, var(--color-brand)) 14%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--ac-color, var(--color-brand)) 30%, transparent);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; flex: none;
  }
  .ac-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .ac-name {
    font-size: var(--text-body); font-weight: 600; color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ac-tags { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
  .ac-badge {
    font-size: 11px; font-weight: 600; text-transform: capitalize;
  }
  .ac-slug {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1px 5px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ac-desc {
    font-size: var(--text-body-sm); color: var(--color-text-secondary);
    line-height: 1.4; margin: 0;
    display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden; flex: 1;
  }
  .ac-pills { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .vibe-pill {
    font-size: 10px; font-weight: 500; padding: 2px 8px;
    border-radius: var(--radius-full); background: var(--color-surface-sunken);
    color: var(--color-text-muted); border: 1px solid var(--color-border);
  }
  .installed-pill {
    font-size: 10px; font-weight: 600; padding: 2px 8px;
    border-radius: var(--radius-full); background: rgba(34, 197, 94, 0.12);
    color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .ac-footer { display: flex; align-items: center; margin-top: auto; }
  .deploy-btn {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; height: 34px; border-radius: var(--radius-md);
    background: var(--color-brand); color: #0d0c0a; font-weight: 600;
    font-size: var(--text-body-sm); cursor: pointer; border: none;
    transition: all 0.15s ease;
  }
  .deploy-btn:hover { filter: brightness(1.12); box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35); }

  /* List View Rows */
  .rows { display: flex; flex-direction: column; gap: 2px; }
  .row { display: flex; align-items: center; gap: var(--space-2); border-radius: var(--radius-md); padding-left: var(--space-2); }
  .row:hover { background: var(--color-surface-sunken); }
  .row.active { background: var(--color-brand-subtle); }
  .row.picked { background: color-mix(in srgb, var(--color-brand) 10%, transparent); }
  .row-main {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-2) var(--space-3); background: transparent; cursor: pointer; text-align: left;
  }
  .row-emoji { font-size: 19px; line-height: 1; flex: none; }
  .row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .row-name { font-size: var(--text-body-sm); font-weight: 500; color: var(--color-text-primary); }
  .row-vibe { font-size: 11px; color: var(--color-text-muted); }
  .row-cat { font-size: 11px; font-weight: 600; text-transform: capitalize; margin-right: 8px; flex: none; }
  .row-dots { display: inline-flex; align-items: center; gap: 3px; flex: none; }
  .row-dots .dot { width: 7px; height: 7px; border-radius: 999px; background: var(--color-text-muted); }
  .dot[data-tone="ok"]     { background: var(--color-success); }
  .dot[data-tone="warn"]   { background: var(--color-warning); }
  .dot[data-tone="info"]   { background: var(--color-brand); }
  .dot[data-tone="danger"] { background: var(--color-danger); }

  /* Division banner */
  .dov {
    margin-bottom: var(--space-4); padding: var(--space-3);
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    background: var(--color-surface-raised); display: flex; flex-direction: column; gap: var(--space-3);
  }
  .dov-head { display: flex; align-items: center; gap: var(--space-3); }
  .dov-ic { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: var(--radius-md); background: var(--color-surface-sunken); }
  .dov-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .dov-name { font-size: var(--text-body); font-weight: 600; color: var(--color-text-primary); }
  .dov-sub { font-size: var(--text-caption); color: var(--color-text-muted); }
  .dov-deploy {
    flex: none; display: inline-flex; align-items: center; gap: 6px;
    height: 30px; padding: 0 12px; border-radius: var(--radius-md);
    border: 1px solid var(--color-border); background: var(--color-surface-sunken);
    color: var(--color-text-primary); font-size: var(--text-body-sm); cursor: pointer;
  }
  .dov-deploy:hover { border-color: var(--color-brand); }

  /* Detail Slide-over */
  .ws-resize { display: flex; flex: none; }
  .detail-pane {
    flex: none; max-width: 90vw;
    display: flex; flex-direction: column; min-height: 0;
    background: var(--color-surface-raised);
    border-left: 1px solid var(--color-border);
  }
  .dp-bar { flex: none; display: flex; justify-content: flex-end; padding: 6px 8px 0; }
  .dp-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: var(--radius-sm);
    color: var(--color-text-muted); background: transparent; cursor: pointer;
  }
  .dp-close:hover { background: var(--color-surface-sunken); color: var(--color-text-primary); }
  .dp-install {
    display: inline-flex; align-items: center; gap: 6px;
    height: 30px; padding: 0 12px; border-radius: var(--radius-md);
    background: var(--color-brand); color: #0d0c0a; font-weight: 600;
    font-size: var(--text-body-sm); cursor: pointer; border: none;
  }
  .dp-install:hover { filter: brightness(1.1); }
  .dp-scroll { flex: 1; overflow-y: auto; min-height: 0; }

  .ws-scrim { display: none; }
  @media (max-width: 860px) {
    .ws-resize { display: none; }
    .detail-pane {
      position: fixed; top: 36px; right: 0; bottom: 0; z-index: 41;
      width: min(var(--detail-w, 420px), 92vw) !important;
      box-shadow: var(--shadow-lg, -8px 0 24px rgba(0,0,0,0.18));
    }
    .ws:not(.sel) .detail-pane { display: none; }
    .ws.sel .ws-scrim {
      display: block; position: fixed; inset: 36px 0 0 0; z-index: 40;
      background: rgba(0,0,0,0.28); border: 0; cursor: default;
    }
  }

  /* Confirm Delete Dialog */
  .cd-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; border: none; }
  .cd-box {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--color-surface-raised); border: 1px solid var(--color-border);
    border-radius: var(--radius-lg); padding: var(--space-5); z-index: 51;
    max-width: 420px; width: 90%; display: flex; flex-direction: column; gap: var(--space-3);
  }
  .cd-head { display: flex; align-items: center; gap: 8px; color: var(--color-danger); }
  .cd-head h2 { font-size: var(--text-h3); font-weight: 600; margin: 0; }
  .cd-body { font-size: var(--text-body-sm); color: var(--color-text-secondary); margin: 0; }
  .cd-note { font-size: 11px; color: var(--color-text-muted); margin: 0; }
  .cd-actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }
  .cd-cancel {
    height: 32px; padding: 0 12px; border-radius: var(--radius-md);
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text-primary); cursor: pointer; font-size: var(--text-body-sm);
  }
  .cd-delete {
    height: 32px; padding: 0 12px; border-radius: var(--radius-md);
    background: var(--color-danger); border: none; color: white;
    cursor: pointer; font-size: var(--text-body-sm); font-weight: 600;
    display: inline-flex; align-items: center; gap: 6px;
  }
</style>
