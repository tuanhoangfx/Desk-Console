import type { DesktopAuthBootTelemetry } from "@tool-workspace/hub-identity";
import {
  buildHubDesktopAuthNotifyAlert,
  type HubNotifyAlert,
  type HubNotifyPanelProps,
} from "@tool-workspace/hub-ui";

export const DESK_NOTIFY_CHANGE = "p0001-desk-notify-change";
const SCOPE_KEY = "p0001-desk-console-notify";

let actionAlerts: HubNotifyAlert[] = [];

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DESK_NOTIFY_CHANGE));
}

export function readDeskActionAlerts(): HubNotifyAlert[] {
  return actionAlerts.slice();
}

export function pushDeskNotifyAlert(alert: HubNotifyAlert) {
  actionAlerts = [alert, ...actionAlerts.filter((row) => row.id !== alert.id)].slice(0, 40);
  emitChange();
}

export function clearDeskNotifyAlert(id: string) {
  actionAlerts = actionAlerts.filter((row) => row.id !== id);
  emitChange();
}

export type DeskHealth = {
  ok: boolean;
  cursorRunning?: boolean;
  authTelemetry?: DesktopAuthBootTelemetry | null;
  error?: string;
};

export function buildDeskNotifyProps(health: DeskHealth | null): HubNotifyPanelProps {
  const alerts: HubNotifyAlert[] = readDeskActionAlerts();

  if (health && health.ok === false) {
    alerts.unshift({
      id: "host-down",
      severity: "bad",
      label: "Host API down",
      detail: health.error?.trim() || "Desk host http://127.0.0.1:6010 is unreachable.",
      meta: { kind: "critical" },
    });
  }

  const authAlert = buildHubDesktopAuthNotifyAlert(health?.authTelemetry, "P0001");
  if (authAlert) alerts.push(authAlert);

  if (health?.cursorRunning) {
    alerts.push({
      id: "cursor-running",
      severity: "ok",
      label: "Cursor is running",
      detail: "Cursor GC needs File → Exit, or Confirm close from Tasks.",
      meta: { kind: "update" },
    });
  }

  return {
    scopeKey: SCOPE_KEY,
    title: "Notify",
    subtitle: "Desk host and clipboard alerts",
    emptyMessage: "No alerts.",
    trackUnread: true,
    alerts,
  };
}
