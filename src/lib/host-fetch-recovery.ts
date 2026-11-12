/**
 * Shared local Desk Console host fetch wrapper (`:6010` / `:6011`).
 *
 * Eliminates raw Chromium `TypeError: Failed to fetch` during cold boot, Windows Defender first-launch
 * scan, or transient `host/server.mjs` respawn by asking Electron Main (`deskConsole.ensureHost()`) to
 * wake/verify the local API server and retrying automatically before surfacing an actionable error.
 */

type DeskPreloadBridge = {
  apiOrigin?: string;
  ensureHost?: () => Promise<{ ok?: boolean; apiOrigin?: string }>;
};

let inflightHostWake: Promise<void> | null = null;

export function resolveDeskApiOrigin(): string {
  if (typeof window === "undefined") return "";
  const bridged = String(
    (window as Window & { deskConsole?: DeskPreloadBridge }).deskConsole?.apiOrigin || "",
  ).trim();
  if (bridged) return bridged;
  if (window.location.protocol === "file:") return "http://127.0.0.1:6010";
  return "";
}

export function isTransientNetworkFetchError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = String((err as { name?: string }).name || "");
  if (name === "AbortError" || name === "TimeoutError") return false;
  const msg = String((err as { message?: string }).message || "").toLowerCase();
  return (
    name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("fetch failed")
  );
}

async function wakeLocalDeskHostOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  const bridge = (window as Window & { deskConsole?: DeskPreloadBridge }).deskConsole;
  if (typeof bridge?.ensureHost !== "function") return;
  if (!inflightHostWake) {
    inflightHostWake = Promise.resolve()
      .then(() => bridge.ensureHost?.())
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        inflightHostWake = null;
      });
  }
  await inflightHostWake;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_LOCAL_HOST_ORIGIN = "http://127.0.0.1:6010";

export async function fetchDeskHost(
  path: string,
  init?: RequestInit,
  opts?: { fetchImpl?: typeof fetch; retryDelaysMs?: readonly number[] },
): Promise<Response> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const delays = opts?.retryDelaysMs ?? [300, 700, 1400, 2200];
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    const origin = resolveDeskApiOrigin();
    try {
      const res = await fetchFn(`${origin}${path}`, init);
      if (origin === "" && (res.status === 502 || res.status === 503 || res.status === 504)) {
        try {
          return await fetchFn(`${DEFAULT_LOCAL_HOST_ORIGIN}${path}`, init);
        } catch {
          return res;
        }
      }
      return res;
    } catch (err) {
      if (origin === "" && isTransientNetworkFetchError(err)) {
        try {
          return await fetchFn(`${DEFAULT_LOCAL_HOST_ORIGIN}${path}`, init);
        } catch (fallbackErr) {
          lastErr = fallbackErr;
        }
      } else {
        lastErr = err;
      }
      if (!isTransientNetworkFetchError(lastErr) || attempt >= delays.length) {
        break;
      }
      await wakeLocalDeskHostOnce();
      if (delays[attempt]! > 0) {
        await sleep(delays[attempt]!);
      }
    }
  }

  if (isTransientNetworkFetchError(lastErr)) {
    const target = resolveDeskApiOrigin() || "local Desk Console host (:6010)";
    throw new Error(
      `Cannot reach ${target}. Make sure Desk Console is running, then try again.`,
    );
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Request failed"));
}
