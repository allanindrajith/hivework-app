<script lang="ts">
  /**
   * Runbooks — the NEXUS scenario launcher (own nav pillar). Each runbook is a
   * proven agent roster for a specific job (from the catalog's
   * `strategy/runbooks.json`); the app resolves each roster slug to a real
   * catalog agent and lets you deploy the whole team into a project in one step.
   *
   *  • Deploy team… → the shared InstallModal (destinations × tools), preloaded
   *    with the runbook's resolved roster — so "install this scenario's team into
   *    a project" reuses the exact install flow.
   *  • Copy activation prompt → a prompt synthesised from the runbook (mode +
   *    roster), mirroring NEXUS's own activation format.
   *
   * `strategy/` only ships in a synced catalog, so an empty manifest shows a
   * "sync to unlock" state, not an error.
   */
  import { errorText } from "$lib/types";
  import { onMount } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import RocketIcon from "@lucide/svelte/icons/rocket";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import InstallModal from "./InstallModal.svelte";
  import EmptyState from "./EmptyState.svelte";
  import { corpus } from "$lib/stores/corpus.svelte";
  import { runbooks } from "$lib/stores/runbooks.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import { i18n } from "$lib/stores/i18n.svelte";
  import type { Agent, Runbook } from "$lib/types";

  onMount(() => {
    corpus.ensureLoaded();
    runbooks.load();
  });

  // Slug → agent, from the loaded corpus (rebuilds as the corpus resolves).
  const bySlug = $derived(new Map(corpus.agents.map((a) => [a.slug, a])));

  const rosterSlugs = (rb: Runbook) => rb.roster.flatMap((g) => g.agents);
  const resolvedSlugs = (rb: Runbook) => rosterSlugs(rb).filter((s) => bySlug.has(s));
  function counts(rb: Runbook): { total: number; found: number } {
    const all = rosterSlugs(rb);
    return { total: all.length, found: all.filter((s) => bySlug.has(s)).length };
  }
  function resolve(slugs: string[]): { slug: string; agent: Agent | undefined }[] {
    return slugs.map((slug) => ({ slug, agent: bySlug.get(slug) }));
  }
  function keyPart(value: string): string {
    return value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\+/g, " plus ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  const runbookTitle = (rb: Runbook) => i18n.optional(`runbooks.item.${rb.slug}.title`, rb.title);
  const runbookDuration = (rb: Runbook) => i18n.optional(`runbooks.item.${rb.slug}.duration`, rb.duration);
  const runbookSummary = (rb: Runbook) => i18n.optional(`runbooks.item.${rb.slug}.summary`, rb.summary);
  const runbookGroup = (group: string) => i18n.optional(`runbooks.group.${keyPart(group)}`, group);
  const runbookActivation = (activation: string) => i18n.optional(`runbooks.activation.${keyPart(activation)}`, activation);

  const DEFAULT_RUNBOOKS: Runbook[] = [
    {
        "slug": "product-sprint",
        "title": "Full-Stack Web App Sprint",
        "mode": "Autonomous Agile",
        "duration": "1 - 3 Days",
        "summary": "End-to-end web feature delivery from system architecture to accessible frontend UI and evidence QA.",
        "doc": "strategy/runbooks/scenario-startup-mvp.md",
        "roster": [
            {
                "group": "Architecture & Planning",
                "activation": "Phase 1 - Blueprint",
                "agents": [
                    "hive-agents-orchestrator",
                    "hive-ux-architect"
                ]
            },
            {
                "group": "Implementation",
                "activation": "Phase 2 - Build",
                "agents": [
                    "hive-senior-developer",
                    "hive-frontend-developer"
                ]
            },
            {
                "group": "Verification",
                "activation": "Phase 3 - Evidence QA",
                "agents": [
                    "hive-reality-checker",
                    "hive-evidence-collector"
                ]
            }
        ]
    },
    {
        "slug": "bug-hardening",
        "title": "Systematic Bug Triage & Hardening",
        "mode": "Adversarial TDD",
        "duration": "4 Hours",
        "summary": "Deep diagnostics, unit & integration test coverage expansion, and strict security verification.",
        "doc": "strategy/runbooks/scenario-incident-response.md",
        "roster": [
            {
                "group": "Root Cause Investigation",
                "activation": "Phase 1 - Trace",
                "agents": [
                    "hive-codebase-onboarding-engineer",
                    "hive-lsp-index-engineer"
                ]
            },
            {
                "group": "Resolution & TDD",
                "activation": "Phase 2 - Fix & Test",
                "agents": [
                    "hive-senior-developer",
                    "hive-test-automation-engineer"
                ]
            },
            {
                "group": "Security Gate",
                "activation": "Phase 3 - Certify",
                "agents": [
                    "hive-appsec-engineer",
                    "hive-reality-checker"
                ]
            }
        ]
    },
    {
        "slug": "gtm-launch",
        "title": "Product Launch & Multi-Channel GTM",
        "mode": "Parallel Publishing",
        "duration": "2 Days",
        "summary": "Coordinates high-converting landing page design, brand positioning, documentation, and app store copy.",
        "doc": "strategy/runbooks/scenario-marketing-campaign.md",
        "roster": [
            {
                "group": "Creative & Brand",
                "activation": "Phase 1 - Positioning",
                "agents": [
                    "hive-brand-guardian",
                    "hive-ux-architect"
                ]
            },
            {
                "group": "Content Engine",
                "activation": "Phase 2 - Collateral",
                "agents": [
                    "hive-content-creator",
                    "hive-email-strategist"
                ]
            },
            {
                "group": "Distribution",
                "activation": "Phase 3 - Release",
                "agents": [
                    "hive-app-store-optimizer",
                    "hive-growth-hacker"
                ]
            }
        ]
    },
    {
        "slug": "cloud-devops",
        "title": "Cloud Ops & Infrastructure Hardening",
        "mode": "GitOps Orchestration",
        "duration": "1 Day",
        "summary": "Zero-downtime CI/CD pipelines, containerization, cloud observability, and automated rollbacks.",
        "doc": "strategy/runbooks/scenario-enterprise-feature.md",
        "roster": [
            {
                "group": "Infra Engineering",
                "activation": "Phase 1 - Provision",
                "agents": [
                    "hive-devops-automator",
                    "hive-cloud-security-architect"
                ]
            },
            {
                "group": "Observability",
                "activation": "Phase 2 - Instrument",
                "agents": [
                    "hive-sre",
                    "hive-threat-detection-engineer"
                ]
            },
            {
                "group": "Quality Gate",
                "activation": "Phase 3 - Verify",
                "agents": [
                    "hive-evidence-collector",
                    "hive-reality-checker"
                ]
            }
        ]
    },
    {
        "slug": "ai-rag-platform",
        "title": "AI Agent & RAG Production Pipeline",
        "mode": "Eval-Driven ML",
        "duration": "2 Days",
        "summary": "Production-grade RAG indexing, evaluation-driven prompt optimization, and low-latency API architecture.",
        "doc": "strategy/runbooks/scenario-enterprise-feature.md",
        "roster": [
            {
                "group": "System Architecture",
                "activation": "Phase 1 - Pipeline Spec",
                "agents": [
                    "hive-ai-engineer",
                    "hive-rag-pipeline-engineer"
                ]
            },
            {
                "group": "Prompt & Embeddings",
                "activation": "Phase 2 - Eval Tuning",
                "agents": [
                    "hive-prompt-engineer",
                    "hive-data-engineer"
                ]
            },
            {
                "group": "Safety & Performance",
                "activation": "Phase 3 - Red Team",
                "agents": [
                    "hive-adversarial-verifier",
                    "hive-performance-benchmarker"
                ]
            }
        ]
    },
    {
        "slug": "security-zero-trust",
        "title": "Zero-Trust Security Audit & Penetration",
        "mode": "Red/Blue Team",
        "duration": "1 Day",
        "summary": "Exhaustive vulnerability discovery, auth bypass probing, credential hygiene, and audit remediation.",
        "doc": "strategy/runbooks/scenario-enterprise-feature.md",
        "roster": [
            {
                "group": "Offensive Audit",
                "activation": "Phase 1 - Penetration",
                "agents": [
                    "hive-penetration-tester",
                    "hive-client-side-auditor"
                ]
            },
            {
                "group": "Defensive Architecture",
                "activation": "Phase 2 - Remediation",
                "agents": [
                    "hive-cloud-security-architect",
                    "hive-secrets-credential-engineer"
                ]
            },
            {
                "group": "Compliance Signoff",
                "activation": "Phase 3 - Attestation",
                "agents": [
                    "hive-compliance-auditor",
                    "hive-reality-checker"
                ]
            }
        ]
    },
    {
        "slug": "mobile-app-release",
        "title": "Cross-Platform Mobile App Launch",
        "mode": "Store-Ready Sprint",
        "duration": "2 - 4 Days",
        "summary": "Take a mobile application from prototype to signed App Store and Play Store release builds.",
        "doc": "strategy/runbooks/scenario-startup-mvp.md",
        "roster": [
            {
                "group": "Experience Design",
                "activation": "Phase 1 - Mobile UX",
                "agents": [
                    "hive-mobile-app-builder",
                    "hive-ui-designer"
                ]
            },
            {
                "group": "Native Build & Telemetry",
                "activation": "Phase 2 - Packaging",
                "agents": [
                    "hive-mobile-release-engineer",
                    "hive-tracking-specialist"
                ]
            },
            {
                "group": "Store Optimization",
                "activation": "Phase 3 - ASO & Cert",
                "agents": [
                    "hive-app-store-optimizer",
                    "hive-evidence-collector"
                ]
            }
        ]
    },
    {
        "slug": "game-studio-vertical-slice",
        "title": "Game Studio Vertical Slice Production",
        "mode": "Playable Milestone",
        "duration": "3 - 5 Days",
        "summary": "Produce a fully playable slice with balanced gameplay loops, game audio, shaders, and performance profiling.",
        "doc": "strategy/runbooks/scenario-startup-mvp.md",
        "roster": [
            {
                "group": "Creative & Systems",
                "activation": "Phase 1 - GDD & Mechanics",
                "agents": [
                    "hive-game-studio-game-designer",
                    "hive-game-studio-systems-designer"
                ]
            },
            {
                "group": "Engine & Visuals",
                "activation": "Phase 2 - Implementation",
                "agents": [
                    "hive-game-studio-gameplay-programmer",
                    "hive-game-studio-technical-artist"
                ]
            },
            {
                "group": "Audio & Quality",
                "activation": "Phase 3 - Polish & Profile",
                "agents": [
                    "hive-game-studio-sound-designer",
                    "hive-game-studio-qa-tester"
                ]
            }
        ]
    },
    {
        "slug": "paid-media-roas-blitz",
        "title": "Paid Media & Conversion Rate Blitz",
        "mode": "ROAS Optimization",
        "duration": "1 - 2 Days",
        "summary": "Multi-channel advertising blitz across Meta, Google, and TikTok with pixel verification and creative matrices.",
        "doc": "strategy/runbooks/scenario-marketing-campaign.md",
        "roster": [
            {
                "group": "Audience & Strategy",
                "activation": "Phase 1 - Campaign Matrix",
                "agents": [
                    "hive-ppc-strategist",
                    "hive-creative-strategist"
                ]
            },
            {
                "group": "Execution & Creative",
                "activation": "Phase 2 - Creative Pipeline",
                "agents": [
                    "hive-paid-social-strategist",
                    "hive-carousel-growth-engine"
                ]
            },
            {
                "group": "Attribution & Auditing",
                "activation": "Phase 3 - Audit & ROAS",
                "agents": [
                    "hive-audit-orchestrator",
                    "hive-tracking-specialist"
                ]
            }
        ]
    },
    {
        "slug": "design-system-overhaul",
        "title": "Design System & WCAG 2.2 Accessibility Overhaul",
        "mode": "Token-First UI",
        "duration": "1 - 2 Days",
        "summary": "Establish semantic token architecture, accessible component hierarchy, and strict WCAG compliance audit.",
        "doc": "strategy/runbooks/scenario-enterprise-feature.md",
        "roster": [
            {
                "group": "Design Foundations",
                "activation": "Phase 1 - Semantic Tokens",
                "agents": [
                    "hive-ux-architect",
                    "hive-ui-designer"
                ]
            },
            {
                "group": "Frontend Implementation",
                "activation": "Phase 2 - Component Library",
                "agents": [
                    "hive-frontend-developer",
                    "hive-ui-finish-gate-reviewer"
                ]
            },
            {
                "group": "Accessibility Gate",
                "activation": "Phase 3 - Section 508 & WCAG",
                "agents": [
                    "hive-accessibility-auditor",
                    "hive-section-508-specialist"
                ]
            }
        ]
    },
    {
        "slug": "enterprise-outbound-revops",
        "title": "Enterprise Outbound & Revenue Operations",
        "mode": "Pipeline Engine",
        "duration": "2 Days",
        "summary": "Signal-based B2B prospecting, discovery call frameworks, and high-converting personalized sequences.",
        "doc": "strategy/runbooks/scenario-marketing-campaign.md",
        "roster": [
            {
                "group": "Targeting & Signals",
                "activation": "Phase 1 - ICP Definition",
                "agents": [
                    "hive-outbound-strategist",
                    "hive-deal-strategist"
                ]
            },
            {
                "group": "Outreach & Discovery",
                "activation": "Phase 2 - Messaging Cadence",
                "agents": [
                    "hive-sales-outreach",
                    "hive-discovery-coach"
                ]
            },
            {
                "group": "Pipeline Governance",
                "activation": "Phase 3 - CRM Integrity",
                "agents": [
                    "hive-salesforce-architect",
                    "hive-coach"
                ]
            }
        ]
    },
    {
        "slug": "data-warehouse-analytics",
        "title": "Real-Time Data Warehouse & BI Telemetry",
        "mode": "Contract-First Data",
        "duration": "1 - 2 Days",
        "summary": "Architect analytics pipelines, data contracts, warehouse schemas, and executive business telemetry.",
        "doc": "strategy/runbooks/scenario-enterprise-feature.md",
        "roster": [
            {
                "group": "Data Modeling",
                "activation": "Phase 1 - Pipeline Spec",
                "agents": [
                    "hive-data-engineer",
                    "hive-backend-architect"
                ]
            },
            {
                "group": "Optimization & Integrity",
                "activation": "Phase 2 - Performance",
                "agents": [
                    "hive-database-optimizer",
                    "hive-database-reliability-engineer"
                ]
            },
            {
                "group": "Business Intelligence",
                "activation": "Phase 3 - Executive BI",
                "agents": [
                    "hive-data-visualization-engineer",
                    "hive-analytics-reporter"
                ]
            }
        ]
    }
];

  const displayRunbooks = $derived(runbooks.list.length > 0 ? runbooks.list : DEFAULT_RUNBOOKS);

  let openSlug = $state<string | null>(null);
  function toggle(slug: string) {
    openSlug = openSlug === slug ? null : slug;
  }

  // Deploy: the shared InstallModal, preloaded with the runbook's resolved roster.
  let deployRb = $state<Runbook | null>(null);

  /** A NEXUS-style activation prompt built from the runbook — no doc scraping. */
  function activationPrompt(rb: Runbook): string {
    const roster = rb.roster
      .map((g) => {
        const names = g.agents.map((s) => bySlug.get(s)?.name ?? s).join(", ");
        return `- ${runbookGroup(g.group)} (${runbookActivation(g.activation)}): ${names}`;
      })
      .join("\n");
    return i18n.optional(
      "runbooks.activationPrompt",
      [
        `Activate the "${rb.title}" runbook in ${rb.mode} mode.`,
        rb.summary,
        "",
        "Roster:",
        roster,
        "",
        "Coordinate this team through the runbook's phases. At each phase, verify the work with evidence before advancing to the next.",
      ].join("\n"),
      { title: runbookTitle(rb), mode: rb.mode, summary: runbookSummary(rb), roster },
    );
  }

  async function copyPrompt(rb: Runbook) {
    try {
      await navigator.clipboard.writeText(activationPrompt(rb));
      toast.success(i18n.t("runbooks.promptCopied", { runbook: runbookTitle(rb) }));
    } catch (e) {
      toast.error(i18n.t("common.copyFailed"), errorText(e));
    }
  }
</script>

<section class="rbv">
  <header class="rbv-head" data-tauri-drag-region>
    <div class="rbv-titles" data-tauri-drag-region="false">
      <div class="rbv-head-top">
        <h1 class="rbv-title">{i18n.t("nav.runbooks")}</h1>
        <span class="rbv-badge-pill">{displayRunbooks.length} Scenario Blueprints</span>
      </div>
      <p class="rbv-sub">{i18n.t("runbooks.subtitle")}</p>
    </div>
  </header>

  <div class="rbv-scroll">
    <div class="rbv-hero-banner">
      <div class="rbv-hb-content">
        <span class="rbv-hb-tag">Multi-Agent Scenarios</span>
        <h3 class="rbv-hb-title">High-Performance Agent Team Playbooks</h3>
        <p class="rbv-hb-desc">
          Runbooks orchestrate proven multi-agent squads across defined project phases. Deploy the complete squad to your tools in 1 click or copy the tailored system activation prompt.
        </p>
      </div>
      <div class="rbv-hb-stats">
        <div class="rbv-stat">
          <span class="rbv-stat-val">{displayRunbooks.length}</span>
          <span class="rbv-stat-lbl">Playbooks</span>
        </div>
        <div class="rbv-stat">
          <span class="rbv-stat-val">100%</span>
          <span class="rbv-stat-lbl">Catalog Coverage</span>
        </div>
      </div>
    </div>

    <ul class="rb-list">
      {#each displayRunbooks as rb (rb.slug)}
        {@const c = counts(rb)}
        {@const open = openSlug === rb.slug}
        {@const title = runbookTitle(rb)}
        <li class="rb-item" class:open>
          <div class="rb-top">
            <button class="rb-expand" onclick={() => toggle(rb.slug)} aria-expanded={open}>
              <span class="rb-ic-box">
                <RocketIcon size={18} />
              </span>
              <span class="rb-id">
                <span class="rb-title-row">
                  <span class="rb-title">{title}</span>
                  <span class="rb-mode">{rb.mode}</span>
                  <span class="rb-dur">{runbookDuration(rb)}</span>
                </span>
                <span class="rb-sum">{runbookSummary(rb)}</span>
              </span>
              <ChevronDown size={18} class={open ? "rbv-chev open" : "rbv-chev"} />
            </button>
            <span class="rb-actions">
              <span class="rb-count" title={i18n.t("runbooks.resolvedTitle", { found: c.found, total: c.total })}>{c.found}/{c.total} Agents</span>
              <button class="btn ghost" onclick={() => copyPrompt(rb)}>
                <CopyIcon size={14} /><span>{i18n.t("runbooks.copyPrompt")}</span>
              </button>
              <button class="btn primary" disabled={c.found === 0} onclick={() => (deployRb = rb)}>
                <DownloadIcon size={14} /><span>{i18n.t("runbooks.deploy")}</span>
              </button>
            </span>
          </div>

          {#if open}
            <div class="rb-detail">
              <div class="rb-phases-grid">
                {#each rb.roster as g (g.group)}
                  <div class="rb-grp">
                    <div class="rb-grp-head">
                      <span class="rb-grp-act">{runbookActivation(g.activation)}</span>
                      <span class="rb-grp-name">{runbookGroup(g.group)}</span>
                    </div>
                    <ul class="rb-agents">
                      {#each resolve(g.agents) as r (r.slug)}
                        <li class="rb-agent" class:missing={!r.agent}>
                          <span class="rb-emoji">{r.agent?.emoji ?? "🤖"}</span>
                          <span class="rb-name">{r.agent?.name ?? r.slug}</span>
                          {#if !r.agent}<span class="rb-flag">{i18n.t("runbooks.notInCatalog")}</span>{/if}
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</section>

{#if deployRb}
  <InstallModal
    title={i18n.t("runbooks.deployTitle", { runbook: runbookTitle(deployRb) })}
    agentSlugs={resolvedSlugs(deployRb)}
    onClose={() => (deployRb = null)}
  />
{/if}

<style>
  .rbv { display: flex; flex-direction: column; height: 100%; min-height: 0; }
  .rbv-head { flex: none; min-height: 54px; display: flex; flex-direction: column; justify-content: center; padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--color-border); }
  .rbv-head-top { display: flex; align-items: center; gap: var(--space-3); }
  .rbv-title { font-size: var(--text-h2); font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .rbv-badge-pill { font-size: 11px; font-weight: 600; color: var(--color-brand); background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: var(--radius-full); }
  .rbv-sub { font-size: var(--text-body-sm); color: var(--color-text-secondary); margin: 3px 0 0; }

  .rbv-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); width: 100%; box-sizing: border-box; }

  /* ── Hero Banner ── */
  .rbv-hero-banner {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-5);
    padding: var(--space-4) var(--space-5); border-radius: var(--radius-xl);
    background: radial-gradient(circle at 100% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 60%), var(--color-surface-raised);
    border: 1px solid var(--color-border);
  }
  .rbv-hb-content { display: flex; flex-direction: column; gap: 4px; max-width: 720px; }
  .rbv-hb-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-brand); }
  .rbv-hb-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .rbv-hb-desc { font-size: 13px; color: var(--color-text-secondary); line-height: 1.4; margin: 0; }
  .rbv-hb-stats { display: flex; gap: var(--space-4); flex: none; }
  .rbv-stat { display: flex; flex-direction: column; align-items: center; padding: 6px 14px; background: var(--color-surface-sunken); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
  .rbv-stat-val { font-size: 18px; font-weight: 700; color: var(--color-brand); }
  .rbv-stat-lbl { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }

  /* ── Runbooks list ── */
  .rb-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  .rb-item { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface-raised); overflow: hidden; transition: all 0.15s ease; }
  .rb-item:hover { border-color: rgba(245, 158, 11, 0.4); transform: translateY(-1px); box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25); }
  .rb-item.open { border-color: var(--color-brand); box-shadow: 0 0 16px rgba(245, 158, 11, 0.15); }

  .rb-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
  .rb-expand { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3); background: transparent; cursor: pointer; text-align: left; border: none; padding: 0; }
  .rb-ic-box { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.1); color: var(--color-brand); display: flex; align-items: center; justify-content: center; flex: none; }
  :global(.rbv-chev) { flex: none; color: var(--color-text-muted); transition: transform var(--motion-duration-fast, 120ms) ease; transform: rotate(-90deg); margin: 0 var(--space-2); }
  :global(.rbv-chev.open) { transform: rotate(0deg); color: var(--color-brand); }
  .rb-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .rb-title-row { display: flex; align-items: center; gap: var(--space-2); min-width: 0; flex-wrap: wrap; }
  .rb-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
  .rb-mode { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10px; font-weight: 600; letter-spacing: 0.03em; color: var(--color-brand); background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: var(--radius-full); }
  .rb-dur { font-size: 11px; color: var(--color-text-muted); }
  .rb-sum { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; }

  .rb-actions { flex: none; display: flex; align-items: center; gap: var(--space-2); }
  .rb-count { font-size: 11px; font-weight: 600; color: var(--color-brand); background: rgba(245, 158, 11, 0.08); padding: 3px 8px; border-radius: var(--radius-full); }
  .btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: transparent; color: var(--color-text-secondary); font-size: var(--text-body-sm); cursor: pointer; white-space: nowrap; transition: all 0.15s ease; }
  .btn:hover:not(:disabled) { color: var(--color-text-primary); background: var(--color-surface-sunken); border-color: rgba(245, 158, 11, 0.3); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.primary { background: var(--color-brand); color: #000; font-weight: 600; border-color: transparent; }
  .btn.primary:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 12px rgba(245, 158, 11, 0.4); }

  /* ── Detail Phases ── */
  .rb-detail { padding: var(--space-4); background: var(--color-surface-sunken); border-top: 1px solid var(--color-border); }
  .rb-phases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-3); }
  .rb-grp { padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-surface-raised); border: 1px solid var(--color-border); }
  .rb-grp-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }
  .rb-grp-act { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--color-brand); letter-spacing: 0.04em; }
  .rb-grp-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .rb-agents { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rb-agent { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-secondary); }
  .rb-emoji { font-size: 14px; flex: none; }
  .rb-name { font-weight: 500; color: var(--color-text-primary); }
  .rb-agent.missing .rb-name { color: var(--color-text-muted); text-decoration: line-through; }
  .rb-flag { font-size: 9px; text-transform: uppercase; color: var(--color-warning); background: rgba(245, 158, 11, 0.1); padding: 1px 5px; border-radius: var(--radius-full); }
</style>
