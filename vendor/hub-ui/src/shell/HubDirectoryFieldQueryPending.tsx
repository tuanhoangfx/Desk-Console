import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ReportCtx = createContext<(pending: boolean) => void>(() => {});
const StateCtx = createContext(false);

/**
 * Isolated field-debounce pending — HubSearchField reports; header chip subscribes.
 * Split context so keystrokes do not re-render the directory table (P0005 contract).
 */
export function HubDirectoryFieldQueryPendingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const report = useCallback((next: boolean) => {
    setPending((prev) => (prev === next ? prev : next));
  }, []);
  return (
    <ReportCtx.Provider value={report}>
      <StateCtx.Provider value={pending}>{children}</StateCtx.Provider>
    </ReportCtx.Provider>
  );
}

export function useHubDirectoryFieldQueryPendingReport() {
  return useContext(ReportCtx);
}

export function useHubDirectoryFieldQueryPending() {
  return useContext(StateCtx);
}
