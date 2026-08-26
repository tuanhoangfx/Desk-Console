import { useEffect, useId, useState } from "react";
import { LayoutTemplate, Save, X, type LucideIcon } from "lucide-react";
import { HUB_NO_SPELLCHECK_PROPS } from "../lib/no-spellcheck";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "./HubToolDetailModal";

export type HubPromptDialogProps = {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  headerIcon?: LucideIcon;
  headerIconClassName?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

/** In-app text prompt — HubToolDetailModal shell (replaces window.prompt). */
export function HubPromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = "",
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  headerIcon: HeaderIcon = LayoutTemplate,
  headerIconClassName = "text-indigo-300",
  onConfirm,
  onClose,
}: HubPromptDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="hub-prompt-title"
      headerIcon={HeaderIcon}
      headerIconClassName={headerIconClassName}
      size="compact"
      ariaLabelledBy="hub-prompt-title"
      footer={
        <>
          <HubToolDetailModalSecondaryAction label={cancelLabel} onClick={onClose} icon={X} />
          <HubToolDetailModalPrimaryAction
            label={confirmLabel}
            onClick={submit}
            disabled={!value.trim()}
            icon={Save}
          />
        </>
      }
    >
      <div className="space-y-2 px-1">
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text)]">
          {label}
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="field h-[var(--hub-control-h)] w-full min-w-0 text-sm"
          autoFocus
          {...HUB_NO_SPELLCHECK_PROPS}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
    </HubToolDetailModal>
  );
}
