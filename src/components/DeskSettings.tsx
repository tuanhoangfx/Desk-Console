import { useEffect, useState } from "react";
import { HubDisplayPrefs, patchHubListPrefs, readHubListPrefsCore, useHubToast } from "@tool-workspace/hub-ui";
import { deskApi } from "../lib/api";
import { readAppScreen } from "../lib/app-screen";
import { SCREEN_DISPLAY_PREFS } from "../lib/display-prefs-registry";
import {
  cleanLegacyDriveBackups,
  fetchNetworkSettings,
  probeNetworkConnection,
  purgeTrash,
  updateNetworkSettings,
} from "../lib/sync-api";
import { DeskHotkeysSettings } from "./DeskHotkeysSettings";

type Props = { sidebarRow?: boolean };

function DeskSystemToolsSettings() {
  const { pushToast } = useHubToast();
  const [proxyUrl, setProxyUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetchNetworkSettings()
      .then((res) => {
        if (res.ok && res.settings) setProxyUrl(res.settings.proxyUrl || "");
      })
      .catch(() => undefined);
  }, []);

  const runAction = async (key: string, title: string, fn: () => Promise<string>) => {
    setBusy(key);
    try {
      const msg = await fn();
      pushToast({ type: "success", title, message: msg });
    } catch (err) {
      pushToast({
        type: "error",
        title,
        message: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 text-xs leading-relaxed text-[var(--muted)]">
      <div className="space-y-1.5">
        <p className="font-medium text-[var(--text)]">Drive Sync Proxy (HTTP / SOCKS5)</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            placeholder="Direct (No proxy) — or http://host:port"
            className="hub-input min-w-0 flex-1 text-xs"
          />
          <button
            type="button"
            disabled={busy !== null}
            className="hub-btn shrink-0"
            onClick={() =>
              void runAction("save-proxy", "Proxy Saved", async () => {
                await updateNetworkSettings({ proxyUrl });
                return proxyUrl ? `Saved ${proxyUrl}` : "Direct connection active";
              })
            }
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy !== null}
            className="hub-btn shrink-0"
            onClick={() =>
              void runAction("probe-proxy", "Proxy Probe", async () => {
                const p = await probeNetworkConnection(proxyUrl);
                return p.ok ? `Reachable (${p.latencyMs ?? 0} ms)` : p.error || "Unreachable";
              })
            }
          >
            Test
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-medium text-[var(--text)]">PC Hygiene & Rclone Maintenance</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy !== null}
            className="hub-btn"
            onClick={() =>
              void runAction("deep-maint", "Deep Maintenance", async () => {
                await deskApi.pcOptimize("deep-maintenance");
                return "RAM trimmed, smoke pool & disk caches pruned";
              })
            }
          >
            Deep Maintenance
          </button>
          <button
            type="button"
            disabled={busy !== null}
            className="hub-btn"
            onClick={() =>
              void runAction("clean-backups", "Drive Backups", async () => {
                const r = await cleanLegacyDriveBackups({ dry: false });
                return r.ok ? "Cleaned legacy Drive backup folders" : "Clean failed";
              })
            }
          >
            Clean Drive Backups
          </button>
          <button
            type="button"
            disabled={busy !== null}
            className="hub-btn"
            onClick={() =>
              void runAction("purge-trash", "Local Sync Trash", async () => {
                await purgeTrash();
                return "Purged local .folder-sync-trash";
              })
            }
          >
            Purge Sync Trash
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeskSettings({ sidebarRow = false }: Props) {
  const [screen, setScreen] = useState(() => readAppScreen());

  useEffect(() => {
    const sync = () => setScreen(readAppScreen());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const cfg = SCREEN_DISPLAY_PREFS[screen];

  return (
    <HubDisplayPrefs
      title="Settings"
      scope="tab"
      sidebarRow={sidebarRow}
      showRange={false}
      showLimit={false}
      kpis={cfg?.kpis}
      charts={cfg?.charts}
      filters={cfg?.filters}
      headerStats={cfg?.headerStats}
      defaultKpiKeys={cfg ? new Set(cfg.defaultKpiKeys) : undefined}
      defaultChartKeys={cfg ? new Set(cfg.defaultChartKeys) : undefined}
      defaultFilterKeys={cfg?.defaultFilterKeys ? new Set(cfg.defaultFilterKeys) : undefined}
      defaultHeaderStatKeys={cfg?.defaultHeaderStatKeys ? new Set(cfg.defaultHeaderStatKeys) : undefined}
      showPageSize
      hideSearchPinOnSystem={screen === "dashboard"}
      readPrefs={readHubListPrefsCore}
      patchPrefs={patchHubListPrefs}
      getScreen={() => screen}
      toolSections={[
        {
          id: "desk-hotkeys",
          label: "Hotkeys & Startup",
          body: <DeskHotkeysSettings />,
        },
        {
          id: "desk-system-tools",
          label: "Network & Maintenance",
          body: <DeskSystemToolsSettings />,
        },
      ]}
    />
  );
}
