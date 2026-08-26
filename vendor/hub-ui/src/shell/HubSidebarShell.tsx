import { useId, useRef, type ReactNode } from "react";
import { PanelLeft } from "lucide-react";
import { compactIconSize } from "../ui-scale";

import "../styles/hub-mobile.css";

export const HUB_SIDEBAR_SHELL_ASIDE_CLASS =
  "hub-sidebar-shell flex h-full min-h-0 w-60 shrink-0 flex-col overflow-visible border-r border-white/5 bg-[var(--panel)] px-4 pt-4 pb-2";

export const HUB_SIDEBAR_SHELL_BRAND_TITLE_CLASS =
  "hub-sidebar-chrome-type truncate font-semibold leading-tight";

/** @deprecated Sidebar brand is logo + title only — do not use for new UI. */
export const HUB_SIDEBAR_SHELL_BRAND_TAGLINE_CLASS = "text-[10px] text-[var(--muted)]";

export const HUB_SIDEBAR_SHELL_NAV_CLASS = "hub-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto";

/** `mt-auto` pins footer to the last line when aside fills the viewport. */
export const HUB_SIDEBAR_SHELL_FOOTER_CLASS =
  "mt-auto shrink-0 space-y-0.5 overflow-visible border-t border-white/5 pt-2.5";

export type HubSidebarShellProps = {
  /** Tool avatar or product mark — left of title block. */
  brandLeading: ReactNode;
  brandTitle: string;
  /** @deprecated Do not pass — descriptor/version live in `AppTabHeader` meta. Parity gate forbids `brandTagline=`. */
  brandTagline?: string;
  /** Optional pill/chip beside brand (e.g. Local mode when Hub auth off). */
  brandTrailing?: ReactNode;
  nav: ReactNode;
  footer: ReactNode;
  asideClassName?: string;
};

/**
 * Golden app sidebar chrome — P0004 / P0016 / P0020 shared aside layout.
 * Mobile (≤767.98px): CSS checkbox drawer — desktop layout unchanged. SSOT: hub-mobile-ssot card.
 */
export function HubSidebarShell({
  brandLeading,
  brandTitle,
  brandTrailing,
  nav,
  footer,
  asideClassName,
}: HubSidebarShellProps) {
  const reactId = useId();
  const toggleId = `hub-sidebar-toggle-${reactId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const closeDrawer = () => {
    if (inputRef.current) inputRef.current.checked = false;
  };

  const asideClass = asideClassName
    ? asideClassName.includes("hub-sidebar-shell")
      ? asideClassName
      : `hub-sidebar-shell ${asideClassName}`
    : HUB_SIDEBAR_SHELL_ASIDE_CLASS;

  return (
    <div className="hub-sidebar-root">
      <input
        ref={inputRef}
        id={toggleId}
        type="checkbox"
        className="hub-sidebar-toggle-input"
        aria-hidden
        tabIndex={-1}
      />
      <label
        htmlFor={toggleId}
        className="hub-sidebar-menu-btn"
        aria-label="Open navigation"
        title="Menu"
      >
        <PanelLeft size={compactIconSize(18)} strokeWidth={2} aria-hidden />
      </label>
      <label htmlFor={toggleId} className="hub-sidebar-backdrop" aria-hidden />
      <aside className={asideClass}>
        <div className="mb-4 flex shrink-0 items-center gap-3">
          {brandLeading}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className={`min-w-0 flex-1 ${HUB_SIDEBAR_SHELL_BRAND_TITLE_CLASS}`}>{brandTitle}</div>
              {brandTrailing}
            </div>
          </div>
        </div>

        <nav
          className={HUB_SIDEBAR_SHELL_NAV_CLASS}
          onClick={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("a, button, [role='button'], [data-hub-nav-close]")) {
              closeDrawer();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeDrawer();
          }}
        >
          {nav}
        </nav>

        <footer className={HUB_SIDEBAR_SHELL_FOOTER_CLASS}>{footer}</footer>
      </aside>
    </div>
  );
}
