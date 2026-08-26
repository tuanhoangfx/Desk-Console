import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { HubAppLogEventDetail } from "../lib/hub-session-log-emit";
import type { HubLogEntityRef } from "../lib/hub-session-log-emit";
import { HUB_APP_LOG_EVENT, TOOL_HUB_LOG_EVENT } from "../lib/hub-session-log-emit";
import type { HubLogEntry } from "./HubUsageLogPanel";
import {
  readPersistedAppLogs,
  writePersistedAppLogs,
  sessionLogsNeedActivityHydrate,
  shouldCarryOverSessionLogs,
  mergeSessionLogsById,
  HUB_APP_LOG_REQUEST_HYDRATE_EVENT,
} from "./hub-app-log-persist";

/** Session lines visible on every tab (boot, cross-tab notices). */
export const HUB_APP_LOG_GLOBAL_SCREEN = "*";

export type HubAppLogBoot = {
  scope: string;
  message: string;
  /** Screen id — omit or `*` for all tabs (SSOT boot). */
  screen?: string;
};

export type { HubAppLogEventDetail };

type HubAppLogContextValue = {
  activeScreen: string;
  allLogs: HubLogEntry[];
  tabLogs: HubLogEntry[];
  pushLog: (
    scope: string,
    message: string,
    screen?: string,
    extras?: Pick<HubLogEntry, "kind" | "audit" | "fieldLabels" | "entityRef">,
  ) => void;
};

const HubAppLogContext = createContext<HubAppLogContextValue | null>(null);

export type HubAppLogProviderProps = {
  children: ReactNode;
  /** Resolved screen id — use `resolveHubActiveScreenId(screen, systemTab)`. */
  activeScreen: string;
  maxLogs?: number;
  bootLog?: HubAppLogBoot;
  /** Custom event; detail: `HubAppLogEventDetail`. Also listens to `tool-hub-log`. */
  logEventName?: string;
  /** sessionStorage key — Header Log survives F5 within the browser tab session. */
  persistKey?: string;
  /** Batch enrich — prefer over per-row map (directory mirror lookup once). */
  enrichEntries?: (logs: readonly HubLogEntry[]) => HubLogEntry[];
  /** Idle hydrate when persist is empty (mirror / recent activity — no network). */
  hydrateIfEmpty?: () => HubLogEntry[];
};

function createBootLogEntry(bootLog?: HubAppLogBoot): HubLogEntry {
  return {
    id: `boot-${Date.now()}`,
    at: Date.now(),
    scope: bootLog?.scope ?? "App",
    message: bootLog?.message ?? "Application started",
    screen: bootLog?.screen?.trim() || HUB_APP_LOG_GLOBAL_SCREEN,
    kind: "system",
  };
}

function initialAppLogs(persistKey: string | undefined, bootLog?: HubAppLogBoot): HubLogEntry[] {
  if (persistKey) {
    const stored = readPersistedAppLogs(persistKey);
    if (stored.length > 0) return stored;
  }
  return [createBootLogEntry(bootLog)];
}

function nextLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isHubAppLogVisibleOnTab(
  log: Pick<HubLogEntry, "screen">,
  activeScreen: string,
): boolean {
  const s = String(log.screen ?? "").trim();
  if (!s || s === HUB_APP_LOG_GLOBAL_SCREEN) return true;
  return s === activeScreen;
}

