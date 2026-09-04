import type { LucideIcon } from "lucide-react";
import { KeyRound, LogOut, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import { HubToolDetailModal } from "../shell/HubToolDetailModal";
import { HubToolDetailModalPrimaryAction } from "../shell/HubToolDetailModalActions";
import { HubToolDetailModalAccountFooter } from "../shell/HubToolDetailModalAccountFooter";
import { HubAccountDetailAdmScaffold } from "../shell/HubAccountDetailAdmScaffold";
import { HubTocSectionNav } from "../shell/HubTocSectionNav";
import {
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  hubAccountDetailShellClass,
} from "../shell/hubAccountDetailModal";
import {
  HUB_WORKSPACE_USER_ACCOUNT_TOC,
  hubUserAccountTocItems,
} from "./hub-user-account-toc";
import {
  HubUserAccountSections,
  hubUserAccountVisibleSectionIds,
  type HubUserAccountSectionsProps,
} from "./HubUserAccountSections";

export { HUB_WORKSPACE_USER_ACCOUNT_TOC } from "./hub-user-account-toc";

const FIELD_ICON_CLASS: Record<string, string> = {
  Email: "text-sky-300",
  Role: "text-purple-300",
  Created: "text-slate-400",
  "Last active": "text-emerald-300",
  Update: "text-emerald-300",
  "Vault ID": "text-violet-300",
};

export type HubWorkspaceUserProfileRow = {
  label: string;
  value: string;
  /** Original ISO value for SSOT timestamp rendering; `value` remains a backward-compatible fallback. */
  timestamp?: string | null;
  icon: LucideIcon;
  iconClassName?: string;
};

export type HubWorkspaceUserModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  headerLeading?: ReactNode;
  userId?: string | null;
  /** Record meta frame — Created (ISO). Prefer over injecting Created rows. */
  createdAt?: string | null;
  /** Record meta frame — Last active (ISO). Prefer over injecting Update/Last active rows. */
  lastActiveAt?: string | null;
  rows: HubWorkspaceUserProfileRow[];
  workspaceNote?: string;
  signingOut?: boolean;
  sessionActive?: boolean;
  /** When false, footer Sign Out is hidden (local console / guest). Default true. */
  showSignOut?: boolean;
  onSignOut: () => void;
  /** Override the standard Sign Out footer for an admin User Detail action set. */
  footer?: ReactNode;
  /** Optional Layout-3 rail (e.g. access audit log). */
  rail?: ReactNode;
  /** Allows the host to replace a canonical profile field with an ADM editor. */
  renderField?: HubUserAccountSectionsProps["renderField"];
  children?: ReactNode;
};

/**
 * Thin account / admin User Detail modal (directory row editors).
 * Sidebar account SSOT is `HubFullUserAccountModal` via `HubWorkspaceUserShell`.
 */
export function HubWorkspaceUserModal({
  open,
  onClose,
  title,
  headerLeading,
  userId,
  createdAt,
  lastActiveAt,
  rows,
  workspaceNote,
  signingOut = false,
  sessionActive = true,
  showSignOut = true,
  onSignOut,
  footer,
  rail,
  renderField,
  children,
}: HubWorkspaceUserModalProps) {
  const accountRows = [
    ...rows,
    {
      label: "Vault ID",
      value: userId?.trim() || "—",
      icon: KeyRound,
      iconClassName: "text-violet-300",
    },
    ...(workspaceNote
      ? [
          {
            label: "Note",
            value: workspaceNote,
            icon: StickyNote,
            iconClassName: "text-slate-400",
          },
        ]
      : []),
  ];
  const visibleSections = new Set(hubUserAccountVisibleSectionIds(accountRows, Boolean(children)));
  const tocItems = hubUserAccountTocItems(
    HUB_WORKSPACE_USER_ACCOUNT_TOC.filter((entry) => visibleSections.has(entry.id)),
  );
  const sectionIds = tocItems.map((item) => item.id);

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="hub-workspace-user-modal-title"
      headerLeading={headerLeading}
      shellClassName={hubAccountDetailShellClass()}
      ariaLabelledBy="hub-workspace-user-modal-title"
      scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
      sectionIds={sectionIds}
      toc={
        <div className="hub-toc-nav">
          <HubTocSectionNav items={tocItems} scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT} />
        </div>
      }
      footer={
        footer ??
        (showSignOut ? (
          <HubToolDetailModalAccountFooter
            onClose={onClose}
            leading={
              <HubToolDetailModalPrimaryAction
                label={signingOut ? "Signing out…" : "Sign Out"}
                onClick={onSignOut}
                disabled={!sessionActive || signingOut}
                busy={signingOut}
                danger
                icon={LogOut}
              />
            }
          />
        ) : null)
      }
    >
      <HubAccountDetailAdmScaffold
        panelId="hub-user-account"
        panelTitle="Account"
        panelSectionKey="credentials"
        main={
          <HubUserAccountSections
            rows={accountRows}
            recordMeta={{
              createdAt,
              lastActiveAt,
              vaultId: userId,
            }}
            iconClassNameFor={(row) => row.iconClassName ?? FIELD_ICON_CLASS[row.label] ?? "text-indigo-300"}
            renderField={renderField}
            statusTrailing={children}
          />
        }
        rail={rail}
      />
    </HubToolDetailModal>
  );
}
