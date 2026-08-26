import { useLayoutEffect, useState, type RefObject } from "react";
import { computeHubTableHeaderIconOnly } from "./hub-table-header-fit";

type FitRefs = {
  headingRef: RefObject<HTMLElement | null>;
  glyphRef: RefObject<HTMLElement | null>;
  textMeasureRef: RefObject<HTMLElement | null>;
};

/** Measure th width — hide label text when glyph + full text do not fit (icon-only, never clip). */
export function useHubTableColumnHeaderFit(
  refs: FitRefs,
  text: string,
  enabled: boolean,
): boolean {
  const [iconOnly, setIconOnly] = useState(false);

  useLayoutEffect(() => {
    if (!enabled || !text.trim()) {
      setIconOnly(false);
      return;
    }

    const { headingRef, glyphRef, textMeasureRef } = refs;
    const heading = headingRef.current;
    const textMeasure = textMeasureRef.current;
    if (!heading || !textMeasure) return;

    const measure = () => {
      const th = heading.closest("th");
      const labelHost = heading.closest(".hub-users-th-label");
      const btn = heading.closest(".hub-users-th-btn");
      if (!th) return;

      const sortEl = labelHost?.querySelector(".hub-users-sort");
      const sortWidth = sortEl?.getBoundingClientRect().width ?? 0;

      const thStyle = window.getComputedStyle(th);
      const thPadX =
        (Number.parseFloat(thStyle.paddingLeft) || 0) +
        (Number.parseFloat(thStyle.paddingRight) || 0);
      let btnPadX = 0;
      if (btn) {
        const btnStyle = window.getComputedStyle(btn);
        btnPadX =
          (Number.parseFloat(btnStyle.paddingLeft) || 0) +
          (Number.parseFloat(btnStyle.paddingRight) || 0);
      }

      const glyphWidth = glyphRef.current?.getBoundingClientRect().width ?? 0;
      const textWidth = textMeasure.scrollWidth;
      const labelStyle = window.getComputedStyle(heading);
      const gap = Number.parseFloat(labelStyle.gap || labelStyle.columnGap || "0") || 0;

      setIconOnly(
        computeHubTableHeaderIconOnly({
          thWidth: th.clientWidth,
          thPadX,
          btnPadX,
          sortWidth,
          glyphWidth,
          textWidth,
          gap,
        }),
      );
    };

    const th = heading.closest("th");
    if (!th) return;

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(th);
    const btn = heading.closest(".hub-users-th-btn");
    const labelHost = heading.closest(".hub-users-th-label");
    if (btn && btn !== th) ro.observe(btn);
    if (labelHost && labelHost !== th && labelHost !== btn) ro.observe(labelHost);
    ro.observe(heading);
    return () => ro.disconnect();
  }, [enabled, text]);

  return iconOnly;
}
