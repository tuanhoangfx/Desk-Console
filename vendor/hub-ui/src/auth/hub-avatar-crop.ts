/** Square avatar crop — pure canvas helpers (no crop library). */

export const HUB_AVATAR_CROP_VIEWPORT_PX = 256;
export const HUB_AVATAR_CROP_OUTPUT_PX = 512;
/** Source pick can be larger; cropped JPEG stays under upload limit. */
export const HUB_AVATAR_CROP_SOURCE_MAX_BYTES = 15 * 1024 * 1024;

export type HubAvatarCropState = {
  /** Pan in viewport px (image moves with pointer). */
  offsetX: number;
  offsetY: number;
  /** 1 = cover viewport; >1 zooms in. */
  zoom: number;
};

export function hubAvatarCoverScale(
  naturalW: number,
  naturalH: number,
  viewportPx: number,
  zoom: number,
): number {
  const cover = viewportPx / Math.min(naturalW, naturalH);
  return cover * Math.max(1, zoom);
}

export function clampHubAvatarCropOffset(
  naturalW: number,
  naturalH: number,
  viewportPx: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): HubAvatarCropState {
  const scale = hubAvatarCoverScale(naturalW, naturalH, viewportPx, zoom);
  const dw = naturalW * scale;
  const dh = naturalH * scale;
  const minX = Math.min(0, viewportPx - dw);
  const maxX = Math.max(0, viewportPx - dw);
  const minY = Math.min(0, viewportPx - dh);
  const maxY = Math.max(0, viewportPx - dh);
  // Image is centered then offset; clamp so viewport stays covered.
  const baseX = (viewportPx - dw) / 2;
  const baseY = (viewportPx - dh) / 2;
  const left = baseX + offsetX;
  const top = baseY + offsetY;
  const clampedLeft = Math.min(maxX, Math.max(minX, left));
  const clampedTop = Math.min(maxY, Math.max(minY, top));
  return {
    offsetX: clampedLeft - baseX,
    offsetY: clampedTop - baseY,
    zoom: Math.max(1, zoom),
  };
}

export function hubAvatarCropLayout(
  naturalW: number,
  naturalH: number,
  viewportPx: number,
  state: HubAvatarCropState,
): { scale: number; left: number; top: number; width: number; height: number } {
  const clamped = clampHubAvatarCropOffset(
    naturalW,
    naturalH,
    viewportPx,
    state.zoom,
    state.offsetX,
    state.offsetY,
  );
  const scale = hubAvatarCoverScale(naturalW, naturalH, viewportPx, clamped.zoom);
  const width = naturalW * scale;
  const height = naturalH * scale;
  const left = (viewportPx - width) / 2 + clamped.offsetX;
  const top = (viewportPx - height) / 2 + clamped.offsetY;
  return { scale, left, top, width, height };
}

export async function loadImageFromBlobUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

/** Export 1:1 JPEG from current pan/zoom (viewport → output square). */
export async function exportHubAvatarSquareJpeg(
  img: HTMLImageElement,
  state: HubAvatarCropState,
  opts?: { viewportPx?: number; outputPx?: number; quality?: number },
): Promise<File> {
  const viewportPx = opts?.viewportPx ?? HUB_AVATAR_CROP_VIEWPORT_PX;
  const outputPx = opts?.outputPx ?? HUB_AVATAR_CROP_OUTPUT_PX;
  const quality = opts?.quality ?? 0.92;
  const layout = hubAvatarCropLayout(img.naturalWidth, img.naturalHeight, viewportPx, state);
  const sx = -layout.left / layout.scale;
  const sy = -layout.top / layout.scale;
  const sSize = viewportPx / layout.scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputPx;
  canvas.height = outputPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputPx, outputPx);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop export failed."))),
      "image/jpeg",
      quality,
    );
  });
  return new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
}
