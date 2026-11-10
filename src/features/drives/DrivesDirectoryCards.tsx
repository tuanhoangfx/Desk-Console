import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardCornerRail,
  HubDirectoryCardHeader,
  HubDirectoryInteractiveCard,
  HubUsersStatusLabel,
} from "@tool-workspace/hub-ui";
import { formatDriveUsage, formatInventoryCounts } from "../../lib/drive-storage";
import type { DriveAccount } from "../../lib/sync-api";

type Row = DriveAccount & { jobCount: number };

type Props = {
  items: Row[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (account: Row) => void;
  emptyMessage?: string;
};

export function DrivesDirectoryCards({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  emptyMessage = "No Drive accounts",
}: Props) {
  if (!items.length) {
    return <p className="px-3 py-6 text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }
  return (
    <div className="hub-scrollbar grid min-h-0 flex-1 auto-rows-fr grid-cols-[repeat(auto-fill,minmax(240px,1fr))] content-start gap-3 overflow-auto p-3">
      {items.map((account) => {
        const storageLabel = formatDriveUsage(account.storage);
        const filesLabel = formatInventoryCounts(account.inventory);
        return (
          <HubDirectoryInteractiveCard
            key={account.name}
            ariaLabel={account.name}
            selected={selectedIds.has(account.name)}
            onActivate={() => onOpen(account)}
          >
            <HubDirectoryCardCornerRail>
              <HubDirectoryCardCheckbox
                corner
                checked={selectedIds.has(account.name)}
                label={account.name}
                onChange={() => onToggleSelect(account.name)}
              />
            </HubDirectoryCardCornerRail>
            <div className="flex min-h-[var(--hub-card-min-h,140px)] flex-col p-3 pr-10">
              <HubDirectoryCardHeader
                title={
                  account.code
                    ? `${account.code} · ${account.displayName || account.email || account.name}`
                    : account.displayName || account.name
                }
                subtitle={account.email || account.code || account.name}
              />
              {storageLabel || filesLabel ? (
                <p className="mt-2 truncate text-xs text-[var(--muted)]">
                  {[storageLabel && `💾 ${storageLabel}`, filesLabel && `📄 ${filesLabel}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="text-xs text-[var(--muted)]">📁 {account.jobCount} jobs</span>
                <HubUsersStatusLabel
                  label={account.authorized ? "Signed in" : "Sign in"}
                  tone={account.authorized ? "online" : "idle"}
                  capitalize={false}
                />
              </div>
            </div>
          </HubDirectoryInteractiveCard>
        );
      })}
    </div>
  );
}
