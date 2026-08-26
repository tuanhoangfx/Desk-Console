import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HUB_TOOL_DETAIL_SCROLL_ROOT } from "./HubToolDetailModal";
import { useHubTocSectionSpy } from "./hub-toc-section-spy";

type HubTocSectionHighlightContextValue = {
  highlightedSectionId: string | null;
  activeSectionId: string | null;
  sectionIds: string[];
  setHighlightedSectionId: (id: string | null) => void;
};

const HubTocSectionHighlightContext = createContext<HubTocSectionHighlightContextValue | null>(null);

/** Pointer + scroll ↔ TOC highlight — wraps tool-detail modal TOC layout. */
export function HubTocSectionHighlightProvider({
  sectionIds,
  scrollRootSelector = HUB_TOOL_DETAIL_SCROLL_ROOT,
  children,
}: {
  sectionIds: string[];
  scrollRootSelector?: string;
  children: ReactNode;
}) {
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => sectionIds[0] ?? null);

  useHubTocSectionSpy(sectionIds, scrollRootSelector, setActiveSectionId);

  const value = useMemo(
    () => ({ highlightedSectionId, activeSectionId, sectionIds, setHighlightedSectionId }),
    [activeSectionId, highlightedSectionId, sectionIds],
  );

  return (
    <HubTocSectionHighlightContext.Provider value={value}>{children}</HubTocSectionHighlightContext.Provider>
  );
}

function useHubTocSectionHighlightContext() {
  const ctx = useContext(HubTocSectionHighlightContext);
  if (!ctx) {
    throw new Error("HubTocHighlightContent must be used within HubTocSectionHighlightProvider");
  }
  return ctx;
}

function resolveSectionAtPointer(sectionIds: string[], clientY: number): string | null {
  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) return id;
  }
  return null;
}

/** Tracks pointer over stacked sections — drives TOC hover highlight. */
export function HubTocHighlightContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { sectionIds, setHighlightedSectionId } = useHubTocSectionHighlightContext();

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const id = resolveSectionAtPointer(sectionIds, event.clientY);
      setHighlightedSectionId(id);
    },
    [sectionIds, setHighlightedSectionId],
  );

  const onPointerLeave = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      setHighlightedSectionId(null);
    },
    [setHighlightedSectionId],
  );

  return (
    <div
      className={`hub-toc-highlight-main min-w-0 ${className}`.trim()}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  );
}

/** Hover highlight (pointer over section content). */
export function useHubTocNavHighlight(sectionId: string) {
  const ctx = useContext(HubTocSectionHighlightContext);
  return ctx?.highlightedSectionId === sectionId;
}

/** Scroll-spy active section (anchor while scrolling). */
export function useHubTocNavActive(sectionId: string) {
  const ctx = useContext(HubTocSectionHighlightContext);
  if (!ctx) return false;
  if (ctx.highlightedSectionId) return false;
  return ctx.activeSectionId === sectionId;
}

/** Optional — `HubToolDetailSection` uses this for direct section hover. */
export function useHubTocSectionHighlightOptional() {
  return useContext(HubTocSectionHighlightContext);
}
