const path = require("node:path");
const os = require("node:os");

const PROD_DIR = "desk-console";
const DEV_DIR = "desk-console-dev";
const DEFAULT_DEV_API_PORT = 6011;

function roamingAppData() {
  return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
}

/** SSOT — clips/captures/hotkeys JSON root (%APPDATA% desk-console vs desk-console-dev). */
function resolveDeskDataRoot() {
  if (process.env.DESK_CONSOLE_DATA) return path.resolve(process.env.DESK_CONSOLE_DATA);
  const port = Number(process.env.DESK_API_PORT || 6010);
  const isolated = port === DEFAULT_DEV_API_PORT || process.env.DESK_DEV_ISOLATED === "1";
  const dir = isolated ? DEV_DIR : PROD_DIR;
  return path.join(roamingAppData(), dir);
}

module.exports = { resolveDeskDataRoot };
