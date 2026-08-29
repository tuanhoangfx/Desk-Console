import { patchHubListPrefs, subscribeHubListPrefs } from "./hub-url-prefs";
import { workspacePeriodDotColor } from "./workspace-period-dot-color";

/** Native-tooltip + docs SSOT — workspace period filters by record creation time. */
export const WORKSPACE_PERIOD_FILTER_HINT = "Filter by creation date";

/** Golden workspace period keys — same order as HubPeriodSelect. */
export type WorkspacePeriodKey =
  | "all"
  | "today"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "last90"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "customMonth"
  | "customRange";

export type WorkspacePeriodKnownScope =
  | "notes"
  | "todo"
  | "twofa"
  | "twofa.mail"
  | "twofa.services"
  | "twofa.facebook"
  | "twofa.tiktok"
  | "twofa.quota"
  | "twofa.browser"
  | "cookie"
  | "orders"
  | "customers"
  | "products"
  | "performance"
  | "users"
  | "hub"
  | "dashboard"
  | "index"
  | "posts"
  | "documents"
  | "bulletin"
  | "bots"
  | "groups"
  | "teams"
  | "places";

/** Catalog scopes + any new directory tab slug (URL keys derived from the slug). */
export type WorkspacePeriodScope = WorkspacePeriodKnownScope | (string & {});

export type WorkspacePeriodPrefs = {
  range: WorkspacePeriodKey;
  customMonth: string;
  customStartDate: string;
  customEndDate: string;
};

export const WORKSPACE_PERIOD_LABELS: Record<WorkspacePeriodKey, string> = {
  all: "All",
  today: "Today",
  thisWeek: "This Week",
  thisMonth: "This Month",
  thisYear: "This Year",
  last90: "Last 90 Days",
  lastWeek: "Last Week",
  lastMonth: "Last Month",
  lastYear: "Last Year",
  customMonth: "By Month",
  customRange: "Date Range",
};

/** Canonical dropdown order — All default first. */
export const WORKSPACE_PERIOD_ORDER: readonly WorkspacePeriodKey[] = [
  "all",
  "today",
  "thisWeek",
  "thisMonth",
  "thisYear",
  "last90",
  "lastWeek",
  "lastMonth",
  "lastYear",
  "customMonth",
  "customRange",
];

const VALID_KEYS = new Set<string>(Object.keys(WORKSPACE_PERIOD_LABELS));

export type WorkspacePeriodUrlKeys = { range: string; month: string; from: string; to: string };

/** Per-tab URL keys — each screen keeps its own period when switching tabs. */
const SCOPE_URL_KEYS: Record<WorkspacePeriodKnownScope, WorkspacePeriodUrlKeys> = {
  notes: { range: "nrange", month: "nperiodMonth", from: "nperiodFrom", to: "nperiodTo" },
  todo: { range: "trange", month: "tperiodMonth", from: "tperiodFrom", to: "tperiodTo" },
  twofa: { range: "frange", month: "fperiodMonth", from: "fperiodFrom", to: "fperiodTo" },
  "twofa.mail": { range: "fmailrange", month: "fmailperiodMonth", from: "fmailperiodFrom", to: "fmailperiodTo" },
  "twofa.services": { range: "fsvcrange", month: "fsvcperiodMonth", from: "fsvcperiodFrom", to: "fsvcperiodTo" },
  "twofa.facebook": { range: "ffbrange", month: "ffbperiodMonth", from: "ffbperiodFrom", to: "ffbperiodTo" },
  "twofa.tiktok": { range: "ftkrange", month: "ftkperiodMonth", from: "ftkperiodFrom", to: "ftkperiodTo" },
  "twofa.quota": { range: "fqrange", month: "fqperiodMonth", from: "fqperiodFrom", to: "fqperiodTo" },
  "twofa.browser": { range: "fbrwrange", month: "fbrwperiodMonth", from: "fbrwperiodFrom", to: "fbrwperiodTo" },
  cookie: { range: "crange", month: "cperiodMonth", from: "cperiodFrom", to: "cperiodTo" },
  orders: { range: "osrange", month: "osperiodMonth", from: "osperiodFrom", to: "osperiodTo" },
  customers: { range: "csrange", month: "csperiodMonth", from: "csperiodFrom", to: "csperiodTo" },
  products: { range: "prdrange", month: "prdperiodMonth", from: "prdperiodFrom", to: "prdperiodTo" },
  performance: { range: "perfrange", month: "perfperiodMonth", from: "perfperiodFrom", to: "perfperiodTo" },
  users: { range: "usrange", month: "usperiodMonth", from: "usperiodFrom", to: "usperiodTo" },
  hub: { range: "hbrange", month: "hbperiodMonth", from: "hbperiodFrom", to: "hbperiodTo" },
  dashboard: { range: "dbrange", month: "dbperiodMonth", from: "dbperiodFrom", to: "dbperiodTo" },
  index: { range: "ixrange", month: "ixperiodMonth", from: "ixperiodFrom", to: "ixperiodTo" },
  posts: { range: "psrange", month: "psperiodMonth", from: "psperiodFrom", to: "psperiodTo" },
  documents: { range: "docrange", month: "docperiodMonth", from: "docperiodFrom", to: "docperiodTo" },
  bulletin: { range: "blrange", month: "blperiodMonth", from: "blperiodFrom", to: "blperiodTo" },
  bots: { range: "botrange", month: "botperiodMonth", from: "botperiodFrom", to: "botperiodTo" },
  groups: { range: "grprange", month: "grpperiodMonth", from: "grpperiodFrom", to: "grpperiodTo" },
  teams: { range: "teamrange", month: "teamperiodMonth", from: "teamperiodFrom", to: "teamperiodTo" },
  places: { range: "plcrange", month: "plcperiodMonth", from: "plcperiodFrom", to: "plcperiodTo" },
};

