const IMAGE_URL_RE = /https?:\/\/[^\s<>"']+/gi;
const ZALO_IMAGE_HOST_RE = /photo-[a-z0-9-]+\.zdn\.vn/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp)(\?|$)/i;

function isImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return ZALO_IMAGE_HOST_RE.test(trimmed) || IMAGE_EXT_RE.test(trimmed);
}

function extractImageUrls(text: string): string[] {
  const urls: string[] = [];
  for (const match of text.matchAll(IMAGE_URL_RE)) {
    const url = match[0]!.replace(/[),.]+$/, "");
    if (isImageUrl(url)) urls.push(url);
  }
  return [...new Set(urls)];
}

function isBrokenPreviewUrl(url?: string): boolean {
  if (!url) return true;
  const t = url.trim();
  return t.endsWith("…") || t.endsWith("...");
}

export type HubThreadPreview = {
  text: string;
  imageUrl?: string;
};

export type HubThreadPreviewSource = {
  lastPreview?: string;
  lastPreviewImage?: string;
};

/** Human-readable preview from raw last-message content. */
export function hubThreadPreviewFromContent(content: string): HubThreadPreview {
  const trimmed = content.trim();
  if (!trimmed) return { text: "" };

  if (trimmed === "[Sticker]") return { text: "Sticker" };

  const images = extractImageUrls(trimmed);
  const imageUrl = images[0];
  let text = trimmed;
  for (const url of images) text = text.split(url).join("");
  text = text.replace(/\s+/g, " ").trim();

  const previewText = text || (imageUrl ? "Photo" : trimmed);
  return {
    text: previewText,
    imageUrl: isBrokenPreviewUrl(imageUrl) ? undefined : imageUrl,
  };
}

/** Prefer worker `lastPreviewImage`; fall back to parsing `lastPreview`. */
export function resolveHubThreadPreview(source: HubThreadPreviewSource): HubThreadPreview | null {
  if (source.lastPreviewImage) {
    return { text: source.lastPreview?.trim() || "Photo", imageUrl: source.lastPreviewImage };
  }
  if (!source.lastPreview) return null;
  return hubThreadPreviewFromContent(source.lastPreview);
}
