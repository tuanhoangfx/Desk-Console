import type { LucideIcon } from "lucide-react";
import { Save, Trash2 } from "lucide-react";
import {
  HubToolDetailModalPrimaryAction,
} from "./HubToolDetailModalActions";
import { HUB_DETAIL_MODAL_SAVING_LABEL } from "./hubToolDetailModalFooter";

export type HubToolDetailModalFooterActionsProps = {
  saveLabel: string;
  saveIcon?: LucideIcon;
  onSave: () => void;
  saveDisabled?: boolean;
  busy?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteIcon?: LucideIcon;
};

/** Golden footer row — optional delete (left) + primary save (right). Compact forms without Close. */
export function HubToolDetailModalFooterActions({
  saveLabel,
  saveIcon = Save,
  onSave,
  saveDisabled,
  busy,
  showDelete,
  onDelete,
  deleteLabel = "Delete",
  deleteIcon = Trash2,
}: HubToolDetailModalFooterActionsProps) {
  return (
    <div className="hub-tool-detail-modal__footer-bar hub-tool-detail-modal__footer-bar--split">
      {showDelete && onDelete ? (
        <div className="hub-tool-detail-modal__footer-leading">
          <HubToolDetailModalPrimaryAction
            label={deleteLabel}
            onClick={onDelete}
            danger
            disabled={busy}
            icon={deleteIcon}
          />
        </div>
      ) : null}
      <div className="hub-tool-detail-modal__footer-main ml-auto">
        <HubToolDetailModalPrimaryAction
          label={saveLabel}
          busyLabel={HUB_DETAIL_MODAL_SAVING_LABEL}
          onClick={onSave}
          disabled={saveDisabled}
          busy={busy}
          icon={saveIcon}
        />
      </div>
    </div>
  );
}