const TWOFA_VAULT_PERIOD_SCOPES = new Set<string>([
  "twofa.mail",
  "twofa.services",
  "twofa.facebook",
  "twofa.tiktok",
  "twofa.quota",
  "twofa.browser",
]);

/** Legacy global URL keys (pre per-tab migration). */
const LEGACY_URL_KEYS = { range: "range", month: "periodMonth", from: "periodFrom", to: "periodTo" };

/** Legacy hub URL `range` values → workspace keys. */
const LEGACY_RANGE_MAP: Record<string, WorkspacePeriodKey> = {
  yesterday: "today",
  "7d": "thisWeek",
  "30d": "lastMonth",
  "90d": "lastMonth",
  "1y": "lastYear",
  last30Days: "lastMonth",
};

export function isWorkspacePeriodKey(raw: string | null | undefined): raw is WorkspacePeriodKey {
  return Boolean(raw && VALID_KEYS.has(raw));
}

/** Query key for this tab’s period (`ixrange`, `dbrange`, `trange`, …). */
export function workspacePeriodRangeParam(scope: WorkspacePeriodScope): string {
  return scopeUrlKeys(scope).range;
}

export function normalizeWorkspacePeriodKey(
  raw: string | null | undefined,
  defaultKey: WorkspacePeriodKey,
): WorkspacePeriodKey {
  if (!raw) return defaultKey;
  if (VALID_KEYS.has(raw)) return raw as WorkspacePeriodKey;
  return LEGACY_RANGE_MAP[raw] ?? defaultKey;
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0]!;
}

function defaultPrefs(defaultRange: WorkspacePeriodKey): WorkspacePeriodPrefs {
  const today = todayIsoDate();
  return {
    range: defaultRange,
    customMonth: new Date().toISOString().slice(0, 7),
    customStartDate: today,
    customEndDate: today,
  };
}

export function slugWorkspacePeriodUrlKeys(scope: string): WorkspacePeriodUrlKeys {
  const slug = scope.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "ws";
  return {
    range: `${slug}range`,
    month: `${slug}periodMonth`,
    from: `${slug}periodFrom`,
    to: `${slug}periodTo`,
  };
}

function isKnownPeriodScope(scope: string): scope is WorkspacePeriodKnownScope {
  return Object.prototype.hasOwnProperty.call(SCOPE_URL_KEYS, scope);
}

function scopeUrlKeys(scope: WorkspacePeriodScope): WorkspacePeriodUrlKeys {
  return isKnownPeriodScope(scope) ? SCOPE_URL_KEYS[scope] : slugWorkspacePeriodUrlKeys(scope);
}

function readRawRange(sp: URLSearchParams, scope: WorkspacePeriodScope, defaultKey: WorkspacePeriodKey) {
  const keys = scopeUrlKeys(scope);
  const scoped = sp.get(keys.range);
  if (scoped) return normalizeWorkspacePeriodKey(scoped, defaultKey);
  if (TWOFA_VAULT_PERIOD_SCOPES.has(scope)) {
    const legacyTwofa = sp.get(SCOPE_URL_KEYS.twofa.range);
    if (legacyTwofa) return normalizeWorkspacePeriodKey(legacyTwofa, defaultKey);
  }
  if (scope === "notes" || scope === "todo") {
    const legacy = sp.get(LEGACY_URL_KEYS.range);
    if (legacy) return normalizeWorkspacePeriodKey(legacy, defaultKey);
  }
  return defaultKey;
}

function readRawField(sp: URLSearchParams, scope: WorkspacePeriodScope, field: "month" | "from" | "to") {
  const keys = scopeUrlKeys(scope);
  const legacyKey = LEGACY_URL_KEYS[field];
  const scopedKey = field === "month" ? keys.month : field === "from" ? keys.from : keys.to;
  const scoped = sp.get(scopedKey);
  if (scoped) return scoped;
  if (TWOFA_VAULT_PERIOD_SCOPES.has(scope)) {
    const twofaKeys = SCOPE_URL_KEYS.twofa;
    const legacyTwofaKey = field === "month" ? twofaKeys.month : field === "from" ? twofaKeys.from : twofaKeys.to;
    const fromTwofa = sp.get(legacyTwofaKey);
    if (fromTwofa) return fromTwofa;
  }
  return scope === "notes" || scope === "todo" ? sp.get(legacyKey) : null;
}

