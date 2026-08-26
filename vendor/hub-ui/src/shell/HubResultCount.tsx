import type { LucideIcon } from "lucide-react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize } from "../ui-scale";
import { HubBrandIcon } from "./HubBrandIcon";

/** Matches ViewToggle row height (hub toolbar). */
export function HubResultCount({
  icon: Icon,
  brandIcon,
  shown,
  total,
  label = "tools",
}: {
  icon?: LucideIcon;
  brandIcon?: HubBrandIconId;
  shown: number;
  total: number;
  label?: string;
}) {
  return (
    <span
      className="hub-result-count inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-semibold tabular-nums text-cyan-100 shadow-sm shadow-cyan-500/10"
      title={`${shown} of ${total} ${label} Shown`}
    >
      {brandIcon ? (
        <HubBrandIcon brandId={brandIcon} size={compactIconSize(14)} className="shrink-0" />
      ) : Icon ? (
        <Icon size={compactIconSize(14)} className="shrink-0 text-cyan-300/90" />
      ) : null}
      <span className="hub-result-count__text">
        {shown}
        <span className="mx-0.5 font-normal text-cyan-300/50">/</span>
        {total}
      </span>
    </span>
  );
}
