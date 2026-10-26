import type { ReactNode } from "react";
import {
  DIRECTORY_CELL_TRUNCATE,
  DirectoryEmptyDash,
  DirectoryTableBodyCell,
  formatHubTimestampCompact,
  HubDirectoryCopyText,
  HubDirectoryTimestampTooltipCell,
  HubDirectoryValuePopover,
  HubUsersStatusLabel,
  type HubDirectoryTableColumn,
} from "@tool-workspace/hub-ui";
import { formatDriveUsage, formatExtensionLabel, formatInventoryCounts } from "../../lib/drive-storage";
import type { DrivesColumnKey } from "../../lib/drives-directory-meta";
import type { DriveAccount, SyncJob } from "../../lib/sync-api";
import { DriveDirectoryLogCell } from "./DriveDirectoryLogCell";
import { DriveJobsUsageCell } from "./DriveJobsUsageCell";

export function renderDrivesDirectoryBodyCell(
  row: DriveAccount,
  col: HubDirectoryTableColumn<DrivesColumnKey>,
  jobsByRemote: Record<string, SyncJob[]>,
  onOpenJob: (jobId: string) => void,
): ReactNode {
  if (col.key === "code") {
    const code = row.code || "";
    const created = formatHubTimestampCompact(row.createdAt);
    const popoverLines = [
      `ID: ${code}`,
      created ? `Created: ${created}` : "",
      `Remote: ${row.name}`,
    ].filter(Boolean);
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass} onClick={(e) => e.stopPropagation()}>
        {code ? (
          <HubDirectoryValuePopover value={popoverLines.join("\n")} title="🆔 ID">
            <HubDirectoryCopyText value={code} copyToastLabel="Drive ID copied" />
          </HubDirectoryValuePopover>
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "account") {
    const label = row.displayName || "";
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        {label ? (
          <span className={`hub-users-directory-body-text ${DIRECTORY_CELL_TRUNCATE}`} title={label}>
            {label}
          </span>
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "gmail") {
    const email = row.email || "";
    return (
      <DirectoryTableBodyCell
        key={col.key}
        colClass={col.colClass}
        onClick={email ? (e) => e.stopPropagation() : undefined}
      >
        {email ? (
          <HubDirectoryCopyText value={email} copyToastLabel="Gmail copied" />
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "jobs") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <DriveJobsUsageCell jobs={jobsByRemote[row.name] || []} onOpenJob={onOpenJob} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "status") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <HubUsersStatusLabel
          label={row.authorized ? "Signed in" : "Sign in"}
          tone={row.authorized ? "online" : "idle"}
          capitalize={false}
          title={
            row.authorized
              ? `Google Drive OAuth active${row.email ? ` (${row.email})` : ""}`
              : "OAuth pending — click row to finish Google sign-in."
          }
          popoverTitle="Drive status"
        />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "storage") {
    const label = formatDriveUsage(row.storage);
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        {label ? (
          <span className="hub-users-directory-body-text hub-users-directory-body-text--center">{label}</span>
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "files") {
    const label = formatInventoryCounts(row.inventory);
    const formats = (row.inventory?.formats || [])
      .slice(0, 8)
      .map((item) => `${formatExtensionLabel(item.ext)} ${item.files}`)
      .join(" · ");
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        {label ? (
          <span className={`hub-users-directory-body-text ${DIRECTORY_CELL_TRUNCATE}`} title={formats || label}>
            {label}
          </span>
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "log") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <DriveDirectoryLogCell entries={row.fileLog} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "updated" || col.key === "created") {
    const at = col.key === "updated" ? row.contentUpdatedAt : row.createdAt;
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <HubDirectoryTimestampTooltipCell
          at={at}
          title={col.key === "updated" ? "Update" : "Created"}
          fallback={<DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
  }
  return (
    <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
      —
    </DirectoryTableBodyCell>
  );
}
