import { useState } from "react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import type { HubGlyphComponent } from "../types/filter-badge";
import { MAX_VISIBLE_KPI } from "../display-prefs/kpi-visible";
import { clampBandSlotCount } from "../lib/analytics-band-count";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { AnalyticsCaptionLabel } from "./AnalyticsCaptionHint";
import { hubBrandIconImgClass } from "./filter-dropdown-primitives";
import type { HubUsersStatusTone } from "./HubUsersStatusLabel";

/** Visible KPI tile count for `data-kpi-count` (0 or 1…MAX_VISIBLE_KPI). */
export function resolveKpiStripCount(count: number): number {
  return clampBandSlotCount(count, MAX_VISIBLE_KPI);
}

export type KpiStripTone =
  | "sky"
  | "indigo"
  | "emerald"
  | "amber"
  | "cyan"
  | "violet"
  | "rose"
  | "fuchsia"
  | "blue"
  | "purple";

type Tone = KpiStripTone;

const tones: Record<Tone, { bg: string; ring: string; icon: string }> = {
  sky: { bg: "from-sky-500/20 to-sky-500/0", ring: "ring-sky-500/30", icon: "text-sky-300 bg-sky-500/15" },
  indigo: { bg: "from-indigo-500/20 to-indigo-500/0", ring: "ring-indigo-500/30", icon: "text-indigo-300 bg-indigo-500/15" },
  emerald: { bg: "from-emerald-500/20 to-emerald-500/0", ring: "ring-emerald-500/30", icon: "text-emerald-300 bg-emerald-500/15" },
  amber: { bg: "from-amber-500/20 to-amber-500/0", ring: "ring-amber-500/30", icon: "text-amber-300 bg-amber-500/15" },
  cyan: { bg: "from-cyan-500/20 to-cyan-500/0", ring: "ring-cyan-500/30", icon: "text-cyan-300 bg-cyan-500/15" },
  violet: { bg: "from-violet-500/20 to-violet-500/0", ring: "ring-violet-500/30", icon: "text-violet-300 bg-violet-500/15" },
  rose: { bg: "from-rose-500/20 to-rose-500/0", ring: "ring-rose-500/30", icon: "text-rose-300 bg-rose-500/15" },
  fuchsia: { bg: "from-fuchsia-500/20 to-fuchsia-500/0", ring: "ring-fuchsia-500/30", icon: "text-fuchsia-300 bg-fuchsia-500/15" },
  blue: { bg: "from-blue-500/20 to-blue-500/0", ring: "ring-blue-500/30", icon: "text-blue-300 bg-blue-500/15" },
  purple: { bg: "from-purple-500/20 to-purple-500/0", ring: "ring-purple-500/30", icon: "text-purple-300 bg-purple-500/15" },
};

export type KpiTileData = {
  label: string;
  value: string | number;
  hint?: string;
  /** @deprecated KPI stickers are emoji — ignored by `KpiStrip`. */
  icon?: HubGlyphComponent;
  /** Sheet-parity emoji sticker — KPI tiles never render Lucide. */
  emojiGlyph?: string;
  /** Presence CSS dot (table `hub-users-status-dot`) — centered in the badge; wins over emoji. */
  statusDot?: HubUsersStatusTone;
  /** Custom SVG/raster KPI mark — after emoji. */
  iconSrc?: string;
  brandIcon?: HubBrandIconId;
  /** Extra classes on KPI icon (e.g. animate-spin for in-progress). */
  iconClassName?: string;
  tone?: Tone;
  /** `money` — amber tabular text (hub-order-price-text SSOT). */
  valueKind?: "number" | "money";
  /** Matches DisplayPrefs KPI keys (total, ready, …). */
  prefKey?: string;
  /** Popover hint for KPI caption label. */
  labelHint?: HubDirectoryColumnHintContent;
  /** When set, tile is a button — directory FilterBar / drill-down. */
  onClick?: () => void;
  /** Marks the tile as an active filter (aria-pressed). */
  active?: boolean;
};

