import { emitHubAppLog, hubLogFieldLabels, type HubAppLogEmitDetail } from "./hub-session-log-emit";

/** Slim timings shape — mirrors hub-identity `WorkspaceDualSignInTimings` without a package edge. */
export type WorkspaceAuthSignInPlaneTiming = {
  index: number;
  ms: number;
  ok: boolean;
  speculative?: boolean;
};

export type WorkspaceAuthSignInTimings = {
  totalMs: number;
  resolveLoginMs?: number;
  hubMs: number;
  planes: WorkspaceAuthSignInPlaneTiming[];
  parallel: boolean;
};

export type EmitWorkspaceDualSignInSessionLogOptions = {
  /** Default plane labels: index 0 = workspace data plane, 1 = Mirror. P0020 overrides to “Data Box”. */
  planeLabels?: string[];
  /** Emit slow wording when Hub grant ≥ this (default 3000). */
  slowHubMs?: number;
  /** Emit slow wording when wall clock ≥ this (default 8000). */
  slowTotalMs?: number;
  eventName?: HubAppLogEmitDetail["eventName"];
  nowIso?: () => string;
};

export const WORKSPACE_AUTH_SIGN_IN_SLOW_HUB_MS = 3_000;
export const WORKSPACE_AUTH_SIGN_IN_SLOW_TOTAL_MS = 8_000;

const DEFAULT_PLANE_LABELS = ["workspace", "Mirror"];

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms >= 1000) {
    const sec = ms / 1000;
    return `${sec >= 10 ? sec.toFixed(0) : sec.toFixed(1).replace(/\.0$/, "")}s`;
  }
  return `${Math.round(ms)}ms`;
}

function planeFieldKey(index: number): string {
  return `plane${index}Grant`;
}

/**
 * One Header/session Log line after dual-plane sign-in succeeds.
 * Surfaces per-plane grant latency so Lenovo GoTrue spikes are visible without console-only timing.
 */
export function emitWorkspaceDualSignInSessionLog(
  timings: WorkspaceAuthSignInTimings,
  options: EmitWorkspaceDualSignInSessionLogOptions = {},
): void {
  const slowHubMs = options.slowHubMs ?? WORKSPACE_AUTH_SIGN_IN_SLOW_HUB_MS;
  const slowTotalMs = options.slowTotalMs ?? WORKSPACE_AUTH_SIGN_IN_SLOW_TOTAL_MS;
  const planeLabels = options.planeLabels ?? DEFAULT_PLANE_LABELS;
  const at = (options.nowIso ?? (() => new Date().toISOString()))();

  const slowHub = timings.hubMs >= slowHubMs;
  const slowTotal = timings.totalMs >= slowTotalMs;
  const mode = timings.parallel ? "parallel" : "sequential";

  const planeParts = timings.planes.map((plane, i) => {
    const label = planeLabels[plane.index] ?? planeLabels[i] ?? `Plane ${plane.index}`;
    const status = plane.ok ? formatMs(plane.ms) : `${formatMs(plane.ms)} fail`;
    return `${label} ${status}`;
  });

  const core = [
    `Hub ${formatMs(timings.hubMs)}`,
    ...planeParts,
    `total ${formatMs(timings.totalMs)} (${mode})`,
  ].join(" · ");

  const prefix = slowHub || slowTotal ? "Slow sign-in" : "Sign-in";
  const message = `${prefix} — ${core}`;

  const changes = [
    { field: "hubGrant", after: `${Math.round(timings.hubMs)}ms` },
    ...(typeof timings.resolveLoginMs === "number" && timings.resolveLoginMs > 0
      ? [{ field: "resolveLogin", after: `${Math.round(timings.resolveLoginMs)}ms` }]
      : []),
    ...timings.planes.map((plane) => ({
      field: planeFieldKey(plane.index),
      after: plane.ok ? `${Math.round(plane.ms)}ms` : `${Math.round(plane.ms)}ms (fail)`,
    })),
    { field: "total", after: `${Math.round(timings.totalMs)}ms` },
    { field: "mode", after: mode },
  ];

  const labelMap: Record<string, string> = {
    hubGrant: "Hub grant",
    resolveLogin: "Resolve login",
    total: "Total",
    mode: "Mode",
  };
  const emojiMap: Record<string, string | undefined> = {
    hubGrant: "🔐",
    resolveLogin: "🔎",
    total: "⏱️",
    mode: "⚙️",
  };
  for (const plane of timings.planes) {
    const key = planeFieldKey(plane.index);
    const label = planeLabels[plane.index] ?? `Plane ${plane.index}`;
    labelMap[key] = `${label} grant`;
    emojiMap[key] = plane.index === 0 ? "📦" : "🪞";
  }

  emitHubAppLog({
    scope: "Auth",
    screen: "*",
    kind: "sync",
    message,
    eventName: options.eventName,
    audit: { at, message, changes },
    fieldLabels: hubLogFieldLabels(labelMap, emojiMap),
  });
}
