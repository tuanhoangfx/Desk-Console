/**
 * Public landing + illustrated guide + video tutorial. Rendered by the P0008 Landing Platform
 * (`Tool/P0008-Landing-Platform/sites/sync`) and mounted under /intro/ on the app's own domain.
 */
export const P0009_SITE_URL = "https://sync.infi.io.vn/intro/";

export type P0009GuidePath = "" | "guide/" | "download/" | "#video";

/** Open the public guide in the system browser (Electron) or a new tab (web). */
export async function openP0009Guide(path: P0009GuidePath = "guide/"): Promise<void> {
  const url = `${P0009_SITE_URL}${path}`;
  const viaDesktop = await window.folderSyncDesktop?.openExternal?.(url).catch(() => null);
  if (viaDesktop?.ok) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
