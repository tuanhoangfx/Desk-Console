const path = require("node:path");
const os = require("node:os");

const PROD_DIR = "desk-console";
const DEV_DIR = "desk-console-dev";
const DEFAULT_PROD_API_PORT = 6010;
const DEFAULT_DEV_API_PORT = 6011;

function roamingAppData() {
  return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
}

module.exports = {
  PROD_DIR,
  DEV_DIR,
  DEFAULT_PROD_API_PORT,
  DEFAULT_DEV_API_PORT,
  roamingAppData,
};
