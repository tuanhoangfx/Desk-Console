"use strict";

/**
 * Shared Electron BrowserWindow dev-boot recovery SSOT.
 *
 * Watches a BrowserWindow loaded against a local Vite dev server (`127.0.0.1` / `localhost`).
 * If `#hub-boot-loader[role="alert"]` ("App failed to load") is active:
 * 1. When `isPackaged` is true and a fallback (`packagedFallbackUrl` or `onPackagedFallback`)
 *    is configured, switches to the packaged bundle after `packagedFallbackAfterAttempts` (default 2)
 *    failed checks so the packaged `.exe` never stays wedged on a broken dev server.
 * 2. Otherwise calls `win.webContents.reloadIgnoringCache()` up to `maxReloadAttempts` (default 15).
 */
function attachElectronDevBootRecovery(win, opts = {}) {
  if (!win || typeof win.isDestroyed !== "function") {
    return { stop() {} };
  }
  const {
    isPackaged = false,
    packagedFallbackUrl = "",
    onPackagedFallback = null,
    packagedFallbackAfterAttempts = 2,
    maxReloadAttempts = 15,
    intervalMs = 1500,
    logPrefix = "[electron-boot-recovery]",
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
  } = opts;

  let attempts = 0;
  let stopped = false;
  let timer = null;

  function stop() {
    if (stopped) return;
    stopped = true;
    if (timer != null) {
      clearIntervalFn(timer);
      timer = null;
    }
  }

  async function tick() {
    if (stopped || !win || win.isDestroyed() || !win.webContents) {
      stop();
      return { action: "stopped" };
    }
    if (typeof win.webContents.isLoading === "function" && win.webContents.isLoading()) {
      return { action: "loading" };
    }
    let hasBootError = false;
    try {
      hasBootError = Boolean(
        await win.webContents.executeJavaScript(
          `Boolean(typeof document !== "undefined" && document.querySelector('#hub-boot-loader[role="alert"]'))`,
        ),
      );
    } catch {
      return { action: "noop" };
    }

    if (!hasBootError) {
      attempts = 0;
      return { action: "healthy" };
    }

    attempts += 1;
    const canFallback =
      isPackaged &&
      attempts >= packagedFallbackAfterAttempts &&
      (typeof onPackagedFallback === "function" || /^https?:\/\/|^file:\/\//i.test(String(packagedFallbackUrl || "")));

    if (canFallback) {
      stop();
      try {
        console.warn(`${logPrefix} dev UI boot error in packaged app — switching to packaged bundle`);
        if (typeof onPackagedFallback === "function") {
          await onPackagedFallback(win);
        } else if (packagedFallbackUrl) {
          await win.loadURL(packagedFallbackUrl);
        }
      } catch {
        /* ignore fallback navigation race */
      }
      return { action: "fallback", attempts };
    }

    if (attempts <= maxReloadAttempts) {
      try {
        win.webContents.reloadIgnoringCache();
      } catch {
        /* ignore reload race */
      }
      return { action: "reload", attempts };
    }

    stop();
    return { action: "exhausted", attempts };
  }

  timer = setIntervalFn(() => {
    void tick();
  }, intervalMs);

  if (typeof win.on === "function") {
    win.on("closed", stop);
  }

  return { stop, tick, getAttempts: () => attempts };
}

module.exports = {
  attachElectronDevBootRecovery,
};
