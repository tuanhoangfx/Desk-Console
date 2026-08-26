import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  clampHubAvatarCropOffset,
  HUB_AVATAR_CROP_VIEWPORT_PX,
  hubAvatarCropLayout,
  type HubAvatarCropState,
} from "./hub-avatar-crop";

export type HubAvatarSquareCropProps = {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  disabled?: boolean;
  onChange: (state: HubAvatarCropState) => void;
  state: HubAvatarCropState;
};

/** Square viewport — drag to pan, range to zoom (1:1 crop SSOT). */
export function HubAvatarSquareCrop({
  imageUrl,
  naturalWidth,
  naturalHeight,
  disabled = false,
  state,
  onChange,
}: HubAvatarSquareCropProps) {
  const viewport = HUB_AVATAR_CROP_VIEWPORT_PX;
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const clamped = clampHubAvatarCropOffset(
    naturalWidth,
    naturalHeight,
    viewport,
    state.zoom,
    state.offsetX,
    state.offsetY,
  );
  const layout = hubAvatarCropLayout(naturalWidth, naturalHeight, viewport, clamped);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: clamped.offsetX, oy: clamped.offsetY };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || disabled) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    onChange(
      clampHubAvatarCropOffset(
        naturalWidth,
        naturalHeight,
        viewport,
        clamped.zoom,
        dragRef.current.ox + dx,
        dragRef.current.oy + dy,
      ),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        className={`relative overflow-hidden rounded-2xl bg-black/40 touch-none ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{ width: viewport, height: viewport }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="Crop avatar — drag to reposition"
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: layout.width,
            height: layout.height,
            left: layout.left,
            top: layout.top,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20"
          aria-hidden
        />
      </div>
      <label className="flex w-full max-w-[16rem] items-center gap-2 text-xs text-[var(--muted)]">
        <span className="w-10 shrink-0">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={clamped.zoom}
          disabled={disabled}
          className="min-w-0 flex-1 accent-indigo-400"
          onChange={(e) =>
            onChange(
              clampHubAvatarCropOffset(
                naturalWidth,
                naturalHeight,
                viewport,
                Number(e.target.value),
                clamped.offsetX,
                clamped.offsetY,
              ),
            )
          }
        />
      </label>
    </div>
  );
}
