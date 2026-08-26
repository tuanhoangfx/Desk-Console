import { createContext, useContext, type ReactNode } from "react";

const HubDirectorySelectionChromeContext = createContext(false);

/** Set by HubDirectoryScreen when `filterSelectionToolbar` is registered. */
export function HubDirectorySelectionChromeProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <HubDirectorySelectionChromeContext.Provider value={active}>
      {children}
    </HubDirectorySelectionChromeContext.Provider>
  );
}

export function useHubDirectorySelectionChrome(): boolean {
  return useContext(HubDirectorySelectionChromeContext);
}
