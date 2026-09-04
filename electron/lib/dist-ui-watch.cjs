/** Reload renderer when dist/ changes — no Vite dev server (DESK_DIST_WATCH=1). P0003 parity. */
const fs = require("node:fs");
const path = require("node:path");

function isDistWatchName(name) {
  return /(?:^|[\\/])index\.html$/i.test(String(name || ""));
}

function readDistIndexFingerprint(indexPath) {
  try {
    return fs.readFileSync(indexPath, "utf8");
  } catch {
    return "";
  }
}

function bindDistUiWatch({ distDir, onReload, debounceMs = 800 }) {
  if (String(process.env.DESK_DIST_WATCH || "") !== "1") {
    return () => {};
  }
  if (!fs.existsSync(distDir)) {
    console.warn("[desk-dist-watch] missing dist — run vite build first");
    return () => {};
  }

  let debounce = null;
  let lastFingerprint = "";
  let lastReloadAt = 0;
  const minIntervalMs = 4000;
  const trigger = (reason) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const indexPath = path.join(distDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const fingerprint = readDistIndexFingerprint(indexPath);
      if (!fingerprint || fingerprint === lastFingerprint) return;
      const now = Date.now();
      if (now - lastReloadAt < minIntervalMs) return;
      lastFingerprint = fingerprint;
      lastReloadAt = now;
      console.log(`[desk-dist-watch] reload (${reason})`);
      onReload();
    }, debounceMs);
  };

  const watchers = [];
  const watchPath = (target, label) => {
    try {
      const w = fs.watch(target, { recursive: true }, (_event, name) => {
        if (isDistWatchName(name)) trigger(label);
      });
      watchers.push(w);
    } catch {
      /* ignore */
    }
  };

  watchPath(distDir, "dist");

  return () => {
    clearTimeout(debounce);
    for (const w of watchers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
  };
}

module.exports = { bindDistUiWatch, isDistWatchName, readDistIndexFingerprint };