export function readWorkspacePeriod(
  scope: WorkspacePeriodScope,
  defaultRange: WorkspacePeriodKey = "all",
): WorkspacePeriodPrefs {
  if (typeof window === "undefined") return defaultPrefs(defaultRange);
  const sp = new URLSearchParams(window.location.search);
  const today = todayIsoDate();
  return {
    range: readRawRange(sp, scope, defaultRange),
    customMonth: readRawField(sp, scope, "month") ?? new Date().toISOString().slice(0, 7),
    customStartDate: readRawField(sp, scope, "from") ?? today,
    customEndDate: readRawField(sp, scope, "to") ?? today,
  };
}

export function patchWorkspacePeriod(
  scope: WorkspacePeriodScope,
  patch: Partial<WorkspacePeriodPrefs>,
  defaultRange: WorkspacePeriodKey = "all",
) {
  const current = readWorkspacePeriod(scope, defaultRange);
  const next = { ...current, ...patch };
  const keys = scopeUrlKeys(scope);
  const urlPatch: Record<string, string | null> = {
    [keys.range]: next.range === defaultRange ? null : next.range,
    [keys.month]: next.range === "customMonth" ? next.customMonth : null,
    [keys.from]: next.range === "customRange" ? next.customStartDate : null,
    [keys.to]: next.range === "customRange" ? next.customEndDate : null,
  };
  if (scope === "notes" || scope === "todo") {
    urlPatch[LEGACY_URL_KEYS.range] = null;
    urlPatch[LEGACY_URL_KEYS.month] = null;
    urlPatch[LEGACY_URL_KEYS.from] = null;
    urlPatch[LEGACY_URL_KEYS.to] = null;
  }
  if (TWOFA_VAULT_PERIOD_SCOPES.has(scope)) {
    /** Prefer vault-scoped keys; clear shared Account legacy once a vault writes its own. */
    urlPatch[SCOPE_URL_KEYS.twofa.range] = null;
    urlPatch[SCOPE_URL_KEYS.twofa.month] = null;
    urlPatch[SCOPE_URL_KEYS.twofa.from] = null;
    urlPatch[SCOPE_URL_KEYS.twofa.to] = null;
  }
  patchHubListPrefs(urlPatch);
}

type HubPeriodOption = { value: WorkspacePeriodKey; label: string; dotColor: string };

export function workspacePeriodOptions(): HubPeriodOption[] {
  return WORKSPACE_PERIOD_ORDER.map((value) => ({
    value,
    label: WORKSPACE_PERIOD_LABELS[value],
    dotColor: workspacePeriodDotColor(value),
  }));
}

/** JS `Date#getDay()` Sunday=0 → days since Monday (Mon=0 … Sun=6). */
export function hubMondayWeekOffset(sundayDow: number): number {
  const dow = ((Math.trunc(sundayDow) % 7) + 7) % 7;
  return dow === 0 ? 6 : dow - 1;
}

/** Filter rows by creation ISO timestamp (SSOT: created_at / createdAt — not updated_at). */
export function matchesWorkspacePeriod(
  isoDate: string | undefined,
  period: WorkspacePeriodPrefs | WorkspacePeriodKey | null | undefined,
  now = new Date(),
): boolean {
  if (period == null) return true;
  const prefs = typeof period === "string" ? { ...defaultPrefs(period), range: period } : period;
  if (!prefs?.range) return true;

  if (prefs.range === "all") return true;
  if (!isoDate?.trim()) return false;

  const taskDate = new Date(isoDate);
  if (Number.isNaN(taskDate.getTime())) return false;

  let startDate: Date;
  let endDate: Date;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const mondayOffset = hubMondayWeekOffset(todayStart.getDay());

  switch (prefs.range) {
    case "today":
      startDate = todayStart;
      endDate = todayEnd;
      break;
    case "thisWeek": {
      startDate = new Date(todayStart);
      startDate.setDate(todayStart.getDate() - mondayOffset);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "lastWeek": {
      startDate = new Date(todayStart);
      startDate.setDate(todayStart.getDate() - mondayOffset - 7);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "thisMonth":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = todayEnd;
      break;
    case "thisYear":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = todayEnd;
      break;
    case "last90": {
      startDate = new Date(todayStart);
      startDate.setDate(todayStart.getDate() - 89);
      endDate = todayEnd;
      break;
    }
    case "lastMonth": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "lastYear": {
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "customMonth": {
      if (!prefs.customMonth) return true;
      const [year, month] = prefs.customMonth.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "customRange": {
      if (!prefs.customStartDate) return true;
      startDate = new Date(prefs.customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = prefs.customEndDate ? new Date(prefs.customEndDate) : new Date(prefs.customStartDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    default:
      return true;
  }

  return taskDate >= startDate && taskDate <= endDate;
}

export { subscribeHubListPrefs };
