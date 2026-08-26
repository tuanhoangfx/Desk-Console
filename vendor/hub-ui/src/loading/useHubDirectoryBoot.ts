import { useCallback, useRef, useState, type MutableRefObject } from "react";

export type HubDirectoryBootState = {
  /** Gate open — directory body may paint (empty is valid). */
  bootReady: boolean;
  directoryBootReady: boolean;
};

export type UseHubDirectoryBootOptions = {
  /** Initial gate state — true when cache is authoritative enough to paint without blocking. */
  initialReady?: boolean;
};

/**
 * Low-level boot-gate state — P0020 Mail golden.
 * Empty directory after first authoritative read is ready, not infinite spinner.
 */
export function useHubDirectoryBoot(options: UseHubDirectoryBootOptions = {}): HubDirectoryBootState & {
  settleBoot: () => void;
  beginBootGate: () => void;
  bootedRef: MutableRefObject<boolean>;
} {
  const initial = options.initialReady ?? true;
  const [bootReady, setBootReady] = useState(initial);
  const bootedRef = useRef(initial);

  const settleBoot = useCallback(() => {
    bootedRef.current = true;
    setBootReady(true);
  }, []);

  const beginBootGate = useCallback(() => {
    if (bootedRef.current) return;
    setBootReady(false);
  }, []);

  return {
    bootReady,
    directoryBootReady: bootReady,
    settleBoot,
    beginBootGate,
    bootedRef,
  };
}
