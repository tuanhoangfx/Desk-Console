import { Trash2 } from "lucide-react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubBulkActionButton } from "./HubBulkActionButton";

export type HubDirectoryDeleteBulkActionProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  labelHint?: HubDirectoryColumnHintContent;
};

/** SSOT directory bulk Delete — rose tone. */
export function HubDirectoryDeleteBulkAction({
  title,
  onClick,
  disabled = false,
  label = "Delete",
  labelHint,
}: HubDirectoryDeleteBulkActionProps) {
  return (
    <HubBulkActionButton
      icon={<Trash2 size={14} aria-hidden />}
      label={label}
      title={title}
      tone="rose"
      disabled={disabled}
      onClick={onClick}
      labelHint={labelHint}
    />
  );
}
