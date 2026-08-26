import { Plus, type LucideIcon } from "lucide-react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubBulkActionButton } from "./HubBulkActionButton";
import {
  HUB_DIRECTORY_NEW_ACTION_LABEL,
  HUB_DIRECTORY_NEW_ACTION_TONE,
} from "./hub-directory-new-action";

export type HubDirectoryNewBulkActionProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  labelHint?: HubDirectoryColumnHintContent;
};

/** SSOT directory create CTA — emerald `New` matching HubDirectoryCrudBulkActions primary. */
export function HubDirectoryNewBulkAction({
  title,
  onClick,
  disabled = false,
  icon: Icon = Plus,
  labelHint,
}: HubDirectoryNewBulkActionProps) {
  return (
    <HubBulkActionButton
      icon={<Icon size={14} aria-hidden />}
      label={HUB_DIRECTORY_NEW_ACTION_LABEL}
      title={title}
      tone={HUB_DIRECTORY_NEW_ACTION_TONE}
      disabled={disabled}
      onClick={onClick}
      labelHint={labelHint}
    />
  );
}
