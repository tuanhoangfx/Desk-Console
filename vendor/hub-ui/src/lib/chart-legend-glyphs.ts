/** Leading emoji from chart legend label (`⏳ Pending` → glyph + `Pending`). */
export function splitChartLegendGlyph(label: string): { glyph: string; text: string } {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return { glyph: "", text: "" };
  const m = trimmed.match(/^([\p{Extended_Pictographic}\uFE0F]+)\s*/u);
  if (!m) return { glyph: "", text: trimmed };
  const text = trimmed.slice(m[0].length).trim();
  return { glyph: m[1], text: text || trimmed };
}
