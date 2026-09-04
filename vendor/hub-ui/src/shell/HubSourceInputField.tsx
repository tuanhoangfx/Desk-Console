import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubAdmClickEditField } from "./HubAdmClickEditField";
import { HubSegmentToggle, hubSegmentIconSize, type HubSegmentToggleOption } from "./HubSegmentToggle";
import "./hub-source-input-field.css";

export type HubSourceDropActiveTone = "sky" | "orange";

export type HubSourceInputFieldProps<T extends string = string> = {
  header: HubTableColumnHeaderProps;
  fieldLabel: string;
  labelHint?: HubDirectoryColumnHintContent;
  className?: string;
  controlClassName?: string;
  inputClassName?: string;
  showCopyAction?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  /** When true, primary field is read-only (file/image secondary mode). */
  fieldReadOnly?: boolean;
  placeholder?: string;
  mode: T;
  onModeChange: (mode: T) => void;
  toggleOptions: HubSegmentToggleOption<T>[];
  /** Enables Paste · Drop · Browse zone (secondary segment). */
  dropzoneActive: boolean;
  onFilePick: (file: File) => void;
  accept?: string;
  maxBytes?: number;
  dropActiveTone?: HubSourceDropActiveTone;
  dropzoneTitle?: string;
  dropzoneBlockedTitle?: string;
  resolveFileFromDataTransfer?: (dataTransfer: DataTransfer) => File | undefined;
  trailingAfterToggle?: ReactNode;
};

function defaultResolveFile(dataTransfer: DataTransfer): File | undefined {
  return dataTransfer.files?.[0];
}

export function HubSourceInputField<T extends string = string>({
  header,
  fieldLabel,
  labelHint,
  className = "",
  controlClassName = "field auth-gate-field twofa-adm-control",
  inputClassName = "",
  showCopyAction = false,
  disabled = false,
  value,
  onChange,
  fieldReadOnly = false,
  placeholder,
  mode,
  onModeChange,
  toggleOptions,
  dropzoneActive,
  onFilePick,
  accept,
  maxBytes,
  dropActiveTone = "sky",
  dropzoneTitle = "Paste, drop, or browse a file",
  dropzoneBlockedTitle = "Switch segment to paste or drop",
  resolveFileFromDataTransfer = defaultResolveFile,
  trailingAfterToggle,
}: HubSourceInputFieldProps<T>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const dragDepthRef = useRef(0);
  const segmentIconPx = hubSegmentIconSize();

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled || !dropzoneActive) return;
      if (maxBytes != null && file.size > maxBytes) return;
      onFilePick(file);
    },
    [disabled, dropzoneActive, maxBytes, onFilePick],
  );

  useEffect(() => {
    if (!dropzoneActive) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = resolveFileFromDataTransfer(event.clipboardData ?? new DataTransfer());
      if (!file) return;
      event.preventDefault();
      acceptFile(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [acceptFile, dropzoneActive, resolveFileFromDataTransfer]);

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!dropzoneActive || ![...event.dataTransfer.types].includes("Files")) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setFileDrag(true);
    },
    [dropzoneActive],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!dropzoneActive || ![...event.dataTransfer.types].includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [dropzoneActive],
  );

  const onDragLeave = useCallback(() => {
    if (!dropzoneActive) return;
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setFileDrag(false);
    }
  }, [dropzoneActive]);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setFileDrag(false);
      if (!dropzoneActive) return;
      acceptFile(resolveFileFromDataTransfer(event.dataTransfer));
    },
    [acceptFile, dropzoneActive, resolveFileFromDataTransfer],
  );

  const onBrowse = useCallback(() => {
    if (!dropzoneActive || disabled) return;
    inputRef.current?.click();
  }, [disabled, dropzoneActive]);

  const onFilePicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      acceptFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [acceptFile],
  );

  const inlineToneClass = `hub-source-input-inline--tone-${dropActiveTone}`;

  return (
    <HubAdmClickEditField
      className={["hub-source-input-line", className].filter(Boolean).join(" ")}
      header={header}
      fieldLabel={fieldLabel}
      labelHint={labelHint}
      value={value}
      onChange={fieldReadOnly ? () => undefined : onChange}
      disabled={disabled || fieldReadOnly}
      placeholder={placeholder}
      inputClassName={inputClassName}
      controlClassName={controlClassName}
      showCopyAction={showCopyAction}
      trailingAction={
        <>
          <div
            className={[
              "hub-source-input-inline",
              inlineToneClass,
              dropzoneActive ? "" : "hub-source-input-inline--blocked",
              fileDrag ? "hub-source-input-inline--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-disabled={!dropzoneActive}
            title={dropzoneActive ? dropzoneTitle : dropzoneBlockedTitle}
          >
            <span className="hub-source-input-inline__text">Paste · Drop · Browse</span>
            <button
              type="button"
              className="hub-source-input-inline__browse"
              onClick={onBrowse}
              disabled={!dropzoneActive || disabled}
              aria-label="Browse file"
            >
              <FolderOpen size={segmentIconPx} aria-hidden />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="sr-only"
              tabIndex={-1}
              disabled={disabled || !dropzoneActive}
              onChange={onFilePicked}
            />
          </div>
          <HubSegmentToggle
            className="hub-source-input-line__toggle"
            value={mode}
            onChange={onModeChange}
            options={toggleOptions}
          />
          {trailingAfterToggle}
        </>
      }
    />
  );
}
