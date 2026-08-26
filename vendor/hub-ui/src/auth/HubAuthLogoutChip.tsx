import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { compactIconSize } from "../ui-scale";
import { resolveWorkspaceRoleIcon } from "./hub-workspace-role-icon";

export type HubAuthLogoutChipProps = {
  email: string;
  /** Workspace role — crown/shield/userRound parity HubSidebarUserFooter + E0001 extension. */
  roleKey?: string;
  /** When set, replaces role icon until deleted / broken. */
  avatarUrl?: string | null;
  onOpenUser?: () => void;
  onLogout: () => void;
  disabled?: boolean;
  signingOut?: boolean;
  linked?: boolean;
  className?: string;
};

/** Header User chip — photo or role icon + email + LogOut (golden auth panel styling). */
export function HubAuthLogoutChip({
  email,
  roleKey = "user",
  avatarUrl = null,
  onOpenUser,
  onLogout,
  disabled = false,
  signingOut = false,
  linked = false,
  className = "",
}: HubAuthLogoutChipProps) {
  const label = email.trim() || "User";
  const busy = disabled || signingOut;
  const roleMeta = resolveWorkspaceRoleIcon(linked ? roleKey : "anonymous");
  const RoleIcon = roleMeta.icon;
  const photoSrc = linked && avatarUrl?.trim() ? avatarUrl.trim() : "";
  const [imgBroken, setImgBroken] = useState(false);
  const iconPx = compactIconSize(14);

  useEffect(() => {
    setImgBroken(false);
  }, [photoSrc]);

  const photo = photoSrc && !imgBroken ? photoSrc : null;

  return (
    <div
      className={`hub-auth-logout-chip${linked ? " hub-auth-logout-chip--linked" : ""}${className ? ` ${className}` : ""}`.trim()}
    >
      <button
        type="button"
        className="hub-auth-logout-chip__identity"
        onClick={onOpenUser}
        disabled={busy || !onOpenUser}
        title={onOpenUser ? `${label} — User details` : label}
        aria-label={onOpenUser ? `Open user details for ${label}` : label}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width={iconPx}
            height={iconPx}
            className="hub-auth-logout-chip__user-icon hub-filter-avatar-icon"
            style={{ width: iconPx, height: iconPx }}
            onError={() => setImgBroken(true)}
          />
        ) : (
          <RoleIcon
            size={iconPx}
            className={`hub-auth-logout-chip__user-icon ${roleMeta.className}`}
            aria-hidden
          />
        )}
        <span className="hub-auth-logout-chip__email">{label}</span>
      </button>
      <button
        type="button"
        className="hub-auth-logout-chip__logout"
        onClick={onLogout}
        disabled={busy}
        title={signingOut ? "Signing out…" : "Log out"}
        aria-label={signingOut ? "Signing out" : "Log out"}
      >
        <LogOut size={compactIconSize(14)} aria-hidden />
      </button>
    </div>
  );
}
