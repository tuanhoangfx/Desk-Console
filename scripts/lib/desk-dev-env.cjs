const path = require("node:path");
const { DEV_DIR, DEFAULT_DEV_API_PORT, roamingAppData } = require("../../electron/lib/user-data-root.cjs");

/** Isolated dev env — host :6011 + %APPDATA%\\desk-console-dev (parity dev-node / Electron). */
function resolveDeskDevEnv(base = process.env) {
  const isolated = base.DESK_DEV_ISOLATED !== "0";
  if (!isolated) return { ...base };
  const root = base.DESK_USER_DATA || path.join(roamingAppData(), DEV_DIR);
  return {
    ...base,
    DESK_DEV_ISOLATED: "1",
    DESK_USER_DATA: root,
    DESK_CONSOLE_DATA: base.DESK_CONSOLE_DATA || root,
    DESK_API_PORT: base.DESK_API_PORT || String(DEFAULT_DEV_API_PORT),
  };
}

module.exports = { resolveDeskDevEnv };
