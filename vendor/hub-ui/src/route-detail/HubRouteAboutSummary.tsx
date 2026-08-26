import { Hash, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { CopyMetaChip } from "../shell/CopyMetaChip";

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export type HubRouteAboutSummaryProps = {
  /** Stat chips row — vault count, sync, share, publish (P0020 card parity). */
  chips?: ReactNode;
  noteId?: string | null;
  syncId?: string | null;
  copiedField?: string | null;
  onCopy?: (field: string, value: string) => void;
};

/** Route detail About — stat chips + copyable Route TM / Note ID. */
export function HubRouteAboutSummary({
  chips,
  noteId,
  syncId,
  onCopy,
}: HubRouteAboutSummaryProps) {
  const noteFull = noteId?.trim() ?? "";
  const noteShort = noteFull ? shortId(noteFull) : "—";
  const syncFull = syncId?.trim() ?? "";
  const syncShort = syncFull ? (syncFull.length > 12 ? syncFull : syncFull) : "—";

  return (
    <div className="hub-route-about-summary">
      {chips ? <div className="hub-route-about-summary__chips">{chips}</div> : null}
      {syncFull || noteFull ? (
        <p className="hub-route-about-summary__line hub-route-about-summary__line--ids">
          {syncFull ? (
            <CopyMetaChip
              icon={<RefreshCw size={11} />}
              label={syncShort}
              value={syncFull}
              tone="cyan"
              title="Route TM sync ID"
              className="font-mono text-[10px]"
              onCopied={() => onCopy?.("sync", syncFull)}
            />
          ) : null}
          {noteFull ? (
            <CopyMetaChip
              icon={<Hash size={11} />}
              label={noteShort}
              value={noteFull}
              tone="indigo"
              title="Note ID"
              className="font-mono text-[10px]"
              onCopied={() => onCopy?.("note", noteFull)}
            />
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