/** Per-tab session log — header shows active tab (+ global); footer shows all tabs. */
export function HubAppLogProvider({
  children,
  activeScreen,
  maxLogs = 30,
  bootLog,
  logEventName = HUB_APP_LOG_EVENT,
  persistKey,
  enrichEntries,
  hydrateIfEmpty,
}: HubAppLogProviderProps) {
  const [logs, setLogs] = useState<HubLogEntry[]>(() => initialAppLogs(persistKey, bootLog));
  const hydratedRef = useRef(false);
  const persistKeyRef = useRef(persistKey);

  /** Mount + key handoff: seed sessionStorage and keep anon lines when auth resolves. */
  useEffect(() => {
    if (!persistKey) return;
    const prevKey = persistKeyRef.current;
    persistKeyRef.current = persistKey;
    const changed = prevKey !== persistKey;
    if (changed) hydratedRef.current = false;
    setLogs((prev) => {
      const carry = !changed || shouldCarryOverSessionLogs(prevKey, persistKey) ? prev : [];
      const merged = mergeSessionLogsById([...carry, ...readPersistedAppLogs(persistKey)], maxLogs);
      const next = merged.length ? merged : initialAppLogs(persistKey, bootLog);
      writePersistedAppLogs(persistKey, next);
      return next;
    });
    // bootLog is a literal per render — key/limit changes are what must re-seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey, maxLogs]);

  const commitLogs = useCallback(
    (updater: (prev: HubLogEntry[]) => HubLogEntry[]) => {
      setLogs((prev) => {
        const next = updater(prev);
        if (persistKey) writePersistedAppLogs(persistKey, next);
        return next;
      });
    },
    [persistKey],
  );

  const pushLog = useCallback(
    (
      scope: string,
      message: string,
      screen?: string,
      extras?: Pick<HubLogEntry, "kind" | "audit" | "fieldLabels" | "entityRef">,
    ) => {
      const raw = String(screen ?? "").trim();
      const targetScreen =
        raw === HUB_APP_LOG_GLOBAL_SCREEN
          ? HUB_APP_LOG_GLOBAL_SCREEN
          : raw || activeScreen;
      commitLogs((prev) =>
        [
          {
            id: nextLogId(),
            at: Date.now(),
            scope,
            message,
            screen: targetScreen,
            ...(extras?.kind ? { kind: extras.kind } : {}),
            ...(extras?.audit?.changes?.length ? { audit: extras.audit } : {}),
            ...(extras?.fieldLabels ? { fieldLabels: extras.fieldLabels } : {}),
            ...(extras?.entityRef ? { entityRef: extras.entityRef } : {}),
          },
          ...prev,
        ].slice(0, maxLogs),
      );
    },
    [activeScreen, commitLogs, maxLogs],
  );

  useEffect(() => {
    const onLog = (event: Event) => {
      const detail = (event as CustomEvent<HubAppLogEventDetail>).detail;
      pushLog(detail?.scope ?? "App", detail?.message ?? "Updated", detail?.screen, {
        kind: detail?.kind,
        audit: detail?.audit ?? undefined,
        fieldLabels: detail?.fieldLabels,
        entityRef: detail?.entityRef,
      });
    };
    window.addEventListener(logEventName, onLog);
    window.addEventListener(TOOL_HUB_LOG_EVENT, onLog);
    return () => {
      window.removeEventListener(logEventName, onLog);
      window.removeEventListener(TOOL_HUB_LOG_EVENT, onLog);
    };
  }, [logEventName, pushLog]);

  useEffect(() => {
    if (!hydrateIfEmpty || !persistKey) return;

    const tryHydrate = (attempt = 0) => {
      const stored = readPersistedAppLogs(persistKey);
      if (!sessionLogsNeedActivityHydrate(stored)) {
        hydratedRef.current = true;
        return;
      }
      const entries = hydrateIfEmpty();
      if (!entries.length && attempt < 3) {
        window.setTimeout(() => tryHydrate(attempt + 1), attempt === 0 ? 1500 : 3000);
        return;
      }
      if (!entries.length) return;
      hydratedRef.current = true;
      commitLogs((prev) => {
        const bootOnly = prev.filter((row) => row.id.startsWith("boot-"));
        const merged = [...entries, ...bootOnly].slice(0, maxLogs);
        return merged;
      });
    };

    const onRequestHydrate = () => {
      if (!sessionLogsNeedActivityHydrate(readPersistedAppLogs(persistKey))) return;
      hydratedRef.current = false;
      tryHydrate(0);
    };

    window.addEventListener(HUB_APP_LOG_REQUEST_HYDRATE_EVENT, onRequestHydrate);

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(() => tryHydrate(0), { timeout: 4000 })
        : window.setTimeout(() => tryHydrate(0), 2000);

    return () => {
      window.removeEventListener(HUB_APP_LOG_REQUEST_HYDRATE_EVENT, onRequestHydrate);
      if (typeof cancelIdleCallback !== "undefined" && typeof idle === "number") {
        cancelIdleCallback(idle);
      } else {
        window.clearTimeout(idle as number);
      }
    };
  }, [commitLogs, hydrateIfEmpty, maxLogs, persistKey]);

  const enrichedAllLogs = useMemo(
    () => (enrichEntries ? enrichEntries(logs) : logs),
    [enrichEntries, logs],
  );

  const tabLogs = useMemo(
    () => enrichedAllLogs.filter((log) => isHubAppLogVisibleOnTab(log, activeScreen)),
    [activeScreen, enrichedAllLogs],
  );

  const value = useMemo(
    () => ({
      activeScreen,
      allLogs: enrichedAllLogs,
      tabLogs,
      pushLog,
    }),
    [activeScreen, enrichedAllLogs, pushLog, tabLogs],
  );

  return <HubAppLogContext.Provider value={value}>{children}</HubAppLogContext.Provider>;
}

export function useHubAppLog() {
  const ctx = useContext(HubAppLogContext);
  if (!ctx) {
    return {
      activeScreen: "default",
      allLogs: [] as HubLogEntry[],
      tabLogs: [] as HubLogEntry[],
      pushLog: (
        _scope: string,
        _message: string,
        _screen?: string,
        _extras?: Pick<HubLogEntry, "kind" | "audit" | "fieldLabels" | "entityRef">,
      ) => {},
    };
  }
  return ctx;
}
