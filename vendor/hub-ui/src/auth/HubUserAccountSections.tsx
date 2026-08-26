import { Fingerprint, Gauge, KeyRound } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import { HubAdmReadonlyField } from "../shell/HubAdmClickEditField";
import { HubAdmGridSlotPad } from "../shell/HubBulkDetailField";
import { HubAdmPlainRelativeTime } from "../shell/HubAdmPlainRelativeTime";
import { HubAdmRecordMetaRow } from "../shell/HubAdmRecordMetaPanel";
import { HubAdmSectionBlock } from "../shell/HubAdmSectionBlock";
import { HUB_ADM_TYPE_MONO_CLASS } from "../shell/hubAccountDetailModal";
import { formatVaultIdForDisplay } from "../lib/vault-id-from-key";
import { HubCopyBadge } from "../shell/HubCopyBadge";
import { HubDirectoryValuePopover } from "../table/HubDirectoryValuePopover";
import type { HubWorkspaceUserProfileRow } from "./HubWorkspaceUserModal";

export type HubUserAccountSectionId = "credentials" | "identity" | "status";

/** Row labels lifted into the top record-meta frame (Order Detail SSOT). */
export const HUB_USER_ACCOUNT_META_LABELS = {
  created: "Created",
  lastActive: "Last active",
  vaultId: "Vault ID",
} as const;

const CREDENTIAL_LABELS = ["Username", "Email", "Password"] as const;
/** Account Identity — Role + self-editable profile / channel fields. */
export const HUB_USER_ACCOUNT_IDENTITY_LABELS = [
  "Display name",
  "Phone",
  "Role",
  "Zalo",
  "Tele",
  "Meta",
] as const;
const IDENTITY_LABELS = HUB_USER_ACCOUNT_IDENTITY_LABELS;

const USER_ACCOUNT_SECTIONS: readonly { id: HubUserAccountSectionId; header: HubTableColumnHeaderProps }[] = [
  {
    id: "credentials",
    header: { label: "Credentials", icon: KeyRound, iconClassName: "hub-adm-section-icon--amber" },
  },
  {
    id: "identity",
    header: { label: "Identity", icon: Fingerprint, iconClassName: "hub-adm-section-icon--cyan" },
  },
  {
    id: "status",
    header: { label: "Status", icon: Gauge, iconClassName: "hub-adm-section-icon--rose" },
  },
];

export function hubUserAccountSectionId(section: HubUserAccountSectionId): string {
  return `hub-user-${section}`;
}

function isMetaLabel(label: string): boolean {
  return (
    Object.values(HUB_USER_ACCOUNT_META_LABELS).some((meta) => meta === label) ||
    label === "Update" ||
    label === "Last sign in" ||
    label === "Member since" ||
    label === "User ID"
  );
}

function sectionForUserRow(label: string): HubUserAccountSectionId {
  if ((CREDENTIAL_LABELS as readonly string[]).includes(label)) return "credentials";
  if ((IDENTITY_LABELS as readonly string[]).includes(label)) return "identity";
  return "status";
}

/** Drop duplicate labels (tools may append a row the builder already emitted). */
function dedupeRows(rows: HubWorkspaceUserProfileRow[]): HubWorkspaceUserProfileRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.label)) return false;
    seen.add(row.label);
    return true;
  });
}

