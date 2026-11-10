import { useState } from "react";
import { KeyRound } from "lucide-react";
import { HubAdmClickFilterField, HubBulkActionButton, HubDetailFieldRow, type FilterOption } from "@tool-workspace/hub-ui";
import {
  formatDriveAccountOptionLabel,
  joinRemoteSpec,
  remoteNameFromSpec,
  remotePathFromSpec,
} from "../../lib/remote-name";
import type { DriveAccount } from "../../lib/sync-api";
import { DriveFolderSelect } from "./DriveFolderSelect";
import { DriveSignInModal } from "./DriveSignInModal";
import { signedInDrives, useDriveAccounts } from "./use-drive-accounts";

type Props = {
  remote: string;
  accounts: DriveAccount[];
  loading?: boolean;
  /** Create modal only. Job detail edits the folder path as a field and browses in Folders. */
  folderBrowse?: boolean;
  /** Create modal compact row. Job detail edits Drive as its own path line. */
  bare?: boolean;
  onChange: (spec: string) => void;
};

/** Job remote = one already-signed-in Drive + a folder path. */
export function DriveAccountFields({ remote, accounts, loading = false, folderBrowse = false, bare = false, onChange }: Props) {
  const ready = signedInDrives(accounts);
  const name = remoteNameFromSpec(remote, "");
  const folder = remotePathFromSpec(remote);
  const known = ready.some((account) => account.name === name);
  const options: FilterOption[] = ready.map((account) => ({
    value: account.name,
    label: formatDriveAccountOptionLabel(account),
    emoji: "☁️",
    detail: account.code ? `${account.code} · ${account.name}` : account.name,
    tip: formatDriveAccountOptionLabel(account),
  }));

  const driveField = (
    <HubAdmClickFilterField
      header={{ label: "Drive", headerEmoji: "☁️" }}
      fieldLabel="Drive"
      filterKey="p0009-drive-account"
      options={options}
      value={known ? name : ""}
      allowClear={false}
      disabled={loading || ready.length === 0}
      onChange={(value) => onChange(joinRemoteSpec(value, bare ? folder : ""))}
    />
  );

  const notices = (
    <>
      {!loading && ready.length === 0 ? (
        <p className="hub-directory-body-value text-amber-200/90">
          Sign in a Google Drive on the Drives screen, then choose it here.
        </p>
      ) : null}
      {!loading && name && !known ? (
        <p className="hub-directory-body-value text-amber-200/90">
          This job’s Drive is not signed in. Choose one from the Drives screen.
        </p>
      ) : null}
    </>
  );

  if (bare) return driveField;

  return (
    <>
      <HubDetailFieldRow slots="full">{driveField}</HubDetailFieldRow>
      {known && folderBrowse ? (
        <DriveFolderSelect
          remoteName={name}
          folder={folder}
          onUseFolder={(dirPath) => onChange(joinRemoteSpec(name, dirPath))}
        />
      ) : null}
      {notices}
    </>
  );
}

/** Shown under the Layout 2 row — must not sit inside the grid. */
export function DriveAccountNotice({
  remote,
  accounts,
  loading = false,
}: {
  remote: string;
  accounts: DriveAccount[];
  loading?: boolean;
}) {
  const { reload } = useDriveAccounts();
  const [signInOpen, setSignInOpen] = useState(false);
  const ready = signedInDrives(accounts);
  const name = remoteNameFromSpec(remote, "");
  const matched = accounts.find((account) => account.name === name);
  const known = ready.some((account) => account.name === name);
  const targetCode = matched?.code || "GG0001";

  if (!loading && ready.length === 0) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5">
          <p className="hub-directory-body-value text-amber-200/90">
            No Google Drive account is signed in yet.
          </p>
          <HubBulkActionButton
            icon={<KeyRound size={12} aria-hidden />}
            label="Sign in Drive"
            title="Sign in a Google Drive account now"
            tone="indigo"
            onClick={() => setSignInOpen(true)}
          />
        </div>
        <DriveSignInModal
          open={signInOpen}
          remoteName={name}
          suggestedName={name || "gdrive"}
          suggestedCode={targetCode}
          onClose={() => setSignInOpen(false)}
          onSignedIn={() => void reload()}
        />
      </>
    );
  }
  if (!loading && name && !known) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5">
          <p className="hub-directory-body-value text-amber-200/90">
            Drive account <strong>{matched?.code || name}</strong> is not signed in or its token expired.
          </p>
          <HubBulkActionButton
            icon={<KeyRound size={12} aria-hidden />}
            label={`Sign in ${matched?.code || name}`}
            title={`Re-authenticate ${matched?.code || name} with Google`}
            tone="indigo"
            onClick={() => setSignInOpen(true)}
          />
        </div>
        <DriveSignInModal
          open={signInOpen}
          remoteName={name}
          suggestedName={name}
          suggestedCode={targetCode}
          onClose={() => setSignInOpen(false)}
          onSignedIn={() => void reload()}
        />
      </>
    );
  }
  return null;
}
