/**
 * Hub perf black box — shared freeze/crash/sync diagnostics for every hub tool.
 *
 * Rolling buffer in localStorage (`<code>:perf-blackbox`) readable from ANY
 * same-origin window (PWA ↔ tab share storage), so a laggy/crashed session can be
 * inspected remotely without DevTools on the affected window.
 *
 * Records:
 * - longtasks ≥ `longtaskMinMs` with the active screen + visibility
 * - heap heartbeat every `heartbeatMs` (also proves liveness)
 * - screen switches (history pushState/replaceState/popstate) with heap
 * - previous-session crash detection: last heartbeat newer than last clean
 *   pagehide goodbye — catches OOM renderer kills that leave no JS log
 * - custom spans/events: sync pulls, search settles, chunk reloads… via
 *   `beginHubBlackboxSpan` / `hubBlackboxEvent`, or — for modules that must stay
 *   DOM-import-free (worker-ready sync engines) — a plain CustomEvent:
 *   `window.dispatchEvent(new CustomEvent("hub:blackbox", { detail: { kind, ...data } }))`
 *
 * Read from console: `window.__hubBlackbox.read()` · clear: `.clear()`.
 * Budget: ≤ ~60KB localStorage, coalesced flush — no hot-path cost.
 */

export type HubBlackboxEntry = {
  /** epoch ms */
  t: number;
  kind: string;
  /** App version of the tab that wrote this — a session can mix builds after a deploy. */
  v?: string;
  [key: string]: unknown;
};

export type HubBlackboxOptions = {
  /** Tool code, lowercased into the storage key prefix (e.g. "P0020" → `p0020:`). */
  code: string;
  maxEntries?: number;
  longtaskMinMs?: number;
  /** Report interactions slower than this (pointerdown -> next paint). Default 200ms. */
  interactionMinMs?: number;
  heartbeatMs?: number;
};

const FLUSH_MS = 2_000;

let installed = false;
let buf: HubBlackboxEntry[] = [];
let flushTimer: number | null = null;
let storageKey = "hub:perf-blackbox";
let maxEntries = 400;

function screenLabel(): string {
  try {
    return `${window.location.pathname}${window.location.search}`;
  } catch {
    return "?";
  }
}

function heapMB(): number | null {
  try {
    const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;
  } catch {
    return null;
  }
}

function entryIdentity(entry: HubBlackboxEntry): string {
  return `${entry.t}|${entry.kind}|${String(entry.ms ?? "")}|${String(entry.screen ?? "")}`;
}

function flush(): void {
  flushTimer = null;
  try {
    // MERGE-on-flush — the key is multi-writer (PWA window + tabs share the origin);
    // a plain overwrite made a long-lived idle tab clobber the interesting entries
    // from the window the user actually works in.
    let merged = buf;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as HubBlackboxEntry[];
      if (Array.isArray(existing) && existing.length) {
        const seen = new Set(buf.map(entryIdentity));
        const foreign = existing.filter((e) => e && typeof e.t === "number" && !seen.has(entryIdentity(e)));
        merged = [...foreign, ...buf].sort((a, b) => a.t - b.t);
      }
    } catch {
      /* corrupted existing — overwrite with own buffer */
    }
    localStorage.setItem(storageKey, JSON.stringify(merged.slice(-maxEntries)));
  } catch {
    /* quota — drop oldest half and retry once */
    buf = buf.slice(-Math.floor(maxEntries / 2));
    try {
      localStorage.setItem(storageKey, JSON.stringify(buf));
    } catch {
      /* give up silently */
    }
  }
}

/**
 * The build this tab is running, read once from the meta tag the deploy stamps.
 *
 * Every record needs it. Tabs keep the bundle they loaded with, so after a deploy a session mixes
 * several builds — and a record from a stale tab is indistinguishable from a record proving the
 * fix did not work. That cost a full day of P0020 diagnosis: 34-minute vault pulls kept being
 * recorded after the fix shipped, with no way to tell which build produced them.
 */
const appVersion = (() => {
  if (typeof document === "undefined") return undefined;
  const meta = document.querySelector('meta[name="app-version"]');
  return meta?.getAttribute("content") ?? undefined;
})();

function push(entry: HubBlackboxEntry): void {
  if (!installed) return;
  if (appVersion && entry.v === undefined) entry.v = appVersion;
  buf.push(entry);
  if (buf.length > maxEntries + 50) buf = buf.slice(-maxEntries);
  if (flushTimer == null && typeof window !== "undefined") {
    flushTimer = window.setTimeout(flush, FLUSH_MS);
  }
}

/** Manual diagnostic event — no-op until `installHubPerfBlackbox` ran. */
export function hubBlackboxEvent(kind: string, data?: Record<string, unknown>): void {
  push({ t: Date.now(), kind, screen: screenLabel(), ...data });
}

/**
 * Duration span for sync/search/loading work: `const end = beginHubBlackboxSpan("sync:full-pull");
 * … ; end({ rows })`. Logs one entry with `ms` on end. No-op until installed.
 */
