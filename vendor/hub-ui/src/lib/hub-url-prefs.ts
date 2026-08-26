import { migrateChartKeysWithPersist } from "../display-prefs/chart-key-migrate";
import { LIMIT_OPTIONS, TIME_RANGES, type TimeRange } from "../display-prefs/constants";
import { HUB_TABLE_PAGE_SIZE_DEFAULT, readHubTablePageSize } from "../table/hub-table-page-size";

export {
  HUB_TABLE_PAGE_SIZE_DEFAULT,
  readHubTablePageSize,
  TABLE_PAGE_SIZE_OPTIONS,
  useHubTablePageSize,
} from "../table/hub-table-page-size";

export type { TimeRange };
export { TIME_RANGES, LIMIT_OPTIONS };

/** P0004 golden defaults when URL omits `range` / `limit`. Prefer All (workspace-period parity). */
export const HUB_URL_DEFAULT_RANGE: TimeRange = "all";
export const HUB_URL_DEFAULT_LIMIT = 100;

export type HubListPrefsCore = {
  range: TimeRange;
  limit: number;
  tablePageSize: number;
  kpi: Set<string> | null;
  charts: Set<string> | null;
  hubFilters: Set<string> | null;
  headerStats: Set<string> | null;
  systemHeaderStats: Set<string> | null;
  headerPin: boolean;
  searchPin: boolean;
};

export type HubUrlPrefsConfig = {
  defaultRange?: TimeRange;
  defaultLimit?: number;
  /** `""` in URL means explicitly none visible (P0004/P0020). Default true. */
  parseSetEmptyMeansNone?: boolean;
  /** P0016 deletes keys when patch value is `""`. */
  deletePatchEmptyString?: boolean;
  /** Use `hub-list-prefs-change` instead of synthetic `popstate` (P0020). */
  usePrefsChangeEvent?: boolean;
  /** App-specific URL rewrite (P0004 buildAppUrl + screen sanitize). */
  patchImpl?: (patch: Record<string, string | null>) => void;
  /** Extra chart URL keys to migrate (e.g. P0016 `icharts`). */
  extraChartKeys?: string[];
};

let config: HubUrlPrefsConfig = {
  defaultRange: HUB_URL_DEFAULT_RANGE,
  defaultLimit: HUB_URL_DEFAULT_LIMIT,
  parseSetEmptyMeansNone: true,
  deletePatchEmptyString: false,
  usePrefsChangeEvent: false,
  extraChartKeys: [],
};

export function configureHubUrlPrefs(patch: Partial<HubUrlPrefsConfig>) {
  config = { ...config, ...patch };
}

export function getHubUrlPrefsDefaults() {
  return {
    defaultRange: config.defaultRange ?? HUB_URL_DEFAULT_RANGE,
    defaultLimit: config.defaultLimit ?? HUB_URL_DEFAULT_LIMIT,
  };
}

/** `null` = defaults; `""` = explicitly none visible (when enabled). */
export function parseHubPrefSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  if (config.parseSetEmptyMeansNone !== false && raw === "") return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

function parseCharts(sp: URLSearchParams, key: string): Set<string> | null {
  return migrateChartKeysWithPersist(sp.get(key), (value) => patchHubListPrefs({ [key]: value }));
}

export function readHubListPrefsCore(): HubListPrefsCore {
  const { defaultRange, defaultLimit } = getHubUrlPrefsDefaults();
  if (typeof window === "undefined") {
    return {
      range: defaultRange,
      limit: defaultLimit,
      tablePageSize: HUB_TABLE_PAGE_SIZE_DEFAULT,
      kpi: null,
      charts: null,
      hubFilters: null,
      headerStats: null,
      systemHeaderStats: null,
      headerPin: true,
      searchPin: true,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  const range = (sp.get("range") ?? defaultRange) as TimeRange;
  const limitNum = Number(sp.get("limit"));
  const limit = (LIMIT_OPTIONS as readonly number[]).includes(limitNum) ? limitNum : defaultLimit;
  const hpin = sp.get("hpin");
  const spin = sp.get("spin");
  return {
    range: TIME_RANGES.some((r) => r.value === range) ? range : defaultRange,
    limit,
    tablePageSize: readHubTablePageSize(),
    kpi: parseHubPrefSet(sp.get("kpi")),
    charts: parseCharts(sp, "charts"),
    hubFilters: parseHubPrefSet(sp.get("hfilt")),
    headerStats: parseHubPrefSet(sp.get("hstat")),
    systemHeaderStats: parseHubPrefSet(sp.get("sstat")),
    headerPin: hpin !== "0",
    searchPin: spin !== "0",
  };
}

/** Fired after URL prefs change — prefer over synthetic `popstate` (P0020). */
export const HUB_LIST_PREFS_CHANGE_EVENT = "hub-list-prefs-change";

export function subscribeHubListPrefs(onSync: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onSync();
  window.addEventListener(HUB_LIST_PREFS_CHANGE_EVENT, handler);
  window.addEventListener("popstate", handler);
  return () => {
    window.removeEventListener(HUB_LIST_PREFS_CHANGE_EVENT, handler);
    window.removeEventListener("popstate", handler);
  };
}

function defaultPatchHubListPrefs(patch: Record<string, string | null>) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) sp.delete(k);
    else if (config.deletePatchEmptyString && v === "") sp.delete(k);
    else sp.set(k, v);
  }
  const q = sp.toString();
  const pathname = window.location.pathname || "/";
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  window.history.replaceState(null, "", `${path}${q ? `?${q}` : ""}${window.location.hash}`);
  if (config.usePrefsChangeEvent) {
    window.dispatchEvent(new CustomEvent(HUB_LIST_PREFS_CHANGE_EVENT));
  } else {
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function patchHubListPrefs(patch: Record<string, string | null>) {
  if (typeof window === "undefined") return;
  if (config.patchImpl) {
    config.patchImpl(patch);
    return;
  }
  defaultPatchHubListPrefs(patch);
}

/** Parse an extra chart key with migration (P0016 inbox `icharts`). */
export function parseHubChartPrefSet(sp: URLSearchParams, key: string): Set<string> | null {
  return parseCharts(sp, key);
}
