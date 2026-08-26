import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { HubDirectoryToolbarSelectionProps } from "../shell/HubDirectoryToolbarSelection";
import type { HubViewMode } from "../shell/ViewToggle";
import type { TabHeaderStatItem } from "../shell/AppTabHeader";
import { HubLoadingView } from "../shell/HubLoadingView";

export type WorkspaceDirectoryChromeHandlers = {
  setToolbar: (toolbar: ReactNode) => void;
  setFilterSelectionToolbar: (toolbar: HubDirectoryToolbarSelectionProps | undefined) => void;
  setDirectoryViewMode: (mode: HubViewMode | undefined) => void;
  setFilterToolbar: (toolbar: ReactNode) => void;
  setCenterStats: (stats: TabHeaderStatItem[]) => void;
  setHeaderStatusSlot?: (slot: ReactNode) => void;
};

export type WorkspaceDirectoryChromeSnapshot = {
  toolbar: ReactNode;
  filterToolbar: ReactNode;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  directoryViewMode?: HubViewMode;
  centerStats: TabHeaderStatItem[];
  /** Sparse Hub header status (vault sync chip) — idle null. */
  headerStatusSlot?: ReactNode;
  /** Stable fingerprint — bump when toolbar / filter slots change (avoids ReactNode dep loops). */
  syncKey: string;
  /** Row-count / stats fingerprint — bumps header stats + selection counts without remounting toolbar. */
  statsKey?: string;
  /** Sync/pending fingerprint — lifts statusSlot without remounting toolbar. */
  statusKey?: string;
};

/**
 * Lift FilterBar + header stats into workspace shell before paint (P0004 Hub parity).
 * Pair with `useDirectoryBandSync` for KPI/charts band.
 *
 * `syncKey` — view mode / structural chrome (exclude row counts + selection *count*).
 * `statsKey` — row counts, facet counts, **selection count** (when filterToolbar embeds Detail/bulk badges); also refreshes toolbar + bulk row when they embed counts.
 */
export function useWorkspaceDirectoryChrome(
  snapshot: WorkspaceDirectoryChromeSnapshot,
  handlers: WorkspaceDirectoryChromeHandlers,
  enabled = true,
) {
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  /**
   * When `enabled` is false: do **not** clear shell chrome.
   * Dual-mount vaults (e.g. P0020 Teams + Account body) share one WorkspaceSearchProvider;
   * the inactive sibling used to wipe toolbar / selection chip / bulk / header stats after
   * the active vault lifted them (layout-effect order). Only the active publisher writes;
   * unmount cleanup below still clears when the owner leaves the tree.
   */
  useLayoutEffect(() => {
    if (!enabled) return;
    const s = snapshotRef.current;
    handlers.setToolbar(s.toolbar);
    handlers.setDirectoryViewMode(s.directoryViewMode);
    handlers.setFilterToolbar(s.filterToolbar);
  }, [
    enabled,
    snapshot.syncKey,
    handlers.setDirectoryViewMode,
    handlers.setFilterToolbar,
    handlers.setToolbar,
  ]);

  const statsLiftKey = snapshot.statsKey ?? snapshot.syncKey;

  useLayoutEffect(() => {
    if (!enabled) return;
    const s = snapshotRef.current;
    handlers.setCenterStats(s.centerStats);
    handlers.setFilterSelectionToolbar(s.filterSelectionToolbar);
    handlers.setToolbar(s.toolbar);
    handlers.setFilterToolbar(s.filterToolbar);
  }, [
    enabled,
    statsLiftKey,
    handlers.setCenterStats,
    handlers.setFilterSelectionToolbar,
    handlers.setToolbar,
    handlers.setFilterToolbar,
  ]);

  const statusLiftKey = snapshot.statusKey ?? "";

  useLayoutEffect(() => {
    if (!handlers.setHeaderStatusSlot || !enabled) return;
    handlers.setHeaderStatusSlot(snapshotRef.current.headerStatusSlot ?? null);
  }, [enabled, statusLiftKey, handlers.setHeaderStatusSlot]);

  useLayoutEffect(
    () => () => {
      handlers.setToolbar(null);
      handlers.setFilterSelectionToolbar(undefined);
      handlers.setDirectoryViewMode(undefined);
      handlers.setFilterToolbar(null);
      handlers.setCenterStats([]);
      handlers.setHeaderStatusSlot?.(null);
    },
    [
      handlers.setCenterStats,
      handlers.setDirectoryViewMode,
      handlers.setFilterSelectionToolbar,
      handlers.setFilterToolbar,
      handlers.setToolbar,
      handlers.setHeaderStatusSlot,
    ],
  );
}

/** Row count at which directory tabs should wait for authoritative local store hydrate before paint. */
export const HUB_LARGE_DIRECTORY_BOOT_THRESHOLD = 2_000;

export function needsLargeDirectoryBoot(rowCount: number): boolean {
  return rowCount >= HUB_LARGE_DIRECTORY_BOOT_THRESHOLD;
}

export type DirectoryBootGateProps = {
  ready: boolean;
  /** Defaults to provider ariaLabel (`Loading {toolName}`). */
  ariaLabel?: string;
  /** @deprecated Prefer HubToolLoadingProvider — tool catalog icon is the SSOT. */
  icon?: LucideIcon;
  /** When false, hidden eager-mounted tabs must not portal over the active screen. */
  enabled?: boolean;
  portaled?: boolean;
  children: ReactNode;
};

/** Block directory body until local authoritative read completes (large vault / IDB-only mirror miss). */
export function DirectoryBootGate({
  ready,
  ariaLabel,
  icon,
  enabled = true,
  portaled = true,
  children,
}: DirectoryBootGateProps) {
  if (!enabled) return children;
  if (!ready) {
    return (
      <HubLoadingView
        icon={icon}
        ariaLabel={ariaLabel}
        variant="overlay"
        enabled
        portaled={portaled}
      />
    );
  }
  return children;
}
