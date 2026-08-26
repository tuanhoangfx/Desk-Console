import type { SupabaseClient } from "@supabase/supabase-js";
import {
  appendHubEntityLogEntry,
  normalizeHubEntityLog,
  type HubEntityLogEntry,
} from "../lib/hub-entity-log";

/** Dedupe StrictMode / remount double-hydrate for the same user. */
const activityLogInflight = new Map<string, Promise<HubEntityLogEntry[]>>();

/**
 * Hub `profiles.activity_log` load/persist — SSOT for Full User Account modal Log rail
 * (P0004 gold; reuse from P0020 / P0005 / P0016 wrappers).
 */
export function createHubProfilesActivityLogHandlers(getClient: () => SupabaseClient | null) {
  async function fetchUserActivityLog(userId: string): Promise<HubEntityLogEntry[]> {
    const id = userId.trim();
    if (!id) return [];
    const existing = activityLogInflight.get(id);
    if (existing) return existing;
    const pending = (async () => {
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client.from("profiles").select("activity_log").eq("id", id).maybeSingle();
      if (error || !data) return [];
      return normalizeHubEntityLog((data as { activity_log?: unknown }).activity_log);
    })().finally(() => {
      activityLogInflight.delete(id);
    });
    activityLogInflight.set(id, pending);
    return pending;
  }

  async function persistUserActivityLog(
    userId: string,
    existing: HubEntityLogEntry[],
    entry: HubEntityLogEntry,
  ): Promise<{ ok: boolean; next: HubEntityLogEntry[]; error: string | null }> {
    const client = getClient();
    const next = appendHubEntityLogEntry(existing, entry);
    if (!client) return { ok: true, next, error: null };
    const { error } = await client
      .from("profiles")
      .update({ activity_log: next, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      if (/activity_log|does not exist|PGRST204|42703/i.test(error.message)) {
        return { ok: true, next, error: null };
      }
      return { ok: false, next: existing, error: error.message };
    }
    void client.from("activity_logs").insert({
      user_id: userId,
      action: "user_save",
      details: { message: entry.message, changes: entry.changes ?? [] },
    });
    return { ok: true, next, error: null };
  }

  return { fetchUserActivityLog, persistUserActivityLog };
}
