const DEFAULT_COPY_PREVIEW_MAX = 52;

/** Single-line preview for copy toast — keeps long secrets/passwords readable. */
export function formatCopyToastPreview(value: string, maxLen = DEFAULT_COPY_PREVIEW_MAX): string {
  const single = value.replace(/\s+/g, " ").trim();
  if (!single) return "";
  if (single.length <= maxLen) return single;
  return `${single.slice(0, maxLen)}…`;
}

/** `Copy title` → `Title copied` (P0020 TwofaCopyControl parity). */
export function copyToastLabelFromTitle(title: string, fallback = "Copied"): string {
  const match = title.match(/^Copy\s+(.+)$/i);
  if (!match?.[1]) return fallback;
  const noun = match[1].trim();
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} copied`;
}
