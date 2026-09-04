import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, Check, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { HUB_AVATAR_ACCEPT, HUB_AVATAR_MAX_BYTES } from "@tool-workspace/hub-identity";
import { HubToolDetailModal } from "../shell/HubToolDetailModal";
import {
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "../shell/HubToolDetailModalActions";
import { HubAvatarSquareCrop } from "./HubAvatarSquareCrop";
import {
  exportHubAvatarSquareJpeg,
  HUB_AVATAR_CROP_SOURCE_MAX_BYTES,
  loadImageFromBlobUrl,
  type HubAvatarCropState,
} from "./hub-avatar-crop";

export type HubAccountAvatarEditorProps = {
  initials: string;
  avatarUrl: string | null;
  disabled?: boolean;
  busy?: boolean;
  onUpload: (file: File) => Promise<{ ok: boolean; message: string; avatarUrl?: string }>;
  onClear: () => Promise<{ ok: boolean; message: string }>;
  onMessage?: (message: string, ok: boolean) => void;
  onAvatarUrlChange?: (url: string | null) => void;
};

function firstImageFile(list: FileList | DataTransferItemList | null | undefined): File | undefined {
  if (!list) return undefined;
  if (list instanceof FileList) {
    for (const file of Array.from(list)) {
      if (file.type.startsWith("image/")) return file;
    }
    return undefined;
  }
  for (const item of Array.from(list)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file?.type.startsWith("image/")) return file;
    }
  }
  return undefined;
}

const DEFAULT_CROP: HubAvatarCropState = { offsetX: 0, offsetY: 0, zoom: 1 };

