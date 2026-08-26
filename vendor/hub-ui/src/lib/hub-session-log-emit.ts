import type { HubEntityLogEntry } from "./hub-entity-log";

/** Label + optional emoji sticker for one entity log field (Header Log mini rail). */
export type HubAppLogFieldLabel = {
  label: string;
  emoji?: string;
};

export type HubAppLogFieldLabels = Record<string, HubAppLogFieldLabel>;

export type HubLogEntityChip = {
  label: string;
  value: string;
};

/** Link session log line → directory/detail modal (tool resolves `entityId`). */
export type HubLogEntityRef = {
  screen: string;
  entityId: string;
  chips?: HubLogEntityChip[];
};

export type HubAppLogEmitDetail = {
  scope: string;
  message: string;
  /** Resolved tab/screen id — omit for active screen; `"*"` for global. */
  screen?: string;
  /** Powers type-first TOC (`create` / `update` / `delete` / `sync` / custom). */
  kind?: string;
  /** Structured audit — preferred over parsing `message` for field deltas. */
  audit?: HubEntityLogEntry | null;
  /** Field labels for `HubChangeLogList` when `audit.changes` is present. */
  fieldLabels?: HubAppLogFieldLabels;
  /** Entity link — Order ID / Product ID chips + open detail. */
  entityRef?: HubLogEntityRef;
  /** Custom event name — default `hub-app-log`; P0020 uses `tool-hub-log`. */
  eventName?: "hub-app-log" | "tool-hub-log";
};

/** Event detail shape consumed by `HubAppLogProvider`. */
export type HubAppLogEventDetail = HubAppLogEmitDetail;

export const HUB_APP_LOG_EVENT = "hub-app-log";
export const TOOL_HUB_LOG_EVENT = "tool-hub-log";

/** Build `fieldLabels` from plain label/emoji maps (entity SSOT helpers). */
export function hubLogFieldLabels(
  labels: Record<string, string>,
  emojis?: Record<string, string | undefined>,
): HubAppLogFieldLabels {
  const out: HubAppLogFieldLabels = {};
  for (const [field, label] of Object.entries(labels)) {
    const emoji = emojis?.[field]?.trim();
    out[field] = emoji ? { label, emoji } : { label };
  }
  return out;
}

/** True when the session line carries structured or textual field deltas. */
export function hubSessionLogHasDelta(
  message: string,
  audit?: HubEntityLogEntry | null,
): boolean {
  if (audit?.changes?.length) return true;
  return String(message).includes("→");
}

/**
 * SSOT emit for header/session Log — dispatches a CustomEvent consumed by
 * `HubAppLogProvider`. Entity saves should pass `audit` (+ `fieldLabels`) so
 * Header Log renders the same deltas as Detail Log (`HubChangeLogList`).
 */
export function emitHubAppLog(detail: HubAppLogEmitDetail): void {
  if (typeof window === "undefined") return;
  const eventName =
    detail.eventName === TOOL_HUB_LOG_EVENT ? TOOL_HUB_LOG_EVENT : HUB_APP_LOG_EVENT;
  try {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          scope: detail.scope,
          message: detail.message,
          ...(detail.screen ? { screen: detail.screen } : {}),
          ...(detail.kind ? { kind: detail.kind } : {}),
          ...(detail.audit?.changes?.length ? { audit: detail.audit } : {}),
          ...(detail.fieldLabels ? { fieldLabels: detail.fieldLabels } : {}),
          ...(detail.entityRef ? { entityRef: detail.entityRef } : {}),
        },
      }),
    );
  } catch {
    /* Session log is best-effort — never break a mutation on dispatch failure. */
  }
}
