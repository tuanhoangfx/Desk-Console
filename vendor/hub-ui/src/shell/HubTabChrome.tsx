import { useEffect, useState, type ReactNode } from "react";

export type HubChromePrefs = {
  headerPin: boolean;
  searchPin: boolean;
};

const DEFAULT_PREFS: HubChromePrefs = { headerPin: true, searchPin: true };

let readChromePrefs: () => HubChromePrefs = () => DEFAULT_PREFS;

/** App supplies URL/storage prefs (P0004 readHubListPrefs, etc.). */
export function configureHubChromePrefs(read: () => HubChromePrefs) {
  readChromePrefs = read;
}

export function useHubChromePrefs() {
  const [prefs, setPrefs] = useState(readChromePrefs);

  useEffect(() => {
    const sync = () => setPrefs(readChromePrefs());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const searchPin = prefs.searchPin;
  const headerPin = prefs.headerPin;
  const stackChrome = searchPin && headerPin;

  return { prefs, searchPin, headerPin, stackChrome };
}

/**
 * Sticky header + search/filter stack — P0004 HubListPage contract.
 * When `filterBar` is set and both pins are on, header and filter share one chrome strip.
 */
export function HubTabChrome({
  header,
  filterBar,
  children,
}: {
  header: ReactNode;
  filterBar?: ReactNode;
  children: ReactNode;
}) {
  const { searchPin, headerPin, stackChrome } = useHubChromePrefs();
  const stack = Boolean(filterBar) && stackChrome;

  return (
    <div
      className={`anim-fade relative flex min-h-0 flex-1 flex-col${stack ? " hub-tab-chrome-stack" : ""}`}
      {...(searchPin ? { "data-search-pin": true } : {})}
      {...(headerPin ? { "data-header-pin": true } : {})}
    >
      {stack ? (
        <div className="hub-chrome-sticky sticky top-0 z-40 -mx-6 bg-[var(--bg)]">
          {header}
          {filterBar}
          <div className="hub-chrome-sticky-divider border-b border-white/5" aria-hidden />
        </div>
      ) : (
        <>
          {header}
          {filterBar}
        </>
      )}
      {children}
    </div>
  );
}

/** Scrollable tab body below chrome; use `flex` for split panes (Inbox, iframe). */
export function HubTabBody({ flex = false, children }: { flex?: boolean; children: ReactNode }) {
  return (
    <div
      className={
        flex
          ? "hub-screen-body relative z-0 flex min-h-0 flex-1 flex-col"
          : "hub-screen-body relative z-0"
      }
    >
      {children}
    </div>
  );
}