export function beginHubBlackboxSpan(
  label: string,
  data?: Record<string, unknown>,
): (extra?: Record<string, unknown>) => void {
  const startedAt = Date.now();
  return (extra?: Record<string, unknown>) => {
    push({ t: startedAt, kind: `span:${label}`, ms: Date.now() - startedAt, screen: screenLabel(), ...data, ...extra });
  };
}

export function installHubPerfBlackbox(opts: HubBlackboxOptions): void {
  if (installed || typeof window === "undefined" || typeof localStorage === "undefined") return;
  installed = true;

  const prefix = opts.code.trim().toLowerCase();
  storageKey = `${prefix}:perf-blackbox`;
  maxEntries = opts.maxEntries ?? 400;
  const longtaskMinMs = opts.longtaskMinMs ?? 200;
  // 200ms: past this an interaction stops feeling instant.
  const interactionMinMs = opts.interactionMinMs ?? 200;
  const heartbeatMs = opts.heartbeatMs ?? 20_000;
  const aliveKey = `${prefix}:perf-blackbox-alive`;
  const byeKey = `${prefix}:perf-blackbox-bye`;

  try {
    buf = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as HubBlackboxEntry[];
    if (!Array.isArray(buf)) buf = [];
  } catch {
    buf = [];
  }

  // Previous session crashed if it heartbeat'd after its last clean goodbye.
  const prevAlive = Number(localStorage.getItem(aliveKey) ?? 0);
  const prevBye = Number(localStorage.getItem(byeKey) ?? 0);
  if (prevAlive > prevBye) {
    const prevHeap = [...buf].reverse().find((e) => e.kind === "heap");
    push({
      t: Date.now(),
      kind: "prev-session-crash",
      lastAliveAt: prevAlive,
      lastHeapMB: prevHeap?.mb ?? null,
      lastScreen: prevHeap?.screen ?? null,
    });
  }
  push({ t: Date.now(), kind: "boot", screen: screenLabel(), mb: heapMB() });

  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration < longtaskMinMs) continue;
        push({
          t: Date.now(),
          kind: "longtask",
          ms: Math.round(e.duration),
          screen: screenLabel(),
          vis: document.visibilityState,
        });
      }
    });
    po.observe({ type: "longtask", buffered: true });
  } catch {
    /* longtask unsupported */
  }

  /**
   * Interaction latency — what the user actually feels.
   *
   * `longtask` alone is not enough and repeatedly said "0ms" while a P0020 user sat waiting:
   * it only sees a single JS task ≥50ms, so it is blind to a lazy chunk being fetched on the
   * click (7.5s, measured), and to work spread over many sub-50ms frames (a 900ms modal close
   * that registered nothing). The Event Timing API measures pointerdown → next paint, which
   * is the number that matches the complaint.
   */
  try {
    const ep = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const entry = e as PerformanceEntry & { processingStart?: number; processingEnd?: number };
        if (e.duration < interactionMinMs) continue;
        push({
          t: Date.now(),
          kind: "interaction",
          name: e.name,
          ms: Math.round(e.duration),
          handlerMs:
            entry.processingEnd != null && entry.processingStart != null
              ? Math.round(entry.processingEnd - entry.processingStart)
              : undefined,
          screen: screenLabel(),
          mb: heapMB(),
        });
      }
    });
    ep.observe({ type: "event", durationThreshold: interactionMinMs, buffered: true } as PerformanceObserverInit);
  } catch {
    /* event timing unsupported */
  }

  const beat = () => {
    try {
      localStorage.setItem(aliveKey, String(Date.now()));
    } catch {
      /* ignore */
    }
    push({ t: Date.now(), kind: "heap", mb: heapMB(), screen: screenLabel(), vis: document.visibilityState });
  };
  window.setInterval(beat, heartbeatMs);
  beat();

  const logScreen = () => push({ t: Date.now(), kind: "screen", screen: screenLabel(), mb: heapMB() });
  const origPush = history.pushState.bind(history);
  history.pushState = (...args: Parameters<History["pushState"]>) => {
    origPush(...args);
    logScreen();
  };
  const origReplace = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    origReplace(...args);
    logScreen();
  };
  window.addEventListener("popstate", logScreen);

  // DOM-import-free emit channel for pure sync/search engines (worker-ready modules
  // must not import this file): dispatch `hub:blackbox` with { kind, ...data }.
  window.addEventListener("hub:blackbox", (event) => {
    const detail = (event as CustomEvent<Record<string, unknown> | undefined>).detail;
    if (!detail || typeof detail.kind !== "string") return;
    const { kind, ...data } = detail;
    push({ t: Date.now(), kind, screen: screenLabel(), ...data });
  });

  window.addEventListener("pagehide", () => {
    try {
      localStorage.setItem(byeKey, String(Date.now()));
    } catch {
      /* ignore */
    }
    push({ t: Date.now(), kind: "bye", mb: heapMB() });
    flush();
  });

  (window as unknown as Record<string, unknown>).__hubBlackbox = {
    read: () => buf.slice(),
    clear: () => {
      buf = [];
      flush();
    },
  };
}
