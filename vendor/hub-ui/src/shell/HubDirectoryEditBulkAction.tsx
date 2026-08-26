import { Pencil } from "lucide-react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubBulkActionButton } from "./HubBulkActionButton";

export type HubDirectoryEditBulkActionProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  selectedCount?: number;
  labelHint?: HubDirectoryColumnHintContent;
};

/** SSOT directory bulk Edit — indigo tone. */
export function HubDirectoryEditBulkAction({
  title,
  onClick,
  disabled = false,
  selectedCount,
  labelHint,
}: HubDirectoryEditBulkActionProps) {
  return (
    <HubBulkActionButton
      icon={<Pencil size={14} aria-hidden />}
      label="Edit"
      title={title}
      tone="indigo"
      disabled={disabled}
      selectedCount={selectedCount}
      onClick={onClick}
      labelHint={labelHint}
    />
  );
}
