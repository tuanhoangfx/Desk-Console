import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Download, RefreshCw, Sparkles, Wrench, Zap } from "lucide-react";
import type { HubActivityKindFilter } from "./HubActivityFeed";
import {
  HubOpsPanelSearch,
  HubOpsTypeTocNav,
  useHubOpsTypeToc,
  type HubOpsTypeTocChrome,
} from "./HubOpsPanelChrome";
import { HubChromeActivityAge } from "./HubChromeActivityAge";
import { HubToolDetailModal } from "./HubToolDetailModal";
import { HUB_TOOL_DETAIL_SCROLL_ROOT } from "./hubToolDetailModalChrome";
import { HubToolDetailSection, HUB_TOOL_DETAIL_SECTIONS_CLASS } from "./HubToolDetailSection";
import { HubTocSectionNav, type HubTocNavItem } from "./HubTocSectionNav";
import { compactIconSize } from "../ui-scale";
import { HUB_RELEASE_CHIP_CLASS } from "../lib/hub-release-chip-ssot";
import {
  HubVersionUpdateStatusIcon,
  HubReleaseUpdateActionButton,
  HubReleaseUpdateAvailableBadge,
  hubDesktopUpdateActionLabel,
  hubDesktopUpdateHighlightsEntry,
  hubDesktopUpdateOwnsTrigger,
  hubDesktopUpdateShouldRecheckOnOpen,
  type HubVersionDesktopUpdate,
} from "./HubVersionUpdateStatusIcon";
import { useHubDesktopUpdateToasts } from "./useHubDesktopUpdateToasts";
import {
  hubReleaseNotesFetchUrl,
  ensureHubReleaseNotesIncludeCurrent,
  ensureHubReleaseNotesIncludePendingUpdate,
  hasUnseenHubReleaseNotes,
  hubReleaseNoteActivityAt,
  hubReleaseSummaryIsRedundant,
  markHubReleaseNotesSeen,
  normalizeReleaseNotesVersion,
  extractHubReleaseNotesSemver,
  parseHubReleaseNotesPayload,
  readHubReleaseNotesSeen,
  type HubReleaseNoteEntry,
  type HubReleaseNoteKind,
} from "../lib/hub-version-release-notes-core";

/** Module cache — fetch `/release-notes.json` once per page, lazily on first open. */
let hubReleaseNotesCache: HubReleaseNoteEntry[] | null = null;
let hubReleaseNotesPromise: Promise<HubReleaseNoteEntry[]> | null = null;

function loadHubReleaseNotes(): Promise<HubReleaseNoteEntry[]> {
  if (hubReleaseNotesCache) return Promise.resolve(hubReleaseNotesCache);
  if (!hubReleaseNotesPromise) {
    hubReleaseNotesPromise = fetch(hubReleaseNotesFetchUrl(), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => {
        hubReleaseNotesCache = parseHubReleaseNotesPayload(json);
        return hubReleaseNotesCache;
      })
      .catch(() => {
        hubReleaseNotesPromise = null;
        return [];
      });
  }
  return hubReleaseNotesPromise;
}

function releaseSectionId(version: string, index: number) {
  const slug = version.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ver";
  return `release-${slug}-${index}`;
}

