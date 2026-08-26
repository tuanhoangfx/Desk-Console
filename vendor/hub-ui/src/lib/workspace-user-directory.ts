import type { Session, SupabaseClient } from "@supabase/supabase-js";

/** Row shape from `workspace_user_directory()` — shared P0004 RPC. */
export type WorkspaceUserDirectoryRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
  last_activity_at?: string | null;
  project_count?: number | null;
  project_names?: string[] | null;
  activity_count?: number | null;
};

export type WorkspaceDirectoryProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  role: "admin" | "manager" | "employee";
  updated_at: string | null;
  last_sign_in_at?: string | null;
  created_at?: string;
};

function cleanRole(value: string | null | undefined): WorkspaceDirectoryProfile["role"] {
  if (value === "admin" || value === "manager") return value;
  return "employee";
}

export function workspaceDirectoryRowToProfile(row: WorkspaceUserDirectoryRow): WorkspaceDirectoryProfile {
  return {
    id: row.id,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
    email: row.email ?? null,
    role: cleanRole(row.role),
    updated_at: row.updated_at ?? null,
    last_sign_in_at: row.last_sign_in_at ?? row.last_activity_at ?? null,
    created_at: row.created_at ?? undefined,
  };
}

function missingRpc(message: string) {
  return /workspace_user_directory/i.test(message) && /does not exist|not found|PGRST202|42883/i.test(message);
}

function dedupe<T extends { id: string }>(users: T[]): T[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (!user.id || seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

/** Fetch shared workspace user directory via Supabase RPC. */
export async function fetchWorkspaceUserDirectoryRows(
  client: SupabaseClient,
  session: Session | null,
  fallbackProfile?: WorkspaceDirectoryProfile | null,
): Promise<{ users: WorkspaceDirectoryProfile[]; warning: string | null }> {
  if (!session?.user?.id) return { users: [], warning: null };

  const directory = await client.rpc("workspace_user_directory");

  if (!directory.error && Array.isArray(directory.data)) {
    const users = dedupe(
      (directory.data as WorkspaceUserDirectoryRow[])
        .map(workspaceDirectoryRowToProfile)
        .filter((profile) => profile.id),
    );
    return { users, warning: null };
  }

  const message = directory.error?.message ?? "Unable to load user directory from database.";
  if (!missingRpc(message)) {
    console.warn("[workspace-user-directory]", message);
    return { users: [], warning: message };
  }

  return {
    users: fallbackProfile ? [fallbackProfile] : [],
    warning:
      "Missing RPC workspace_user_directory. Apply supabase/migrations/20260528170000_workspace_user_directory.sql.",
  };
}
