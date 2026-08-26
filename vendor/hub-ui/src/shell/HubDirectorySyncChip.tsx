import { AlertCircle, Check, RefreshCw } from "lucide-react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubDirectoryColumnHint } from "../table/HubDirectoryColumnHint";
import { MetaChip } from "./CopyMetaChip";
import {
  hubDirectorySyncChipHintContent,
  type HubDirectorySyncChipView,
} from "./hub-directory-sync-chip";

export type HubDirectorySyncChipProps = {
  view: HubDirectorySyncChipView;
  /** Domain hint (vault / CRM). Defaults to generic hub-ui copy. */
  hint?: HubDirectoryColumnHintContent;
  onErrorActivate?: (detail?: string) => void;
  onPendingActivate?: () => void;
};

function syncingReason(view: HubDirectorySyncChipView): string | undefined {
  return view.kind === "syncing" ? view.reason ?? "directory-mirror" : undefined;
}

function livePath(view: HubDirectorySyncChipView): string | undefined {
  return view.kind === "live" ? view.path ?? "push" : undefined;
}

/** Hub header Live / Syncing… / Sync error — P0020 vault + P0005 CRM (and later tools). */
export function HubDirectorySyncChip({
  view,
  hint,
  onErrorActivate,
  onPendingActivate,
}: HubDirectorySyncChipProps) {
  if (view.kind === "hidden") return null;

  const content = hint ?? hubDirectorySyncChipHintContent(view);
  const kind = view.kind;
  const reason = syncingReason(view);
  const path = livePath(view);
  const errorClick = kind === "error" && onErrorActivate ? () => onErrorActivate(view.detail) : undefined;
  const pendingClick =
    kind === "pending" && onPendingActivate ? () => onPendingActivate() : undefined;
  const onClick = errorClick ?? pendingClick;
  const spinning = kind === "syncing" || kind === "live-reconnecting";
  const icon =
    kind === "live" ? (
      <Check size={11} />
    ) : kind === "error" ? (
      <AlertCircle size={11} />
    ) : (
      <RefreshCw size={11} className={spinning ? "animate-spin" : undefined} />
    );

  return (
    <span
      data-hub-directory-sync-chip={kind}
      data-hub-vault-sync-chip={kind}
      {...(path
        ? { "data-hub-directory-sync-path": path, "data-hub-vault-live-path": path }
        : {})}
      {...(reason
        ? { "data-hub-directory-sync-reason": reason, "data-hub-vault-sync-reason": reason }
        : {})}
    >
      <HubDirectoryColumnHint content={content}>
        <MetaChip
          icon={icon}
          label={view.label}
          tone={view.tone}
          className={onClick ? "cursor-pointer" : undefined}
          onClick={onClick}
        />
      </HubDirectoryColumnHint>
    </span>
  );
}
