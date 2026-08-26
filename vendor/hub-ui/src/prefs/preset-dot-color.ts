const PRESET_DOT_PALETTE = [
  "#818cf8",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#38bdf8",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#4ade80",
] as const;

export const PRESET_DEFAULT_DOT_COLOR = "#818cf8";
export const PRESET_CURRENT_DOT_COLOR = "#fbbf24";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function presetDotColorFromId(id: string, storedColor?: string): string {
  if (storedColor) return storedColor;
  return PRESET_DOT_PALETTE[hashString(id) % PRESET_DOT_PALETTE.length] ?? PRESET_DEFAULT_DOT_COLOR;
}

export function randomPresetDotColor(usedColors: readonly string[] = []): string {
  const used = new Set(usedColors.map((color) => color.toLowerCase()));
  const available = PRESET_DOT_PALETTE.filter((color) => !used.has(color.toLowerCase()));
  const pool = available.length ? available : PRESET_DOT_PALETTE;
  return pool[Math.floor(Math.random() * pool.length)] ?? PRESET_DEFAULT_DOT_COLOR;
}
