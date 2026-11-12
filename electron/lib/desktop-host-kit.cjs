"use strict";

/**
 * @dev/hub-desktop-host-kit — Canonical Electron Main & Preload Desktop Host Kit (`desktop-host-kit.cjs`)
 *
 * Synced into `<productRoot>/electron/lib/desktop-host-kit.cjs` via `Tool/scripts/lib/sync-electron-shared-libs.cjs`
 * so packaged `app.asar` builds (`P0001`, `P0003`, `P0006`, `P0009`, `P0010`) stay 100% self-contained.
 *
 * Unifies:
 * 1. Product version resolution (`resolveDesktopProductVersion`) — prevents unpackaged `app.getVersion()` from returning Electron runtime `42.x`.
 * 2. Semver comparison & `latest.yml` parser (`compareSemver`, `parseLatestYml`, `hasPackagedAppUpdateYml`).
 * 3. Fresh workspace `dist/index.html` vs `app.asar` resolution (`resolveLocalDistIndexHtml`).
 * 4. Unified `electron-updater` + direct GitHub Releases `latest.yml` HTTPS fallback IPC controller (`createDesktopUpdaterIpcController`).
 * 5. Preload `HubDesktopUpdateBridge` factory (`createPreloadUpdateBridge`).
 */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

function compareSemver(a, b) {
  const pa = String(a || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function parseLatestYml(ymlText) {
  const verMatch = String(ymlText || "").match(/^version:\s*['"]?([^\r\n'"]+)['"]?/m);
  const pathMatch = String(ymlText || "").match(/^path:\s*['"]?([^\r\n'"]+)['"]?/m);
  const dateMatch = String(ymlText || "").match(/^releaseDate:\s*['"]?([^\r\n'"]+)['"]?/m);
  return {
    version: verMatch ? verMatch[1].trim() : "",
    fileName: pathMatch ? pathMatch[1].trim() : "",
    releaseDate: dateMatch ? dateMatch[1].trim() : "",
  };
}

function hasPackagedAppUpdateYml(app) {
  if (!app?.isPackaged) return false;
  try {
    return fs.existsSync(path.join(process.resourcesPath || "", "app-update.yml"));
  } catch {
    return false;
  }
}

/**
 * Resolve true product version from `package.json` (never returning unpackaged Electron runtime semver).
 */
function resolveDesktopProductVersion(app, opts = {}) {
  const packaged = Boolean(app?.isPackaged);
  const electronDir = opts.electronDir || __dirname;
  const repoRoot = opts.repoRoot || (packaged ? process.resourcesPath || "" : path.resolve(electronDir, ".."));
  const envVersionKey = opts.envVersionKey || "";
  const isDevWorkspace =
    opts.isDevWorkspace ??
    (!packaged ||
      String(electronDir).toLowerCase().includes("\\e:\\dev\\") ||
      String(electronDir).toLowerCase().startsWith("e:\\dev\\"));

  try {
    const devWorkspacePkg = packaged
      ? path.resolve(process.resourcesPath || "", "..", "..", "..", "package.json")
      : path.join(repoRoot, "package.json");
    const localParentPkg = path.resolve(electronDir, "..", "package.json");
    const localGrandParentPkg = path.resolve(electronDir, "..", "..", "package.json");
    const asarPkg = packaged ? path.join(process.resourcesPath || "", "app.asar", "package.json") : null;
    const altPkg = packaged ? path.join(process.resourcesPath || "", "app", "package.json") : null;
    const candidates = isDevWorkspace
      ? [devWorkspacePkg, localParentPkg, localGrandParentPkg, asarPkg, altPkg]
      : [asarPkg, altPkg, localParentPkg, localGrandParentPkg];
    for (const candidate of candidates) {
      if (!candidate || !fs.existsSync(candidate)) continue;
      const ver = String(JSON.parse(fs.readFileSync(candidate, "utf8")).version || "").trim();
      if (ver) return ver;
    }
  } catch {
    /* fall through */
  }
  const fromEnv = envVersionKey ? String(process.env[envVersionKey] || "").trim() : "";
  const electronVer = String(app?.getVersion?.() || "").trim();
  if (fromEnv && (!packaged || fromEnv !== electronVer)) return fromEnv;
  return packaged ? electronVer : fromEnv || electronVer;
}

/**
 * Prefer live workspace `dist/index.html` when unpacked build runs inside workspace and `dist` is newer than `app.asar`.
 */
function resolveLocalDistIndexHtml(app, electronDir) {
  const baseDir = electronDir || __dirname;
  const bundledDistHtml = fs.existsSync(path.resolve(baseDir, "..", "dist", "index.html"))
    ? path.resolve(baseDir, "..", "dist", "index.html")
    : path.resolve(baseDir, "..", "..", "dist", "index.html");
  if (!app?.isPackaged) {
    return bundledDistHtml;
  }
  try {
    const workspaceDistHtml = path.resolve(process.resourcesPath || "", "..", "..", "dist", "index.html");
    const asarPath = path.join(process.resourcesPath || "", "app.asar");
    if (fs.existsSync(workspaceDistHtml)) {
      const workspaceStat = fs.statSync(workspaceDistHtml);
      const asarMtime = fs.existsSync(asarPath) ? fs.statSync(asarPath).mtimeMs : 0;
      if (workspaceStat.mtimeMs >= asarMtime) {
        return workspaceDistHtml;
      }
    }
  } catch {
    /* ignore */
  }
  return bundledDistHtml;
}

function fetchTextFollowingRedirects(url, userAgent = "Hub-Desktop-Updater/1.0", redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": userAgent, Accept: "*/*" } },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          resolve(fetchTextFollowingRedirects(nextUrl, userAgent, redirectsLeft - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );
    req.setTimeout(10_000, () => {
      req.destroy(new Error("Update check timed out"));
    });
    req.on("error", reject);
  });
}

function downloadFileWithProgress(url, destPath, onProgress, userAgent = "Hub-Desktop-Updater/1.0", redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": userAgent, Accept: "application/octet-stream,*/*" } },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          resolve(downloadFileWithProgress(nextUrl, destPath, onProgress, userAgent, redirectsLeft - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} downloading update`));
          return;
        }
        const total = Number.parseInt(res.headers["content-length"] || "0", 10) || 0;
        let transferred = 0;
        const partPath = `${destPath}.${process.pid}.${Date.now()}.part`;
        const cleanupPart = () => {
          try {
            if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
          } catch {
            /* ignore */
          }
        };
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const out = fs.createWriteStream(partPath);
        res.on("data", (chunk) => {
          transferred += chunk.length;
          const percent = total > 0 ? Math.min(99, Math.round((transferred / total) * 100)) : 50;
          onProgress?.({ percent, transferred, total });
        });
        res.on("error", (err) => {
          out.destroy();
          cleanupPart();
          reject(err);
        });
        res.pipe(out);
        out.on("finish", () => {
          out.close(() => {
            try {
              if (fs.existsSync(destPath)) {
                try {
                  fs.unlinkSync(destPath);
                } catch {
                  fs.renameSync(destPath, `${destPath}.stale.${Date.now()}`);
                }
              }
              fs.renameSync(partPath, destPath);
              resolve(destPath);
            } catch (err) {
              try {
                fs.copyFileSync(partPath, destPath);
                cleanupPart();
                resolve(destPath);
              } catch {
                cleanupPart();
                reject(err);
              }
            }
          });
        });
        out.on("error", (err) => {
          cleanupPart();
          reject(err);
        });
      },
    );
    req.setTimeout(120_000, () => {
      req.destroy(new Error("Download timed out"));
    });
    req.on("error", reject);
  });
}

