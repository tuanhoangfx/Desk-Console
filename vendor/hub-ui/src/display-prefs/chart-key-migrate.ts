/** Legacy donut chart pref keys → horizontal bar keys (workspace-wide). */
export const CHART_KEY_MIGRATION: Record<string, string> = {
  deploy_donut: "deploy_bar",
  status_donut: "status_bar",
  usage_donut: "usage_bar",
  password_donut: "password_bar",
  access_donut: "access_bar",
  share_donut: "share_bar",
  source_donut: "access_bar",
  active_donut: "active_bar",
  allowlist_donut: "allowlist_bar",
  connect_donut: "connect_bar",
  unread_donut: "unread_bar",
  groups_donut: "groups_bar",
  type_bar: "platform_bar",
  vault_donut: "cookies_bar",
};

export function migrateChartKeySet(
  set: Set<string> | null,
  migration: Record<string, string> = CHART_KEY_MIGRATION,
): Set<string> | null {
  if (set === null) return null;
  const next = new Set<string>();
  for (const key of set) {
    next.add(migration[key] ?? key);
  }
  return next;
}

export function serializeChartKeySet(set: Set<string> | null): string | null {
  if (set === null) return null;
  if (set.size === 0) return "";
  return [...set].join(",");
}

/** Migrate stored chart keys; persist to URL/storage when legacy keys were present. */
export function migrateChartKeysWithPersist(
  raw: string | null,
  persist: (value: string | null) => void,
  migration: Record<string, string> = CHART_KEY_MIGRATION,
): Set<string> | null {
  if (raw === null) return null;
  const parsed = raw === "" ? new Set<string>() : new Set(raw.split(",").filter(Boolean));
  let changed = false;
  const next = new Set<string>();
  for (const key of parsed) {
    const mapped = migration[key];
    if (mapped) {
      next.add(mapped);
      if (mapped !== key) changed = true;
    } else {
      next.add(key);
    }
  }
  if (changed) {
    persist(serializeChartKeySet(next));
  }
  return next;
}

/** Migrate chart key arrays in session/local storage maps. */
export function migrateChartKeyList(
  keys: string[] | null,
  migration: Record<string, string> = CHART_KEY_MIGRATION,
): { next: string[] | null; changed: boolean } {
  if (keys === null) return { next: null, changed: false };
  let changed = false;
  const next = keys.map((key) => {
    const mapped = migration[key];
    if (mapped && mapped !== key) {
      changed = true;
      return mapped;
    }
    return key;
  });
  return { next, changed };
}
