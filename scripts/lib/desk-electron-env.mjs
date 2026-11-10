/** Electron child env — P0003 stealthElectronEnv parity for Desk Console. */
import path from "node:path";
import { createRequire } from "node:module";
import { DESK_VITE_PORT } from "./dev-port-guard.mjs";

const require = createRequire(import.meta.url);
const {
  DEFAULT_DEV_API_PORT,
  DEFAULT_PROD_API_PORT,
  DEV_DIR,
  roamingAppData,
} = require("../../electron/lib/user-data-root.cjs");

/**
 * Isolated dev (`DESK_DEV_ISOLATED=1`) = default — packaged NSIS and `pnpm dev` in parallel.
 * Pass `DESK_DEV_ISOLATED: "0"` only for explicit prod userData debugging.
 */
export function deskElectronEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra,
    DESK_DEV_ISOLATED:
      extra.DESK_DEV_ISOLATED !== undefined ? String(extra.DESK_DEV_ISOLATED) : "1",
  };

  delete env.ELECTRON_RUN_AS_NODE;

  const isolated = env.DESK_DEV_ISOLATED === "1";
  if (isolated) {
    env.DESK_USER_DATA = extra.DESK_USER_DATA ?? path.join(roamingAppData(), DEV_DIR);
    env.DESK_CONSOLE_DATA = extra.DESK_CONSOLE_DATA ?? env.DESK_USER_DATA;
    env.DESK_API_PORT = extra.DESK_API_PORT ?? String(DEFAULT_DEV_API_PORT);
    /** Isolated desktop:dev must hit Vite — never fall through to stale `dist/` (black screen). */
    if (!String(env.VITE_DEV_SERVER_URL || "").trim()) {
      env.VITE_DEV_SERVER_URL = `http://127.0.0.1:${DESK_VITE_PORT}/`;
    }
  } else if (!env.DESK_API_PORT) {
    env.DESK_API_PORT = String(DEFAULT_PROD_API_PORT);
  }

  if (!Object.prototype.hasOwnProperty.call(extra, "VITE_DEV_SERVER_URL") && !isolated) {
    delete env.VITE_DEV_SERVER_URL;
  }

  return env;
}
