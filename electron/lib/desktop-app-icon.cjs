const fs = require("node:fs");
const path = require("node:path");

function listAppIconCandidates(rootDir) {
  const out = [];
  if (rootDir) {
    out.push(path.join(rootDir, "build", "icons", "app.ico"));
    out.push(path.join(rootDir, "build", "icons", "app.png"));
  }
  const resourcesPath = typeof process !== "undefined" ? process.resourcesPath : "";
  if (resourcesPath) {
    out.push(path.join(resourcesPath, "app.ico"));
    out.push(path.join(resourcesPath, "build", "icons", "app.ico"));
  }
  return out;
}

function resolveAppIconPath(rootDir) {
  return path.join(rootDir, "build", "icons", "app.ico");
}

function resolveAppIconPathIfExists(rootDir) {
  for (const iconPath of listAppIconCandidates(rootDir)) {
    try {
      if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile() && fs.statSync(iconPath).size >= 1024) {
        return iconPath;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

module.exports = {
  listAppIconCandidates,
  resolveAppIconPath,
  resolveAppIconPathIfExists,
};
