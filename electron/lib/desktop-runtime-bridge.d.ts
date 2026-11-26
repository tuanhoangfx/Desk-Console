import type { Server } from "node:net";

export interface PickPortOptions {
  /**
   * Host list to verify concurrently (default: ['127.0.0.1', '::1']).
   */
  hosts?: string[];
  /**
   * Upper bound port (default: 65535).
   */
  endPort?: number;
  /**
   * Maximum probe attempts from startPort (default: 1000).
   */
  maxAttempts?: number;
  /**
   * Whether to hold the socket open to avoid race conditions.
   */
  reserve?: boolean;
  /**
   * Auto-release timeout in milliseconds (0 = manual release).
   */
  autoReleaseMs?: number;
}

export interface ReservedPort {
  port: number;
  servers: Server[];
  release: () => Promise<void>;
}

export function isPackagedAsarPath(targetPath: string): boolean;

export function readValidJsonState<T = unknown>(
  stateFile: string,
  validateFn?: ((data: unknown) => boolean) | null
): T | null;

export function writeJsonStateAtomic(stateFile: string, payload: unknown): void;

export function pickAvailablePort(
  startPort: number,
  options?: PickPortOptions & { reserve?: false }
): Promise<number>;

export function pickAvailablePort(
  startPort: number,
  options: PickPortOptions & { reserve: true }
): Promise<ReservedPort>;

export function pickAvailablePort(
  startPort: number,
  options?: PickPortOptions
): Promise<number | ReservedPort>;

export interface SovereignRuntimeBridgeConfig {
  productRoot: string;
  homeDirName: string;
  stateFileName?: string;
  stateEnvVar?: string;
}

export interface SovereignRuntimeBridge {
  productRoot: string;
  monorepoRoot: string;
  appHomeDir: string;
  isPackagedAsar: () => boolean;
  resolveStateFilePath: () => string;
  ensureHiddenConsoleSafe: () => Promise<void>;
  applyProcessShieldSafe: () => Promise<void>;
  acquireSingletonLockSafe: (
    lockName: string,
    options?: {
      isLoopDaemon?: boolean;
      disableWatchdog?: boolean;
      maxRuntimeMs?: number;
      maxGlobalWorkers?: number;
      enforceGlobalCap?: boolean;
      exitOnConflict?: boolean;
    },
  ) => Promise<{
    acquired: boolean;
    existing: unknown;
    release: () => void;
  }>;
  spawnHiddenNodeSafe: (opts: {
    command?: string;
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    logFile?: string;
  }) => { pid: number };
  resolveDataboxAuthSafe: () => Promise<{
    apiUrl: string;
    serviceRoleKey: string;
    origin?: string;
    url?: string;
    key?: string;
  }>;
  readHubUserSession: () => {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
    userId: string | null;
    email: string | null;
    updatedAt: string;
  } | null;
  saveHubUserSession: (payload: {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: number | null;
    userId?: string | null;
    email?: string | null;
  } | null) => {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
    userId: string | null;
    email: string | null;
    updatedAt: string;
  } | null;
  clearHubUserSession: () => void;
  readHubAuthTelemetry: () => {
    code: string;
    outcome: string;
    initialCached: boolean;
    initialExpired: boolean;
    policyMs: number | null;
    sessionMs: number | null;
    accessCheckMs: number | null;
    totalMs: number;
    timedOut: boolean;
    expiredCleared: boolean;
    startedAtIso: string | null;
    settledAtIso: string | null;
    errorMessage?: string;
    updatedAt: string;
  } | null;
  saveHubAuthTelemetry: (payload: Record<string, unknown> | null) => Record<string, unknown> | null;
  decodeHubJwtClaims: (
    rawToken: string,
    opts?: { nowSec?: number; skewSec?: number },
  ) =>
    | { ok: true; claims: Record<string, unknown>; user: { id: string; email: string | null; role: string | null; exp: number | null } }
    | { ok: false; error: string; exp?: number };
  verifyHubRequestAuth: (
    req: { headers?: Record<string, string | string[] | undefined> },
    opts?: { requireAuth?: boolean; skewSec?: number },
  ) => {
    ok: boolean;
    status: number;
    error?: string;
    code?: string;
    source: "bearer" | "session-file" | "none";
    hubUser: { id: string | null; email: string | null; exp?: number | null } | null;
    token?: string;
  };
  verifyHubTokenOnline: (
    rawToken: string,
    opts?: { ttlMs?: number; timeoutMs?: number; fetchFn?: typeof fetch },
  ) => Promise<{
    ok: boolean;
    status?: number;
    verifiedOnline?: boolean;
    cached?: boolean;
    offlineFallback?: boolean;
    error?: string;
    code?: string;
    user?: { id: string | null; email: string | null };
  }>;
  verifyHubRequestAuthAsync: (
    req: { headers?: Record<string, string | string[] | undefined> },
    opts?: { requireAuth?: boolean; skewSec?: number; verifyOnline?: boolean; fetchFn?: typeof fetch },
  ) => Promise<{
    ok: boolean;
    status: number;
    error?: string;
    code?: string;
    source: "bearer" | "session-file" | "none";
    verifiedOnline?: boolean;
    hubUser: { id: string | null; email: string | null; exp?: number | null } | null;
    token?: string;
  }>;
  readValidJsonState: typeof readValidJsonState;
  writeJsonStateAtomic: typeof writeJsonStateAtomic;
  pickAvailablePort: typeof pickAvailablePort;
}

export function createSovereignRuntimeBridge(
  config: SovereignRuntimeBridgeConfig
): SovereignRuntimeBridge;
