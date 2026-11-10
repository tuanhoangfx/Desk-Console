import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { HUB_ADM_TYPE_MONO_CLASS, HubAdmCopyValueBadge } from "@tool-workspace/hub-ui";
import { openJobPath } from "../../lib/open-job-path";

type Props = {
  kind: "local" | "remote";
  /** rclone spec (`gdrive:Folder`) or a local path. Open always uses this. */
  path: string;
  /** Visible text. Remote rows pass `email/Folder`; open still uses `path`. */
  label?: string;
};

/** Path pill + open icon. Local opens Explorer. Remote opens the Drive folder. */
export function JobPathCell({ kind, path, label }: Props) {
  const openPath = path.trim();
  const shown = (label ?? path).trim();
  const [error, setError] = useState<string | null>(null);
  if (!shown) return <span className="hub-directory-body-value text-white/40">—</span>;

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <span className="min-w-0 flex-1">
        <HubAdmCopyValueBadge
          value={shown}
          label={shown}
          title={kind === "local" ? "Local path" : shown}
          copyToastLabel={kind === "local" ? "Local path copied" : "Remote path copied"}
          className={`${HUB_ADM_TYPE_MONO_CLASS} w-full max-w-full`}
        />
      </span>
      <button
        type="button"
        className="folder-sync-path-btn"
        title={error || (kind === "local" ? "Open local folder" : "Open in Google Drive")}
        aria-label={kind === "local" ? "Open local folder" : "Open in Google Drive"}
        onClick={() => {
          setError(null);
          void openJobPath(kind, openPath).catch((e) => setError(e instanceof Error ? e.message : String(e)));
        }}
      >
        <FolderOpen size={13} aria-hidden />
      </button>
      {error ? <span className="sr-only">{error}</span> : null}
    </span>
  );
}
