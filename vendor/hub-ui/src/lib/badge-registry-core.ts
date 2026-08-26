/**
 * Shared badge/filter icon maps — SSOT for Hub deploy, health, category, schema chips.
 * Tool-specific keys extend via local badge-registry (P0016 bot, P0020 cookie/todo).
 */
import {
  Activity,
  AlertTriangle,
  Archive,
  Beaker,
  Bot,
  Calculator,
  CheckCircle2,
  Cloud,
  Database,
  FileCode2,
  FileText,
  Flag,
  FlaskConical,
  FolderOpen,
  Fingerprint,
  Github,
  HardDrive,
  Heart,
  Layers,
  Link2,
  Lock,
  Monitor,
  Package,
  Pencil,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Tag,
  Zap,
} from "lucide-react";
import { deployLabel } from "./deploy-label";
import type { BadgeSpec, FilterIconMeta } from "../types/filter-badge";

export type { FilterIconMeta, BadgeSpec } from "../types/filter-badge";

export type SchemaMode = "input" | "auto" | "derive" | "compute" | "ro";

export function pickBadgeIcon(map: Record<string, FilterIconMeta>, key: string): FilterIconMeta | null {
  return map[key] ?? null;
}

/** Hub — health / status filters & cards */
export const STATUS_HEALTH: Record<string, FilterIconMeta> = {
  Ready: { icon: CheckCircle2, className: "text-emerald-400" },
  "Needs review": { icon: Flag, className: "text-purple-400" },
  Active: { icon: Zap, className: "text-sky-400" },
  Beta: { icon: Beaker, className: "text-amber-400" },
  Experimental: { icon: FlaskConical, className: "text-amber-400" },
  Archived: { icon: Archive, className: "text-slate-400" },
};

/** Hub — category filter & ToolCodeBadge */
export const CATEGORY: Record<string, FilterIconMeta> = {
  Web: { icon: Monitor, className: "text-indigo-400" },
  Desktop: { icon: Monitor, className: "text-violet-400" },
  Bot: { icon: Bot, className: "text-cyan-400" },
  Infrastructure: { icon: Server, className: "text-slate-300" },
  "App Script": { icon: FileCode2, className: "text-amber-300" },
  GUI: { icon: Layers, className: "text-indigo-300" },
};

/** Hub — deploy filter & deploy QuietChip (canonical "Vercel", etc.) */
export const DEPLOY: Record<string, FilterIconMeta> = {
  Vercel: { icon: Cloud, className: "text-sky-300" },
  "GitHub Release": { icon: Package, className: "text-emerald-300" },
  "GitHub Pages": { icon: Github, className: "text-violet-300" },
  "VPS · CloudFly": { icon: Server, className: "text-orange-300" },
  "Local only": { icon: HardDrive, className: "text-slate-400" },
};

export const DRIFT: Record<string, FilterIconMeta> = {
  drift: { icon: AlertTriangle, className: "text-rose-400" },
  clean: { icon: ShieldCheck, className: "text-emerald-400" },
};

export const LINKS: Record<string, FilterIconMeta> = {
  missing: { icon: Link2, className: "text-amber-400" },
};

export const LINK_STATUS: Record<string, FilterIconMeta> = {
  online: { icon: CheckCircle2, className: "text-emerald-400" },
  offline: { icon: AlertTriangle, className: "text-rose-400" },
  checking: { icon: Activity, className: "text-amber-400" },
  unknown: { icon: Activity, className: "text-slate-400" },
  na: { icon: HardDrive, className: "text-slate-500" },
};

export const LINK_STATUS_LABEL: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  checking: "Checking",
  unknown: "Unknown",
  na: "Not pinged",
};

export const LINK_STATUS_TONE: Record<string, BadgeSpec["tone"]> = {
  online: "ok",
  offline: "bad",
  checking: "warn",
  unknown: "neutral",
  na: "neutral",
};

export const LINK_KIND: Record<string, FilterIconMeta> = {
  url: { icon: Link2, className: "text-cyan-400" },
  id: { icon: Tag, className: "text-slate-400" },
};

export const LINK_KIND_LABEL: Record<string, string> = {
  url: "URL",
  id: "ID / path",
};

export const SCHEMA_GROUP: Record<string, FilterIconMeta> = {
  Metadata: { icon: Database, className: "text-slate-300" },
  Identity: { icon: Fingerprint, className: "text-yellow-300" },
  Repository: { icon: Github, className: "text-indigo-300" },
  Classification: { icon: Layers, className: "text-emerald-300" },
  Paths: { icon: FolderOpen, className: "text-cyan-300" },
  Deploy: { icon: Rocket, className: "text-orange-300" },
  Release: { icon: Package, className: "text-amber-300" },
  URLs: { icon: Link2, className: "text-blue-300" },
  GitHub: { icon: Github, className: "text-fuchsia-300" },
  Health: { icon: Heart, className: "text-emerald-300" },
  Docs: { icon: FileText, className: "text-purple-300" },
  Runtime: { icon: Server, className: "text-rose-300" },
  "GitHub API": { icon: Github, className: "text-teal-300" },
  Sync: { icon: RefreshCw, className: "text-violet-300" },
};

