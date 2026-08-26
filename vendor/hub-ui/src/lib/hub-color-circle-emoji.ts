/**
 * Windows Segoe draws 🟢🔵🔴 (and siblings) off-center in a square em-box.
 * KPI tiles and chart legends must paint a CSS circle instead of the emoji.
 */
const HUB_COLOR_CIRCLE_EMOJI: Record<string, string> = {
  "🟢": "#22c55e",
  "🔵": "#06b6d4",
  "🔴": "#ef4444",
  "🟠": "#f97316",
  "🟡": "#eab308",
  "🟣": "#a855f7",
  "🟤": "#a16207",
  "⚪": "#94a3b8",
  "⚫": "#334155",
};

export function hubColorCircleCss(glyph: string | null | undefined): string | undefined {
  if (!glyph) return undefined;
  const key = Array.from(glyph.replace(/\uFE0F/g, "").trim())[0];
  return (key && HUB_COLOR_CIRCLE_EMOJI[key]) || HUB_COLOR_CIRCLE_EMOJI[glyph.trim()] || undefined;
}
