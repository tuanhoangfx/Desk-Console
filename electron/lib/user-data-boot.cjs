const path = require("node:path");
const { app } = require("electron");
const { DEV_DIR, roamingAppData } = require("./user-data-root.cjs");

/** Pin isolated dev userData before app.ready — packaged + prod dev can run in parallel. */
function applyDeskDevPaths() {
  if (app.isPackaged) return;
  if (String(process.env.DESK_DEV_ISOLATED || "") !== "1") return;
  const root = process.env.DESK_USER_DATA || path.join(roamingAppData(), DEV_DIR);
  app.setPath("userData", root);
}

module.exports = { applyDeskDevPaths };
