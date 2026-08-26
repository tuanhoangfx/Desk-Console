import type { ReactNode } from "react";
import type { FilterIconMeta } from "../types/filter-badge";
import { ChartLegendLabelContent } from "../lib/chart-legend-label-content";
import { chartRankBarColor, isChartOthersLabel } from "../lib/chart-palette";
import type { HubBrandIconShell } from "./filter-dropdown-primitives";
import { MetricBadge, type MetricBadgeTone } from "./MetricBadge";

export type EntityRankRow = {
  id: string;
  label: string;
  value: number;
  total?: number;
  color?: string;
  iconMeta?: FilterIconMeta | null;
  iconSrc?: string;
  iconSrcs?: string[];
  iconShell?: HubBrandIconShell;
  statusLabel?: string;
  statusTone?: MetricBadgeTone;
  badgeLabel?: string;
  badgeTone?: MetricBadgeTone;
  onClick?: () => void;
};

type Props = {
  title: ReactNode;
  rows: EntityRankRow[];
  footer?: ReactNode;
  emptyLabel?: string;
};

function fmtInt(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** Ranked entity list — hub-chart-card rows (KPI/chart visual parity). */
export function EntityRankMiniChart({ title, rows, footer, emptyLabel = "—" }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));

  return (
    <div className="hub-chart-card rounded-2xl border border-white/5 bg-[var(--panel)] p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">{title}</div>
      <ul className="hub-chart-card__body hub-chart-card__body--rank space-y-2.5">
        {rows.length === 0 ? (
          <li className="hub-chart-card__empty py-3 text-center">{emptyLabel}</li>
        ) : (
          rows.map((row, i) => {
            const pct = Math.max(2, ((row.value || 0) / max) * 100);
            const color = row.color ?? chartRankBarColor(i, row.label);
            const othersRow = isChartOthersLabel(row.label);
            const LabelTag = row.onClick ? "button" : "span";
            return (
              <li key={row.id} className="hub-chart-row hub-chart-row--rank anim-slide">
                <LabelTag
                  type={row.onClick ? "button" : undefined}
                  className={
                    row.onClick
                      ? "hub-chart-legend-label text-left hover:text-indigo-200"
                      : "hub-chart-legend-label"
                  }
                  title={row.label}
                  onClick={row.onClick}
                >
                  <ChartLegendLabelContent
                    label={row.label}
                    iconSrc={row.iconSrc}
                    iconSrcs={row.iconSrcs}
                    iconShell={row.iconShell}
                    iconMeta={row.iconMeta}
                  />
                </LabelTag>
                <div className="relative h-1.5 min-w-0 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      ...(othersRow ? {} : { boxShadow: `0 0 12px ${color}55` }),
                    }}
                  />
                </div>
                <div className="hub-chart-row__value flex flex-col items-end gap-0.5">
                  <span className="tabular-nums">
                    {fmtInt(row.value)}
                    {row.total != null ? (
                      <span className="text-[var(--muted)]"> / {fmtInt(row.total)}</span>
                    ) : null}
                  </span>
                  <div className="flex max-w-full flex-wrap justify-end gap-1">
                    {row.statusLabel ? (
                      <MetricBadge label={row.statusLabel} tone={row.statusTone ?? "neutral"} />
                    ) : null}
                    {row.badgeLabel ? (
                      <MetricBadge label={row.badgeLabel} tone={row.badgeTone ?? "neutral"} />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
      {footer ? <div className="mt-2 border-t border-white/5 pt-2">{footer}</div> : null}
    </div>
  );
}
