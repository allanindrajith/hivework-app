/**
 * Preset teams — app-bundled, curated squads of agents you can deploy as a unit.
 *
 * These are starting points: a "team" is a hand-picked set pulled from across
 * divisions for a goal (ship a mobile app, run growth, etc.). Each references
 * corpus agent slugs (`<division>-<name>`); slugs not present in the active
 * catalog are silently skipped at deploy time, so a preset degrades gracefully.
 *
 * Curated by hand and bundled (no catalog/network dependency). To add one:
 * append an entry with a Lucide icon, a brand color, and verified slugs.
 */

import type { Component } from "svelte";
import Rocket from "@lucide/svelte/icons/rocket";
import Code from "@lucide/svelte/icons/code";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import Compass from "@lucide/svelte/icons/compass";
import Sparkles from "@lucide/svelte/icons/sparkles";
import ShieldAlert from "@lucide/svelte/icons/shield-alert";
import Gamepad2 from "@lucide/svelte/icons/gamepad-2";
import Target from "@lucide/svelte/icons/target";
import Briefcase from "@lucide/svelte/icons/briefcase";
import Palette from "@lucide/svelte/icons/palette";
import Database from "@lucide/svelte/icons/database";
import Crown from "@lucide/svelte/icons/crown";

export interface PresetTeam {
  slug: string;
  label: string;
  description: string;
  icon: Component;
  /** Brand color (hex) for the icon tint. */
  color: string;
  /** Corpus agent slugs that make up the team. */
  agents: string[];
}

export const PRESET_TEAMS: PresetTeam[] = [
  {
    slug: "mobile-launch",
    label: "Mobile Launch",
    description: "Take a mobile app from prototype to the App Store.",
    icon: Rocket,
    color: "#6366f1",
    agents: [
      "hive-mobile-app-builder",
      "hive-rapid-prototyper",
      "hive-ui-designer",
      "hive-ux-researcher",
      "hive-app-store-optimizer",
    ],
  },
  {
    slug: "ship-web-app",
    label: "Ship It (Web)",
    description: "Build, deploy, and keep a web app healthy in production.",
    icon: Code,
    color: "#0ea5e9",
    agents: [
      "hive-frontend-developer",
      "hive-backend-architect",
      "hive-devops-automator",
      "hive-sre",
      "hive-api-tester",
    ],
  },
  {
    slug: "growth-squad",
    label: "Growth Squad",
    description: "Drive acquisition across content, search, and social.",
    icon: TrendingUp,
    color: "#ec4899",
    agents: [
      "hive-growth-hacker",
      "hive-content-creator",
      "hive-seo-specialist",
      "hive-tiktok-strategist",
      "hive-instagram-curator",
    ],
  },
  {
    slug: "product-discovery",
    label: "Product Discovery",
    description: "Find what to build next and sequence the work.",
    icon: Compass,
    color: "#f59e0b",
    agents: [
      "hive-sprint-prioritizer",
      "hive-trend-researcher",
      "hive-feedback-synthesizer",
      "hive-ux-researcher",
    ],
  },
  {
    slug: "ai-builders",
    label: "AI Builders",
    description: "Ship AI features on a solid data + prompt foundation.",
    icon: Sparkles,
    color: "#8b5cf6",
    agents: [
      "hive-ai-engineer",
      "hive-prompt-engineer",
      "hive-data-engineer",
      "hive-backend-architect",
    ],
  },
  {
    slug: "security-red-team",
    label: "Security Red Team",
    description: "Penetrate defenses, find auth vulnerabilities, and enforce compliance.",
    icon: ShieldAlert,
    color: "#ef4444",
    agents: [
      "hive-penetration-tester",
      "hive-adversarial-verifier",
      "hive-client-side-auditor",
      "hive-cloud-security-architect",
      "hive-compliance-auditor",
    ],
  },
  {
    slug: "game-studio-core",
    label: "Game Studio Core",
    description: "Mechanics, technical art, game audio, and QA testing in one squad.",
    icon: Gamepad2,
    color: "#a855f7",
    agents: [
      "hive-game-studio-game-designer",
      "hive-game-studio-gameplay-programmer",
      "hive-game-studio-technical-artist",
      "hive-game-studio-sound-designer",
      "hive-game-studio-qa-tester",
    ],
  },
  {
    slug: "paid-acquisition-engine",
    label: "Paid Acquisition Engine",
    description: "High-ROAS advertising across PPC, paid social, and creative carousels.",
    icon: Target,
    color: "#eab308",
    agents: [
      "hive-ppc-strategist",
      "hive-paid-social-strategist",
      "hive-creative-strategist",
      "hive-carousel-growth-engine",
      "hive-tracking-specialist",
    ],
  },
  {
    slug: "b2b-revops-sales",
    label: "B2B RevOps & Sales",
    description: "Signal-based outbound outreach, discovery coaching, and CRM architecture.",
    icon: Briefcase,
    color: "#10b981",
    agents: [
      "hive-outbound-strategist",
      "hive-sales-outreach",
      "hive-deal-strategist",
      "hive-discovery-coach",
      "hive-salesforce-architect",
    ],
  },
  {
    slug: "design-systems-a11y",
    label: "Design Systems & A11y",
    description: "Pixel-perfect token architecture with strict WCAG 2.2 accessibility sign-off.",
    icon: Palette,
    color: "#d946ef",
    agents: [
      "hive-ux-architect",
      "hive-ui-designer",
      "hive-frontend-developer",
      "hive-ui-finish-gate-reviewer",
      "hive-accessibility-auditor",
    ],
  },
  {
    slug: "data-cloud-infra",
    label: "Data & Cloud Infrastructure",
    description: "Zero-downtime database optimization, real-time pipelines, and SRE reliability.",
    icon: Database,
    color: "#06b6d4",
    agents: [
      "hive-data-engineer",
      "hive-database-optimizer",
      "hive-devops-automator",
      "hive-sre",
      "hive-analytics-reporter",
    ],
  },
  {
    slug: "executive-war-room",
    label: "Executive War Room",
    description: "High-stakes strategic duels, senior project management, and ruthless reality checks.",
    icon: Crown,
    color: "#f59e0b",
    agents: [
      "hive-chief-of-staff",
      "hive-advisor",
      "hive-strategy-duel-agent",
      "hive-project-manager-senior",
      "hive-reality-checker",
    ],
  },
];
