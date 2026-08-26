/**
 * Map DB `notifications` rows type=trash_purged → HubNotifyAlert (cron hard purge).
 * Pure mapper + hook — no Supabase client. Products inject `loadRows`.
 */
import { useEffect, useState } from "react";
import type { HubNotifyAlert } from "./HubNotifyPanel";

export const HUB_TRASH_PURGE_NOTIFY_TYPE = "trash_purged";
export const HUB_TRASH_PURGE_NOTIFY_SELECT = "id,type,data,is_read,created_at";
export const HUB_TRASH_PURGE_NOTIFY_LIMIT = 30;

export type HubTrashPurgeNotifyRow = {
  id: string | number;
  type?: string;
  is_read?: boolean;
  created_at?: string | null;
  data?: {
    tab_label?: string;
    plane?: string;
    purged_count?: number;
    retention_days?: number;
    audience?: string;
  } | null;
};

export function isHubTrashPurgeNotifyType(type: string | null | undefined): boolean {
  return String(type ?? "").trim().toLowerCase() === HUB_TRASH_PURGE_NOTIFY_TYPE;
}

export function formatHubTrashPurgeNotifyLabel(row: HubTrashPurgeNotifyRow): string {
  const data = row.data ?? {};
  const tab = String(data.tab_label ?? data.plane ?? "Trash").trim() || "Trash";
  const n = Number(data.purged_count) || 0;
  const days = Number(data.retention_days) || 30;
  const audience = String(data.audience ?? "").toLowerCase();
  const who = audience === "admin" ? " (admin)" : "";
  return `${tab} trash purged${who}: ${n} row${n === 1 ? "" : "s"} after ${days} days`;
}

export function hubTrashPurgeNotificationToAlert(row: HubTrashPurgeNotifyRow): HubNotifyAlert {
  const data = row.data ?? {};
  return {
    id: String(row.id),
    severity: "warn",
    label: formatHubTrashPurgeNotifyLabel(row),
    detail: "Automatic hard delete from Trash (database cron). This cannot be undone.",
    meta: {
      kind: "delete",
      notificationType: HUB_TRASH_PURGE_NOTIFY_TYPE,
      isRead: Boolean(row.is_read),
      plane: data.plane ?? null,
      purgedCount: data.purged_count ?? 0,
      audience: data.audience ?? null,
      createdAt: row.created_at ?? null,
    },
  };
}

export function mapHubTrashPurgeNotifyRows(rows: unknown): HubNotifyAlert[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is HubTrashPurgeNotifyRow => Boolean(row) && typeof row === "object")
    .map((row) => hubTrashPurgeNotificationToAlert(row));
}

export function useHubTrashPurgeNotifyAlerts(input: {
  userId: string | null | undefined;
  enabled?: boolean;
  loadRows: (userId: string) => Promise<unknown>;
}): HubNotifyAlert[] {
  const { userId, enabled = true, loadRows } = input;
  const [alerts, setAlerts] = useState<HubNotifyAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    const uid = userId?.trim();
    if (!uid || !enabled) {
      setAlerts([]);
      return;
    }
    void loadRows(uid)
      .then((rows) => {
        if (!cancelled) setAlerts(mapHubTrashPurgeNotifyRows(rows));
      })
      .catch((err: unknown) => {
        console.warn("[hub-notify] trash_purged", err instanceof Error ? err.message : err);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, loadRows, userId]);

  return alerts;
}
