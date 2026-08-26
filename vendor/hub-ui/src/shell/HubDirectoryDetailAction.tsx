import { Info } from "lucide-react";
import { HubBulkActionButton } from "./HubBulkActionButton";

export type HubDirectoryDetailActionProps = {
  disabled?: boolean;
  /** Use “Bulk Detail” only when the target is a multi-record operation. */
  label?: "Detail" | "Bulk Detail";
  onClick: () => void;
};

/**
 * Single Detail CTA contract for every Hub directory action rail.
 * Styling delegates to HubBulkActionButton — the same control family as Bulk Detail.
 */
export function HubDirectoryDetailAction({
  disabled = false,
  label = "Detail",
  onClick,
}: HubDirectoryDetailActionProps) {
  return (
    <HubBulkActionButton
      icon={<Info size={14} aria-hidden />}
      label={label}
      title={label === "Bulk Detail" ? "View selected record details" : "View record details"}
      tone="indigo"
      disabled={disabled}
      onClick={onClick}
    />
  );
}
