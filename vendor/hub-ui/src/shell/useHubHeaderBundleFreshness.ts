import { useCallback } from "react";

export type HubHeaderBundleFreshness = {
  bundleStale: boolean;
  onBundleReload: () => void;
};

/**
 * Map product bundle-stale probe → WorkspaceTabHeader / HubListChromeHeader props.
 * Products keep their own probe (e.g. P0020 `useAppBundleFreshness`); this is the header SSOT shape.
 */
export function useHubHeaderBundleFreshness(staleBundle: boolean): HubHeaderBundleFreshness {
  const onBundleReload = useCallback(() => {
    window.location.reload();
  }, []);
  return { bundleStale: Boolean(staleBundle), onBundleReload };
}
