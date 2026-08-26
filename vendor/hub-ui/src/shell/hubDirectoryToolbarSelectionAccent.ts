/** Hue 228 (indigo) → 152 (emerald); 0% stays cool slate — never alarm red. */
export function hueForToolbarSelectionPct(pct: number): number {
  if (pct <= 0) return 215;
  return Math.round(228 - (pct / 100) * 76);
}

export function accentForToolbarSelectionPct(pct: number): string {
  const h = hueForToolbarSelectionPct(pct);
  return `hsl(${h} 72% 62%)`;
}

export function accentSoftForToolbarSelectionPct(pct: number): string {
  const h = hueForToolbarSelectionPct(pct);
  return `hsl(${h} 55% 48% / 0.35)`;
}