/** Header avatar — detail modal with 1:1 crop before upload. */
export function HubAccountAvatarEditor({
  initials,
  avatarUrl,
  disabled = false,
  busy = false,
  onUpload,
  onClear,
  onMessage,
  onAvatarUrlChange,
}: HubAccountAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stickyUrl, setStickyUrl] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [cropNatural, setCropNatural] = useState<{ w: number; h: number } | null>(null);
  const [cropState, setCropState] = useState<HubAvatarCropState>(DEFAULT_CROP);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const working = busy || localBusy;
  const cropping = Boolean(cropUrl && cropNatural);
  const displayUrl = stickyUrl || previewUrl || avatarUrl;

  useEffect(() => {
    if (avatarUrl && stickyUrl && avatarUrl === stickyUrl) {
      setStickyUrl(null);
    }
  }, [avatarUrl, stickyUrl]);

  useEffect(() => {
    return () => {
      if (cropUrl) URL.revokeObjectURL(cropUrl);
    };
  }, [cropUrl]);

  const clearCrop = useCallback(() => {
    setCropUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCropNatural(null);
    setCropState(DEFAULT_CROP);
    cropImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const pickFile = () => {
    if (disabled || working) return;
    inputRef.current?.click();
  };

  const beginCrop = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > HUB_AVATAR_CROP_SOURCE_MAX_BYTES) {
      onMessage?.("Image must be 15 MB or smaller.", false);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageFromBlobUrl(objectUrl);
      cropImgRef.current = img;
      setCropUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setCropNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setCropState(DEFAULT_CROP);
      setDetailOpen(true);
    } catch {
      URL.revokeObjectURL(objectUrl);
      onMessage?.("Could not load image.", false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyCrop = async () => {
    const img = cropImgRef.current;
    if (!img || disabled || working) return;
    setLocalBusy(true);
    try {
      const file = await exportHubAvatarSquareJpeg(img, cropState);
      if (file.size > HUB_AVATAR_MAX_BYTES) {
        onMessage?.("Cropped avatar must be 2 MB or smaller.", false);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      const result = await onUpload(file);
      onMessage?.(result.message, result.ok);
      if (result.ok && result.avatarUrl) {
        setStickyUrl(result.avatarUrl);
        onAvatarUrlChange?.(result.avatarUrl);
        setPreviewUrl(null);
        clearCrop();
      } else if (!result.ok) {
        setPreviewUrl(null);
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Crop failed.", false);
    } finally {
      setLocalBusy(false);
    }
  };

  const handleClear = async () => {
    if (disabled || working || !displayUrl || cropping) return;
    setLocalBusy(true);
    try {
      const result = await onClear();
      onMessage?.(result.message, result.ok);
      if (result.ok) {
        setPreviewUrl(null);
        setStickyUrl(null);
        onAvatarUrlChange?.(null);
      }
    } finally {
      setLocalBusy(false);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || working || cropping) return;
    setDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled || working || cropping) return;
    void beginCrop(firstImageFile(e.dataTransfer?.files) ?? firstImageFile(e.dataTransfer?.items));
  };

  const onCloseModal = () => {
    if (working) return;
    clearCrop();
    setDetailOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="user-access-modal__avatar relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-indigo-300/35 bg-indigo-500/25 text-sm font-bold text-indigo-50 disabled:opacity-60"
        title="Avatar details"
        aria-label="Open avatar details"
        disabled={disabled || working}
        onClick={() => setDetailOpen(true)}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => {
              if (stickyUrl === displayUrl) setStickyUrl(null);
              if (previewUrl === displayUrl) setPreviewUrl(null);
            }}
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-0.5">
          <Camera size={10} className="text-white" aria-hidden />
        </span>
      </button>

      <HubToolDetailModal
        open={detailOpen}
        onClose={onCloseModal}
        title={cropping ? "Crop avatar" : "Avatar"}
        titleId="hub-avatar-detail-title"
        headerIcon={Camera}
        headerIconClassName="text-indigo-200"
        size="compact"
        stacked
        ariaLabelledBy="hub-avatar-detail-title"
        busy={working}
        busyLabel="Saving…"
        footer={
          <div className="hub-tool-detail-modal__footer-bar">
            <div className="hub-tool-detail-modal__footer-main">
              {cropping ? (
                <>
                  <HubToolDetailModalSecondaryAction
                    label="Cancel"
                    icon={X}
                    disabled={working}
                    onClick={clearCrop}
                  />
                  <HubToolDetailModalPrimaryAction
                    label={working ? "Saving…" : "Apply"}
                    icon={Check}
                    disabled={disabled || working}
                    busy={working}
                    onClick={() => void applyCrop()}
                  />
                </>
              ) : (
                <>
                  {displayUrl ? (
                    <HubToolDetailModalSecondaryAction
                      label={working ? "Removing…" : "Delete"}
                      icon={Trash2}
                      tone="rose"
                      disabled={disabled || working}
                      onClick={() => void handleClear()}
                    />
                  ) : null}
                  <HubToolDetailModalPrimaryAction
                    label={
                      displayUrl
                        ? working
                          ? "Uploading…"
                          : "Replace"
                        : working
                          ? "Uploading…"
                          : "Upload"
                    }
                    icon={ImagePlus}
                    disabled={disabled || working}
                    onClick={pickFile}
                  />
                </>
              )}
            </div>
          </div>
        }
      >
        {cropping && cropUrl && cropNatural ? (
          <div className="flex flex-col items-center gap-2 px-2 py-4">
            <HubAvatarSquareCrop
              imageUrl={cropUrl}
              naturalWidth={cropNatural.w}
              naturalHeight={cropNatural.h}
              disabled={working}
              state={cropState}
              onChange={setCropState}
            />
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center gap-3 px-2 py-5 ${
              disabled || working ? "opacity-60" : ""
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <button
              type="button"
              className={`grid h-44 w-44 place-items-center overflow-hidden rounded-2xl bg-indigo-500/12 text-3xl font-bold text-indigo-50 outline-none transition-[box-shadow,ring] focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
                dragOver
                  ? "ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-[var(--panel,#0f1219)]"
                  : ""
              } ${disabled || working ? "cursor-not-allowed" : "cursor-pointer"}`}
              disabled={disabled || working}
              onClick={pickFile}
              aria-label={displayUrl ? "Replace avatar — drop image or click" : "Upload avatar — drop image or click"}
            >
              {displayUrl ? (
                <img src={displayUrl} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="flex flex-col items-center gap-2 text-indigo-200/90" aria-hidden>
                  <Upload size={28} strokeWidth={1.5} />
                  <span className="text-2xl font-bold">{initials}</span>
                </span>
              )}
            </button>
            {working ? (
              <span className="text-xs text-indigo-200/80" role="status">
                Saving…
              </span>
            ) : null}
          </div>
        )}
      </HubToolDetailModal>

      <input
        ref={inputRef}
        type="file"
        accept={HUB_AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => void beginCrop(e.target.files?.[0])}
      />
    </>
  );
}
