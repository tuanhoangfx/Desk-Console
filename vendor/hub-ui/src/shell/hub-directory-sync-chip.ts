import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { colHint } from "../lib/directory-column-hint-helpers";
import type { MetaTone } from "./CopyMetaChip";

export type HubDirectorySyncLivePath = "push" | "poll" | "reconnect";

export type HubDirectoryRealtimeStatus = "idle" | "subscribing" | "subscribed" | "error";

export type HubDirectorySyncChipView =
  | { kind: "hidden" }
  | { kind: "live"; label: "Live"; tone: MetaTone; path?: HubDirectorySyncLivePath }
  | { kind: "syncing"; label: "Syncing…"; tone: MetaTone; reason?: string }
  | { kind: "live-poll"; label: string; tone: MetaTone; detail?: string }
  | { kind: "live-reconnecting"; label: string; tone: MetaTone; detail?: string }
  | { kind: "pending"; label: string; tone: MetaTone; count: number }
  | { kind: "pending-stuck"; label: string; tone: MetaTone; count: number }
  | { kind: "error"; label: "Sync error"; tone: MetaTone; detail?: string };

export function resolveHubDirectorySyncLivePath(
  realtimeStatus: HubDirectoryRealtimeStatus,
): HubDirectorySyncLivePath {
  if (realtimeStatus === "subscribing") return "reconnect";
  if (realtimeStatus === "error") return "poll";
  return "push";
}

/**
 * Tools without a vault pending queue (P0005 CRM). P0020 keeps its own resolver.
 * `fetching` = user-visible wait only. **Forbidden:** silent watermark / delta revalidate
 * (P0005 `fetch*({ silent: true })`) — keep Live; do not flash Syncing….
 */
export function resolveHubDirectoryRealtimeSyncChipView(input: {
  configured: boolean;
  realtimeStatus: HubDirectoryRealtimeStatus;
  fetching?: boolean;
  fetchError?: string | null;
  syncingReason?: string;
}): HubDirectorySyncChipView {
  if (!input.configured) return { kind: "hidden" };
  if (input.fetching) {
    return {
      kind: "syncing",
      label: "Syncing…",
      tone: "indigo",
      reason: input.syncingReason ?? "directory-mirror",
    };
  }
  const error = input.fetchError?.trim();
  if (error) {
    return { kind: "error", label: "Sync error", tone: "rose", detail: error };
  }
  return {
    kind: "live",
    label: "Live",
    tone: "emerald",
    path: resolveHubDirectorySyncLivePath(input.realtimeStatus),
  };
}

export function hubDirectorySyncChipHintContent(
  view: Exclude<HubDirectorySyncChipView, { kind: "hidden" }>,
): HubDirectoryColumnHintContent {
  if (view.kind === "live") {
    const path = view.path ?? "push";
    if (path === "poll") {
      return colHint(
        "Live",
        "Directory still updates via automatic poll. Realtime push is down and will reconnect on its own. Debug: data-hub-directory-sync-path=poll.",
      );
    }
    if (path === "reconnect") {
      return colHint(
        "Live",
        "Directory is live. Realtime socket is reconnecting automatically; poll covers the gap. Debug: data-hub-directory-sync-path=reconnect.",
      );
    }
    return colHint(
      "Live",
      "Directory load is complete and Realtime push is subscribed. Debug: data-hub-directory-sync-path=push.",
    );
  }
  if (view.kind === "syncing") {
    const reason = view.reason ?? "directory-mirror";
    return colHint(
      "Syncing…",
      `Directory is catching up with cloud. Debug: data-hub-directory-sync-reason=${reason}.`,
    );
  }
  if (view.kind === "pending" || view.kind === "pending-stuck") {
    return colHint(
      view.label,
      `${view.count} local change${view.count === 1 ? "" : "s"} waiting for cloud acknowledgment.`,
    );
  }
  if (view.kind === "live-poll") {
    return colHint(
      view.label,
      view.detail?.trim() || "Realtime push is down — directory still updates via automatic poll.",
    );
  }
  if (view.kind === "live-reconnecting") {
    return colHint(
      view.label,
      view.detail?.trim() || "Opening the Realtime channel — directory still updates via poll.",
    );
  }
  return colHint(
    view.label,
    view.detail?.trim() || "Directory cloud sync failed — check sign-in and service status.",
  );
}

export function hubDirectorySyncChipStatusKey(view: HubDirectorySyncChipView): string {
  if (view.kind === "hidden") return "hidden";
  if (view.kind === "syncing") return `syncing:${view.reason ?? "directory-mirror"}`;
  if (view.kind === "pending" || view.kind === "pending-stuck") return `${view.kind}:${view.count}`;
  if (view.kind === "live") return `live:${view.path ?? "push"}`;
  if (view.kind === "error") return `error:${view.detail ?? ""}`;
  return view.kind;
}