function entryMatchesQuery(entry: HubReleaseNoteEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    entry.version,
    entry.date,
    entry.title,
    entry.userTitle,
    entry.userSummary,
    entry.kind,
    ...entry.bullets,
    ...entry.userHighlights,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

const KIND_META: Record<
  HubReleaseNoteKind,
  { label: string; Icon: LucideIcon; className: string; chip: string }
> = {
  new: {
    label: "New",
    Icon: Sparkles,
    className: "text-emerald-300",
    chip: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  },
  improve: {
    label: "Update",
    Icon: Zap,
    className: "text-violet-300",
    chip: "border-violet-400/40 bg-violet-500/15 text-violet-100",
  },
  fix: {
    label: "Fixed",
    Icon: Wrench,
    className: "text-amber-300",
    chip: "border-amber-400/35 bg-amber-500/15 text-amber-100",
  },
};

/** Running bundle row — green Latest chip (P0010 release modal SSOT). */
const RELEASE_LATEST_BADGE = {
  label: "Latest",
  Icon: CheckCircle2,
  className: "text-emerald-400",
  chip: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
} as const;

/**
 * Fixed head of the release type TOC. Feed kinds are `new | improve | fix`; the
 * labels users see are New · Update · Fixed (same words as the row badges).
 */
const RELEASE_TYPE_ORDER = ["new", "improve", "fix"] as const;

/** Type TOC chrome — reuses the row badge glyphs so rail and rows read alike. */
function releaseTypeTocChrome(kind: HubActivityKindFilter): HubOpsTypeTocChrome | null {
  const meta = KIND_META[kind as HubReleaseNoteKind];
  if (!meta) return null;
  return { label: meta.label, Icon: meta.Icon, className: meta.className };
}

function freshnessTocIcon(isLatest: boolean) {
  if (isLatest) {
    return <CheckCircle2 size={14} className="text-emerald-400" aria-hidden />;
  }
  return <RefreshCw size={14} className="text-indigo-300/90" aria-hidden />;
}

/** Drop stub / version-echo titles — headline only when it adds meaning. */
function releaseHeadline(entry: HubReleaseNoteEntry): string | null {
  const raw = (entry.userTitle || entry.title).trim();
  if (!raw) return null;
  if (/^release\s+v?[\d.]+$/i.test(raw)) return null;
  if (raw.toLowerCase() === `v${entry.version}`.toLowerCase()) return null;
  if (raw.toLowerCase() === entry.version.toLowerCase()) return null;
  if (raw.toLowerCase() === "current version") return null;
  return raw;
}

/** Compare feed semver vs running bundle (tolerates header noise). */
function releaseVersionsMatch(entryVersion: string, runningVersion: string): boolean {
  const entryVer = extractHubReleaseNotesSemver(entryVersion);
  const runVer = extractHubReleaseNotesSemver(runningVersion);
  if (entryVer && runVer && entryVer === runVer) return true;
  return normalizeReleaseNotesVersion(entryVersion) === normalizeReleaseNotesVersion(runningVersion);
}

/** Timeline kind chip — Lucide SSOT (Latest for running bundle, else New/Update/Fixed). */
function ReleaseTimelineKindBadge({
  entry,
  entryIndex,
  currentVersion,
  showUpdateAvailableBadge = false,
}: {
  entry: HubReleaseNoteEntry;
  entryIndex: number;
  currentVersion: string;
  showUpdateAvailableBadge?: boolean;
}) {
  const isRunningBundle =
    !showUpdateAvailableBadge && releaseVersionsMatch(entry.version, currentVersion);
  const isCurrentStub =
    !showUpdateAvailableBadge &&
    entryIndex === 0 &&
    entry.userTitle?.trim() === "Current version";
  const meta =
    isRunningBundle || isCurrentStub
      ? RELEASE_LATEST_BADGE
      : KIND_META[entry.kind as HubReleaseNoteKind] ?? KIND_META.improve;
  const Icon = meta.Icon;
  return (
    <span className={`${HUB_RELEASE_CHIP_CLASS} hub-release-kind-badge ${meta.chip}`}>
      <Icon size={compactIconSize(12)} className={`shrink-0 ${meta.className}`} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Version + activity age — hub header chrome scale (`vX.Y.Z` · dot · `2h ago`). */
function ReleaseVersionMeta({ version, date, at }: { version: string; date: string; at?: string }) {
  const activityAt = hubReleaseNoteActivityAt(date, at);
  return (
    <div className="hub-release-version-meta app-tab-header__chrome-text inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[var(--muted)]">
      <span className="truncate font-semibold tabular-nums tracking-tight text-[var(--text)]/90">
        v{version}
      </span>
      {activityAt ? (
        <HubChromeActivityAge at={activityAt} />
      ) : date ? (
        <span className="tabular-nums text-[var(--text)]/90">{date}</span>
      ) : null}
    </div>
  );
}

function ReleaseTimelineCard({
  entry,
  entryIndex,
  currentVersion,
  showUpdateAvailableBadge = false,
}: {
  entry: HubReleaseNoteEntry;
  entryIndex: number;
  currentVersion: string;
  showUpdateAvailableBadge?: boolean;
}) {
  const headline = releaseHeadline(entry);
  const lines = entry.userHighlights.length ? entry.userHighlights : entry.bullets;
  const showSummary =
    Boolean(entry.userSummary) &&
    !hubReleaseSummaryIsRedundant(entry.userSummary, headline ?? "", lines);

  return (
    <article
      className={`hub-release-timeline-card${showUpdateAvailableBadge ? " hub-release-timeline-card--update-available" : ""}`}
    >
      <div className="hub-release-timeline-card__head app-tab-header__chrome-text">
        <ReleaseTimelineKindBadge
          entry={entry}
          entryIndex={entryIndex}
          currentVersion={currentVersion}
          showUpdateAvailableBadge={showUpdateAvailableBadge}
        />
        <ReleaseVersionMeta version={entry.version} date={entry.date} at={entry.at} />
        {showUpdateAvailableBadge ? <HubReleaseUpdateAvailableBadge /> : null}
        {headline ? (
          <span className="hub-release-headline min-w-0 truncate font-semibold text-[var(--text)]">
            {headline}
          </span>
        ) : null}
      </div>
      <div className="app-tab-header__chrome-text mt-2 space-y-1.5">
        {showSummary ? <p className="leading-snug text-[var(--muted)]">{entry.userSummary}</p> : null}
        {lines.length ? (
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line} className="flex items-start gap-1.5 leading-snug text-[var(--muted)]">
                <span
                  className="mt-[5px] inline-block h-1 w-1 shrink-0 rounded-full bg-cyan-300/50"
                  aria-hidden
                />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export type HubVersionReleaseNotesProps = {
  /** Tool code — scopes the localStorage seen key (`hub:release-notes-seen:<code>`). */
  code: string;
  /** Current app version, with or without leading `v`. */
  version: string;
  /**
   * Hub tab version activity stamp (CHANGELOG Timestamp / builtAt).
   * Used for Latest stub + modal header age so it matches chrome `Xh ago`.
   */
  publishedAt?: string | null;
  className?: string;
  /**
   * Web/PWA: bundled assets behind the running tab — single header icon SSOT
   * (Download) instead of a second HubVersionUpdateStatusIcon.
   */
  bundleStale?: boolean;
  onBundleReload?: () => void;
  /**
   * Desktop electron-updater — same trigger as Latest/Update/Download.
   * Owns the icon only while checking / available / downloading / error.
   */
  desktopUpdate?: HubVersionDesktopUpdate | null;
};

/**
 * Update Release — ops-panel chrome SSOT (`HubOpsPanelChrome`) + V1 timeline.
 *
 * Same shell contract as Log · Notify: search in `headerCenter` via
 * `HubOpsPanelSearch` (no chip row anywhere), left rail = **type TOC first**
 * (`HubOpsTypeTocNav`: All · New · Update · Fixed with counts, click filters the
 * timeline) followed by the version scrollspy list, which stays because a
 * release feed is chronological and jumping to `v6.1.175` is the primary move.
 * Hub trigger = Latest/Update status icons (not scroll glyph). Cards keep the
 * praised 2-line format: kind badge → version + age → optional headline.
 * No "Mark all read" — opening the modal marks the whole feed seen.
 */
export function HubVersionReleaseNotes({
  code,
  version,
  publishedAt = null,
  className = "",
  bundleStale = false,
  onBundleReload,
  desktopUpdate = null,
}: HubVersionReleaseNotesProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HubReleaseNoteEntry[] | null>(hubReleaseNotesCache);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<HubActivityKindFilter>("all");
  const [unseen, setUnseen] = useState(() =>
    hasUnseenHubReleaseNotes(version, readHubReleaseNotesSeen(code)),
  );

  useHubDesktopUpdateToasts(desktopUpdate);

  const currentVersion = extractHubReleaseNotesSemver(version);

  useEffect(() => {
    if (!open) return;
    markHubReleaseNotesSeen(code, version);
    setUnseen(false);
  }, [open, code, version]);

  useEffect(() => {
    if (!open || entries !== null) return;
    let alive = true;
    void loadHubReleaseNotes().then((list) => {
      if (alive) setEntries(list);
    });
    return () => {
      alive = false;
    };
  }, [open, entries]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setKindFilter("all");
  }, [open]);

  const resolvedEntries = useMemo(() => {
    if (!entries) return null;
    const withCurrent = ensureHubReleaseNotesIncludeCurrent(entries, currentVersion, publishedAt);
    if (
      desktopUpdate &&
      (desktopUpdate.state === "available" ||
        desktopUpdate.state === "downloading" ||
        desktopUpdate.state === "downloaded" ||
        desktopUpdate.state === "installing")
    ) {
      return ensureHubReleaseNotesIncludePendingUpdate(
        withCurrent,
        currentVersion,
        desktopUpdate.availableVersion,
      );
    }
    return withCurrent;
  }, [entries, currentVersion, publishedAt, desktopUpdate]);

  /** Search-only pass — drives the type TOC counts (same rule as Log · Notify). */
  const searched = useMemo(() => {
    if (!resolvedEntries) return null;
    return resolvedEntries.filter((entry) => entryMatchesQuery(entry, query));
  }, [resolvedEntries, query]);

  const searchedKinds = useMemo(() => (searched ?? []).map((entry) => entry.kind), [searched]);

  const typeTocEntries = useHubOpsTypeToc({
    kinds: searchedKinds,
    order: RELEASE_TYPE_ORDER,
    /** Module-level fn — stable identity, so the TOC memo never churns. */
    chromeOf: releaseTypeTocChrome,
  });

  /** Rendered timeline = search ∩ type TOC selection. */
  const filtered = useMemo(() => {
    if (!searched) return null;
    if (kindFilter === "all") return searched;
    return searched.filter((entry) => entry.kind === kindFilter);
  }, [kindFilter, searched]);

  const { tocItems, sectionIds, body } = useMemo(() => {
    const toc: HubTocNavItem[] = [];
    const ids: string[] = [];
    const sections: ReactNode[] = [];
    const fallbackIcon = <RefreshCw size={14} className="text-indigo-300" aria-hidden />;

    if (filtered === null) {
      const id = "release-loading";
      ids.push(id);
      sections.push(
        <HubToolDetailSection key={id} id={id} title="Recent" icon={fallbackIcon} hideHeader>
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-[var(--muted)] app-tab-header__chrome-text">
            Loading…
          </div>
        </HubToolDetailSection>,
      );
      return { tocItems: toc, sectionIds: ids, body: sections };
    }

    if (filtered.length === 0) {
      const id = "release-empty";
      ids.push(id);
      sections.push(
        <HubToolDetailSection key={id} id={id} title="Recent" icon={fallbackIcon} hideHeader>
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-[var(--muted)] app-tab-header__chrome-text">
            {resolvedEntries?.length
              ? "No release notes match the current filters."
              : "No release notes yet."}
          </div>
        </HubToolDetailSection>,
      );
      return { tocItems: toc, sectionIds: ids, body: sections };
    }

    for (let index = 0; index < filtered.length; index++) {
      const entry = filtered[index]!;
      const id = releaseSectionId(entry.version, index);
      const isLatest = entry.version === currentVersion || (index === 0 && !currentVersion);
      const showUpdateBadge = hubDesktopUpdateHighlightsEntry(
        entry.version,
        index,
        currentVersion,
        desktopUpdate,
      );
      const label = `v${entry.version}`;
      toc.push({ id, label, icon: freshnessTocIcon(isLatest) });
      ids.push(id);
      sections.push(
        <HubToolDetailSection key={id} id={id} title={label} hideHeader>
          <div className="hub-release-timeline-item">
            <div className="hub-release-timeline-rail" aria-hidden>
              <span className="hub-release-timeline-dot" />
              {index < filtered.length - 1 ? <span className="hub-release-timeline-line" /> : null}
            </div>
            <ReleaseTimelineCard
              entry={entry}
              entryIndex={index}
              currentVersion={currentVersion}
              showUpdateAvailableBadge={showUpdateBadge}
            />
          </div>
        </HubToolDetailSection>,
      );
    }

    return { tocItems: toc, sectionIds: ids, body: sections };
  }, [currentVersion, desktopUpdate, filtered, resolvedEntries?.length]);

  const headerEntry = resolvedEntries?.[0];
  const desktopOwnsTrigger = Boolean(
    desktopUpdate && hubDesktopUpdateOwnsTrigger(desktopUpdate.state),
  );
  const desktopActionLabel = desktopUpdate
    ? hubDesktopUpdateActionLabel(desktopUpdate.state, desktopUpdate.progress)
    : null;
  const triggerTitle = bundleStale
    ? `Older bundle — reload for v${currentVersion || version}`
    : desktopUpdate
      ? desktopOwnsTrigger
        ? desktopUpdate.state === "downloaded"
          ? "Update ready — open release notes to install"
          : desktopUpdate.state === "available"
            ? "New version available — open release notes"
            : desktopUpdate.title || "Open release notes"
        : desktopUpdate.title ||
          (desktopUpdate.state === "idle"
            ? "Check for updates — open release notes"
            : "You are on the latest version — open release notes")
      : unseen
        ? "Update available — open release notes"
        : "You are on the latest version — open release notes";
  const TriggerIcon = bundleStale ? Download : unseen ? RefreshCw : CheckCircle2;
  const triggerIconClass = bundleStale
    ? "text-amber-300"
    : unseen
      ? "text-amber-300"
      : "text-emerald-400";
  const desktopActionIcon =
    desktopUpdate?.state === "error" ? RefreshCw : Download;

  return (
    <span className={`relative inline-flex shrink-0 items-center ${className}`.trim()}>
      <button
        type="button"
        aria-haspopup={bundleStale ? undefined : "dialog"}
        aria-expanded={bundleStale ? undefined : open}
        title={triggerTitle}
        aria-label={triggerTitle}
        onClick={() => {
          if (bundleStale) {
            if (onBundleReload) onBundleReload();
            else window.location.reload();
            return;
          }
          setOpen(true);
          if (desktopUpdate && hubDesktopUpdateShouldRecheckOnOpen(desktopUpdate.state)) {
            desktopUpdate.onAction();
          }
        }}
        className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-opacity hover:opacity-90"
      >
        {desktopUpdate ? (
          <HubVersionUpdateStatusIcon
            state={desktopUpdate.state}
            progress={desktopUpdate.progress}
            title={triggerTitle}
          />
        ) : (
          <TriggerIcon size={compactIconSize(13)} className={`shrink-0 ${triggerIconClass}`} aria-hidden />
        )}
      </button>

      <HubToolDetailModal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Update Release"
        headerTrailing={
          <div className="hub-release-header-version inline-flex min-w-0 items-center gap-2">
            <ReleaseVersionMeta
              version={currentVersion || headerEntry?.version || "—"}
              date={headerEntry?.date || ""}
              at={headerEntry?.at || publishedAt || undefined}
            />
            {desktopActionLabel && desktopUpdate ? (
              <HubReleaseUpdateActionButton
                state={desktopUpdate.state}
                label={desktopActionLabel}
                icon={desktopActionIcon}
                progress={desktopUpdate.progress}
                disabled={desktopUpdate.disabled}
                onClick={desktopUpdate.onAction}
              />
            ) : null}
          </div>
        }
        headerCenter={
          <HubOpsPanelSearch
            query={query}
            onQueryChange={setQuery}
            placeholder="Search releases…"
          />
        }
        shellClassName="hub-header-panel-modal hub-release-notes-modal"
        sectionIds={sectionIds}
        toc={
          <div className="hub-toc-nav">
            <HubOpsTypeTocNav
              entries={typeTocEntries}
              active={kindFilter}
              onSelect={setKindFilter}
              ariaLabel="Release types"
            />
            {tocItems.length ? (
              <div className="hub-release-version-toc mt-2 border-t border-white/5 pt-2">
                <div className="px-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Versions
                </div>
                <HubTocSectionNav
                  items={tocItems}
                  scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
                />
              </div>
            ) : null}
          </div>
        }
      >
        <div className={`${HUB_TOOL_DETAIL_SECTIONS_CLASS} hub-release-timeline`}>{body}</div>
      </HubToolDetailModal>
    </span>
  );
}
