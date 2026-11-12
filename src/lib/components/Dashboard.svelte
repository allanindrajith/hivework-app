<script lang="ts">
  /**
   * Hive Dashboard — Modern, intuitive overview of the Hivework agent platform.
   * Features:
   *  - 4 at-a-glance KPI metric cards with sparkline visuals
   *  - 3-step Quick Deploy onboarding guide
   *  - Featured & Top AI Agents showcase with one-click deployment
   *  - Active Project & Tool coverage analytics
   *  - System health and real-time activity feed
   */
  import { errorText, type Agent, type InstalledAgent } from "$lib/types";
  import { onMount } from "svelte";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import RepoIcon from "@lucide/svelte/icons/git-branch";
  import Rocket from "@lucide/svelte/icons/rocket";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Folder from "@lucide/svelte/icons/folder";
  import Bot from "@lucide/svelte/icons/bot";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  import { corpus } from "$lib/stores/corpus.svelte";
  import { install, SUPPORTED_TOOLS } from "$lib/stores/install.svelte";
  import { projects } from "$lib/stores/projects.svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { activity } from "$lib/stores/activity.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { toolAccent, toolLabel } from "$lib/data/toolRegistry";
  import HealthDonut from "./HealthDonut.svelte";
  import CoverageDonuts from "./CoverageDonuts.svelte";
  import CatalogByDivision from "./CatalogByDivision.svelte";
  import InstallSunburst from "./InstallSunburst.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";

  onMount(() => {
    corpus.ensureLoaded();
    projects.refresh();
    void catalog.load().then(() => catalog.loadStatus());
  });

  const catalogReadOnly = $derived(
    catalog.source.kind === "userClone" && !catalog.source.manage,
  );
  const showCatalogUpdate = $derived(!!catalog.status?.isGit && !catalogReadOnly);
  const catalogRepo = $derived(catalog.status?.repoSlug ?? null);

  async function updateCatalog() {
    if (catalog.busy) return;
    try {
      await catalog.pull();
      toast.success(i18n.t("dashboard.catalogUpdated"));
    } catch (e) {
      toast.error(i18n.t("common.actionFailed"), errorText(e));
    }
  }

  const available = $derived(corpus.agents.length || 296);
  const managed = $derived(install.installed.filter((i) => i.state !== "foreign").length);
  const trackedByApp = $derived(install.installed.filter((i) => i.tracked && i.state !== "foreign").length);
  const fromOtherTools = $derived(managed - trackedByApp);
  const attention = $derived(
    install.installed.filter((i) => ["outdated", "modified", "removed"].includes(i.state)).length,
  );
  const foreign = $derived(install.installed.filter((i) => i.state === "foreign").length);
  const totalInstalls = $derived(install.installed.length);

  // Install health segments
  const byState = $derived.by(() => {
    const c = { current: 0, outdated: 0, modified: 0, foreign: 0, removed: 0 };
    for (const i of install.installed) c[i.state]++;
    return c;
  });
  const healthSegments = $derived([
    { label: i18n.t("state.current"),   value: byState.current,  color: "var(--color-success)", onClick: () => ui.openAgents(null, "current") },
    { label: i18n.t("state.outdated"),  value: byState.outdated,  color: "var(--color-warning)", onClick: () => ui.openAgents(null, "outdated") },
    { label: i18n.t("state.modified"),  value: byState.modified,  color: "color-mix(in srgb, var(--color-warning) 55%, var(--color-danger))", onClick: () => ui.openAgents(null, "outdated") },
    { label: i18n.t("state.foreign"), value: byState.foreign,   color: "var(--color-brand)",   onClick: () => ui.openAgents(null, "foreign") },
    { label: i18n.t("state.removed"),   value: byState.removed,   color: "var(--color-danger)",  onClick: () => ui.openAgents(null, "removed") },
  ]);

  // Coverage by tool
  const perTool = $derived(
    SUPPORTED_TOOLS.map((t) => ({
      id: t.id,
      label: t.label,
      count: install.installed.filter((i) => i.tool === t.id).length,
      detected: install.tools.find((x) => x.tool === t.id)?.detected ?? false,
    })).filter((t) => t.count > 0),
  );
  const maxTool = $derived(Math.max(1, ...perTool.map((t) => t.count)));

  let divisionHover = $state<string | null>(null);

  // Managed rows and project breakdown
  const managedRows = $derived(install.installed.filter((i) => i.state !== "foreign"));
  const globalRows = $derived(managedRows.filter((i) => i.projectPath == null));
  const projectRows = $derived(managedRows.filter((i) => i.projectPath != null));

  function basename(p: string): string {
    return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;
  }
  function projectColor(i: number): string {
    return `hsl(${(i * 137.508 + 25) % 360} 60% 55%)`;
  }

  const globalByTool = $derived.by(() => {
    const m = new Map<string, number>();
    for (const r of globalRows) m.set(r.tool, (m.get(r.tool) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, value]) => ({ label: toolLabel(id), value, color: toolAccent(id), onClick: () => ui.openTools(id) }));
  });
  const projByProject = $derived.by(() => {
    const m = new Map<string, number>();
    for (const r of projectRows) m.set(r.projectPath!, (m.get(r.projectPath!) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([path, value], i) => ({ label: basename(path), value, color: projectColor(i), onClick: () => ui.selectProject(path) }));
  });
  const sunburstGroups = $derived([
    { label: i18n.t("dashboard.global"), value: globalRows.length, color: "var(--color-brand)", onClick: () => ui.setSection("tools"), children: globalByTool },
    { label: i18n.t("dashboard.projects"), value: projectRows.length, color: "var(--color-success)", onClick: () => ui.setSection("projects"), children: projByProject },
  ]);

  const slugCat = $derived(new Map(corpus.agents.map((a) => [a.slug, a.category])));
  const projectBreakdown = $derived.by(() => {
    const byPath = new Map<string, InstalledAgent[]>();
    for (const r of projectRows) {
      const arr = byPath.get(r.projectPath!);
      if (arr) arr.push(r);
      else byPath.set(r.projectPath!, [r]);
    }
    return [...byPath.entries()]
      .map(([path, rows]) => {
        const divs = new Map<string, number>();
        for (const r of rows) {
          const c = slugCat.get(r.slug) ?? "uncategorized";
          divs.set(c, (divs.get(c) ?? 0) + 1);
        }
        const divisions = [...divs.entries()]
          .map(([slug, count]) => ({ slug, label: corpus.labelOf(slug), color: corpus.colorOf(slug), count }))
          .sort((a, b) => b.count - a.count);
        return { path, label: basename(path), total: rows.length, divisions };
      })
      .sort((a, b) => b.total - a.total);
  });

  // Featured agents selection
  const curatedSlugs = [
    "hive-senior-developer",
    "hive-devops-automator",
    "hive-ux-architect",
    "hive-database-optimizer",
    "hive-code-reviewer",
    "hive-evidence-collector",
  ];

  const featuredAgents = $derived.by(() => {
    if (corpus.agents.length === 0) {
      // Fallback preview placeholders when corpus is still hydrating
      return [
        {
          slug: "hive-senior-developer",
          name: "Senior Developer",
          category: "engineering",
          description: "High-level architecture, TypeScript, Svelte, and systems design.",
          emoji: "⚡",
          color: "#f59e0b",
          vibe: "Precise",
          body: ""
        },
        {
          slug: "hive-devops-automator",
          name: "DevOps Automator",
          category: "engineering",
          description: "Containerization, GitHub Actions, cloud pipelines, and Docker.",
          emoji: "🚀",
          color: "#3b82f6",
          vibe: "Automated",
          body: ""
        },
        {
          slug: "hive-ux-architect",
          name: "UX Architect",
          category: "design",
          description: "Design systems, typography, accessible UI, and micro-animations.",
          emoji: "✨",
          color: "#ec4899",
          vibe: "Creative",
          body: ""
        }
      ] as Agent[];
    }
    const matches: Agent[] = [];
    for (const slug of curatedSlugs) {
      const a = corpus.agents.find((x) => x.slug === slug || x.slug.includes(slug));
      if (a && !matches.some(m => m.slug === a.slug)) matches.push(a);
    }
    if (matches.length < 3) {
      for (const a of corpus.agents) {
        if (!matches.some(m => m.slug === a.slug)) matches.push(a);
        if (matches.length >= 3) break;
      }
    }
    return matches.slice(0, 3);
  });

  function deployAgent(agent: Agent) {
    ui.openAgents(agent.category);
    ui.selectAgent(agent.slug);
  }

  // Detected tools summary
  const detectedToolCount = $derived(install.tools.filter(t => t.detected).length);

  const HERO_COMMANDS = [
    { id: "install", label: "Install All", command: "./scripts/install.sh", desc: "Detect installed tools & deploy all 296 hive-* agents" },
    { id: "skills", label: "Install Skills", command: "./scripts/install.sh --skills", desc: "Install 21 superpowers workflow skills alongside agents" },
    { id: "convert", label: "Convert All", command: "./scripts/convert.sh --parallel", desc: "Regenerate 17 tool integrations in parallel" },
  ] as const;

  let activeCmdIdx = $state(0);
  let cmdCopied = $state(false);

  async function copyHeroCmd(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      cmdCopied = true;
      toast.success("Copied command to clipboard");
      setTimeout(() => { cmdCopied = false; }, 1800);
    } catch {
      toast.error("Could not copy command");
    }
  }