function chunkRows(rows: HubWorkspaceUserProfileRow[], size: number): HubWorkspaceUserProfileRow[][] {
  const out: HubWorkspaceUserProfileRow[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export type HubUserAccountRecordMeta = {
  createdAt?: string | null;
  lastActiveAt?: string | null;
  vaultId?: string | null;
};

export type HubUserAccountSectionsProps = {
  rows: HubWorkspaceUserProfileRow[];
  /**
   * Always-on record meta frame (Created · Last active · Vault ID).
   * Prefers these values over matching row labels when both are present.
   */
  recordMeta?: HubUserAccountRecordMeta;
  iconClassNameFor?: (row: HubWorkspaceUserProfileRow) => string;
  /** Custom value body — defaults to the plain row value (ADM typography owns the type). */
  renderValue?: (row: HubWorkspaceUserProfileRow) => ReactNode;
  /**
   * Replace the whole field cell (Service Detail SSOT — `HubAdmClickEditField` / readonly).
   * Return `null`/`undefined` to keep the default `HubAdmReadonlyField`.
   */
  renderField?: (row: HubWorkspaceUserProfileRow) => ReactNode | null | undefined;
  /** Inline control after a value (Change email / Change password). */
  trailingActionFor?: (row: HubWorkspaceUserProfileRow) => ReactNode;
  /** Extra content appended inside the Status section. */
  statusTrailing?: ReactNode;
};

/** Section ids actually rendered for `rows` — TOC must not link a missing anchor. */
export function hubUserAccountVisibleSectionIds(
  rows: HubWorkspaceUserProfileRow[],
  hasStatusTrailing = false,
): string[] {
  const fields = dedupeRows(rows).filter((row) => !isMetaLabel(row.label));
  return USER_ACCOUNT_SECTIONS.filter((section) => {
    const count = fields.filter((row) => sectionForUserRow(row.label) === section.id).length;
    return count > 0 || (section.id === "status" && hasStatusTrailing);
  }).map((section) => hubUserAccountSectionId(section.id));
}

/**
 * Shared user-account ADM body — record meta frame (Created · Last active · Vault ID)
 * above Credentials / Identity / Status groups. Same field kit as P0020 Order Detail.
 * The meta frame is always rendered (Mail Detail / User Detail SSOT).
 */
export function HubUserAccountSections({
  rows,
  recordMeta,
  iconClassNameFor,
  renderValue,
  renderField,
  trailingActionFor,
  statusTrailing,
}: HubUserAccountSectionsProps) {
  const allRows = dedupeRows(rows);
  const metaRow = (label: string) => allRows.find((item) => item.label === label);
  const created = metaRow(HUB_USER_ACCOUNT_META_LABELS.created);
  const lastActive =
    metaRow(HUB_USER_ACCOUNT_META_LABELS.lastActive) ??
    metaRow("Last sign in") ??
    metaRow("Update") ??
    metaRow("Member since");
  const vault = metaRow(HUB_USER_ACCOUNT_META_LABELS.vaultId) ?? metaRow("User ID");
  const createdAt = recordMeta?.createdAt ?? created?.timestamp ?? created?.value ?? "";
  const lastActiveAt = recordMeta?.lastActiveAt ?? lastActive?.timestamp ?? lastActive?.value ?? "";
  const vaultRaw = (recordMeta?.vaultId ?? vault?.value ?? "").trim();
  const vaultDisplayId = formatVaultIdForDisplay(vaultRaw);
  const fieldRows = allRows.filter((row) => !isMetaLabel(row.label));

  return (
    <div className="hub-adm-credentials-stack">
      <HubAdmRecordMetaRow
        created={<HubAdmPlainRelativeTime at={createdAt} />}
        updated={<HubAdmPlainRelativeTime at={lastActiveAt} />}
        updatedLabel={HUB_USER_ACCOUNT_META_LABELS.lastActive}
        vaultId={
          vaultDisplayId ? (
            <HubDirectoryValuePopover value={vaultDisplayId} title="Vault ID">
              <HubCopyBadge
                value={vaultRaw || vaultDisplayId}
                title="Copy vault row ID"
                className={HUB_ADM_TYPE_MONO_CLASS}
                labelContent={vaultDisplayId}
              />
            </HubDirectoryValuePopover>
          ) : (
            "—"
          )
        }
      />

      {USER_ACCOUNT_SECTIONS.map((section) => {
        const sectionRows = fieldRows.filter((row) => sectionForUserRow(row.label) === section.id);
        const withTrailing = section.id === "status" && statusTrailing;
        if (sectionRows.length === 0 && !withTrailing) return null;
        // Account Credentials are the compact Service Detail variant: Username · Email ·
        // Password share one aligned three-column row. Narrow rails use full rows instead.
        const slotsFull = false;
        const chunkSize = 3;
        return (
          <HubAdmSectionBlock
            key={section.id}
            id={hubUserAccountSectionId(section.id)}
            header={section.header}
          >
            {chunkRows(sectionRows, chunkSize).map((line, index) => (
              <div
                key={index}
                className={`hub-adm-form-row hub-adm-form-row--aligned${
                  slotsFull ? " hub-adm-form-row--single" : ""
                }`}
              >
                {line.map((row) => {
                  const custom = renderField?.(row);
                  if (custom != null) {
                    return <Fragment key={row.label}>{custom}</Fragment>;
                  }
                  const trailing = trailingActionFor?.(row);
                  return (
                    <HubAdmReadonlyField
                      key={row.label}
                      header={{
                        label: row.label,
                        icon: row.icon,
                        iconClassName: iconClassNameFor?.(row) ?? row.iconClassName,
                      }}
                      valueLayout={trailing ? "inline" : "text"}
                      trailingAction={trailing}
                      empty={!row.value || row.value === "—"}
                    >
                      {renderValue?.(row) ?? row.value}
                    </HubAdmReadonlyField>
                  );
                })}
                {slotsFull ? null : <HubAdmGridSlotPad filledCount={line.length} />}
              </div>
            ))}
            {withTrailing ? statusTrailing : null}
          </HubAdmSectionBlock>
        );
      })}
    </div>
  );
}
