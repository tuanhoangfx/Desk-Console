import { User } from "lucide-react";
import { HubSidebarFooterButton } from "../shell/HubSidebarFooterButton";
import { resolveWorkspaceRoleIcon } from "./hub-workspace-role-icon";

export type HubSidebarUserFooterProps = {
  footerUserLabel: string;
  onOpenUser: () => void;
  /** Workspace role key — icon only, shown before email (admin / manager / user). */
  roleKey?: string;
  /** Wait for profiles.role — icon slot reserved, no JWT fallback flash. */
  roleIconPending?: boolean;
  /** Hub `profiles.avatar_url` — when set, replaces role icon until deleted / broken. */
  avatarUrl?: string | null;
  label?: string;
  title?: string;
};

/** Sidebar User row — signed-in: photo or role icon + Display name / Username (never email). */
export function HubSidebarUserFooter({
  footerUserLabel,
  onOpenUser,
  roleKey = "user",
  roleIconPending = false,
  avatarUrl = null,
  title = "Account & sign out",
  label = "User",
}: HubSidebarUserFooterProps) {
  const roleMeta = resolveWorkspaceRoleIcon(roleKey);
  const RoleIcon = roleMeta.icon;
  const signedIn = roleKey !== "anonymous";
  const photo = avatarUrl?.trim() || null;

  if (signedIn) {
    return (
      <HubSidebarFooterButton
        icon={RoleIcon}
        iconSrc={photo}
        iconClass={roleIconPending && !photo ? "opacity-0" : roleMeta.className}
        iconFadeIn={!roleIconPending || Boolean(photo)}
        label={footerUserLabel}
        title={title}
        onClick={onOpenUser}
        dataHubSidebarUser
      />
    );
  }

  return (
    <HubSidebarFooterButton
      icon={User}
      iconClass="text-violet-400"
      label={label}
      title={title}
      onClick={onOpenUser}
      dataHubSidebarUser
      trailing={
        footerUserLabel && footerUserLabel !== label ? (
          <span className="max-w-[140px] truncate text-xs font-medium text-[var(--text)]/80">{footerUserLabel}</span>
        ) : null
      }
    />
  );
}
