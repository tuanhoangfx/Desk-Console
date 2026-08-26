import { formatHubUnknownMessage } from "../toast/format-hub-unknown-message";

/** Hub Detail Save toast copy — after local apply, not cloud RTT. */
export type HubDetailSaveToastInput = {
  mode: "added" | "updated";
  entity: string;
  label?: string;
  count?: number;
  plural?: string;
};

export function hubDetailPlural(entity: string, plural?: string): string {
  const override = plural?.trim();
  if (override) return override;
  const e = entity.trim();
  if (!e) return "items";
  return `${e}s`;
}

export function hubDetailSaveToast(input: HubDetailSaveToastInput): string {
  if (input.count != null && input.count > 1) {
    return `Updated ${input.count} ${hubDetailPlural(input.entity, input.plural)}.`;
  }
  const label = (input.label ?? "").trim();
  if (input.mode === "added") {
    return label ? `Added ${input.entity}: ${label}` : `Added ${input.entity}.`;
  }
  return label ? `Updated ${label}` : `Updated ${input.entity}.`;
}

export const HUB_DETAIL_CLOUD_PENDING_PREFIX = "Saved locally; cloud sync pending —";

/** Optimistic row kept — warn, do not re-lock the Detail dialog. */
export function hubDetailCloudPendingToast(
  error?: unknown,
  opts?: { fallback?: string },
): string {
  const detail = formatHubUnknownMessage(error);
  if (!detail) {
    return opts?.fallback ?? `${HUB_DETAIL_CLOUD_PENDING_PREFIX} will retry automatically.`;
  }
  const max = 280;
  const clipped = detail.length > max ? `${detail.slice(0, max)}…` : detail;
  return `${HUB_DETAIL_CLOUD_PENDING_PREFIX} ${clipped}`;
}

/** Cloud write failed and UI reverted or was cloud-first — warn, do not re-lock Saving…. */
export function hubDetailCloudFailedToast(error?: unknown): string {
  const detail = formatHubUnknownMessage(error);
  if (!detail) return "Could not save to cloud. Try again.";
  const max = 280;
  const clipped = detail.length > max ? `${detail.slice(0, max)}…` : detail;
  return `Could not save to cloud — ${clipped}`;
}

export type HubDetailCloudAck = { ok: true } | { ok: false; error?: unknown };

/**
 * Edit Save — success toast is already shown after local apply.
 * Fire warn only if the background 1-row persist fails (dialog stays usable).
 */
export function scheduleHubDetailCloudSaveFeedback(input: {
  whenCloud?: Promise<HubDetailCloudAck>;
  pushToast: (message: string, tone: "warn") => void;
  formatError?: (error: unknown) => string;
}): void {
  if (!input.whenCloud) return;
  const format = input.formatError ?? hubDetailCloudPendingToast;
  void input.whenCloud
    .then((ack) => {
      if (ack.ok) return;
      input.pushToast(format(ack.error), "warn");
    })
    .catch((err) => {
      input.pushToast(format(err), "warn");
    });
}
