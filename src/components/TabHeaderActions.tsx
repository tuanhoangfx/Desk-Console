import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HubHeaderOpsPanels } from "@tool-workspace/hub-ui";
import { deskApi } from "../lib/api";
import { DESK_NOTIFY_CHANGE, buildDeskNotifyProps, type DeskHealth } from "../lib/desk-notify";
import { DeskSettings } from "./DeskSettings";

let sharedHealth: DeskHealth | null = null;
const healthListeners = new Set<() => void>();
let healthTimer: number | null = null;
let healthPullInflight = false;

async function pullSharedDeskHealth() {
  if (healthPullInflight) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  healthPullInflight = true;
  try {
    const next = await deskApi.health();
    sharedHealth = {
      ok: Boolean(next.ok),
      cursorRunning: next.cursorRunning,
      authTelemetry: next.authTelemetry ?? null,
    };
  } catch (error) {
    sharedHealth = { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    healthPullInflight = false;
    healthListeners.forEach((fn) => fn());
  }
}

function subscribeSharedDeskHealth(onChange: () => void) {
  healthListeners.add(onChange);
  if (healthListeners.size === 1 && typeof window !== "undefined") {
    void pullSharedDeskHealth();
    healthTimer = window.setInterval(() => void pullSharedDeskHealth(), 20_000);
  }
  return () => {
    healthListeners.delete(onChange);
    if (healthListeners.size === 0 && healthTimer !== null) {
      window.clearInterval(healthTimer);
      healthTimer = null;
    }
  };
}

function getSharedDeskHealthSnapshot() {
  return sharedHealth;
}

/** Golden header ops only — Notify · Log · Settings. Domain CTAs stay on FilterBar. */
export function TabHeaderActions() {
  const health = useSyncExternalStore(
    subscribeSharedDeskHealth,
    getSharedDeskHealthSnapshot,
    getSharedDeskHealthSnapshot,
  );
  const [notifyTick, setNotifyTick] = useState(0);

  useEffect(() => {
    const sync = () => setNotifyTick((n) => n + 1);
    window.addEventListener(DESK_NOTIFY_CHANGE, sync);
    return () => window.removeEventListener(DESK_NOTIFY_CHANGE, sync);
  }, []);

  const notify = useMemo(() => {
    void notifyTick;
    return buildDeskNotifyProps(health);
  }, [health, notifyTick]);

  return <HubHeaderOpsPanels notify={notify} log={{ variant: "tab" }} trailing={<DeskSettings />} />;
}
