/**
 * Post-deploy stale-chunk recovery — Hub-UI SSOT.
 *
 * After a deploy, an already-open tab may lazy-import a hashed chunk that no longer
 * exists on the server → the dynamic import rejects and the tab error-boundary
 * dead-ends (React.lazy caches the rejection, so an in-place Retry can never
 * succeed). Vite dispatches `vite:preloadError` on window for these failures —
 * reload once to pick up the fresh asset graph.
 *
 * Loop guard: at most one auto-reload per `cooldownMs` (sessionStorage + in-memory
 * fallback); repeat failures inside the window fall through to the error boundary.
 *
 * Wire once per app entry (main.tsx), before the React root mounts.
 */
const RELOAD_AT_KEY = "hub:chunk-reload-at";

let memoryLastReloadAt = 0;

export function installHubChunkReloadGuard(options: { cooldownMs?: number } = {}): () => void {
  if (typeof window === "undefined") return () => {};
  const cooldownMs = options.cooldownMs ?? 60_000;

  const onPreloadError = (event: Event) => {
    let lastReloadAt = memoryLastReloadAt;
    try {
      lastReloadAt = Math.max(
        lastReloadAt,
        Number(window.sessionStorage.getItem(RELOAD_AT_KEY)) || 0,
      );
    } catch {
      /* storage unavailable — in-memory fallback still bounds the loop */
    }
    if (Date.now() - lastReloadAt < cooldownMs) return;
    memoryLastReloadAt = Date.now();
    try {
      window.sessionStorage.setItem(RELOAD_AT_KEY, String(memoryLastReloadAt));
    } catch {
      /* ignore */
    }
    // preventDefault stops Vite from rethrowing into the error boundary before reload.
    event.preventDefault();
    window.location.reload();
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}
