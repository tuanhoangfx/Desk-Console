import { useCallback, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { HubBulkActionButton } from "@tool-workspace/hub-ui";
import { fetchDriveFolders, type DriveFolder } from "../../lib/sync-api";

type Props = {
  remoteName: string;
  folder: string;
  disabled?: boolean;
  onUseFolder: (dirPath: string) => void;
};

/** One-level folder list for a Drive that is already signed in. */
export function DriveFolderSelect({ remoteName, folder, disabled, onUseFolder }: Props) {
  const [browsePath, setBrowsePath] = useState(folder);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (dirPath: string) => {
      setBusy(true);
      setError(null);
      try {
        const listed = await fetchDriveFolders(remoteName, dirPath);
        setFolders(listed.folders || []);
        setBrowsePath(listed.path || "");
        if (listed.ok === false) setError(listed.error || "Could not list Drive folders.");
      } catch (e) {
        setFolders([]);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [remoteName],
  );

  useEffect(() => {
    setBrowsePath(folder);
    void load(folder);
  }, [folder, load]);

  const parentPath = browsePath.includes("/") ? browsePath.slice(0, browsePath.lastIndexOf("/")) : "";

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hub-directory-body-value min-w-0 flex-1 truncate text-white/70" title={browsePath || "(Drive root)"}>
          {browsePath || "(Drive root)"}
        </span>
        <HubBulkActionButton
          icon={<FolderOpen size={14} aria-hidden />}
          label="Use this folder"
          title="Sync this Drive folder"
          tone="sky"
          disabled={disabled || busy}
          onClick={() => onUseFolder(browsePath)}
        />
      </div>
      {browsePath ? (
        <button
          type="button"
          className="hub-directory-body-value self-start text-cyan-200/90 hover:text-cyan-100"
          onClick={() => void load(parentPath)}
        >
          Up
        </button>
      ) : null}
      {busy ? <p className="hub-directory-body-value text-white/45">Loading folders…</p> : null}
      {error ? <p className="hub-directory-body-value text-rose-200/90">{error}</p> : null}
      {!busy && folders.length === 0 && !error ? (
        <p className="hub-directory-body-value text-white/45">No subfolders. Use this folder to sync it.</p>
      ) : null}
      <ul className="flex max-h-52 min-h-0 flex-col gap-1 overflow-auto">
        {folders.map((item) => (
          <li key={item.path}>
            <button
              type="button"
              className="hub-directory-body-value flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left text-white/85 hover:border-white/20 hover:bg-white/[0.06]"
              onClick={() => void load(item.path)}
            >
              <FolderOpen size={13} className="shrink-0 text-amber-300" aria-hidden />
              <span className="truncate">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
