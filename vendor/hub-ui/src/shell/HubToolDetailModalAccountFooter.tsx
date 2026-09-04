import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Trash2, X } from "lucide-react";
import {
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "./HubToolDetailModalActions";
import {
  HUB_DETAIL_MODAL_CLOSE_LABEL,
  HUB_DETAIL_MODAL_SAVE_LABEL,
  HUB_DETAIL_MODAL_SAVING_LABEL,
} from "./hubToolDetailModalFooter";

export type HubToolDetailModalAccountFooterProps = {
  onClose: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
  /** Close button icon — Layout-3 SSOT defaults to X. */
  closeIcon?: LucideIcon;
  onSave?: () => void;
  saveLabel?: string;
  /** Busy label for Save/Apply — defaults to Saving…. */
  saveBusyLabel?: string;
  saveDisabled?: boolean;
  saveIcon?: LucideIcon;
  saveVariant?: "default" | "create";
  busy?: boolean;
  /** Destructive CTA — primary danger, after Close (never left-split). */
  onDelete?: () => void;
  deleteLabel?: string;
  deleteIcon?: LucideIcon;
  /** Subtle hotkey chip beside Delete (e.g. Del) — hidden while busy. */
  deleteHotkeyHint?: string;
  /**
   * Extra secondary actions after Close/Delete (View customer, View orders, …).
   * Rendered in the same centered cluster — do not use left/right split.
   */
  leading?: ReactNode;
  /** Replaces default Save (Edit toggle, readonly Close-only, …). */
  saveSlot?: ReactNode;
};

/**
 * Golden account-detail footer — single centered cluster:
 * **Save → trailing secondaries (`leading`) → Close → Delete?**.
 *
 * Reference: P0020 TwofaAccountDetailModal · P0005 Order/Customer Detail.
 */
export function HubToolDetailModalAccountFooter({
  onClose,
  closeLabel = HUB_DETAIL_MODAL_CLOSE_LABEL,
  closeDisabled,
  closeIcon = X,
  onSave,
  saveLabel = HUB_DETAIL_MODAL_SAVE_LABEL,
  saveBusyLabel = HUB_DETAIL_MODAL_SAVING_LABEL,
  saveDisabled,
  saveIcon,
  saveVariant = "default",
  busy,
  onDelete,
  deleteLabel = "Delete",
  deleteIcon = Trash2,
  deleteHotkeyHint,
  leading,
  saveSlot,
}: HubToolDetailModalAccountFooterProps) {
  return (
    <div className="hub-tool-detail-modal__footer-bar">
      <div className="hub-tool-detail-modal__footer-main">
        {saveSlot ??
          (onSave ? (
            <HubToolDetailModalPrimaryAction
              label={saveLabel}
              busyLabel={saveBusyLabel}
              onClick={onSave}
              disabled={saveDisabled}
              busy={busy}
              icon={saveIcon}
              variant={saveVariant}
            />
          ) : null)}
        {leading}
        <HubToolDetailModalSecondaryAction
          label={closeLabel}
          onClick={onClose}
          disabled={closeDisabled ?? busy}
          icon={closeIcon}
          close
        />
        {onDelete ? (
          <span className="hub-tool-detail-modal__delete-wrap">
            <HubToolDetailModalPrimaryAction
              label={deleteLabel}
              onClick={onDelete}
              danger
              disabled={busy}
              icon={deleteIcon}
            />
            {deleteHotkeyHint && !busy ? (
              <kbd className="hub-tool-detail-modal__hotkey-hint" aria-hidden>
                {deleteHotkeyHint}
              </kbd>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
