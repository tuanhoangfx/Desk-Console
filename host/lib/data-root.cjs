const path = require("node:path");
const {
  PROD_DIR,
  DEV_DIR,
  DEFAULT_DEV_API_PORT,
  roamingAppData,
} = require("../../electron/lib/user-data-root.cjs");

/** SSOT — clips/captures/hotkeys JSON root (%APPDATA% desk-console vs desk-console-dev). */
function resolveDeskDataRoot() {
  if (process.env.DESK_CONSOLE_DATA) return path.resolve(process.env.DESK_CONSOLE_DATA);
  const port = Number(process.env.DESK_API_PORT || 6010);
  const isolated = port === DEFAULT_DEV_API_PORT || process.env.DESK_DEV_ISOLATED === "1";
  const dir = isolated ? DEV_DIR : PROD_DIR;
  return path.join(roamingAppData(), dir);
}

module.exports = { resolveDeskDataRoot };
