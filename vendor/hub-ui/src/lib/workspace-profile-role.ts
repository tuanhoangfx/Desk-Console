import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { hubAuthEmailsForSignIn } from "@tool-workspace/hub-identity";
import { normalizeWorkspaceRoleKey, type HubWorkspaceRoleKey } from "../auth/hub-workspace-role-icon";

type RoleListener = (role: HubWorkspaceRoleKey) => void;

type ProfileRoleChannelEntry = {
  channel: RealtimeChannel | null;
  listeners: Set<RoleListener>;
};

/** One subscribed channel per client+user — avoids ".on() after subscribe()" on React remount. */
const profileRoleChannels = new WeakMap<SupabaseClient, Map<string, ProfileRoleChannelEntry>>();

function profileRoleChannelTopic(channelName: string): string {
  return `realtime:${channelName}`;
}

function removeStaleProfileRoleChannels(client: SupabaseClient, channelName: string): void {
  const topic = profileRoleChannelTopic(channelName);
  for (const ch of client.getChannels()) {
    if (ch.topic === topic) void client.removeChannel(ch);
  }
}

const ROLE_CACHE_KEY = "hub:workspace-profile-role";

/** Fired when `cacheWorkspaceProfileRole` / directory warm updates session cache (P0020 dual-auth). */
export const WORKSPACE_PROFILE_ROLE_UPDATED = "hub:workspace-profile-role-updated";

export type WorkspaceProfileRoleUpdatedDetail = {
  userId: string;
  role: HubWorkspaceRoleKey;
};

const ROLE_RANK: Record<HubWorkspaceRoleKey, number> = {
  admin: 3,
  manager: 2,
  user: 1,
  anonymous: 0,
};

export type FetchWorkspaceProfileRoleOptions = {
  /** Dual-auth tools (P0020) — Hub profiles keyed by identity user, not local Supabase auth id. */
  email?: string | null;
  /** Apply Hub JWT on client before RLS query (e.g. applyHubIdentitySession). */
  prepareClient?: (client: SupabaseClient) => Promise<void>;
};

type DirectoryRow = { id?: string; role?: string | null; email?: string | null };

type RoleCachePayload = {
  /** Legacy single-slot shape — kept for read migration. */
  userId?: string;
  role?: string;
  /** Dual-auth: Hub identity id + tool-local auth id share one role. */
  byUserId?: Record<string, HubWorkspaceRoleKey>;
};

function parseRoleCache(raw: string | null, userId: string): HubWorkspaceRoleKey | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RoleCachePayload;
    const mapped = parsed.byUserId?.[userId];
    if (mapped) return normalizeWorkspaceRoleKey(mapped);
    if (parsed.userId === userId && parsed.role) return normalizeWorkspaceRoleKey(parsed.role);
    return null;
  } catch {
    return null;
  }
}

function readRoleCacheBlob(): RoleCachePayload {
  if (typeof window === "undefined") return {};
  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = store.getItem(ROLE_CACHE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as RoleCachePayload;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function readRoleCache(userId: string): HubWorkspaceRoleKey | null {
  if (typeof window === "undefined") return null;
  return (
    parseRoleCache(window.sessionStorage.getItem(ROLE_CACHE_KEY), userId) ??
    parseRoleCache(window.localStorage.getItem(ROLE_CACHE_KEY), userId)
  );
}

function dispatchRoleCacheUpdated(userId: string, role: HubWorkspaceRoleKey): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceProfileRoleUpdatedDetail>(WORKSPACE_PROFILE_ROLE_UPDATED, {
      detail: { userId, role },
    }),
  );
}

function writeRoleCache(userId: string, role: HubWorkspaceRoleKey): void {
  if (typeof window === "undefined") return;
  const prev = readRoleCacheBlob();
  const unchanged = (prev.byUserId?.[userId] ?? null) === role;
  const byUserId: Record<string, HubWorkspaceRoleKey> = { ...(prev.byUserId ?? {}) };
  if (prev.userId && prev.role) {
    byUserId[prev.userId] = normalizeWorkspaceRoleKey(prev.role);
  }
  byUserId[userId] = role;
  const payload = JSON.stringify({ userId, role, byUserId });
  try {
    window.sessionStorage.setItem(ROLE_CACHE_KEY, payload);
    window.localStorage.setItem(ROLE_CACHE_KEY, payload);
    // Re-announcing the same role re-renders every sidebar listener (role icon flicker).
    if (!unchanged) dispatchRoleCacheUpdated(userId, role);
  } catch {
    /* ignore quota */
  }
}

function expandAuthEmails(email: string | null | undefined): Set<string> {
  const raw = email?.trim();
  if (!raw) return new Set();
  const keys = new Set<string>([raw.toLowerCase()]);
  for (const alias of hubAuthEmailsForSignIn(raw)) {
    keys.add(alias.toLowerCase());
  }
  return keys;
}

function directoryEmailsMatch(
  profileEmail: string | null | undefined,
  needle: string | null | undefined,
): boolean {
  const profileKeys = expandAuthEmails(profileEmail);
  const needleKeys = expandAuthEmails(needle);
  if (!profileKeys.size || !needleKeys.size) return false;
  for (const key of needleKeys) {
    if (profileKeys.has(key)) return true;
  }
  return false;
}

