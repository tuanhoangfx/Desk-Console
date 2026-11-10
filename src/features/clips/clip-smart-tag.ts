import type { ClipRow } from "../../lib/api";

export type ClipSmartTag =
  | { kind: "image"; label: string; badgeClass: string }
  | { kind: "color"; label: string; colorHex: string; badgeClass: string }
  | { kind: "url"; label: "URL"; href: string; badgeClass: string }
  | { kind: "path"; label: "Path"; filePath: string; badgeClass: string }
  | { kind: "json"; label: "JSON"; badgeClass: string };

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const WIN_PATH_RE = /^(?:[a-zA-Z]:[\\/]|\\\\[^\s\\/]+[\\/])[^\r\n]{1,260}$/;

export function detectClipSmartTag(row: ClipRow): ClipSmartTag | null {
  if (row.imageDataUrl || row.hasImage || row.contentType === "image") {
    const dims = row.imageWidth && row.imageHeight ? `${row.imageWidth}×${row.imageHeight}` : "IMG";
    return {
      kind: "image",
      label: dims,
      badgeClass: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    };
  }
  const raw = String(row.text || "").trim();
  if (!raw) return null;

  if (HEX_COLOR_RE.test(raw)) {
    return {
      kind: "color",
      label: raw.toUpperCase(),
      colorHex: raw,
      badgeClass: "border-violet-400/30 bg-violet-500/15 text-violet-200",
    };
  }

  if (raw.length <= 2048 && URL_RE.test(raw)) {
    return {
      kind: "url",
      label: "URL",
      href: raw,
      badgeClass: "border-sky-400/30 bg-sky-500/15 text-sky-200",
    };
  }

  if (raw.length <= 300 && !raw.includes("\n") && WIN_PATH_RE.test(raw)) {
    return {
      kind: "path",
      label: "Path",
      filePath: raw,
      badgeClass: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    };
  }

  if (
    raw.length >= 2 &&
    raw.length <= 32_768 &&
    ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]")))
  ) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          kind: "json",
          label: "JSON",
          badgeClass: "border-indigo-400/30 bg-indigo-500/15 text-indigo-200",
        };
      }
    } catch {
      /* not valid json */
    }
  }

  return null;
}
