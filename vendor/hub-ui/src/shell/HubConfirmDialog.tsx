import type { ReactNode } from "react";
import { AlertTriangle, Check, Trash2, X, type LucideIcon } from "lucide-react";
import { HubToolDetailModal } from "./HubToolDetailModal";
import {
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "./HubToolDetailModalActions";

export type HubConfirmTone = "danger" | "warning" | "info";

export type HubConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: HubConfirmTone;
  icon?: LucideIcon;
  confirmBusy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const toneIconClass: Record<HubConfirmTone, string> = {
  danger: "text-rose-300",
  warning: "text-amber-300",
  info: "text-indigo-300",
};

/** In-app confirm — HubToolDetailModal shell (replaces window.confirm). */
export function HubConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  icon: Icon = AlertTriangle,
  confirmBusy = false,
  onConfirm,
  onClose,
}: HubConfirmDialogProps) {
  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="hub-confirm-title"
      headerIcon={Icon}
      headerIconClassName={toneIconClass[tone]}
      size="compact"
      ariaLabelledBy="hub-confirm-title"
      footer={
        <>
          <HubToolDetailModalSecondaryAction
            label={cancelLabel}
            onClick={onClose}
            disabled={confirmBusy}
            icon={X}
          />
          <HubToolDetailModalPrimaryAction
            label={confirmLabel}
            onClick={onConfirm}
            disabled={confirmBusy}
            busy={confirmBusy}
            danger={tone === "danger"}
            icon={tone === "danger" ? Trash2 : Check}
          />
        </>
      }
    >
      <div id="hub-confirm-desc" className="px-1 text-center text-sm leading-relaxed text-[var(--muted)]">
        {message}
      </div>
    </HubToolDetailModal>
  );
}
