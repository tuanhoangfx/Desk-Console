import { useEffect, useMemo, useState } from "react";
import { HubHeaderOpsPanels } from "@tool-workspace/hub-ui";
import { deskApi } from "../lib/api";
import { DESK_NOTIFY_CHANGE, buildDeskNotifyProps, type DeskHealth } from "../lib/desk-notify";
import { DeskSettings } from "./DeskSettings";

/** Golden header ops only — Notify · Log · Settings. Domain CTAs stay on FilterBar. */
export function TabHeaderActions() {
  const [health, setHealth] = useState<DeskHealth | null>(null);
  const [notifyTick, setNotifyTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const next = await deskApi.health();
        if (!cancelled) setHealth({ ok: Boolean(next.ok), cursorRunning: next.cursorRunning });
      } catch (error) {
        if (!cancelled) setHealth({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

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