export function KpiStrip({ items, className = "" }: { items: KpiTileData[]; className?: string }) {
  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE_KPI);
  const count = resolveKpiStripCount(visible.length);

  return (
    <div
      className={`hub-kpi-strip stagger min-w-0 ${className}`.trim()}
      data-kpi-count={count}
    >
      {visible.map((it, i) => (
        <KpiTile key={it.prefKey ?? `${it.label}-${i}`} {...it} />
      ))}
    </div>
  );
}

function KpiTileIcon({
  statusDot,
  emojiGlyph,
  iconSrc,
  iconClassName,
}: {
  statusDot?: HubUsersStatusTone;
  emojiGlyph?: string;
  iconSrc?: string;
  iconClassName?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const iconClasses = ["hub-kpi-tile__icon-svg", iconClassName].filter(Boolean).join(" ");

  if (statusDot) {
    return (
      <span
        className={`hub-users-status-dot hub-users-status-dot--${statusDot} hub-kpi-tile__status-dot`}
        aria-hidden
      />
    );
  }

  if (emojiGlyph) {
    return (
      <span className="hub-kpi-tile__emoji" aria-hidden>
        {emojiGlyph}
      </span>
    );
  }
  if (iconSrc && !imgFailed) {
    return (
      <img
        src={iconSrc}
        alt=""
        className={[hubBrandIconImgClass("bare"), iconClasses].filter(Boolean).join(" ")}
        draggable={false}
        decoding="async"
        onError={() => setImgFailed(true)}
        aria-hidden
      />
    );
  }
  return (
    <span className="hub-kpi-tile__emoji" aria-hidden>
      📊
    </span>
  );
}

function KpiTile({
  label,
  value,
  hint,
  statusDot,
  emojiGlyph,
  iconSrc,
  iconClassName,
  tone = "indigo",
  valueKind = "number",
  labelHint,
  onClick,
  active,
}: KpiTileData) {
  const t = tones[tone];
  const valueClassName = [
    "hub-kpi-tile__value truncate tabular-nums",
    valueKind === "money" ? "hub-order-price-text hub-order-price-text--amber" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const interactive = typeof onClick === "function";
  const shellClass = [
    "hub-kpi-tile anim-slide relative z-0 min-w-0 overflow-visible rounded-2xl bg-[var(--panel)] transition-[box-shadow,background-color,ring-width,ring-color] hover:z-[1]",
    interactive
      ? `hub-kpi-tile--interactive cursor-pointer text-left outline-none hover:ring-2 focus-visible:ring-2 ${t.ring}`
      : "",
    active ? "hub-kpi-tile--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const body = (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${t.bg} blur-2xl`} />
      </div>
      <div className="hub-kpi-tile__inner relative flex min-w-0 items-center">
        <div className={`hub-kpi-tile__icon grid shrink-0 place-items-center rounded-xl ${t.icon}`}>
          <KpiTileIcon
            statusDot={statusDot}
            emojiGlyph={emojiGlyph}
            iconSrc={iconSrc}
            iconClassName={iconClassName}
          />
        </div>
        <div className="hub-kpi-tile__body">
          <AnalyticsCaptionLabel
            label={label}
            labelHint={labelHint}
            className="hub-kpi-tile__label w-full"
          />
          <div className={valueClassName}>{value}</div>
          {hint ? <div className="hub-kpi-tile__hint truncate text-[var(--muted)]">{hint}</div> : null}
        </div>
      </div>
    </>
  );
  if (interactive) {
    return (
      <button
        type="button"
        className={shellClass}
        title={typeof label === "string" ? label : undefined}
        onClick={onClick}
        aria-pressed={active ? true : undefined}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={shellClass} title={typeof label === "string" ? label : undefined}>
      {body}
    </div>
  );
}
