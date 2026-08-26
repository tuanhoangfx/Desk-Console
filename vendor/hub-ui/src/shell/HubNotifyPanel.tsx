import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Info,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { buildSemanticTocIcon } from "../lib/semantic-icon-registry";
import { HubHeaderPanelButton } from "./HubHeaderPanelButton";
import { HubToolDetailModal, HUB_TOOL_DETAIL_SCROLL_ROOT } from "./HubToolDetailModal";
import { HubToolDetailSection, HUB_TOOL_DETAIL_SECTIONS_CLASS } from "./HubToolDetailSection";
import { HubTocSectionNav, type HubTocNavItem } from "./HubTocSectionNav";
import { markAllNotifySeen, markNotifySeenId, mergeNotifySeenIds, pruneNotifySeenIds, readNotifySeenIds } from "./hub-notify-seen";
import type { HubLogQuickAction } from "./HubUsageLogPanel";
import {
  HubActivityFeedRows,
  HubOpsFeedFilterProvider,
  filterHubActivityFeedItems,
  type HubActivityFeedItem,
  type HubActivityKindFilter,
} from "./HubActivityFeed";
import {
  HubOpsPanelBadge,
  HubOpsPanelSearch,
  HubOpsTitleReadActions,
  HubOpsTypeTocNav,
  useHubOpsTypeToc,
  type HubOpsTypeTocChrome,
} from "./HubOpsPanelChrome";
import { HUB_NOTIFY_EMPTY_MESSAGE } from "./hub-chrome-messages";

export type HubNotifyAlertSeverity = "ok" | "warn" | "bad";

export type HubNotifyAlert = {
  id: string;
  severity: HubNotifyAlertSeverity;
  label: string;
  detail?: string;
  href?: string;
  /** Tool-specific payload (e.g. structured changelog entries). */
  meta?: Record<string, unknown>;
};

export type HubNotifyQuickAction = HubLogQuickAction;

export type HubNotifySeveritySectionOverride = {
  label?: string;
  icon?: LucideIcon;
  iconClassName?: string;
};

export type HubNotifyPanelProps = {
  alerts: HubNotifyAlert[];
  /** localStorage key for unread persistence across visits (migrates sessionStorage). */
  scopeKey?: string;
  title?: string;
  /** Hover title on the header bell — defaults to `title` / unread copy. */
  triggerTitle?: string;
  subtitle?: string;
  emptyMessage?: string;
  compact?: boolean;
  sidebarRow?: boolean;
  /** Shake bell when unread alerts exist (localStorage when scopeKey set). */
  trackUnread?: boolean;
  /** Override severity TOC / section chrome (e.g. Updates · Removed for vault Live sync). */
  severitySections?: Partial<Record<HubNotifyAlertSeverity, HubNotifySeveritySectionOverride>>;
  quickActions?: HubNotifyQuickAction[];
  /** Rich alert body — e.g. shared changelog list SSOT. */
  renderAlertBody?: (alert: HubNotifyAlert) => ReactNode;
  /** Open linked account / row detail (separate from mark-read row click). */
  onAlertOpenDetail?: (alert: HubNotifyAlert) => void;
  /** Fired when a row is marked read (localStorage + optional product sync). */
  onMarkRead?: (alertId: string) => void;
  /** Fired when Mark all read is clicked. */
  onMarkAllRead?: (alertIds: readonly string[]) => void;
  /** @deprecated Use onAlertOpenDetail — row click now marks read only. */
  onAlertAction?: (alert: HubNotifyAlert) => void;
  /**
   * Type-first TOC (All / Create / Update / Critical / …) — TOC click filters
   * the feed (replaces the old header kind chips). Default: auto — enabled when
   * any alert carries `meta.kind`; otherwise the legacy severity scrollspy TOC.
   */
  typeToc?: boolean;
};

type SeveritySectionDef = {
  key: HubNotifyAlertSeverity;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
};

const DEFAULT_SEVERITY_SECTIONS: SeveritySectionDef[] = [
  { key: "bad", label: "Critical", icon: ShieldAlert, iconClassName: "text-rose-400" },
  { key: "warn", label: "Warnings", icon: AlertTriangle, iconClassName: "text-amber-300" },
];

