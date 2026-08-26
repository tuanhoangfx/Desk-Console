import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { ExternalLink, Pencil, ScrollText, Search, Trash2, UserPlus } from "lucide-react";
import type { HubLogEntityChip, HubLogEntityRef } from "../lib/hub-session-log-emit";
import { HubChromeActivityAge } from "./HubChromeActivityAge";
import { HubOpsKindBadge } from "./HubOpsPanelChrome";
import { HubTwofaCopyControl } from "./HubTwofaCopyControl";

/** Primary entity id shown inline beside scope headline (Order ID · Product ID · …). */
const TIMELINE_PRIMARY_ID_LABELS = ["Order ID", "Product ID", "Buyer ID", "Service ID"] as const;

function findTimelinePrimaryIdChip(
  chips?: readonly HubLogEntityChip[],
): HubLogEntityChip | null {
  if (!chips?.length) return null;
  for (const label of TIMELINE_PRIMARY_ID_LABELS) {
    const hit = chips.find((chip) => chip.label === label && chip.value.trim());
    if (hit) return hit;
  }
  return chips.find((chip) => / ID$/i.test(chip.label) && chip.value.trim()) ?? null;
}

function timelineBodyChips(
  chips: readonly HubLogEntityChip[] | undefined,
  primary: HubLogEntityChip | null,
): string[] {
  return (
    chips
      ?.filter((chip) => {
        if (!chip.value.trim()) return false;
        if (!primary) return true;
        return !(chip.label === primary.label && chip.value === primary.value);
      })
      .map((chip) => `${chip.label}: ${chip.value}`) ?? []
  );
}

export type HubActivityFeedKind = "create" | "update" | "delete";

/**
 * Kind values beyond CRUD are allowed (e.g. `system` session lines, `sync`).
 * Unknown kinds render a generic badge via `resolveHubActivityKindMeta`.
 */
export type HubActivityKindFilter = "all" | HubActivityFeedKind | (string & {});

export type HubActivityFeedItem = {
  id: string;
  kind?: HubActivityFeedKind | (string & {});
  label: string;
  detail?: string;
  at?: number;
  /** Order ID / Product ID / SKU chips under the row label. */
  entityChips?: readonly HubLogEntityChip[];
  /** Passed to `onOpenDetail` for tool-specific modal navigation. */
  entityRef?: HubLogEntityRef;
  /** When false, hide ExternalLink (e.g. delete rows). Default true when onOpenDetail set. */
  canOpenDetail?: boolean;
  body?: ReactNode;
};

const KIND_META: Record<
  HubActivityFeedKind,
  { label: string; Icon: LucideIcon; className: string }
> = {
  create: { label: "New", Icon: UserPlus, className: "text-emerald-400" },
  update: { label: "Update", Icon: Pencil, className: "text-sky-300" },
  delete: { label: "Removed", Icon: Trash2, className: "text-rose-400" },
};

/** Non-CRUD kinds — session/system lines share the Log cyan identity. */
const EXTRA_KIND_META: Record<string, { label: string; Icon: LucideIcon; className: string }> = {
  system: { label: "System", Icon: ScrollText, className: "text-cyan-300" },
  sync: { label: "Sync", Icon: ScrollText, className: "text-indigo-300" },
};

export function resolveHubActivityKindMeta(kind: string | undefined): {
  label: string;
  Icon: LucideIcon;
  className: string;
} | null {
  if (!kind) return null;
  if (kind in KIND_META) return KIND_META[kind as HubActivityFeedKind];
  if (kind in EXTRA_KIND_META) return EXTRA_KIND_META[kind]!;
  /** Unknown custom kind — generic badge (label = capitalized kind). */
  return {
    label: kind.charAt(0).toUpperCase() + kind.slice(1),
    Icon: ScrollText,
    className: "text-slate-300",
  };
}

export function hubActivityKindLabel(kind: HubActivityFeedKind): string {
  return KIND_META[kind].label;
}