/**
 * Create a unified `HubDesktopUpdateBridge` IPC controller for Electron `main.cjs`.
 *
 * @param {{
 *   app: import("electron").App,
 *   ipcMain: import("electron").IpcMain,
 *   channelPrefix: string,
 *   productName?: string,
 *   githubRepo?: string,
 *   installerFallbackTemplate?: string,
 *   electronDir?: string,
 *   autoCheckDelayMs?: number,
 *   feedConfig?: Record<string, unknown> | null,
 *   resolveAuthToken?: ((app: import("electron").App) => string) | null,
 *   autoDownload?: boolean,
 *   autoInstallOnAppQuit?: boolean,
 *   disableDifferentialDownload?: boolean,
 *   legacyAppChannels?: boolean,
 *   onBeforeQuit?: () => void,
 * }} opts
 */
function createDesktopUpdaterIpcController(opts) {
  const {
    app,
    ipcMain,
    channelPrefix,
    productName = "Desktop App",
    githubRepo = "",
    installerFallbackTemplate = "",
    electronDir = __dirname,
    autoCheckDelayMs = 0,
    recheckIntervalMs = 0,
    focusRecheckMs = 0,
    feedConfig = null,
    resolveAuthToken = null,
    autoDownload = false,
    autoInstallOnAppQuit = true,
    quitAndInstallSilent = false,
    disableDifferentialDownload = false,
    legacyAppChannels = false,
  } = opts;

  let mainWindow = null;
  let onBeforeQuitHook = typeof opts.onBeforeQuit === "function" ? opts.onBeforeQuit : null;
  let downloadedInstallerPath = "";
  let downloadedInstallerVersion = "";
  let inFlightCheckPromise = null;
  let inFlightDownloadPromise = null;
  let autoUpdaterInstance;
  let listenersBound = false;
  let lastCheckAt = 0;
  let recheckTimer = null;

  const effectiveRepo =
    githubRepo ||
    (feedConfig && feedConfig.owner && feedConfig.repo ? `${feedConfig.owner}/${feedConfig.repo}` : "");
  const effectiveFeedConfig =
    feedConfig ||
    (() => {
      const slash = String(effectiveRepo || "").indexOf("/");
      if (slash <= 0 || slash >= effectiveRepo.length - 1) return null;
      return {
        provider: "github",
        owner: effectiveRepo.slice(0, slash),
        repo: effectiveRepo.slice(slash + 1),
      };
    })();
  const userAgent = `${productName.replace(/\s+/g, "-")}-Updater/1.0`;
  const latestYmlUrl = effectiveRepo
    ? `https://github.com/${effectiveRepo}/releases/latest/download/latest.yml`
    : "";
  const releasePageUrl = effectiveRepo
    ? `https://github.com/${effectiveRepo}/releases/latest`
    : "";

  function resolveDirectDownloadUrl(ver, fileName) {
    if (!effectiveRepo) return "";
    if (!ver) return releasePageUrl;
    const defaultInstaller = installerFallbackTemplate
      ? installerFallbackTemplate.replace(/\{version\}/g, ver)
      : `${productName.replace(/\s+/g, "-")}-Setup-${ver}.exe`;
    const resolvedFile = fileName || defaultInstaller;
    return `https://github.com/${effectiveRepo}/releases/download/v${ver}/${encodeURIComponent(resolvedFile)}`;
  }

  function formatFriendlyError(err) {
    const raw = err instanceof Error ? err.message : String(err || "Update check failed");
    if (/404|not found/i.test(raw) && typeof resolveAuthToken === "function") {
      const hasAuth = Boolean(resolveAuthToken(app));
      return hasAuth
        ? "Update feed not reachable — check GitHub Releases or updater token scope."
        : "Update feed not reachable (GitHub Releases must be public, or add updater-gh-token for private repo).";
    }
    return raw.slice(0, 220);
  }

  function applyFeedAndAuth(updater) {
    if (!updater) return;
    if (effectiveFeedConfig && typeof updater.setFeedURL === "function") {
      try {
        updater.setFeedURL({ ...effectiveFeedConfig });
      } catch {
        /* ignore invalid feed URL in dev */
      }
    }
    if (typeof resolveAuthToken === "function") {
      const token = String(resolveAuthToken(app) || "").trim();
      if (token) {
        process.env.GH_TOKEN = token;
        process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || token;
        updater.requestHeaders = {
          ...(updater.requestHeaders || {}),
          Authorization: `token ${token}`,
        };
        if (typeof updater.addAuthHeader === "function") {
          updater.addAuthHeader(`token ${token}`);
        }
      }
    }
  }

  function runtimeChannel() {
    if (!app.isPackaged) return "dev";
    if (process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE) return "portable";
    return "installer";
  }

  function currentVersion() {
    return resolveDesktopProductVersion(app, { electronDir });
  }

  let updateStatus = {
    state: app.isPackaged ? "idle" : "dev",
    runtime: runtimeChannel(),
    supportsUpdates: app.isPackaged,
    currentVersion: currentVersion(),
    message: app.isPackaged
      ? "Ready to check for desktop updates."
      : "Auto update is available after installing the packaged app.",
    updateVersion: "",
    releaseName: "",
    releaseDate: "",
    installerFileName: "",
    releasePageUrl,
    downloadUrl: releasePageUrl,
    progress: null,
  };

  function setUpdateStatus(next) {
    const merged = {
      ...updateStatus,
      ...next,
    };
    updateStatus = {
      ...merged,
      runtime: runtimeChannel(),
      supportsUpdates: app.isPackaged,
      currentVersion: currentVersion(),
      releasePageUrl,
      downloadUrl: resolveDirectDownloadUrl(merged.updateVersion, merged.installerFileName) || releasePageUrl,
    };
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`${channelPrefix}:update-status`, updateStatus);
      if (legacyAppChannels) {
        const legacyStatusMap = {
          latest: "none",
          available: "available",
          downloaded: "downloaded",
          checking: "checking",
          downloading: "downloading",
          installing: "installing",
          error: "error",
        };
        const mappedStatus = legacyStatusMap[updateStatus.state];
        if (mappedStatus) {
          mainWindow.webContents.send("app:update-event", {
            status: mappedStatus,
            version: updateStatus.updateVersion || undefined,
            message: updateStatus.message,
          });
        }
      }
    }
    return updateStatus;
  }

  function getAutoUpdater() {
    if (!app.isPackaged) return null;
    if (autoUpdaterInstance !== undefined) return autoUpdaterInstance;
    try {
      autoUpdaterInstance = require("electron-updater").autoUpdater || null;
    } catch {
      autoUpdaterInstance = null;
    }
    if (autoUpdaterInstance && !listenersBound) {
      listenersBound = true;
      const isPortable = runtimeChannel() === "portable";
      autoUpdaterInstance.autoDownload = Boolean(autoDownload) && !isPortable;
      autoUpdaterInstance.autoInstallOnAppQuit = Boolean(autoInstallOnAppQuit) && !isPortable;
      if (disableDifferentialDownload) {
        autoUpdaterInstance.disableDifferentialDownload = true;
      }
      applyFeedAndAuth(autoUpdaterInstance);
      autoUpdaterInstance.on("before-quit-for-update", () => {
        onBeforeQuitHook?.();
      });
      autoUpdaterInstance.on("checking-for-update", () => {
        setUpdateStatus({ state: "checking", message: "Checking GitHub Releases...", progress: null });
      });
      autoUpdaterInstance.on("update-available", (info) => {
        const ver = String(info?.version || "");
        setUpdateStatus({
          state: "available",
          updateVersion: ver,
          releaseName: ver ? `v${ver}` : String(info?.releaseName || ""),
          releaseDate: String(info?.releaseDate || ""),
          message: isPortable
            ? `Version ${ver} is available on GitHub Releases.`
            : ver
              ? `Version ${ver} is ready to download.`
              : "Update available",
          progress: null,
        });
      });
      autoUpdaterInstance.on("update-not-available", (info) => {
        setUpdateStatus({
          state: "latest",
          updateVersion: String(info?.version || ""),
          message: `${productName} ${currentVersion()} is up to date.`,
          progress: null,
        });
      });
      autoUpdaterInstance.on("download-progress", (prog) => {
        const pct = Math.round(Number(prog?.percent || 0));
        setUpdateStatus({
          state: "downloading",
          progress: {
            percent: Number(prog?.percent || 0),
            transferred: Number(prog?.transferred || 0),
            total: Number(prog?.total || 0),
            bytesPerSecond: Number(prog?.bytesPerSecond || 0),
          },
          message: `Downloading update (${pct}%)...`,
        });
      });
      autoUpdaterInstance.on("update-downloaded", (info) => {
        const ver = String(info?.version || updateStatus.updateVersion || "");
        downloadedInstallerVersion = ver;
        setUpdateStatus({
          state: "downloaded",
          updateVersion: ver,
          progress: { percent: 100 },
          message: ver ? `Version ${ver} is ready. Restart to update.` : "Update ready — restart to install",
        });
      });
      autoUpdaterInstance.on("error", (err) => {
        setUpdateStatus({
          state: "error",
          message: formatFriendlyError(err),
          progress: null,
        });
      });
    }
    return autoUpdaterInstance;
  }

  async function checkForUpdates() {
    if (!app.isPackaged) {
      return setUpdateStatus({
        state: "dev",
        message: "Auto update is available after installing the packaged app.",
        progress: null,
      });
    }
    if (inFlightDownloadPromise) {
      return inFlightDownloadPromise;
    }
    if (inFlightCheckPromise) {
      return inFlightCheckPromise;
    }
    inFlightCheckPromise = (async () => {
      lastCheckAt = Date.now();
      const updater = getAutoUpdater();
      applyFeedAndAuth(updater);
      setUpdateStatus({
        state: "checking",
        message: "Checking GitHub Releases for a new version...",
        progress: null,
      });
      if (updater && (hasPackagedAppUpdateYml(app) || effectiveFeedConfig)) {
        try {
          const result = await updater.checkForUpdates();
          if (autoDownload && result?.downloadPromise) {
            inFlightDownloadPromise = Promise.resolve(result.downloadPromise).then(
              () => updateStatus,
              (err) => {
                setUpdateStatus({
                  state: "error",
                  message: formatFriendlyError(err),
                  progress: null,
                });
                return updateStatus;
              },
            ).finally(() => {
              inFlightDownloadPromise = null;
            });
            await inFlightDownloadPromise;
          }
          return updateStatus;
        } catch (err) {
          if (!latestYmlUrl) {
            return setUpdateStatus({
              state: "error",
              message: formatFriendlyError(err),
              progress: null,
            });
          }
          /* fall through to direct latest.yml check if effectiveRepo is configured */
        }
      }
      if (!latestYmlUrl) {
        return setUpdateStatus({
          state: "latest",
          message: `${productName} ${currentVersion()} is up to date.`,
          progress: null,
        });
      }
      try {
        const yml = await fetchTextFollowingRedirects(latestYmlUrl, userAgent);
        const parsed = parseLatestYml(yml);
        if (!parsed.version) throw new Error("Invalid latest.yml response");
        const cmp = compareSemver(parsed.version, currentVersion());
        const defaultInstaller = installerFallbackTemplate
          ? installerFallbackTemplate.replace(/\{version\}/g, parsed.version)
          : `${productName.replace(/\s+/g, "-")}-Setup-${parsed.version}.exe`;
        if (cmp > 0) {
          if (
            downloadedInstallerVersion === parsed.version &&
            downloadedInstallerPath &&
            fs.existsSync(downloadedInstallerPath)
          ) {
            return setUpdateStatus({
              state: "downloaded",
              updateVersion: parsed.version,
              releaseName: `v${parsed.version}`,
              releaseDate: parsed.releaseDate,
              installerFileName: parsed.fileName || defaultInstaller,
              message: `Version ${parsed.version} is ready. Restart to update.`,
              progress: { percent: 100 },
            });
          }
          const availStatus = setUpdateStatus({
            state: "available",
            updateVersion: parsed.version,
            releaseName: `v${parsed.version}`,
            releaseDate: parsed.releaseDate,
            installerFileName: parsed.fileName || defaultInstaller,
            message: `Version ${parsed.version} is ready to download.`,
            progress: null,
          });
          if (autoDownload) {
            return downloadUpdate();
          }
          return availStatus;
        }
        return setUpdateStatus({
          state: "latest",
          updateVersion: parsed.version,
          releaseDate: parsed.releaseDate,
          message: `${productName} ${currentVersion()} is up to date.`,
          progress: null,
        });
      } catch (err) {
        return setUpdateStatus({
          state: "error",
          message: formatFriendlyError(err),
          progress: null,
        });
      }
    })();
    try {
      return await inFlightCheckPromise;
    } finally {
      inFlightCheckPromise = null;
    }
  }

  async function downloadUpdate() {
    if (!app.isPackaged) return checkForUpdates();
    if (runtimeChannel() === "portable") {
      return setUpdateStatus({
        state: "available",
        message: "Portable build — download the latest portable .exe from GitHub Releases.",
        progress: null,
      });
    }
    if (inFlightDownloadPromise) {
      return inFlightDownloadPromise;
    }
    if (
      updateStatus.state === "downloaded" &&
      updateStatus.updateVersion &&
      downloadedInstallerVersion === updateStatus.updateVersion
    ) {
      return updateStatus;
    }
    inFlightDownloadPromise = (async () => {
      const updater = getAutoUpdater();
      applyFeedAndAuth(updater);
      if (updater && (hasPackagedAppUpdateYml(app) || effectiveFeedConfig)) {
        try {
          setUpdateStatus({
            state: "downloading",
            message: "Downloading update...",
            progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 },
          });
          await updater.downloadUpdate();
          return updateStatus;
        } catch (err) {
          if (!effectiveRepo) {
            return setUpdateStatus({
              state: "error",
              message: formatFriendlyError(err),
              progress: null,
            });
          }
          /* fall through to direct HTTPS installer download */
        }
      }
      const ver = updateStatus.updateVersion;
      if (!ver || !effectiveRepo) return checkForUpdates();
      const defaultInstaller = installerFallbackTemplate
        ? installerFallbackTemplate.replace(/\{version\}/g, ver)
        : `${productName.replace(/\s+/g, "-")}-Setup-${ver}.exe`;
      const fileName = updateStatus.installerFileName || defaultInstaller;
      const downloadUrl = resolveDirectDownloadUrl(ver, fileName);
      const destPath = path.join(app.getPath("temp"), defaultInstaller);
      try {
        setUpdateStatus({ state: "downloading", message: `Downloading v${ver} (0%)...`, progress: { percent: 0 } });
        await downloadFileWithProgress(
          downloadUrl,
          destPath,
          ({ percent, transferred, total }) => {
            setUpdateStatus({
              state: "downloading",
              message: `Downloading v${ver} (${percent}%)...`,
              progress: { percent, transferred, total },
            });
          },
          userAgent,
        );
        downloadedInstallerPath = destPath;
        downloadedInstallerVersion = ver;
        return setUpdateStatus({
          state: "downloaded",
          message: `Version ${ver} is ready. Restart to update.`,
          progress: { percent: 100 },
        });
      } catch (err) {
        return setUpdateStatus({
          state: "error",
          message: formatFriendlyError(err),
          progress: null,
        });
      }
    })();
    try {
      return await inFlightDownloadPromise;
    } finally {
      inFlightDownloadPromise = null;
    }
  }

  function installUpdate() {
    if (!app.isPackaged) return checkForUpdates();
    if (runtimeChannel() === "portable") {
      return setUpdateStatus({
        state: "available",
        message: "Portable build — replace the .exe manually from GitHub Releases.",
        progress: null,
      });
    }
    const updater = getAutoUpdater();
    setUpdateStatus({
      state: "installing",
      message: `Restarting ${productName} to install update...`,
      progress: null,
    });
    onBeforeQuitHook?.();
    if (updater && !downloadedInstallerPath) {
      setImmediate(() => updater.quitAndInstall(Boolean(quitAndInstallSilent), true));
      return updateStatus;
    }
    if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
      const installerArgs = [
        ...(quitAndInstallSilent ? ["/S"] : []),
        "--updated",
        "--force-run",
      ];
      setImmediate(() => {
        try {
          const child = spawn(downloadedInstallerPath, installerArgs, {
            detached: true,
            stdio: "ignore",
            windowsHide: Boolean(quitAndInstallSilent),
          });
          child.unref();
        } catch {
          /* ignore */
        }
        try {
          if (typeof app.releaseSingleInstanceLock === "function") {
            app.releaseSingleInstanceLock();
          }
        } catch {
          /* ignore */
        }
        app.exit(0);
      });
    }
    return updateStatus;
  }

  function registerIpc(registerOpts = {}) {
    if (typeof registerOpts.onBeforeQuit === "function") {
      onBeforeQuitHook = registerOpts.onBeforeQuit;
    }
    getAutoUpdater();
    ipcMain.handle(`${channelPrefix}:get-update-status`, async () => updateStatus);
    ipcMain.handle(`${channelPrefix}:check-for-updates`, async () => checkForUpdates());
    ipcMain.handle(`${channelPrefix}:download-update`, async () => downloadUpdate());
    ipcMain.handle(`${channelPrefix}:install-update`, async () => installUpdate());

    if (legacyAppChannels) {
      ipcMain.handle("app:checkForUpdates", async () => {
        if (!app.isPackaged) {
          return { ok: false, message: "Updates are only available in the packaged app." };
        }
        if (!hasPackagedAppUpdateYml(app) && !effectiveRepo) {
          return { ok: true, updateInfo: null, message: "Auto-update config is not bundled in unpacked builds." };
        }
        const status = await checkForUpdates();
        if (status.state === "error") {
          return { ok: false, message: status.message };
        }
        if (status.state === "latest") {
          return { ok: true, updateInfo: null, message: "No updates available." };
        }
        const updateInfo = status.updateVersion ? { version: status.updateVersion } : null;
        return {
          ok: true,
          updateInfo,
          downloaded: status.state === "downloaded",
          message: status.message,
        };
      });

      ipcMain.handle("app:installUpdate", async () => {
        if (!app.isPackaged) {
          return { ok: false, message: "Updates are only available in the packaged app." };
        }
        installUpdate();
        return { ok: true, message: "Installing update..." };
      });
    }

    if (app.isPackaged && autoCheckDelayMs > 0) {
      setTimeout(() => {
        void checkForUpdates();
      }, autoCheckDelayMs).unref?.();
    }
  }

  function attachWindow(win) {
    mainWindow = win;
    setUpdateStatus(updateStatus);
    if (!app.isPackaged) return;
    if (recheckIntervalMs > 0 && !recheckTimer) {
      recheckTimer = setInterval(() => {
        void checkForUpdates().catch(() => undefined);
      }, recheckIntervalMs);
      if (typeof recheckTimer.unref === "function") recheckTimer.unref();
    }
    if (focusRecheckMs > 0 && win && typeof win.on === "function") {
      win.on("focus", () => {
        if (Date.now() - lastCheckAt < focusRecheckMs) return;
        void checkForUpdates().catch(() => undefined);
      });
    }
  }

  return {
    registerIpc,
    attachWindow,
    getStatus: () => updateStatus,
    setStatus: setUpdateStatus,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}

/**
 * Create preload IPC methods matching `@tool-workspace/hub-ui` `HubDesktopUpdateBridge`.
 */
function createPreloadUpdateBridge(ipcRenderer, channelPrefix) {
  return {
    getUpdateStatus: () => ipcRenderer.invoke(`${channelPrefix}:get-update-status`),
    checkForUpdates: () => ipcRenderer.invoke(`${channelPrefix}:check-for-updates`),
    downloadUpdate: () => ipcRenderer.invoke(`${channelPrefix}:download-update`),
    installUpdate: () => ipcRenderer.invoke(`${channelPrefix}:install-update`),
    onUpdateStatus: (handler) => {
      const listener = (_event, status) => handler(status);
      ipcRenderer.on(`${channelPrefix}:update-status`, listener);
      return () => ipcRenderer.removeListener(`${channelPrefix}:update-status`, listener);
    },
  };
}

module.exports = {
  compareSemver,
  parseLatestYml,
  hasPackagedAppUpdateYml,
  resolveDesktopProductVersion,
  resolveLocalDistIndexHtml,
  createDesktopUpdaterIpcController,
  createPreloadUpdateBridge,
};