function resolveSeveritySections(
  overrides?: Partial<Record<HubNotifyAlertSeverity, HubNotifySeveritySectionOverride>>,
): SeveritySectionDef[] {
  return DEFAULT_SEVERITY_SECTIONS.map((section) => {
    const override = overrides?.[section.key];
    if (!override) return section;
    return {
      ...section,
      label: override.label ?? section.label,
      icon: override.icon ?? section.icon,
      iconClassName: override.iconClassName ?? section.iconClassName,
    };
  });
}

function severityIcon(severity: HubNotifyAlertSeverity): LucideIcon {
  return severity === "bad" ? ShieldAlert : AlertTriangle;
}

function severityIconClass(severity: HubNotifyAlertSeverity): string {
  if (severity === "bad") return "text-rose-400";
  if (severity === "warn") return "text-amber-300";
  return "text-emerald-400";
}

/** Row icon from `meta.kind` (create | update | delete) — falls back to severity. */
export function resolveHubNotifyAlertIcon(alert: HubNotifyAlert): {
  Icon: LucideIcon;
  className: string;
} {
  const kind = typeof alert.meta?.kind === "string" ? alert.meta.kind : "";
  if (kind === "create") return { Icon: UserPlus, className: "text-emerald-400" };
  if (kind === "update") return { Icon: Pencil, className: "text-sky-300" };
  if (kind === "delete") return { Icon: Trash2, className: "text-rose-400" };
  return { Icon: severityIcon(alert.severity), className: severityIconClass(alert.severity) };
}

/**
 * Type bucket for the TOC — `meta.kind` when present (create / update / delete
 * / system / custom), else the severity bucket so untyped alerts still group.
 */
export function resolveHubNotifyAlertKind(alert: HubNotifyAlert): string {
  const raw = typeof alert.meta?.kind === "string" ? alert.meta.kind.trim().toLowerCase() : "";
  if (raw) return raw;
  if (alert.severity === "bad") return "critical";
  if (alert.severity === "warn") return "warning";
  return "info";
}

/** Severity buckets rendered in the type TOC (kind ⇢ severity section chrome). */
const NOTIFY_KIND_SEVERITY: Record<string, HubNotifyAlertSeverity> = {
  critical: "bad",
  warning: "warn",
  info: "ok",
};

const NOTIFY_SEVERITY_TOC_CHROME: Record<HubNotifyAlertSeverity, HubOpsTypeTocChrome> = {
  bad: { label: "Critical", Icon: ShieldAlert, className: "text-rose-400" },
  warn: { label: "Warnings", Icon: AlertTriangle, className: "text-amber-300" },
  ok: { label: "Info", Icon: Info, className: "text-emerald-400" },
};

/** Fixed head of the type TOC — custom kinds append after, sorted. */
const NOTIFY_TYPE_ORDER = [
  "create",
  "update",
  "delete",
  "critical",
  "warning",
  "system",
  "info",
] as const;

function alertToFeedItem(
  alert: HubNotifyAlert,
  renderAlertBody?: (alert: HubNotifyAlert) => ReactNode,
): HubActivityFeedItem {
  const kindRaw = typeof alert.meta?.kind === "string" ? alert.meta.kind : undefined;
  const kind =
    kindRaw === "create" || kindRaw === "update" || kindRaw === "delete" ? kindRaw : undefined;
  const entityIdRaw = alert.meta?.entityId ?? alert.meta?.taskId;
  const entityId =
    typeof entityIdRaw === "string" || typeof entityIdRaw === "number"
      ? String(entityIdRaw)
      : undefined;
  const entityIdDisplayRaw = alert.meta?.entityIdDisplay;
  const entityIdDisplay =
    typeof entityIdDisplayRaw === "string" && entityIdDisplayRaw.trim()
      ? entityIdDisplayRaw.trim()
      : entityId;
  const screen =
    typeof alert.meta?.screen === "string" && alert.meta.screen.trim()
      ? alert.meta.screen.trim()
      : typeof alert.meta?.entityType === "string" && alert.meta.entityType.trim()
        ? alert.meta.entityType.trim()
        : entityId
          ? "row"
          : undefined;
  const idLabel =
    typeof alert.meta?.entityIdLabel === "string" && alert.meta.entityIdLabel.trim()
      ? alert.meta.entityIdLabel.trim()
      : screen === "task"
        ? "Task ID"
        : entityId
          ? "ID"
          : null;
  return {
    id: alert.id,
    kind,
    label: alert.label,
    detail: alert.detail,
    canOpenDetail: kind !== "delete",
    body: renderAlertBody?.(alert),
    ...(entityId && screen
      ? {
          entityRef: { screen, entityId },
          entityChips: idLabel ? [{ label: idLabel, value: entityIdDisplay ?? entityId }] : undefined,
        }
      : {}),
  };
}