export const SCHEMA_MODE: Record<SchemaMode, FilterIconMeta> = {
  input: { icon: Pencil, className: "text-emerald-300" },
  auto: { icon: Bot, className: "text-purple-300" },
  derive: { icon: RefreshCw, className: "text-amber-300" },
  compute: { icon: Calculator, className: "text-cyan-300" },
  ro: { icon: Lock, className: "text-slate-300" },
};

export const MODE_LABEL_SHORT: Record<SchemaMode, string> = {
  input: "Input",
  auto: "Auto",
  derive: "Derive",
  compute: "Compute",
  ro: "Read-only",
};

export const FIELD_KEY: Record<string, FilterIconMeta> = {
  id: { icon: Fingerprint, className: "text-yellow-300" },
  code: { icon: Tag, className: "text-indigo-300" },
  name: { icon: FileText, className: "text-slate-200" },
  repo: { icon: Github, className: "text-violet-300" },
  branch: { icon: RefreshCw, className: "text-emerald-300" },
  category: { icon: Layers, className: "text-emerald-300" },
  status: { icon: Flag, className: "text-violet-300" },
  deployTarget: { icon: Rocket, className: "text-orange-300" },
  healthLabel: { icon: Heart, className: "text-emerald-300" },
  driftAlerts: { icon: AlertTriangle, className: "text-rose-300" },
};

export const HUB_KPI: Record<string, FilterIconMeta> = {
  total: { icon: Package, className: "text-indigo-300" },
  ready: { icon: CheckCircle2, className: "text-emerald-300" },
  releases: { icon: Rocket, className: "text-amber-300" },
  drift: { icon: AlertTriangle, className: "text-rose-300" },
};

/** Hub deploy chip spec — reused for link group `vercel` and deployTarget fields. */
export function resolveDeployBadge(target?: string): BadgeSpec {
  const label = deployLabel(target);
  const iconMeta = pickBadgeIcon(DEPLOY, label) ?? { icon: Rocket, className: "text-sky-300/90" };
  return { label, iconMeta, tone: "neutral" };
}

export function resolveHealthStatusIcon(label?: string | null): FilterIconMeta | null {
  if (!label) return null;
  return pickBadgeIcon(STATUS_HEALTH, label);
}

export function resolveDeployTargetIcon(target?: string): FilterIconMeta {
  return resolveDeployBadge(target).iconMeta;
}

export function resolveCategoryDisplayIcon(category?: string): FilterIconMeta {
  if (!category) return { icon: CATEGORY.Web.icon, className: "text-indigo-300/90" };
  return pickBadgeIcon(CATEGORY, category) ?? { icon: CATEGORY.Web.icon, className: "text-indigo-300/90" };
}

export function resolveDriftChipIcon(): FilterIconMeta {
  return DRIFT.drift;
}

export function resolveDriftCleanIcon(): FilterIconMeta {
  return DRIFT.clean;
}

export function resolveLinkGapChipIcon(): FilterIconMeta {
  return LINKS.missing;
}

export function resolveLocalOnlyIcon(): FilterIconMeta {
  return DEPLOY["Local only"];
}

export function resolveLocalPortIcon(online: boolean): FilterIconMeta {
  return online
    ? { icon: STATUS_HEALTH.Ready.icon, className: "text-emerald-400" }
    : DEPLOY["Local only"];
}

export function resolveSchemaGroupIcon(group: string): FilterIconMeta {
  return SCHEMA_GROUP[group] ?? { icon: SCHEMA_GROUP.Classification.icon, className: "text-slate-300" };
}

export function resolveSchemaModeIcon(mode: SchemaMode): FilterIconMeta {
  return SCHEMA_MODE[mode];
}

export function resolveFieldSpecIcon(field: { key: string }): FilterIconMeta {
  return FIELD_KEY[field.key] ?? { icon: SCHEMA_GROUP.Metadata.icon, className: "text-slate-400" };
}

export function resolveHubKpiIcon(key: string): FilterIconMeta | null {
  return HUB_KPI[key] ?? null;
}

export function resolveLinkStatusBadge(status: string): BadgeSpec {
  const label = LINK_STATUS_LABEL[status] ?? status;
  const iconMeta = LINK_STATUS[status] ?? LINK_STATUS.unknown;
  return { label, iconMeta, tone: LINK_STATUS_TONE[status] ?? "neutral" };
}

export function resolveLinkKindBadge(kind: string): BadgeSpec {
  const label = LINK_KIND_LABEL[kind] ?? kind;
  const iconMeta = LINK_KIND[kind] ?? LINK_KIND.id;
  return { label, iconMeta, tone: "neutral" };
}

export function resolveChartLegendIcon(label: string): FilterIconMeta | null {
  return pickBadgeIcon(STATUS_HEALTH, label) ?? pickBadgeIcon(CATEGORY, label) ?? pickBadgeIcon(DEPLOY, label) ?? null;
}