</script>

<section class="dash">
  <!-- 0. hivework.online Hero Banner -->
  <div class="hw-hero">
    <div class="hw-hero-copy">
      <div class="hw-eyebrow-row">
        <span class="hw-eyebrow">HIVEWORK · HIVEWORK.ONLINE</span>
        <span class="hw-creator-pill">Built by Allan Indrajith · itsallan.me</span>
      </div>
      <h2 class="hw-headline">
        The Unified AI Agent Workforce — <span class="hw-accent">{available} Specialized Agents</span>
      </h2>
      <p class="hw-sub">
        18 divisions · 21 workflow skills · 17 AI coding harnesses · Every agent prefixed with <code>hive-*</code> for zero naming collisions.
      </p>
    </div>

    <div class="hw-terminal">
      <div class="hw-term-head">
        <div class="hw-term-dots" aria-hidden="true">
          <span class="t-dot red"></span>
          <span class="t-dot amber"></span>
          <span class="t-dot green"></span>
        </div>
        <div class="hw-term-tabs" role="tablist">
          {#each HERO_COMMANDS as c, idx (c.id)}
            <button
              type="button"
              role="tab"
              aria-selected={activeCmdIdx === idx}
              class="hw-term-tab"
              class:active={activeCmdIdx === idx}
              onclick={() => (activeCmdIdx = idx)}
            >
              {c.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="hw-term-body">
        <span class="hw-term-prompt">&gt;</span>
        <code class="hw-term-code">{HERO_COMMANDS[activeCmdIdx].command}</code>
        <button
          type="button"
          class="hw-term-copy"
          onclick={() => copyHeroCmd(HERO_COMMANDS[activeCmdIdx].command)}
        >
          {#if cmdCopied}
            <CheckIcon size={12} />
            <span>Copied</span>
          {:else}
            <CopyIcon size={12} />
            <span>Copy</span>
          {/if}
        </button>
      </div>
      <div class="hw-term-foot">{HERO_COMMANDS[activeCmdIdx].desc}</div>
    </div>
  </div>
  {#if showCatalogUpdate}
    <div class="cat-bar">
      <span class="cat-info">
        <RepoIcon size={15} />
        <span class="cat-repo">{catalogRepo ?? i18n.t("dashboard.catalogGitHub")}</span>
        {#if catalog.updateCheck && !catalog.updateCheck.upToDate && catalog.updateCheck.behind > 0}
          <span class="cat-behind">{i18n.t("dashboard.catalogBehind", { count: catalog.updateCheck.behind })}</span>
        {/if}
      </span>
      <button
        class="cat-btn"
        disabled={catalog.busy}
        onclick={updateCatalog}
        title={catalogRepo ? i18n.t("dashboard.catalogManagedFrom", { repo: catalogRepo }) : undefined}
      >
        <RefreshCw size={14} class={catalog.busy ? "cat-spin" : ""} />
        <span>{catalog.busy ? i18n.t("common.working") : i18n.t("dashboard.updateFromGitHub")}</span>
      </button>
    </div>
  {/if}

  <!-- 1. Top KPI Metrics Row -->
  <div class="stats-grid">
    <!-- Stat 1: Available -->
    <button class="kpi-card" onclick={() => ui.openAgents()}>
      <div class="kpi-header">
        <span class="kpi-num">{available}</span>
        <span class="kpi-badge gold">Catalog</span>
      </div>
      <span class="kpi-lbl">{i18n.t("dashboard.agentsAvailable")}</span>
      <!-- Amber Sparkline SVG -->
      <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0,18 Q20,22 35,12 T70,16 T100,6" fill="none" stroke="var(--color-brand)" stroke-width="2.2" stroke-linecap="round" />
        <path d="M0,18 Q20,22 35,12 T70,16 T100,6 L100,24 L0,24 Z" fill="url(#amber-grad)" opacity="0.25" />
        <defs>
          <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    </button>

    <!-- Stat 2: Total Installed -->
    <button class="kpi-card" onclick={() => ui.openAgents(null, "current")}>
      <div class="kpi-header">
        <span class="kpi-num">{managed}</span>
        <span class="kpi-badge {managed > 0 ? 'green' : 'neutral'}">{managed > 0 ? 'Active' : 'Empty'}</span>
      </div>
      <span class="kpi-lbl">{i18n.t("dashboard.totalInstalled")}</span>
      <div class="kpi-ring-wrap">
        <svg class="kpi-ring" viewBox="0 0 36 36">
          <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          <path class="ring-fill" stroke-dasharray="{Math.min(100, (managed / 10) * 100)}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
        <span class="ring-sub">{fromOtherTools > 0 ? `+${fromOtherTools} external` : 'Ready to deploy'}</span>
      </div>
    </button>

    <!-- Stat 3: Recommended -->
    <button class="kpi-card" onclick={() => ui.openAgents()}>
      <div class="kpi-header">
        <span class="kpi-num">12</span>
        <span class="kpi-badge gold">Featured</span>
      </div>
      <span class="kpi-lbl">Recommended Agents</span>
      <!-- Mini glowing bars -->
      <div class="mini-bars">
        <span class="bar" style="height: 35%"></span>
        <span class="bar" style="height: 55%"></span>
        <span class="bar" style="height: 40%"></span>
        <span class="bar" style="height: 85%"></span>
        <span class="bar" style="height: 70%"></span>
        <span class="bar" style="height: 95%"></span>
        <span class="bar" style="height: 60%"></span>
      </div>
    </button>

    <!-- Stat 4: System Status -->
    <button class="kpi-card" onclick={() => ui.setSection("tools")}>
      <div class="kpi-header">
        <span class="kpi-title-stat">System Ready</span>
        <span class="kpi-badge green">Optimal</span>
      </div>
      <span class="kpi-lbl">{detectedToolCount} Harnesses Detected</span>
      <!-- Wave SVG -->
      <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0,20 Q25,8 50,16 T100,8" fill="none" stroke="var(--color-success)" stroke-width="2.2" stroke-linecap="round" />
        <path d="M0,20 Q25,8 50,16 T100,8 L100,24 L0,24 Z" fill="url(#green-grad)" opacity="0.2" />
        <defs>
          <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-success)" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="var(--color-success)" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    </button>
  </div>

  <!-- 2. Get Started: Quick Deploy Banner -->
  <div class="quick-deploy">
    <div class="qd-header">
      <div class="qd-title-wrap">
        <Sparkles size={16} class="qd-sparkle" />
        <h3 class="qd-title">Get Started: Quick Deploy</h3>
      </div>
      <span class="qd-hint">3 steps to full AI multi-agent orchestration</span>
    </div>

    <div class="qd-steps">
      <!-- Step 1 -->
      <button class="qd-step" onclick={() => ui.setSection("tools")}>
        <div class="step-badge">
          <Wrench size={16} />
        </div>
        <div class="step-content">
          <span class="step-num">Step 1</span>
          <span class="step-name">Connect AI Tools</span>
          <span class="step-desc">Audit Claude Code, Cursor, Windsurf</span>
        </div>
        <ArrowRight size={14} class="step-arrow" />
      </button>

      <!-- Step 2 -->
      <button class="qd-step" onclick={() => ui.setSection("projects")}>
        <div class="step-badge">
          <Folder size={16} />
        </div>
        <div class="step-content">
          <span class="step-num">Step 2</span>
          <span class="step-name">Link Workspace</span>
          <span class="step-desc">Select or connect your code repositories</span>
        </div>
        <ArrowRight size={14} class="step-arrow" />
      </button>

      <!-- Step 3 -->
      <button class="qd-step primary" onclick={() => ui.openAgents()}>
        <div class="step-badge gold-bg">
          <Rocket size={16} />
        </div>
        <div class="step-content">
          <span class="step-num gold">Step 3</span>
          <span class="step-name">Deploy First Agent</span>
          <span class="step-desc">Pick from {available} specialized agents</span>
        </div>
        <ArrowRight size={14} class="step-arrow" />
      </button>
    </div>
  </div>

  <!-- 3. Featured & Top AI Agents Showcase -->
  <div class="featured-wrap">
    <div class="section-head">
      <div class="sh-left">
        <Bot size={18} class="sh-icon" />
        <h3 class="sh-title">Featured & Top AI Agents</h3>
      </div>
      <button class="sh-link" onclick={() => ui.openAgents()}>
        <span>View all {available} agents</span>
        <ArrowRight size={13} />
      </button>
    </div>

    <div class="featured-grid">
      {#each featuredAgents as agent (agent.slug)}
        <div class="agent-card">
          <div class="ac-top">
            <div class="ac-avatar" style="--ac-color: {corpus.colorOf(agent.category)}">
              <span>{agent.emoji || "🤖"}</span>
            </div>
            <div class="ac-meta">
              <span class="ac-name">{agent.name}</span>
              <div class="ac-tags">
                <span class="ac-cat" style="color: {corpus.colorOf(agent.category)}">
                  {corpus.labelOf(agent.category)}
                </span>
                <code class="ac-slug">{agent.slug}</code>
              </div>
            </div>
          </div>
          <p class="ac-desc">{agent.description || "Production-grade AI agent ready to integrate with your local development harness."}</p>
          <div class="ac-footer">
            <button class="deploy-btn" onclick={() => deployAgent(agent)}>
              <Rocket size={13} />
              <span>Deploy</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- 4. Lower Two-Column Section: Workspaces & Tools on Left, Health & Activity on Right -->
  <div class="cols">
    <!-- Left: Projects & Installed Summary -->
    <div class="card">
      <div class="card-head-row">
        <h3 class="c-title">{i18n.t("dashboard.projects")} & Workspaces</h3>
        <button class="c-link" onclick={() => ui.setSection("projects")}>Open Projects →</button>
      </div>
      <div class="card-fill">
        {#if projectBreakdown.length === 0}
          <div class="empty-box">
            <Folder size={24} class="empty-icon" />
            <p class="muted">{i18n.t("dashboard.noProjectInstalls")}</p>
            <button class="action-link" onclick={() => ui.setSection("projects")}>
              Connect a project workspace
            </button>
          </div>
        {:else}
          <ul class="proj-list">
            {#each projectBreakdown.slice(0, 4) as p (p.path)}
              <li>
                <button class="proj-row" onclick={() => ui.selectProject(p.path)} title={p.path}>
                  <span class="proj-top">
                    <span class="proj-name">{p.label}</span>
                    <span class="proj-total">{i18n.count(p.total, "common.agent.one", "common.agent.many")}</span>
                  </span>
                  <span class="proj-bar">
                    {#each p.divisions as d (d.slug)}
                      <span class="proj-seg" style="flex:{d.count};background:{d.color}" title="{d.label}: {d.count}"></span>
                    {/each}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Coverage by tool -->
      <div class="tool-subcard">
        <div class="card-head-row">
          <span class="subcard-title">{i18n.t("dashboard.coverageByTool")}</span>
          <button class="c-link" onclick={() => ui.setSection("tools")}>{i18n.t("dashboard.manageTools")} →</button>
        </div>
        {#if perTool.length === 0}
          <p class="muted text-sm">{i18n.t("dashboard.emptyToolCoverage")}</p>
        {:else}
          <ul class="bars">
            {#each perTool as t (t.id)}
              <li>
                <button class="bar-btn" onclick={() => ui.openTools(t.id)}>
                  <span class="tool-dot" class:off={!t.detected}></span>
                  <span class="bar-label">{t.label}</span>
                  <span class="bar-track"><span class="bar-fill" style="width:{(t.count / maxTool) * 100}%"></span></span>
                  <span class="bar-count">{t.count}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    <!-- Right: Health Status & Recent Activity -->
    <div class="card">
      <div class="card-head-row">
        <h3 class="c-title">System Health & Activity</h3>
        <button class="c-link" onclick={() => ui.setSection("activity")}>View Logs →</button>
      </div>

      <div class="activity-feed">
        <!-- Live System Operational Badge -->
        <div class="feed-item active">
          <div class="feed-indicator green-pulse"></div>
          <div class="feed-body">
            <span class="feed-title">System Operational</span>
            <span class="feed-time">All harnesses monitored</span>
          </div>
          <span class="feed-tag">Live</span>
        </div>

        {#if activity.entries.length > 0}
          {#each activity.entries.slice(0, 3) as entry (entry.id)}
            <div class="feed-item">
              <div class="feed-indicator {entry.outcome === 'ok' ? 'amber-dot' : 'red-dot'}"></div>
              <div class="feed-body">
                <span class="feed-title">{entry.agentName || entry.agentSlug || entry.action}</span>
                <span class="feed-time">{entry.action.toUpperCase()} {entry.tool ? `• ${entry.tool}` : ''}</span>
              </div>
              <span class="feed-tag muted">{entry.outcome}</span>
            </div>
          {/each}
        {:else}
          <div class="feed-item">
            <div class="feed-indicator amber-dot"></div>
            <div class="feed-body">
              <span class="feed-title">Agent Store Ready</span>
              <span class="feed-time">{available} hive-* agents loaded into catalog</span>
            </div>
            <span class="feed-tag">Ready</span>
          </div>
          <div class="feed-item">
            <div class="feed-indicator amber-dot"></div>
            <div class="feed-body">
              <span class="feed-title">Harness Bridge Active</span>
              <span class="feed-time">Local environment synced</span>
            </div>
            <span class="feed-tag">Synced</span>
          </div>
        {/if}
      </div>

      <!-- Donut Chart summary if installed > 0 -->
      {#if totalInstalls > 0}
        <div class="health-mini">
          <HealthDonut segments={healthSegments} />
        </div>
      {/if}
    </div>
  </div>

  <!-- 5. Cross-Tool Coverage & Catalog Distribution -->
  <div class="card">
    <h3 class="c-title">{i18n.t("dashboard.crossToolCoverage")}</h3>
    <CoverageDonuts bind:hovered={divisionHover} />
    <div class="merge-sep">
      <span class="merge-cap">{i18n.t("dashboard.catalogByDivision")}</span>
    </div>
    <CatalogByDivision bind:hovered={divisionHover} />
  </div>
</section>

<style>
  .dash {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* 0. hivework.online Hero Banner */
  .hw-hero {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background:
      radial-gradient(ellipse at 15% 0%, rgba(245, 158, 11, 0.12) 0%, transparent 65%),
      var(--color-surface-raised);
  }
  @media (max-width: 920px) {
    .hw-hero { grid-template-columns: 1fr; }
  }
  .hw-hero-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .hw-eyebrow-row {
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
  .hw-creator-pill {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    color: var(--color-brand);
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: var(--radius-full);
    padding: 2px 8px;
  }
  .hw-headline {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
  }
  .hw-accent {
    color: var(--color-brand);
  }
  .hw-sub {
    margin: 0;
    font-size: var(--text-body-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
  .hw-sub code {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-brand);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1px 5px;
  }

  .hw-terminal {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .hw-term-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }
  .hw-term-dots {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .t-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }
  .t-dot.red { background: #ef4444; opacity: 0.75; }
  .t-dot.amber { background: #f59e0b; opacity: 0.75; }
  .t-dot.green { background: #22c55e; opacity: 0.75; }
  .hw-term-tabs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .hw-term-tab {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border: 1px solid transparent;
  }
  .hw-term-tab:hover {
    color: var(--color-text-primary);
  }
  .hw-term-tab.active {
    color: var(--color-brand);
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.28);
  }
  .hw-term-body {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
  }
  .hw-term-prompt {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-brand);
  }
  .hw-term-code {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hw-term-copy {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 10px;
    cursor: pointer;
  }
  .hw-term-copy:hover {
    border-color: var(--color-brand);
    color: var(--color-brand);
  }
  .hw-term-foot {
    padding: 6px 12px;
    border-top: 1px solid var(--color-border);
    font-size: 11px;
    color: var(--color-text-muted);
    background: rgba(23, 21, 17, 0.55);
  }

  /* Catalog Update Bar */
  .cat-bar {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    background: var(--color-surface-raised);
  }
  .cat-info { display: flex; align-items: center; gap: var(--space-2); min-width: 0; color: var(--color-text-secondary); font-size: var(--text-body-sm); }
  .cat-repo { font-family: var(--font-mono, ui-monospace, monospace); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cat-behind { flex: none; font-size: var(--text-caption); font-weight: var(--fw-semibold); color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 15%, transparent); padding: 1px 7px; border-radius: var(--radius-full); }
  .cat-btn {
    display: inline-flex; align-items: center; gap: 6px; flex: none;
    height: 30px; padding: 0 var(--space-3);
    border: 1px solid transparent; border-radius: var(--radius-md);
    background: var(--color-brand); color: #0d0c0a; font-weight: var(--fw-semibold);
    font-size: var(--text-body-sm); cursor: pointer; transition: all 0.15s ease;
  }
  .cat-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  .cat-btn:disabled { opacity: 0.6; cursor: default; }
  :global(.cat-spin) { animation: cat-spin 0.7s linear infinite; }
  @keyframes cat-spin { to { transform: rotate(360deg); } }

  /* 1. Top KPI Cards */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
  }
  @media (max-width: 980px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 580px) {
    .stats-grid { grid-template-columns: 1fr; }
  }

  .kpi-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--space-4);
    min-height: 120px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    cursor: pointer;
    text-align: left;
    position: relative;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .kpi-card:hover {
    border-color: color-mix(in srgb, var(--color-brand) 45%, var(--color-border));
    box-shadow: 0 6px 24px -4px rgba(245, 158, 11, 0.12);
    transform: translateY(-2px);
  }
  .kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .kpi-num {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .kpi-title-stat {
    font-size: 19px;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
  }
  .kpi-lbl {
    font-size: var(--text-body-sm);
    color: var(--color-text-muted);
    font-weight: 500;
    margin-top: 4px;
    margin-bottom: 8px;
  }
  .kpi-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .kpi-badge.gold {
    background: rgba(245, 158, 11, 0.14);
    color: var(--color-brand);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  .kpi-badge.green {
    background: rgba(34, 197, 94, 0.14);
    color: var(--color-success);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  .kpi-badge.neutral {
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  /* Sparkline visual */
  .sparkline {
    width: 100%;
    height: 26px;
    margin-top: auto;
  }

  /* Donut Ring */
  .kpi-ring-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
  }
  .kpi-ring {
    width: 24px;
    height: 24px;
    transform: rotate(-90deg);
    flex: none;
  }
  .ring-bg {
    fill: none;
    stroke: var(--color-surface-sunken);
    stroke-width: 4;
  }
  .ring-fill {
    fill: none;
    stroke: var(--color-brand);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .ring-sub {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  /* Mini bars sparkline */
  .mini-bars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 24px;
    margin-top: auto;
  }
  .mini-bars .bar {
    width: 5px;
    background: var(--color-brand);
    border-radius: 2px;
    opacity: 0.85;
  }

  /* 2. Quick Deploy Banner */
  .quick-deploy {
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(13, 12, 10, 0.4) 100%), var(--color-surface-raised);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .qd-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .qd-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  :global(.qd-sparkle) {
    color: var(--color-brand);
  }
  .qd-title {
    font-size: var(--text-body);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .qd-hint {
    font-size: var(--text-caption);
    color: var(--color-text-muted);
  }
  .qd-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  @media (max-width: 780px) {
    .qd-steps { grid-template-columns: 1fr; }
  }
  .qd-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }
  .qd-step:hover {
    border-color: rgba(245, 158, 11, 0.5);
    background: color-mix(in srgb, var(--color-brand) 6%, var(--color-surface));
    transform: translateY(-1px);
  }
  .step-badge {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-brand);
    flex: none;
  }
  .step-badge.gold-bg {
    background: rgba(245, 158, 11, 0.16);
    color: var(--color-brand);
  }
  .step-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .step-num {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }
  .step-num.gold {
    color: var(--color-brand);
  }
  .step-name {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .step-desc {
    font-size: 11px;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.step-arrow) {
    color: var(--color-text-muted);
    opacity: 0.6;
    flex: none;
    transition: transform 0.15s ease;
  }
  .qd-step:hover :global(.step-arrow) {
    transform: translateX(3px);
    color: var(--color-brand);
    opacity: 1;
  }

  /* 3. Featured & Top AI Agents */
  .featured-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sh-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  :global(.sh-icon) {
    color: var(--color-brand);
  }
  .sh-title {
    font-size: var(--text-body);
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .sh-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-body-sm);
    color: var(--color-brand);
    background: transparent;
    cursor: pointer;
    font-weight: 500;
  }
  .sh-link:hover {
    text-decoration: underline;
  }
  .featured-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  @media (max-width: 860px) {
    .featured-grid { grid-template-columns: 1fr; }
  }

  .agent-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .agent-card:hover {
    border-color: rgba(245, 158, 11, 0.45);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
  }
  .ac-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ac-avatar {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--ac-color, var(--color-brand)) 15%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--ac-color, var(--color-brand)) 35%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex: none;
  }
  .ac-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .ac-name {
    font-size: var(--text-body);
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ac-tags {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .ac-cat {
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
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
    font-size: var(--text-body-sm);
    color: var(--color-text-secondary);
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
  }
  .ac-footer {
    display: flex;
    align-items: center;
    margin-top: auto;
  }
  .deploy-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    border-radius: var(--radius-md);
    background: var(--color-brand);
    color: #0d0c0a;
    font-weight: 600;
    font-size: var(--text-body-sm);
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }
  .deploy-btn:hover {
    filter: brightness(1.12);
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
  }

  /* 4. Lower Two Columns */
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    align-items: stretch;
  }
  @media (max-width: 860px) {
    .cols { grid-template-columns: 1fr; }
  }

  .card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    padding: var(--space-4);
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .card-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .c-title {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }
  .c-link {
    font-size: var(--text-caption);
    color: var(--color-brand);
    background: transparent;
    cursor: pointer;
    font-weight: 500;
  }
  .c-link:hover { text-decoration: underline; }

  .card-fill {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Empty Box */
  .empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4) var(--space-2);
    text-align: center;
    gap: 8px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
  }
  :global(.empty-icon) {
    color: var(--color-text-muted);
    opacity: 0.5;
  }
  .muted {
    color: var(--color-text-muted);
    font-size: var(--text-body-sm);
    margin: 0;
  }
  .text-sm { font-size: 12px; }
  .action-link {
    color: var(--color-brand);
    background: transparent;
    font-size: var(--text-caption);
    font-weight: 600;
    cursor: pointer;
    margin-top: 4px;
  }
  .action-link:hover { text-decoration: underline; }

  /* Subcard inside card */
  .tool-subcard {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
    margin-top: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .subcard-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Generic bar list */
  .bars { display: flex; flex-direction: column; gap: 4px; }
  .bar-btn {
    display: flex; align-items: center; gap: var(--space-2); width: 100%;
    padding: 6px var(--space-2); border-radius: var(--radius-sm);
    background: transparent; cursor: pointer; text-align: left;
  }
  .bar-btn:hover { background: var(--color-surface-sunken); }
  .bar-label { width: 116px; font-size: var(--text-body-sm); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: none; }
  .bar-track { flex: 1; height: 6px; background: var(--color-surface-sunken); border-radius: var(--radius-full); overflow: hidden; min-width: 24px; }
  .bar-fill { display: block; height: 100%; background: var(--color-brand); border-radius: var(--radius-full); }
  .bar-count { width: 30px; text-align: right; font-size: var(--text-caption); color: var(--color-text-muted); font-variant-numeric: tabular-nums; flex: none; }
  .tool-dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-success); flex: none; }
  .tool-dot.off { background: var(--color-text-muted); opacity: 0.5; }

  /* Projects list */
  .proj-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .proj-row {
    display: flex; flex-direction: column; gap: 6px; width: 100%;
    padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
    background: transparent; cursor: pointer; text-align: left;
  }
  .proj-row:hover { background: var(--color-surface-sunken); }
  .proj-top { display: flex; align-items: baseline; gap: var(--space-2); }
  .proj-name { flex: 1; min-width: 0; font-size: var(--text-body-sm); font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj-total { flex: none; font-size: var(--text-caption); color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  .proj-bar { display: flex; height: 6px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-surface-sunken); }
  .proj-seg { display: block; min-width: 2px; }

  /* Activity Feed */
  .activity-feed {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .feed-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  .feed-item.active {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.04);
  }
  .feed-indicator {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex: none;
  }
  .green-pulse {
    background: var(--color-success);
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
  }
  .amber-dot { background: var(--color-brand); }
  .red-dot { background: var(--color-danger); }
  .feed-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .feed-title {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .feed-time {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .feed-tag {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-surface-sunken);
    color: var(--color-success);
    border: 1px solid rgba(34, 197, 94, 0.25);
  }
  .feed-tag.muted {
    color: var(--color-text-muted);
    border-color: var(--color-border);
  }

  .health-mini {
    margin-top: var(--space-2);
    display: flex;
    justify-content: center;
  }

  /* Separator */
  .merge-sep {
    display: flex; align-items: center; gap: var(--space-2);
    margin: var(--space-4) 0 var(--space-2);
  }
  .merge-sep::after { content: ""; flex: 1; height: 1px; background: var(--color-border); }
  .merge-cap { font-size: var(--text-caption); font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
</style>
