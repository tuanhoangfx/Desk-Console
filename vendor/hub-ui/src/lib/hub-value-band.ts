/** Value-relative mini-chart bar fill — ratio of value to chart max (optional `value-band` mode). */
export function hubValueBandColor(value: number, max: number): string {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const low = [0x64, 0x74, 0x8b];
  const high = [0x22, 0xc5, 0x5e];
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  const r = mix(low[0]!, high[0]!);
  const g = mix(low[1]!, high[1]!);
  const b = mix(low[2]!, high[2]!);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
