import { Clock, Mail, User } from "lucide-react";
import {
  hubSessionLabels,
  isHubOpaqueAuthEmail,
  type HubSessionLike,
} from "@tool-workspace/hub-identity";
import type { HubAuthSessionMode } from "./HubAuthSessionBadge";
import type { HubWorkspaceUserProfileRow } from "./HubWorkspaceUserModal";
import { resolveWorkspaceRoleIcon, workspaceRoleLabel } from "./hub-workspace-role-icon";

export function resolveHubAuthSessionMode(opts: {
  anonymous?: boolean;
  session: HubSessionLike;
}): HubAuthSessionMode {
  if (opts.anonymous) return "anonymous";
  return opts.session ? "signed_in" : "anonymous";
}

export function workspaceUserInitials(
  email: string | null | undefined,
  userId: string | null | undefined,
): string {
  const base = email?.trim() || userId || "U";
  return base.slice(0, 2).toUpperCase();
}

/** Opaque GoTrue locals / UUID prefixes must never paint as the sidebar account label. */
export function isUnstableWorkspaceFooterLabel(label: string | null | undefined): boolean {
  const v = String(label ?? "").trim();
  if (!v) return true;
  if (v.includes("@")) return true;
  if (/^u_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return true;
  if (/^u_[0-9a-f-]{20,}$/i.test(v)) return true;
  // Data Box / Hub auth UUID (full or first-8 fallback) — not a human account label.
  if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)) return true;
  if (/^[0-9a-f]{8}$/i.test(v)) return true;
  return false;
}

/**
 * Sidebar User footer label — never show email.
 * Priority: Display name → Username (login_id) → auth local-part → id/guest.
 * Never surface opaque `u_<uuid>` auth locals (Hub GoTrue technical address).
 */
export function workspaceUserFooterLabel(opts: {
  labels?: ReturnType<typeof hubSessionLabels>;
  session?: HubSessionLike;
  anonymous?: boolean;
  anonymousLabel?: string;
  guestLabel?: string;
  /** Live profiles.full_name (or host override) — wins over session metadata. */
  displayName?: string | null;
  /** Live profiles.login_id (or host override). */
  username?: string | null;
}): string {
  if (opts.anonymous) return opts.anonymousLabel ?? "Anonymous";
  const labels = opts.labels ?? hubSessionLabels(opts.session ?? null);
  const displayName = String(opts.displayName ?? labels.displayName ?? "").trim();
  if (displayName && !isUnstableWorkspaceFooterLabel(displayName)) return displayName;

  const username = String(opts.username ?? labels.loginId ?? "").trim();
  if (username && !isUnstableWorkspaceFooterLabel(username)) return username;

  const authEmail = String(opts.session?.user?.email ?? labels.authEmail ?? "").trim();
  if (authEmail && !isHubOpaqueAuthEmail(authEmail)) {
    const authLocal = authEmail.split("@")[0]?.trim() ?? "";
    if (authLocal && !isUnstableWorkspaceFooterLabel(authLocal)) return authLocal;
  }

  // Never paint auth UUID (full or first-8) — wait for profiles.login_id / sticky label.
  return opts.guestLabel || "Account";
}

export type BuildWorkspaceUserProfileRowsOptions = {
  session: HubSessionLike;
  labels?: ReturnType<typeof hubSessionLabels>;
  locale?: string;
  /** Hub-style rows (P0016): User ID + synthetic email handling */
  includeLoginId?: boolean;
  /** P0020: "Not signed in" when email missing */
  emptyEmailLabel?: string;
  /** Resolved workspace role — sidebar / profiles SSOT. */
  roleKey?: string;
};

export function buildWorkspaceUserProfileRows(
  opts: BuildWorkspaceUserProfileRowsOptions,
): HubWorkspaceUserProfileRow[] {
  const labels = opts.labels ?? hubSessionLabels(opts.session);
  const user = opts.session?.user;
  const createdAt = user?.created_at ?? null;
  const lastActiveAt =
    user?.last_sign_in_at ??
    (user as { updated_at?: string | null } | null | undefined)?.updated_at ??
    null;
  const roleKey = opts.roleKey ?? String(user?.app_metadata?.role ?? user?.user_metadata?.role ?? "user");
  const roleMeta = resolveWorkspaceRoleIcon(roleKey);

  const rows: HubWorkspaceUserProfileRow[] = [];
  if (opts.includeLoginId) {
    rows.push({ label: "User ID", value: labels.loginId || "—", icon: User });
  }
  // profiles.email SSOT (Users detail) — never paint opaque/synthetic auth.users.email.
  const emailValue =
    labels.email ||
    (labels.hasTechnicalAuth || labels.hasSyntheticAuth
      ? opts.emptyEmailLabel || "Not linked"
      : "") ||
    opts.emptyEmailLabel ||
    "—";
  rows.push({
    label: "Email",
    value: emailValue,
    icon: Mail,
  });
  rows.push(
    {
      label: "Role",
      value: workspaceRoleLabel(roleKey),
      icon: roleMeta.icon,
      iconClassName: roleMeta.className,
    },
    { label: "Created", value: createdAt ?? "—", timestamp: createdAt, icon: User },
    { label: "Last active", value: lastActiveAt ?? "—", timestamp: lastActiveAt, icon: Clock },
  );
  return rows;
}
