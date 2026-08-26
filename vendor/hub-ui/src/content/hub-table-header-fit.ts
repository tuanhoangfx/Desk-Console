/**
 * Directory header icon-only fit — SSOT budget is the <th> column width.
 * Never use shrunk .hub-users-th-btn / label host width (latch: hide label → host shrinks → stays icon-only).
 */

export const HUB_TABLE_HEADER_FIT_EPSILON_PX = 1;

export type HubTableHeaderFitInput = {
  thWidth: number;
  thPadX: number;
  /** Button horizontal padding inside th (reserved). */
  btnPadX: number;
  sortWidth: number;
  glyphWidth: number;
  textWidth: number;
  gap: number;
};

export function computeHubTableHeaderIconOnly(input: HubTableHeaderFitInput): boolean {
  const {
    thWidth,
    thPadX,
    btnPadX,
    sortWidth,
    glyphWidth,
    textWidth,
    gap,
  } = input;
  if (textWidth <= 0) return false;
  const available = Math.max(
    0,
    thWidth - sortWidth - thPadX - btnPadX - HUB_TABLE_HEADER_FIT_EPSILON_PX,
  );
  const glyphGap = glyphWidth > 0 && textWidth > 0 ? gap : 0;
  const needed = glyphWidth + glyphGap + textWidth;
  return needed > available;
}
