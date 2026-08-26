import { Fragment, startTransition, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import {
  HUB_FILTER_VIRTUAL_ROW_PX,
  hubFilterShouldVirtualize,
  hubFilterVirtualWindow,
} from "./hub-filter-virtual-window";

export function HubFilterVirtualList<T>({
  items,
  renderItem,
  getItemKey,
  className,
  header,
  footer,
  rowPx = HUB_FILTER_VIRTUAL_ROW_PX,
}: {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  rowPx?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportPx, setViewportPx] = useState(288);
  const [headerPx, setHeaderPx] = useState(0);
  const virtual = hubFilterShouldVirtualize(items.length);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setViewportPx(el.clientHeight || 288);
    setHeaderPx(headerRef.current?.offsetHeight ?? 0);
  }, [items.length, header, virtual]);

  const win = virtual
    ? hubFilterVirtualWindow({
        count: items.length,
        scrollTop,
        viewportPx,
        rowPx,
        headerPx,
      })
    : { start: 0, end: items.length, padTop: 0, padBottom: 0 };
  const slice = virtual ? items.slice(win.start, win.end) : items;

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!virtual) return;
    const top = event.currentTarget.scrollTop;
    startTransition(() => setScrollTop(top));
  };

  return (
    <div ref={scrollerRef} className={className} onScroll={onScroll}>
      {header ? <div ref={headerRef}>{header}</div> : null}
      {virtual && win.padTop > 0 ? <div style={{ height: win.padTop }} aria-hidden /> : null}
      {slice.map((item, i) => {
        const index = virtual ? win.start + i : i;
        return <Fragment key={getItemKey(item, index)}>{renderItem(item, index)}</Fragment>;
      })}
      {virtual && win.padBottom > 0 ? <div style={{ height: win.padBottom }} aria-hidden /> : null}
      {footer}
    </div>
  );
}
