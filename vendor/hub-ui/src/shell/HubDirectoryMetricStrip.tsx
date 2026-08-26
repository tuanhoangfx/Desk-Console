import type { LucideIcon } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubDirectoryMetricTone = "ok" | "muted" | "admin";

export type HubDirectoryMetricItem = {
  icon: LucideIcon;
  label: string;
  title?: string;
  tone?: HubDirectoryMetricTone;
};

function metricToneClass(tone: HubDirectoryMetricTone): string {
  if (tone === "admin") return " hub-users-tool-badge--admin";
  if (tone === "muted") return " hub-users-tool-badge--empty";
  return "";
}

/** Golden P0004 directory card metric chip — icon + label on `hub-users-tool-badge--card`. */
export function HubDirectoryMetricBadge({
  icon: Icon,
  label,
  title,
  tone = "ok",
}: HubDirectoryMetricItem) {
  return (
    <span
      className={`hub-users-tool-badge hub-users-tool-badge--card${metricToneClass(tone)}`}
      title={title ?? label}
    >
      <Icon size={compactIconSize(11)} className="hub-users-tool-badge__icon" aria-hidden />
      <span className="hub-users-tool-badge__count capitalize">{label}</span>
    </span>
  );
}

/** Horizontal strip of directory card metrics (Accounts, Tools, etc.). */
export function HubDirectoryMetricStrip({
  items,
  className = "",
}: {
  items: HubDirectoryMetricItem[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2${className ? ` ${className}` : ""}`}>
      {items.map((item) => (
        <HubDirectoryMetricBadge key={`${item.label}-${item.title ?? ""}`} {...item} />
      ))}
    </div>
  );
}