export function filterHubActivityFeedItems(
  items: readonly HubActivityFeedItem[],
  query: string,
  kindFilter: HubActivityKindFilter,
): HubActivityFeedItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    if (!q) return true;
    const hay = `${item.label} ${item.detail ?? ""} ${(item.entityChips ?? []).map((c) => `${c.label} ${c.value}`).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export type HubActivityFeedToolbarProps = {
  query: string;
  onQueryChange: (next: string) => void;
  kindFilter: HubActivityKindFilter;
  onKindFilterChange: (next: HubActivityKindFilter) => void;
  /** Hide kind chips when false (e.g. system-only Notify). Default true. */
  showKindFilters?: boolean;
  searchPlaceholder?: string;
  /**
   * `header` — single row for Layout 2 `headerCenter` (Log / Notify / Update Release).
   * `stack` — body-mounted (legacy / standalone feeds).
   */
  variant?: "stack" | "header";
};

const KIND_CHIPS: { id: HubActivityKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "create", label: "Create" },
  { id: "update", label: "Update" },
  { id: "delete", label: "Delete" },
];

/** Search + All/Create/Update/Delete chips — Log / Notify / Release feed SSOT. */
export function HubActivityFeedToolbar({
  query,
  onQueryChange,
  kindFilter,
  onKindFilterChange,
  showKindFilters = true,
  searchPlaceholder = "Search…",
  variant = "stack",
}: HubActivityFeedToolbarProps) {
  const isHeader = variant === "header";
  return (
    <div
      className={
        isHeader
          ? "hub-activity-feed-toolbar hub-activity-feed-toolbar--header flex min-w-0 flex-wrap items-center gap-1.5"
          : "hub-activity-feed-toolbar mb-2 space-y-1.5"
      }
    >
      <label className={`relative block min-w-0 ${isHeader ? "flex-1" : ""}`}>
        <Search
          size={12}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-white/10 bg-white/[.03] py-1.5 pl-7 pr-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-white/20"
        />
      </label>
      {showKindFilters ? (
        <div className={`flex flex-wrap gap-1 ${isHeader ? "shrink-0" : ""}`}>
          {KIND_CHIPS.map((chip) => {
            const active = kindFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                    : "border-white/10 bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
                }`}
                onClick={() => onKindFilterChange(chip.id)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type HubOpsFeedFilterValue = {
  query: string;
  setQuery: (next: string) => void;
  kindFilter: HubActivityKindFilter;
  setKindFilter: (next: HubActivityKindFilter) => void;
};

const HubOpsFeedFilterContext = createContext<HubOpsFeedFilterValue | null>(null);

/** Shared query/kind filter for Layout 2 ops modals (Log · Notify · nested Vault Live). */
export function HubOpsFeedFilterProvider({
  value,
  children,
}: {
  value: HubOpsFeedFilterValue;
  children: ReactNode;
}) {
  return (
    <HubOpsFeedFilterContext.Provider value={value}>{children}</HubOpsFeedFilterContext.Provider>
  );
}

export function useHubOpsFeedFilterOptional(): HubOpsFeedFilterValue | null {
  return useContext(HubOpsFeedFilterContext);
}

export type HubActivityFeedRowsProps = {
  items: readonly HubActivityFeedItem[];
  seenIds?: ReadonlySet<string>;
  trackUnread?: boolean;
  onMarkRead?: (id: string) => void;
  onOpenDetail?: (item: HubActivityFeedItem) => void;
  emptyMessage?: string;
  formatTime?: (at: number) => string;
  /** Extra leading glyph when kind is absent (e.g. severity icon). */
  resolveLeadingIcon?: (item: HubActivityFeedItem) => { Icon: LucideIcon; className: string } | null;
};

/** Shared activity row chrome — Update Release timeline SSOT (Log · Notify). */
export function HubActivityFeedRows({
  items,
  seenIds,
  trackUnread = false,
  onMarkRead,
  onOpenDetail,
  emptyMessage = "No entries.",
  formatTime: _formatTime,
  resolveLeadingIcon,
}: HubActivityFeedRowsProps) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[var(--muted)] app-tab-header__chrome-text">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="hub-release-timeline hub-ops-timeline-feed">
      {items.map((item, index) => {
        const isRead = trackUnread && seenIds ? seenIds.has(item.id) : false;
        /** Notify may open via alert.id without entityRef; Log still passes entityRef when available. */
        const canOpen =
          Boolean(onOpenDetail) &&
          item.canOpenDetail !== false &&
          item.kind !== "delete";
        const headline = item.label.trim();
        const primaryIdChip = findTimelinePrimaryIdChip(item.entityChips);
        const chipLines = timelineBodyChips(item.entityChips, primaryIdChip);

        return (
          <div
            key={item.id}
            className={`hub-release-timeline-item hub-ops-timeline-item${isRead ? " hub-notify-alert-item--read" : ""}`}
          >
            <div className="hub-release-timeline-rail" aria-hidden>
              <span className="hub-release-timeline-dot" />
              {index < items.length - 1 ? <span className="hub-release-timeline-line" /> : null}
            </div>
            <div
              className={`hub-release-timeline-card min-w-0 flex-1 text-left transition-opacity hover:opacity-95${onMarkRead ? " cursor-pointer" : ""}`}
              role={onMarkRead ? "button" : undefined}
              tabIndex={onMarkRead ? 0 : undefined}
              onClick={onMarkRead ? () => onMarkRead(item.id) : undefined}
              onKeyDown={
                onMarkRead
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onMarkRead(item.id);
                      }
                    }
                  : undefined
              }
            >
              <div className="hub-release-timeline-card__head app-tab-header__chrome-text">
                {item.kind ? (
                  <HubOpsKindBadge kind={item.kind} />
                ) : resolveLeadingIcon?.(item) ? (
                  (() => {
                    const leading = resolveLeadingIcon(item)!;
                    const LeadingIcon = leading.Icon;
                    return (
                      <span className="hub-release-kind-badge inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/[.04] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text)]/90">
                        <LeadingIcon size={12} className={leading.className} aria-hidden />
                      </span>
                    );
                  })()
                ) : null}
                {headline || primaryIdChip || canOpen ? (
                  <span className="hub-ops-timeline-headline-group min-w-0">
                    {headline ? (
                      <span className="hub-release-headline min-w-0 truncate font-semibold text-[var(--text)]">
                        {headline}
                      </span>
                    ) : null}
                    {canOpen ? (
                      <button
                        type="button"
                        className="hub-ops-timeline-open-detail"
                        title="Open detail"
                        aria-label={`Open detail for ${item.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMarkRead?.(item.id);
                          onOpenDetail?.(item);
                        }}
                      >
                        <ExternalLink size={11} className="text-sky-300" aria-hidden />
                      </button>
                    ) : null}
                    {primaryIdChip ? (
                      <>
                        <span className="hub-ops-timeline-headline-sep" aria-hidden>
                          ·
                        </span>
                        <HubTwofaCopyControl
                          value={primaryIdChip.value}
                          display={
                            <span className="hub-ops-timeline-entity-id tabular-nums text-[var(--muted)]">
                              {primaryIdChip.value}
                            </span>
                          }
                          copyToastLabel={`Copy ${primaryIdChip.label}`}
                          title={`${primaryIdChip.label} ${primaryIdChip.value}`}
                          copyFeedback="inline"
                          className="hub-ops-timeline-entity-id-copy"
                        />
                      </>
                    ) : null}
                  </span>
                ) : null}
                {item.at != null ? <HubChromeActivityAge at={item.at} className="ml-auto" /> : null}
              </div>
              <div className="app-tab-header__chrome-text mt-2 space-y-1.5">
                {item.body ??
                  (item.detail || chipLines.length ? (
                    <ul className="space-y-1">
                      {chipLines.map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-1.5 leading-snug text-[var(--muted)]"
                        >
                          <span
                            className="mt-[5px] inline-block h-1 w-1 shrink-0 rounded-full bg-cyan-300/50"
                            aria-hidden
                          />
                          <span className="min-w-0 tabular-nums">{line}</span>
                        </li>
                      ))}
                      {item.detail ? (
                        <li className="flex items-start gap-1.5 leading-snug text-[var(--muted)]">
                          <span
                            className="mt-[5px] inline-block h-1 w-1 shrink-0 rounded-full bg-cyan-300/50"
                            aria-hidden
                          />
                          <span className="min-w-0">{item.detail}</span>
                        </li>
                      ) : null}
                    </ul>
                  ) : null)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Hook helper — local search + kind filter state for a feed. */
export function useHubActivityFeedFilter(items: readonly HubActivityFeedItem[]) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<HubActivityKindFilter>("all");
  const filtered = useMemo(
    () => filterHubActivityFeedItems(items, query, kindFilter),
    [items, query, kindFilter],
  );
  return { query, setQuery, kindFilter, setKindFilter, filtered };
}
