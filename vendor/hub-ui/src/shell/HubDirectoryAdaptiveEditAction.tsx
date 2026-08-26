import { Pencil, Tags } from "lucide-react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubBulkActionButton } from "./HubBulkActionButton";

export type HubDirectoryAdaptiveEditActionProps = {
  selectedCount: number;
  onEditSingle: () => void;
  onEditBulk: () => void;
  singleLabel?: string;
  bulkLabel?: string;
  noneTitle?: string;
  singleTitle?: string;
  bulkTitle?: string;
  labelHint?: HubDirectoryColumnHintContent;
};

/**
 * SSOT adaptive edit CTA:
 * - 0 rows: disabled (guides user to select rows)
 * - 1 row: single Edit modal
 * - 2+ rows: Bulk Edit modal
 */
export function HubDirectoryAdaptiveEditAction({
  selectedCount,
  onEditSingle,
  onEditBulk,
  singleLabel = "Edit",
  bulkLabel = "Bulk Edit",
  noneTitle = "Select rows to edit",
  singleTitle = "Open detail editor for selected row",
  bulkTitle = "Bulk-edit fields for selected rows",
  labelHint,
}: HubDirectoryAdaptiveEditActionProps) {
  const hasSelection = selectedCount > 0;
  const isBulk = selectedCount > 1;
  return (
    <HubBulkActionButton
      icon={isBulk ? <Tags size={14} aria-hidden /> : <Pencil size={14} aria-hidden />}
      label={isBulk ? bulkLabel : singleLabel}
      title={isBulk ? bulkTitle : hasSelection ? singleTitle : noneTitle}
      tone={isBulk ? "sky" : "indigo"}
      disabled={!hasSelection}
      selectedCount={hasSelection ? selectedCount : undefined}
      onClick={isBulk ? onEditBulk : onEditSingle}
      labelHint={labelHint}
    />
  );
}