/** Ops alerts — same HubToolDetailModal shell as Log (TOC · sections · fixed size). */
export function HubNotifyPanel({
  alerts,
  scopeKey = "default",
  title = "Notify",
  triggerTitle,
  subtitle = "Operational alerts for this screen",
  emptyMessage = HUB_NOTIFY_EMPTY_MESSAGE,
  compact = false,
  sidebarRow = false,
  trackUnread = true,
  severitySections,
  quickActions = [],
  renderAlertBody,
  onAlertOpenDetail,
  onMarkRead,
  onMarkAllRead,
  onAlertAction,
  typeToc,
}: HubNotifyPanelProps) {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState(() => readNotifySeenIds(scopeKey));
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<HubActivityKindFilter>("all");
  const activeAlerts = useMemo(() => alerts.filter((a) => a.severity !== "ok"), [alerts]);
  const activeIds = useMemo(() => activeAlerts.map((a) => a.id), [activeAlerts]);
  const unreadCount = useMemo(
    () => activeIds.filter((id) => !seenIds.has(id)).length,
    [activeIds, seenIds],
  );
  /** Header / modal badge = unread when tracking; otherwise total active. */
  const badge = trackUnread ? unreadCount : activeAlerts.length;
  const unread = trackUnread && unreadCount > 0;
  const openDetail = onAlertOpenDetail ?? onAlertAction;
  const sections = useMemo(() => resolveSeveritySections(severitySections), [severitySections]);

  /** Any typed alert turns the TOC type-first; severity-only feeds stay legacy. */
  const hasKindMeta = useMemo(
    () =>
      activeAlerts.some(
        (a) => typeof a.meta?.kind === "string" && a.meta.kind.trim().length > 0,
      ),
    [activeAlerts],
  );
  const typeTocEnabled = typeToc ?? hasKindMeta;

  /** Type bucket per alert id — TOC filter + counts (rows keep their own icons). */
  const alertKinds = useMemo(() => {
    const map = new Map<string, string>();
    for (const alert of activeAlerts) map.set(alert.id, resolveHubNotifyAlertKind(alert));
    return map;
  }, [activeAlerts]);

  /** Search-filtered alerts drive TOC rows; unread subset drives Notify counts. */
  const searchedAlerts = useMemo(() => {
    if (!typeTocEnabled) return [];
    const q = query.trim().toLowerCase();
    return activeAlerts.filter(
      (a) => !q || `${a.label} ${a.detail ?? ""}`.toLowerCase().includes(q),
    );
  }, [activeAlerts, query, typeTocEnabled]);

  const searchedKinds = useMemo(
    () => searchedAlerts.map((a) => alertKinds.get(a.id) ?? "info"),
    [alertKinds, searchedAlerts],
  );

  const unreadSearchedKinds = useMemo(
    () =>
      trackUnread
        ? searchedAlerts.filter((a) => !seenIds.has(a.id)).map((a) => alertKinds.get(a.id) ?? "info")
        : searchedKinds,
    [alertKinds, searchedAlerts, searchedKinds, seenIds, trackUnread],
  );

  /** Severity buckets inherit the consumer's section chrome (Updates / Removed). */
  const tocChromeOf = useCallback(
    (kind: HubActivityKindFilter): HubOpsTypeTocChrome | null => {
      const severity = NOTIFY_KIND_SEVERITY[kind as string];
      if (!severity) return null;
      const section = sections.find((s) => s.key === severity);
      if (!section) return NOTIFY_SEVERITY_TOC_CHROME[severity];
      return { label: section.label, Icon: section.icon, className: section.iconClassName };
    },
    [sections],
  );

  const typeTocEntries = useHubOpsTypeToc({
    enabled: typeTocEnabled,
    kinds: searchedKinds,
    countKinds: trackUnread ? unreadSearchedKinds : undefined,
    order: NOTIFY_TYPE_ORDER,
    chromeOf: tocChromeOf,
  });

  /** Typed alerts under active type + search filters — single timeline feed (Release parity). */
  const notifyFeedItems = useMemo(() => {
    if (!typeTocEnabled) return [];
    const items = activeAlerts
      .filter((a) => kindFilter === "all" || alertKinds.get(a.id) === kindFilter)
      .map((a) => alertToFeedItem(a, renderAlertBody));
    return filterHubActivityFeedItems(items, query, "all");
  }, [activeAlerts, alertKinds, kindFilter, query, renderAlertBody, typeTocEnabled]);

  /** Re-read when scope or alert ids change so products can seed DB-read ids before setState. */
  const activeIdsKey = activeIds.join("\0");
  const dbReadKey = useMemo(
    () =>
      activeAlerts
        .filter((a) => a.meta?.isRead === true)
        .map((a) => a.id)
        .join("\0"),
    [activeAlerts],
  );
  useEffect(() => {
    const dbReadIds = dbReadKey ? dbReadKey.split("\0") : [];
    mergeNotifySeenIds(scopeKey, dbReadIds);
    setSeenIds(pruneNotifySeenIds(scopeKey, activeIds));
  }, [scopeKey, activeIds, activeIdsKey, dbReadKey]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setKindFilter("all");
  }, [open]);

  const markRead = useCallback(
    (id: string) => {
      markNotifySeenId(scopeKey, id);
      setSeenIds(pruneNotifySeenIds(scopeKey, activeIds));
      onMarkRead?.(id);
    },
    [activeIds, onMarkRead, scopeKey],
  );

  const markAllRead = useCallback(() => {
    markAllNotifySeen(scopeKey, activeIds);
    setSeenIds(pruneNotifySeenIds(scopeKey, activeIds));
    onMarkAllRead?.(activeIds);
  }, [activeIds, onMarkAllRead, scopeKey]);

  const { tocItems, sectionIds, body } = useMemo(() => {
    const toc: HubTocNavItem[] = [];
    const ids: string[] = [];
    const sectionNodes: ReactNode[] = [];
    const alertIcon = buildSemanticTocIcon("notify.alerts");
    const shortcutIcon = buildSemanticTocIcon("notify.shortcuts");

    if (quickActions.length > 0) {
      const id = "notify-quick-actions";
      toc.push({ id, label: "Shortcuts", icon: shortcutIcon });
      ids.push(id);
      sectionNodes.push(
        <HubToolDetailSection key={id} id={id} title="Shortcuts" icon={shortcutIcon}>
          <div className="flex flex-col gap-1.5">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/[.06]"
                >
                  <ActionIcon size={14} className="shrink-0 text-amber-300" aria-hidden />
                  <span className="flex-1">
                    <span className="font-semibold text-[var(--text)]">{action.label}</span>
                    {action.description ? (
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{action.description}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </HubToolDetailSection>,
      );
    }

    if (activeAlerts.length === 0) {
      const id = "notify-empty";
      if (!typeTocEnabled) {
        toc.push({ id, label: "Alerts", icon: alertIcon });
        ids.push(id);
      }
      sectionNodes.push(
        <HubToolDetailSection
          key={id}
          id={id}
          title="Recent"
          icon={alertIcon}
          hideHeader={typeTocEnabled}
        >
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[var(--muted)] app-tab-header__chrome-text">
            {emptyMessage}
          </div>
          {subtitle && !typeTocEnabled ? (
            <p className="mt-3 text-center text-[10px] text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </HubToolDetailSection>,
      );
      return { tocItems: toc, sectionIds: ids, body: sectionNodes };
    }

    if (typeTocEnabled) {
      if (notifyFeedItems.length > 0) {
        sectionNodes.push(
          <HubToolDetailSection key="notify-recent" id="notify-recent" title="Recent" hideHeader>
            <HubActivityFeedRows
              items={notifyFeedItems}
              seenIds={seenIds}
              trackUnread={trackUnread}
              onMarkRead={markRead}
              onOpenDetail={
                openDetail
                  ? (item) => {
                      const alert = activeAlerts.find((a) => a.id === item.id);
                      if (alert) openDetail(alert);
                    }
                  : undefined
              }
              emptyMessage="No alerts match the current filters."
              resolveLeadingIcon={(item) => {
                const alert = activeAlerts.find((a) => a.id === item.id);
                return alert ? resolveHubNotifyAlertIcon(alert) : null;
              }}
            />
          </HubToolDetailSection>,
        );
      } else {
        sectionNodes.push(
          <HubToolDetailSection key="notify-empty" id="notify-empty" title="Recent" hideHeader>
            <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[var(--muted)] app-tab-header__chrome-text">
              No alerts match the current filters.
            </div>
          </HubToolDetailSection>,
        );
      }
      return { tocItems: toc, sectionIds: ids, body: sectionNodes };
    }

    let alertSections = 0;
    for (const { key, label, icon: SectionIcon, iconClassName } of sections) {
      const rows = activeAlerts.filter((a) => a.severity === key);
      if (!rows.length) continue;
      const typeMatched = typeTocEnabled
        ? rows.filter((a) => kindFilter === "all" || alertKinds.get(a.id) === kindFilter)
        : rows;
      const feedItems = typeMatched.map((a) => alertToFeedItem(a, renderAlertBody));
      const filtered = filterHubActivityFeedItems(feedItems, query, "all");
      /** Type mode — the TOC is the filter, so empty buckets drop out entirely. */
      if (typeTocEnabled && filtered.length === 0) continue;
      alertSections += 1;
      const id = `notify-${key}`;
      const tocIcon = <SectionIcon size={14} className={iconClassName} aria-hidden />;
      toc.push({ id, label, icon: tocIcon });
      ids.push(id);
      sectionNodes.push(
        <HubToolDetailSection key={id} id={id} title={`${label} (${filtered.length})`} icon={tocIcon}>
          <HubActivityFeedRows
            items={filtered}
            seenIds={seenIds}
            trackUnread={trackUnread}
            onMarkRead={markRead}
            onOpenDetail={
              openDetail
                ? (item) => {
                    const alert = rows.find((a) => a.id === item.id);
                    if (alert) openDetail(alert);
                  }
                : undefined
            }
            emptyMessage="No alerts match the current filters."
            resolveLeadingIcon={(item) => {
              const alert = rows.find((a) => a.id === item.id);
              return alert ? resolveHubNotifyAlertIcon(alert) : null;
            }}
          />
        </HubToolDetailSection>,
      );
    }

    if (alertSections === 0) {
      const id = "notify-empty";
      toc.push({ id, label: "Alerts", icon: alertIcon });
      ids.push(id);
      sectionNodes.push(
        <HubToolDetailSection key={id} id={id} title="Alerts" icon={alertIcon}>
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[var(--muted)]">
            No alerts match the current filters.
          </div>
        </HubToolDetailSection>,
      );
    }

    return { tocItems: toc, sectionIds: ids, body: sectionNodes };
  }, [
    activeAlerts,
    alertKinds,
    emptyMessage,
    kindFilter,
    markRead,
    openDetail,
    query,
    quickActions,
    renderAlertBody,
    sections,
    seenIds,
    subtitle,
    trackUnread,
    typeTocEnabled,
    notifyFeedItems,
  ]);

  const showToc = typeTocEnabled || tocItems.length > 0;
  const feedFilter = useMemo(
    () => ({ query, setQuery, kindFilter, setKindFilter }),
    [query, kindFilter],
  );

  return (
    <>
      <HubHeaderPanelButton
        icon={Bell}
        iconClassName={`text-amber-300${unread ? " animate-notify-shake" : ""}`}
        label="Notify"
        title={triggerTitle ?? (unread ? "Unread alerts" : title)}
        badge={badge}
        compact={compact}
        sidebarRow={sidebarRow}
        onClick={() => setOpen(true)}
      />

      <HubToolDetailModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        titleId="hub-notify-panel-title"
        headerIcon={Bell}
        headerIconClassName="text-amber-300"
        headerTrailing={
          trackUnread ? (
            <HubOpsTitleReadActions unreadCount={unreadCount} onMarkAllRead={markAllRead} />
          ) : badge > 0 ? (
            <HubOpsPanelBadge count={badge} tone="amber" />
          ) : undefined
        }
        headerCenter={
          <HubOpsPanelSearch query={query} onQueryChange={setQuery} placeholder="Search alerts…" />
        }
        shellClassName="hub-header-panel-modal hub-ops-panel-modal"
        sectionIds={showToc && !typeTocEnabled ? sectionIds : undefined}
        toc={
          showToc ? (
            <div className="hub-toc-nav">
              {typeTocEnabled ? (
                <HubOpsTypeTocNav
                  entries={typeTocEntries}
                  active={kindFilter}
                  onSelect={setKindFilter}
                  ariaLabel="Alert types"
                />
              ) : (
                <HubTocSectionNav items={tocItems} scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT} />
              )}
            </div>
          ) : undefined
        }
      >
        <HubOpsFeedFilterProvider value={feedFilter}>
          <div className={`${HUB_TOOL_DETAIL_SECTIONS_CLASS} hub-release-timeline`}>{body}</div>
        </HubOpsFeedFilterProvider>
      </HubToolDetailModal>
    </>
  );
}
