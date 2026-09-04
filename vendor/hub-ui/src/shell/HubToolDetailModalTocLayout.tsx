import type { ReactNode } from "react";
import { HUB_TOOL_DETAIL_SCROLL_CLASS } from "./hubToolDetailModalChrome";

export type HubToolDetailModalTocLayoutProps = {
  toc: ReactNode;
  children: ReactNode;
  className?: string;
};

/** TOC left · content right — scroll isolated to content column (aligned tops). */
export function HubToolDetailModalTocLayout({ toc, children, className = "" }: HubToolDetailModalTocLayoutProps) {
  return (
    <div className={`hub-tool-detail-modal__layout${className ? ` ${className}` : ""}`}>
      <aside className="hub-tool-detail-modal__toc">{toc}</aside>
      <div className="hub-tool-detail-modal__content">
        <div className={HUB_TOOL_DETAIL_SCROLL_CLASS}>
          <div className="hub-tool-detail-modal__scroll-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