function strongerRole(a: HubWorkspaceRoleKey, b: HubWorkspaceRoleKey): HubWorkspaceRoleKey {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

function pickDirectoryRole(
  rows: DirectoryRow[],
  userId: string,
  email?: string | null,
): HubWorkspaceRoleKey | null {
  let best: HubWorkspaceRoleKey | null = null;

  for (const row of rows) {
    if (!row.role) continue;
    const role = normalizeWorkspaceRoleKey(String(row.role));
    const idMatch = row.id === userId;
    const emailMatch = email ? directoryEmailsMatch(row.email, email) : false;
    if (!idMatch && !emailMatch) continue;
    best = best ? strongerRole(best, role) : role;
  }

  return best;
}

function missingRpc(message: string, rpcName: string): boolean {
  return new RegExp(rpcName, "i").test(message) && /does not exist|not found|PGRST202|42883/i.test(message);
}

/** Listen for cross-tab / post-warm cache writes (sidebar icon sync). */
export function subscribeWorkspaceProfileRoleCache(
  userId: string,
  onRole: (role: HubWorkspaceRoleKey) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceProfileRoleUpdatedDetail>).detail;
    if (!detail || detail.userId !== userId || !detail.role) return;
    onRole(normalizeWorkspaceRoleKey(detail.role));
  };
  window.addEventListener(WORKSPACE_PROFILE_ROLE_UPDATED, handler);
  return () => window.removeEventListener(WORKSPACE_PROFILE_ROLE_UPDATED, handler);
}

async function fetchDirectoryRole(
  client: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<HubWorkspaceRoleKey | null> {
  const roster = await client.rpc("hub_todo_user_roster");
  if (!roster.error && Array.isArray(roster.data)) {
    const role = pickDirectoryRole(roster.data as DirectoryRow[], userId, email);
    if (role) return role;
  }

  const directory = await client.rpc("workspace_user_directory");
  if (!directory.error && Array.isArray(directory.data)) {
    const role = pickDirectoryRole(directory.data as DirectoryRow[], userId, email);
    if (role) return role;
  }

  return null;
}

/** Fetch workspace role — Hub directory roster SSOT, then profiles.role, then cache. */
export async function fetchWorkspaceProfileRole(
  client: SupabaseClient,
  userId: string,
  opts?: FetchWorkspaceProfileRoleOptions,
): Promise<HubWorkspaceRoleKey | null> {
  const cached = readRoleCache(userId);
  if (opts?.prepareClient) await opts.prepareClient(client);
  else await client.auth.getSession();

  const directoryRole = await fetchDirectoryRole(client, userId, opts?.email);
  if (directoryRole) {
    writeRoleCache(userId, directoryRole);
    return directoryRole;
  }

  const { data, error } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!error && data?.role) {
    const role = normalizeWorkspaceRoleKey(String(data.role));
    const merged = cached ? strongerRole(cached, role) : role;
    writeRoleCache(userId, merged);
    return merged;
  }

  return cached;
}

/** Live `profiles.role` updates — sidebar icon stays in sync after admin edits. */
export function subscribeWorkspaceProfileRole(
  client: SupabaseClient,
  userId: string,
  onRole: (role: HubWorkspaceRoleKey) => void,
): () => void {
  const channelName = `hub-profile-role:${userId}`;
  let byUser = profileRoleChannels.get(client);
  if (!byUser) {
    byUser = new Map();
    profileRoleChannels.set(client, byUser);
  }

  let entry = byUser.get(userId);
  if (!entry) {
    removeStaleProfileRoleChannels(client, channelName);
    const listeners = new Set<RoleListener>();
    entry = { channel: null, listeners };
    byUser.set(userId, entry);
    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const next = (payload.new as { role?: string | null } | undefined)?.role;
          if (!next) return;
          const role = normalizeWorkspaceRoleKey(next);
          writeRoleCache(userId, role);
          for (const listener of listeners) listener(role);
        },
      )
      .subscribe();
    entry.channel = channel;
  }

  entry.listeners.add(onRole);
  return () => {
    entry!.listeners.delete(onRole);
    if (entry!.listeners.size === 0) {
      byUser!.delete(userId);
      if (entry!.channel) void client.removeChannel(entry!.channel);
    }
  };
}

/** Seed sidebar icon before async fetch (same-tab sessionStorage). */
export function readCachedWorkspaceProfileRole(userId: string): HubWorkspaceRoleKey | null {
  return readRoleCache(userId);
}

/** Write role cache when directory/modal resolves role (Users tab SSOT). */
export function cacheWorkspaceProfileRole(userId: string, role: string): void {
  const key = userId.trim();
  if (!key) return;
  writeRoleCache(key, normalizeWorkspaceRoleKey(role));
}

/** Dual-auth tools — cache the same role under Hub + tool-local user ids. */
export function cacheWorkspaceProfileRoleForUsers(userIds: string[], role: string): void {
  const normalized = normalizeWorkspaceRoleKey(role);
  for (const id of userIds) {
    const key = id.trim();
    if (key) writeRoleCache(key, normalized);
  }
}

/** Clear cached role on sign-out — avoid leaking role to next session. */
export function clearWorkspaceProfileRoleCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ROLE_CACHE_KEY);
    window.localStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefetch profiles.role after sign-in — sidebar icon ready before shell paints. */
export async function warmWorkspaceProfileRole(
  client: SupabaseClient,
  opts?: { userId?: string | null; email?: string | null; prepareClient?: (client: SupabaseClient) => Promise<void> },
): Promise<void> {
  const { data } = await client.auth.getSession();
  const userId = opts?.userId?.trim() || data.session?.user?.id;
  if (!userId) return;
  await fetchWorkspaceProfileRole(client, userId, {
    email: opts?.email ?? data.session?.user?.email ?? null,
    prepareClient: opts?.prepareClient,
  });
}
