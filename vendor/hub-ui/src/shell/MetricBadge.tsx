import type { ReactNode } from "react";
import type { FilterIconMeta, BadgeSpec, MetricBadgeTone } from "../types/filter-badge";

export type { MetricBadgeTone };

const TONE_BORDER: Record<MetricBadgeTone, string> = {
  ok: "border-emerald-500/25 bg-emerald-500/8 text-emerald-200/90",
  bad: "border-rose-500/25 bg-rose-500/8 text-rose-200/90",
  warn: "border-amber-500/25 bg-amber-500/8 text-amber-200/90",
  neutral: "border-white/10 bg-white/[0.03] text-[var(--muted)]",
};

const TONE_DOT: Partial<Record<MetricBadgeTone, string>> = {
  ok: "#22c55e",
  bad: "#f43f5e",
  warn: "#f59e0b",
};

export type MetricBadgeProps = {
  label: ReactNode;
  iconMeta?: FilterIconMeta | null;
  tone?: MetricBadgeTone;
  /** Schema / link groups: full Tailwind border+bg+text classes */
  variantClass?: string;
  uppercase?: boolean;
  mono?: boolean;
  title?: string;
  className?: string;
};

/** Icon + text chip — shared by Hub, Tool detail, Tool Links, System schema. */
export function MetricBadge({
  label,
  iconMeta,
  tone = "neutral",
  variantClass,
  uppercase,
  mono,
  title,
  className = "",
}: MetricBadgeProps) {
  const border = variantClass ?? TONE_BORDER[tone];
  const dot = !iconMeta && !variantClass ? TONE_DOT[tone] : undefined;
  const Icon = iconMeta?.icon;

  return (
    <span
      title={title}
      className={`hub-chrome-type--micro inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 leading-none ${border} ${
        uppercase ? "uppercase tracking-wide" : ""
      } ${mono ? "font-mono font-semibold tracking-wide" : ""} ${className}`}
    >
      {Icon ? (
        <Icon size={11} className={`shrink-0 ${iconMeta.className}`} aria-hidden />
      ) : dot ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

export function RegistryMetricBadge({ spec, className }: { spec: BadgeSpec; className?: string }) {
  return (
    <MetricBadge
      label={spec.label}
      iconMeta={spec.iconMeta}
      tone={spec.tone}
      variantClass={spec.variantClass}
      className={className}
    />
  );
}
