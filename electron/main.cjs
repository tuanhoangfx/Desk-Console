try { require("./lib/hot-patch-loader.cjs").installHotPatchResolveHook(); } catch { /* ignore */ }
const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell, clipboard, Notification, screen, dialog } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { applyDeskDevPaths } = require("./lib/user-data-boot.cjs");
const { readPickerSnapshot, snapshotSignature } = require("./picker-store.cjs");
const {
  applyPickerWindowRegion,
  captureForegroundHwnd,
  forceShowWindowWin32,
  getClipboardSequenceNumber,
  hwndFromNativeHandle,
  setWindowNoActivate,
} = require("./hwnd-once.cjs");
const { pasteToForegroundHwnd, restoreForegroundHwnd, grantForegroundPermission } = require("./win-paste.cjs");
const { whenModifiersUp, whenModifiersUpAsync } = require("./modifiers-up.cjs");
const { readPrefs, writePrefs } = require("./prefs.cjs");
const { resolveAppIconPathIfExists } = require("./lib/desktop-app-icon.cjs");
const {
  parseDeskCliActions,
  registerExplorerContextMenu,
  buildClipPayloadFromFile,
} = require("./lib/explorer-context-menu.cjs");
const { evaluateSyncHealthAlerts } = require("./lib/sync-health-guard.cjs");
const {
  registerDesktopUpdaterIpc,
  attachMainWindowForUpdater,
} = require("./desktop-updater.cjs");
const {
  applyElectronDevAppId,
  formatElectronWindowTitle,
  attachElectronDevWindowBadge,
} = require("./lib/electron-dev-badge.cjs");

applyDeskDevPaths();

const isDevIsolated = String(process.env.DESK_DEV_ISOLATED || "") === "1";
if (String(process.env.DESK_DISABLE_GPU || "") === "1") {
  app.disableHardwareAcceleration();
}
if (isDevIsolated) {
  app.commandLine.appendSwitch("remote-debugging-port", String(process.env.DESK_DEV_CDP_PORT || "9311"));
}
applyElectronDevAppId(app, "vn.infi.desk-console", !app.isPackaged || isDevIsolated);

const API_PORT = Number(process.env.DESK_API_PORT || 6010);
const APP_VERSION = require("../package.json").version;
const DEFAULT_HOTKEYS = {
  picker: "CommandOrControl+Shift+Q",
};

const PICKER_FALLBACKS = ["CommandOrControl+Shift+Q", "CommandOrControl+Shift+Period"];

let mainWindow = null;
let pickerWindow = null;
let pickerReady = false;
let tray = null;
let hostChild = null;
let lastPicker = { rows: [], labels: { picker: "Ctrl+Shift+Q" } };
let pickerFocusTimer = null;
let lastPickerSig = "";
let armedPickerHwnd = "";
let lastForeignHwnd = "";
let pickerOpenedFromMain = false;
let lastPickerShownAt = 0;
let lastElectronClipText = "";
let ignoreElectronClipText = "";
let lastElectronClipImgHash = "";
let ignoreElectronClipImgHash = "";
let electronClipPrimed = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.error(`[desk] another instance holds lock (${isDevIsolated ? "dev" : "prod"}) — exiting`);
  app.quit();
}

function api(pathname, method = "GET", body, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) || 1500;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: API_PORT,
        path: pathname,
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function refreshPickerSnapshot(force) {
  try {
    const sig = snapshotSignature();
    if (!force && sig === lastPickerSig && lastPicker.rows.length) return lastPicker;
    lastPickerSig = sig;
    lastPicker = readPickerSnapshot();
  } catch {
    /* keep last */
  }
  return lastPicker;
}

function pushPickerData() {
  if (!pickerWindow || pickerWindow.isDestroyed()) return;
  pickerWindow.webContents.send("desk-picker-data", lastPicker);
}

function probeHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${API_PORT}/api/health`, { timeout: 800 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function hostEntry() {
  const packed = path.join(__dirname, "..", "host", "server.mjs");
  const unpacked = packed.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
  return fs.existsSync(unpacked) ? unpacked : packed;
}

/** Real filesystem root for spawn cwd — never `app.asar` (Windows CreateProcess → ENOENT). */
function hostCwd() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, "app.asar.unpacked");
    if (fs.existsSync(unpacked)) return unpacked;
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, "..");
}

function distRoot() {
  const packed = path.join(__dirname, "..", "dist");
  const unpacked = packed.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
  if (fs.existsSync(path.join(unpacked, "index.html"))) return unpacked;
  if (fs.existsSync(path.join(packed, "index.html"))) return packed;
  return packed;
}

function bundledRclonePath() {
  if (!app.isPackaged) {
    return path.join(__dirname, "..", "resources", "rclone", process.platform === "win32" ? "rclone.exe" : "rclone");
  }
  return path.join(process.resourcesPath, "rclone", process.platform === "win32" ? "rclone.exe" : "rclone");
}

let hostRespawnTimer = null;

async function ensureHost() {
  if (await probeHealth()) return;
  const rclone = bundledRclonePath();
  const dist = distRoot();
  const child = spawn(process.execPath, [hostEntry()], {
    cwd: hostCwd(),
    detached: false,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DESK_API_PORT: String(API_PORT),
      FOLDER_SYNC_API_PORT: String(API_PORT),
      RCLONE_PATH: rclone,
      FOLDER_SYNC_DIST: dist,
      FOLDER_SYNC_RESOURCES: app.isPackaged
        ? process.resourcesPath
        : path.join(__dirname, "..", "resources"),
    },
    windowsHide: true,
  });
  hostChild = child;
  let errTail = "";
  child.stderr?.on("data", (chunk) => {
    errTail = (errTail + String(chunk)).slice(-4000);
  });
  child.on("exit", (code, sig) => {
    if (errTail.trim()) {
      try {
        const logFile = path.join(app.getPath("userData"), "host-boot.log");
        fs.appendFileSync(
          logFile,
          `[${new Date().toISOString()}] exit=${code ?? sig}\n${errTail.trim()}\n\n`,
          "utf8",
        );
      } catch {
        /* ignore log write failure */
      }
    }
    if (!app.isQuiting && hostChild === child) {
      if (hostRespawnTimer) clearTimeout(hostRespawnTimer);
      hostRespawnTimer = setTimeout(() => {
        hostRespawnTimer = null;
        if (!app.isQuiting) void ensureHost();
      }, 1500);
      hostRespawnTimer.unref?.();
    }
  });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (await probeHealth()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function distIndexPath() {
  return path.join(__dirname, "..", "dist", "index.html");
}

function windowTitle() {
  return formatElectronWindowTitle("Desk Console", APP_VERSION, !app.isPackaged || isDevIsolated);
}

function uiHref(opts) {
  const screen = opts && opts.screen ? String(opts.screen) : "";
  const search = opts && opts.search != null ? String(opts.search) : "";
  const q = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const fromEnv = String(process.env.VITE_DEV_SERVER_URL || "").trim();
  const isolated = String(process.env.DESK_DEV_ISOLATED || "") === "1";
  if (fs.existsSync(distIndexPath()) && String(process.env.DESK_LOAD_DIST || "") === "1") {
    const sp = new URLSearchParams(q ? q.slice(1) : "");
    if (screen) sp.set("screen", screen);
    const qs = sp.toString();
    return `${pathToFileURL(distIndexPath()).href}${qs ? `?${qs}` : ""}`;
  }
  if ((!app.isPackaged && fromEnv) || (isolated && !app.isPackaged)) {
    const base = fromEnv || "http://127.0.0.1:5180/";
    const url = new URL(base.endsWith("/") ? base : `${base}/`);
    if (screen) {
      url.pathname = `/${screen}`.replace(/\/+/g, "/");
      url.search = q ? q.slice(1) : "";
    } else {
      url.search = q ? q.slice(1) : "";
    }
    return url.toString();
  }
  if (app.isPackaged) {
    const url = new URL(`http://127.0.0.1:${API_PORT}/`);
    if (screen) {
      url.pathname = `/${screen}`.replace(/\/+/g, "/");
      url.search = q ? q.slice(1) : "";
    } else {
      url.search = q ? q.slice(1) : "";
    }
    return url.toString();
  }
  if (screen) return `http://127.0.0.1:5180/${screen}${q}`;
  return `http://127.0.0.1:5180/${q.replace(/^\?/, "")}`;
}

function reloadAllRenderers() {
  for (const win of [mainWindow, pickerWindow]) {
    if (win && !win.isDestroyed()) win.reload();
  }
}

function appIconPath() {
  return resolveAppIconPathIfExists(path.join(__dirname, ".."));
}

function createWindow() {
  const icon = appIconPath();
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: windowTitle(),
    autoHideMenuBar: true,
    backgroundColor: "#0b1020",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  attachMainWindowForUpdater(mainWindow);
  attachElectronDevWindowBadge(mainWindow, {
    productName: "Desk Console",
    version: APP_VERSION,
    isDev: !app.isPackaged || isDevIsolated,
  });
  if (!wantsHiddenStart()) {
    forceShowWindowWin32(nativeHwnd(mainWindow));
  }
  mainWindow.once("ready-to-show", () => {
    if (!wantsHiddenStart() && mainWindow && !mainWindow.isDestroyed()) {
      forceShowWindowWin32(nativeHwnd(mainWindow));
      mainWindow.show();
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    if (!wantsHiddenStart() && mainWindow && !mainWindow.isDestroyed()) {
      forceShowWindowWin32(nativeHwnd(mainWindow));
    }
  });
  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.loadURL(uiHref({ screen: "jobs" }));
  const recoveryPath = fs.existsSync(path.join(__dirname, "..", "..", "scripts", "lib", "electron-dev-boot-recovery.cjs"))
    ? path.join(__dirname, "..", "..", "scripts", "lib", "electron-dev-boot-recovery.cjs")
    : path.join(__dirname, "lib", "electron-dev-boot-recovery.cjs");
  if (fs.existsSync(recoveryPath)) {
    const { attachElectronDevBootRecovery } = require(recoveryPath);
    attachElectronDevBootRecovery(mainWindow, {
      isPackaged: app.isPackaged,
      packagedFallbackUrl: fs.existsSync(distIndexPath())
        ? `${pathToFileURL(distIndexPath()).href}?screen=jobs`
        : "",
      logPrefix: "[desk]",
    });
  }
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[desk] did-fail-load code=${code} desc=${desc} url=${url}`);
    if (fs.existsSync(distIndexPath()) && String(url || "").startsWith("http://127.0.0.1:")) {
      console.warn("[desk] Vite dev server unreachable — falling back to built dist/index.html");
      process.env.DESK_LOAD_DIST = "1";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(uiHref({ screen: "jobs" }));
      }
      if (pickerWindow && !pickerWindow.isDestroyed()) {
        pickerWindow.loadURL(uiHref({ search: "picker=1" }));
      }
      return;
    }
    if (String(process.env.DESK_DEV_ISOLATED || "") === "1" || process.env.VITE_DEV_SERVER_URL) {
      const retry = uiHref({ screen: "jobs" });
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(retry);
      }, 1500);
    }
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    const reason = String(details?.reason || "unknown");
    console.warn(`[desk] mainWindow render-process-gone reason=${reason} exitCode=${details?.exitCode ?? ""}`);
    if (app.isQuiting || reason === "clean-exit") return;
    setTimeout(() => {
      if (!app.isQuiting && mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.reload();
        } catch {
          mainWindow.loadURL(uiHref({ screen: "dashboard" }));
        }
      }
    }, 300);
  });
  mainWindow.on("unresponsive", () => {
    console.warn("[desk] mainWindow unresponsive — reloading renderer");
    if (!app.isQuiting && mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.reload();
      } catch {
        /* ignore */
      }
    }
  });
}

function createPicker() {
  pickerReady = false;
  pickerWindow = new BrowserWindow({
    width: 480,
    height: 580,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    // Do NOT use type:"toolbar" or transparent:true with disableHardwareAcceleration — breaks Win32 mouse hit-testing.
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  pickerWindow.setAlwaysOnTop(true, "pop-up-menu");
  pickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  applyPickerWindowRegion(nativeHwnd(pickerWindow), 1, 480, 580);
  pickerWindow.on("blur", () => {
    if (Date.now() - lastPickerShownAt < 250) return;
    if (pickerWindow && !pickerWindow.isDestroyed() && pickerWindow.isVisible()) {
      hidePicker();
    }
  });
  pickerWindow.on("closed", () => {
    pickerWindow = null;
    pickerReady = false;
  });
  pickerWindow.webContents.on("did-finish-load", () => {
    pickerReady = true;
    refreshPickerSnapshot(true);
    pushPickerData();
  });
  pickerWindow.webContents.on("did-fail-load", (_e, _code, _desc, url) => {
    if (fs.existsSync(distIndexPath()) && String(url || "").startsWith("http://127.0.0.1:")) {
      process.env.DESK_LOAD_DIST = "1";
      if (pickerWindow && !pickerWindow.isDestroyed()) {
        pickerWindow.loadURL(uiHref({ search: "picker=1" }));
      }
    }
  });
  pickerWindow.loadURL(uiHref({ search: "picker=1" }));
}

/** Hide picker without mutating or blurring Desk Console main window (blur() sends mainWindow to HWND_BOTTOM). */
function dismissPickerQuiet() {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.hide();
  }
}

function restoreMainFocusableSoon() {
  /* no-op: mainWindow stays focusable at all times so it never drops behind other windows */
}

function hidePicker() {
  if (pickerFocusTimer) {
    clearTimeout(pickerFocusTimer);
    pickerFocusTimer = null;
  }
  const hwnd = armedPickerHwnd;
  const fromMain = pickerOpenedFromMain;
  dismissPickerQuiet();
  if (fromMain) {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      try {
        mainWindow.focus();
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (hwnd && !isDeskHwnd(hwnd)) {
    whenModifiersUp(() => {
      restoreForegroundHwnd(hwnd);
    }, { timeoutMs: 600, pollMs: 12 });
  }
}

function notifyPasteFailure(message) {
  const body = String(message || "Could not paste to previous window");
  if (Notification.isSupported()) {
    new Notification({ title: "Desk Console", body }).show();
    return;
  }
  if (tray && typeof tray.displayBalloon === "function") {
    tray.displayBalloon({ title: "Desk Console", content: body });
  }
}

function ensurePickerWarm() {
  if (pickerWindow && !pickerWindow.isDestroyed()) return;
  createPicker();
}

function nativeHwnd(win) {
  if (!win || win.isDestroyed()) return "";
  try {
    return hwndFromNativeHandle(win.getNativeWindowHandle());
  } catch {
    return "";
  }
}

function isDeskHwnd(hwndStr) {
  const h = String(hwndStr || "");
  if (!h || h === "0") return true;
  return h === nativeHwnd(mainWindow) || h === nativeHwnd(pickerWindow);
}

function rememberForeignForeground() {
  if (pickerWindow && !pickerWindow.isDestroyed() && pickerWindow.isVisible()) return;
  const h = captureForegroundHwnd();
  if (h && !isDeskHwnd(h)) lastForeignHwnd = h;
}

function armTargetHwnd() {
  grantForegroundPermission();
  const currentFg = captureForegroundHwnd();
  pickerOpenedFromMain = Boolean(currentFg && currentFg === nativeHwnd(mainWindow));
  let h = currentFg;
  if (!h || isDeskHwnd(h)) h = lastForeignHwnd;
  if (h && isDeskHwnd(h)) h = "";
  armedPickerHwnd = h || "";
  api("/api/clips/picker/arm", "POST", armedPickerHwnd ? { hwnd: armedPickerHwnd } : {}).catch(() => {});
}

function showPicker() {
  // Capture the field/caret window before the picker paints (never arm Desk itself).
  armTargetHwnd();
  refreshPickerSnapshot(true);

  ensurePickerWarm();
  pushPickerData();

  if (!pickerWindow || pickerWindow.isDestroyed()) return;

  const openPicker = () => {
    if (!pickerWindow || pickerWindow.isDestroyed()) return;
    lastPickerShownAt = Date.now();
    let scaleFactor = 1;
    let w = 480;
    let h = 580;
    try {
      const pt = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(pt);
      scaleFactor = display?.scaleFactor || 1;
      const wa = display?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
      [w, h] = pickerWindow.getSize();
      const nextX = Math.max(wa.x + 12, Math.min(pt.x - Math.round(w / 2), wa.x + wa.width - w - 12));
      const nextY = Math.max(wa.y + 12, Math.min(pt.y + 16, wa.y + wa.height - h - 12));
      pickerWindow.setPosition(nextX, nextY, false);
    } catch {
      /* ignore positioning fallback */
    }
    pickerWindow.setAlwaysOnTop(true, "pop-up-menu");
    try {
      pickerWindow.show();
      restoreForegroundHwnd(nativeHwnd(pickerWindow));
      pickerWindow.focus();
      pickerWindow.moveTop();
      applyPickerWindowRegion(nativeHwnd(pickerWindow), scaleFactor, w || 480, h || 580);
      setTimeout(() => {
        if (pickerWindow && !pickerWindow.isDestroyed()) {
          applyPickerWindowRegion(nativeHwnd(pickerWindow), scaleFactor, w || 480, h || 580);
        }
      }, 24);
      pickerWindow.webContents.focus();
      pickerWindow.webContents
        .executeJavaScript("if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();")
        .catch(() => {});
    } catch {
      /* ignore */
    }
  };

  if (pickerReady && !pickerWindow.webContents.isLoading()) {
    openPicker();
    return;
  }
  pickerWindow.removeListener("ready-to-show", openPicker);
  pickerWindow.once("ready-to-show", openPicker);
  pickerWindow.webContents.removeListener("did-finish-load", openPicker);
  pickerWindow.webContents.once("did-finish-load", openPicker);
}

function togglePicker() {
  if (pickerWindow && pickerWindow.isVisible()) hidePicker();
  else showPicker();
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      if (mainWindow.webContents && mainWindow.webContents.isCrashed()) {
        mainWindow.webContents.reload();
      }
    } catch {
      /* ignore */
    }
    forceShowWindowWin32(nativeHwnd(mainWindow));
    mainWindow.show();
    mainWindow.focus();
  }
}

function wantsHiddenStart() {
  return process.argv.includes("--hidden");
}

function applyLoginItem(enabled) {
  if (process.env.VITE_DEV_SERVER_URL) return { openAtLogin: Boolean(enabled), applied: false };
  spawnSync("reg", ["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "electron.app.Electron", "/f"], {
    windowsHide: true,
    stdio: "ignore",
  });
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: process.execPath,
    args: enabled ? ["--hidden"] : [],
  });
  return { openAtLogin: Boolean(enabled), applied: true };
}

/**
 * Retire standalone Folder Sync (P0009) binary, shortcuts, and auto-start entries
 * once unified into Desk Console (P0001). Preserves %APPDATA%\\folder-sync data 100%.
 */
function cleanupRetiredFolderSyncInstall() {
  if (process.platform !== "win32") return;
  try {
    const os = require("node:os");
    const home = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");

    // 1. Stop any running Folder Sync.exe process
    spawnSync("taskkill", ["/F", "/IM", "Folder Sync.exe"], { windowsHide: true, stdio: "ignore" });

    // 2. Remove auto-run registry values for Folder Sync
    for (const valName of ["electron.app.Folder Sync", "Folder Sync", "vn.infi.folder-sync"]) {
      spawnSync("reg", ["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", valName, "/f"], {
        windowsHide: true,
        stdio: "ignore",
      });
    }

    // 3. Remove Desktop & Start Menu shortcuts for Folder Sync
    const shortcuts = [
      path.join(home, "Desktop", "Folder Sync.lnk"),
      path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Folder Sync.lnk"),
      path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "Folder Sync.lnk"),
    ];
    for (const lnk of shortcuts) {
      if (fs.existsSync(lnk)) {
        try {
          fs.rmSync(lnk, { force: true });
        } catch {
          /* ignore */
        }
      }
    }

    // 4. Remove retired %LOCALAPPDATA%\Programs\folder-sync or Folder Sync binary folder
    for (const dirName of ["folder-sync", "Folder Sync"]) {
      const legacyDir = path.join(localAppData, "Programs", dirName);
      if (fs.existsSync(legacyDir)) {
        try {
          fs.rmSync(legacyDir, { recursive: true, force: true });
        } catch {
          /* ignore if locked */
        }
      }
    }
  } catch {
    /* ignore cleanup errors */
  }
}

function dispatchToMainRenderer(jsExpr) {
  showWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const run = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript(jsExpr).catch(() => {});
  };
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", () => setTimeout(run, 150));
  } else {
    setTimeout(run, 80);
  }
}

function openDeskEntity(target = {}) {
  const screenName = String(target.screen || "jobs");
  const payload = JSON.stringify(target);
  dispatchToMainRenderer(
    `window.dispatchEvent(new CustomEvent("desk:navigate", { detail: { screen: ${JSON.stringify(screenName)} } }));` +
      `setTimeout(() => window.dispatchEvent(new CustomEvent("desk:open-entity", { detail: ${payload} })), 60);`,
  );
}

function openSyncFolderInJobs(localPath) {
  const clean = String(localPath || "").trim();
  if (!clean) return;
  dispatchToMainRenderer(
    `window.dispatchEvent(new CustomEvent("desk:navigate", { detail: { screen: "jobs" } }));` +
      `setTimeout(() => window.dispatchEvent(new CustomEvent("desk:sync-folder", { detail: { localPath: ${JSON.stringify(clean)} } })), 60);`,
  );
}

async function handleCliActions(argv = []) {
  const { syncFolder, clipFile } = parseDeskCliActions(argv);
  if (syncFolder) {
    openSyncFolderInJobs(syncFolder);
    return true;
  }
  if (clipFile) {
    try {
      const payload = buildClipPayloadFromFile(clipFile, nativeImage);
      if (payload) {
        const res = await api("/api/clips", "POST", payload, { timeoutMs: 3500 }).catch(() => null);
        if (payload.contentType === "image" && payload.imageDataUrl) {
          writeClipToSystemClipboard(res?.row?.id || "", payload.text, payload.imageDataUrl);
        } else if (payload.text) {
          writeClipToSystemClipboard(res?.row?.id || "", payload.text, "");
        }
        refreshPickerSnapshot(true);
        pushPickerData();
        if (Notification.isSupported()) {
          new Notification({
            title: "Desk Console Clips",
            body: `Saved "${payload.name || path.basename(clipFile)}" to Clips`,
          }).show();
        }
      }
    } catch {
      /* ignore clip-file error */
    }
    return true;
  }
  return false;
}

const notifiedSyncAlertIds = new Set();
let lastSyncAlertsSig = "";

function rebuildTrayMenu(alerts = [], summaryTooltip = "Desk Console") {
  if (!tray) return;
  tray.setToolTip(summaryTooltip || "Desk Console");
  const alertItems = Array.isArray(alerts) && alerts.length > 0
    ? [
        ...alerts.slice(0, 6).map((alert) => ({
          label: alert.title,
          click: () => openDeskEntity(alert.target),
        })),
        { type: "separator" },
      ]
    : [];
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...alertItems,
      { label: "Open Desk Console", click: showWindow },
      { label: "Save clip", click: () => api("/api/clips", "POST", { source: "tray" }).catch(() => {}) },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]),
  );
}

async function pollSyncHealthGuard() {
  try {
    const [jobsRes, accountsRes] = await Promise.all([
      api("/api/jobs", "GET", undefined, { timeoutMs: 2500 }).catch(() => null),
      api("/api/remotes/accounts", "GET", undefined, { timeoutMs: 2500 }).catch(() => null),
    ]);
    if (!jobsRes && !accountsRes) return;
    const { alerts, summaryTooltip } = evaluateSyncHealthAlerts({
      jobs: jobsRes?.jobs || [],
      accounts: accountsRes?.accounts || [],
    });
    const sig = `${summaryTooltip}|${alerts.map((a) => a.id).join(",")}`;
    if (sig !== lastSyncAlertsSig) {
      lastSyncAlertsSig = sig;
      rebuildTrayMenu(alerts, summaryTooltip);
    }
    for (const alert of alerts) {
      if (notifiedSyncAlertIds.has(alert.id)) continue;
      notifiedSyncAlertIds.add(alert.id);
      if (Notification.isSupported()) {
        const n = new Notification({
          title: alert.title,
          body: alert.body,
        });
        n.on("click", () => openDeskEntity(alert.target));
        n.show();
      }
    }
  } catch {
    /* ignore background health poll errors */
  }
}

function createTray() {
  const icon = appIconPath();
  const img = icon ? nativeImage.createFromPath(icon) : nativeImage.createEmpty();
  tray = new Tray(img);
  rebuildTrayMenu([], "Desk Console");
  tray.on("click", showWindow);
}

let configuredPicker = DEFAULT_HOTKEYS.picker;
let boundPickerAccel = "";
let pickerBindNotified = false;

function formatHotkeyLabel(acc) {
  return String(acc || "")
    .replace(/CommandOrControl/gi, "Ctrl")
    .replace(/Command/gi, "Ctrl")
    .replace(/Control/gi, "Ctrl")
    .replace(/Super/gi, "Win")
    .replace(/Meta/gi, "Win");
}

function registerPickerShortcut(preferred) {
  const skipRetired = (acc) => {
    const s = String(acc);
    if (/(^|\+)alt(\+|$)/i.test(s)) return false;
    if (/shift\+v$/i.test(s)) return false;
    return true;
  };
  const candidates = [preferred, ...PICKER_FALLBACKS].filter((acc) => acc && skipRetired(acc));
  const seen = new Set();
  for (const acc of candidates) {
    const key = String(acc);
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    if (globalShortcut.register(key, togglePicker)) {
      boundPickerAccel = key;
      if (key !== preferred) {
        console.warn(`[desk] picker shortcut ${preferred} unavailable — bound ${key}`);
        if (!pickerBindNotified && Notification.isSupported()) {
          pickerBindNotified = true;
          new Notification({
            title: "Desk Console",
            body: `${formatHotkeyLabel(preferred)} is busy — paste picker listens on ${formatHotkeyLabel(key)}`,
          }).show();
        }
      }
      return key;
    }
  }
  boundPickerAccel = "";
  console.error(`[desk] could not register any picker shortcut (tried ${candidates.join(", ")})`);
  return null;
}

async function bindShortcuts() {
  globalShortcut.unregisterAll();
  let configured = DEFAULT_HOTKEYS.picker;
  try {
    const data = await api("/api/hotkeys");
    configured = data.picker || DEFAULT_HOTKEYS.picker;
  } catch {
    configured = DEFAULT_HOTKEYS.picker;
  }
  configuredPicker = configured;
  const bound = registerPickerShortcut(configured);
  // Register ergonomic 1-hand secondary alias Ctrl+` (Ditto standard) alongside primary shortcut
  if (String(configured).toLowerCase() !== "commandorcontrol+backquote") {
    try {
      globalShortcut.register("CommandOrControl+Backquote", togglePicker);
    } catch {
      /* ignore if busy */
    }
  }
  return { picker: configured, boundPicker: bound || configured };
}

function findPickerClipRow(id) {
  const rowId = String(id || "");
  if (!rowId) return null;
  const hit = (lastPicker.rows || []).find((r) => r.id === rowId);
  if (hit) return hit;
  const fresh = refreshPickerSnapshot(true);
  return (fresh.rows || []).find((r) => r.id === rowId) || null;
}

let clipPollBusy = false;
let lastElectronWatchPingAt = 0;
let lastElectronClipSeq = 0;

function writeClipToSystemClipboard(rowId, text, imageDataUrl) {
  const stored = findPickerClipRow(rowId);
  const imgUrl = String(imageDataUrl || stored?.imageDataUrl || "").trim();
  const clipText = String(text || stored?.text || "");
  if (imgUrl.startsWith("data:image/")) {
    const img = nativeImage.createFromDataURL(imgUrl);
    if (!img.isEmpty()) {
      const pngBuf = img.toPNG();
      const hash = crypto.createHash("sha256").update(pngBuf).digest("hex");
      ignoreElectronClipImgHash = hash;
      lastElectronClipImgHash = hash;
      clipboard.writeImage(img);
      lastElectronClipSeq = getClipboardSequenceNumber();
      api("/api/clips/clipboard/prime", "POST", { imageDataUrl: imgUrl, electronWatch: true }).catch(() => {});
      return { ok: true, isImage: true };
    }
  }
  if (!clipText) return { ok: false, error: "Missing clip content" };
  ignoreElectronClipText = clipText;
  lastElectronClipText = clipText;
  clipboard.writeText(clipText);
  lastElectronClipSeq = getClipboardSequenceNumber();
  api("/api/clips/clipboard/prime", "POST", { text: clipText, electronWatch: true }).catch(() => {});
  return { ok: true, isImage: false };
}

async function pollElectronClipboard() {
  if (clipPollBusy) return;
  clipPollBusy = true;
  try {
    const seq = getClipboardSequenceNumber();
    if (electronClipPrimed && seq > 0 && seq === lastElectronClipSeq) {
      const now = Date.now();
      if (now - lastElectronWatchPingAt > 30_000) {
        lastElectronWatchPingAt = now;
        api("/api/clips/clipboard/prime", "POST", { electronWatch: true }, { timeoutMs: 1200 }).catch(() => {});
      }
      return;
    }
    lastElectronWatchPingAt = Date.now();
    if (seq > 0) lastElectronClipSeq = seq;
    const formats = clipboard.availableFormats() || [];
    const hasImage = formats.some((f) => String(f).toLowerCase().startsWith("image/"));
    if (hasImage) {
      const img = clipboard.readImage();
      if (!img.isEmpty()) {
        const pngBuf = img.toPNG();
        const hash = crypto.createHash("sha256").update(pngBuf).digest("hex");
        if (!electronClipPrimed) {
          lastElectronClipImgHash = hash;
        } else if (hash && hash !== lastElectronClipImgHash && hash !== ignoreElectronClipImgHash) {
          lastElectronClipImgHash = hash;
          const { width, height } = img.getSize();
          const imageDataUrl = `data:image/png;base64,${pngBuf.toString("base64")}`;
          await api(
            "/api/clips",
            "POST",
            {
              name: `Image (${width}×${height})`,
              text: `[Image ${width}×${height}]`,
              contentType: "image",
              imageDataUrl,
              imageWidth: width,
              imageHeight: height,
              source: "clipboard",
              electronWatch: true,
            },
            { timeoutMs: 4000 },
          ).catch(() => {});
          refreshPickerSnapshot(true);
          pushPickerData();
        }
      }
    }
    const text = String(clipboard.readText() || "").replace(/\r\n/g, "\n").trimEnd();
    if (!electronClipPrimed) {
      electronClipPrimed = true;
      lastElectronClipText = text;
      return;
    }
    if (text && text !== lastElectronClipText && text !== ignoreElectronClipText) {
      lastElectronClipText = text;
      await api(
        "/api/clips",
        "POST",
        { text, contentType: "text", source: "clipboard", electronWatch: true },
        { timeoutMs: 2500 },
      ).catch(() => {});
      refreshPickerSnapshot(true);
      pushPickerData();
    }
  } catch {
    /* ignore transient clipboard lock */
  } finally {
    clipPollBusy = false;
  }
}

ipcMain.on("desk-picker-close", () => hidePicker());
ipcMain.handle("desk-picker-open", async () => {
  showPicker();
  const hwnd = nativeHwnd(pickerWindow);
  const rgnApplied = hwnd ? applyPickerWindowRegion(hwnd, 1, 480, 580) : false;
  return {
    ok: true,
    visible: Boolean(pickerWindow && !pickerWindow.isDestroyed() && pickerWindow.isVisible()),
    hwnd,
    rgnApplied,
  };
});
ipcMain.on("desk-picker-snapshot-sync", (event) => {
  refreshPickerSnapshot(true);
  event.returnValue = lastPicker;
});
ipcMain.handle("desk-clip-copy", async (_event, id, text, imageDataUrl) => {
  const written = writeClipToSystemClipboard(id, text, imageDataUrl);
  if (!written.ok) return { ok: false, copied: false, error: written.error || "Missing clip content" };
  hidePicker();
  return { ok: true, copied: true };
});
ipcMain.handle("desk-clip-paste", async (_event, id, text, imageDataUrl) => {
  const rowId = String(id || "");
  const written = writeClipToSystemClipboard(rowId, text, imageDataUrl);
  if (!written.ok) return { ok: false, pasted: false, error: written.error || "Missing clip content" };
  if (pickerOpenedFromMain && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    dismissPickerQuiet();
    try {
      mainWindow.focus();
      mainWindow.webContents.focus();
      mainWindow.webContents.paste();
    } catch {
      /* ignore */
    }
    return { ok: true, pasted: true };
  }
  const hwnd = armedPickerHwnd || lastForeignHwnd;
  if (!hwnd || isDeskHwnd(hwnd)) {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      dismissPickerQuiet();
      try {
        mainWindow.focus();
        mainWindow.webContents.focus();
        mainWindow.webContents.paste();
      } catch {
        /* ignore */
      }
      return { ok: true, pasted: true };
    }
    return {
      ok: false,
      pasted: false,
      error: "No target window — click inside the input field first, then open Ctrl+Shift+Q.",
    };
  }
  grantForegroundPermission();
  dismissPickerQuiet();
  await whenModifiersUpAsync({ timeoutMs: 900, pollMs: 12 });
  const pasted = pasteToForegroundHwnd(hwnd);
  armedPickerHwnd = "";
  if (!pasted) {
    const error = "Could not paste to previous window";
    notifyPasteFailure(error);
    if (pickerWindow && !pickerWindow.isDestroyed()) {
      pickerWindow.showInactive();
    }
    return { ok: true, pasted: false, error };
  }
  return { ok: true, pasted: true };
});
ipcMain.handle("desk-clip-pin", async (_event, rowId, pinned) => {
  const id = String(rowId || "").trim();
  if (!id) return { ok: false, error: "Missing clip id" };
  try {
    const res = await api(`/api/clips/${encodeURIComponent(id)}/pin`, "POST", { pinned: Boolean(pinned) });
    refreshPickerSnapshot(true);
    pushPickerData();
    return { ok: true, row: res?.row };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});
ipcMain.handle("desk-hotkeys-rebind", async () => {
  const keys = await bindShortcuts();
  return { ok: true, ...keys };
});
ipcMain.handle("desk-prefs-login", async (_event, next) => {
  if (typeof next === "boolean") {
    const prefs = writePrefs({ openAtLogin: next });
    return { ok: true, ...applyLoginItem(prefs.openAtLogin) };
  }
  return { ok: true, openAtLogin: readPrefs().openAtLogin, packaged: app.isPackaged };
});

ipcMain.handle("folder-sync:open-local", async (_event, target) => {
  const filePath = typeof target === "string" ? target.trim() : "";
  if (!filePath) return { ok: false, error: "path is required" };
  const error = await shell.openPath(filePath);
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle("folder-sync:open-external", async (_event, target) => {
  const url = typeof target === "string" ? target.trim() : "";
  if (!/^https:\/\//i.test(url)) return { ok: false, error: "https required" };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("folder-sync:browse-folder", async (_event, initialPath) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  let defaultPath = "";
  try {
    const mod = await import(pathToFileURL(path.join(path.dirname(hostEntry()), "existing-directory.mjs")).href);
    defaultPath = mod.existingDirectory(initialPath);
  } catch {
    /* dialog still opens at the system default */
  }
  const result = await dialog.showOpenDialog(win || undefined, {
    title: "Select local sync folder",
    defaultPath: defaultPath || undefined,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, cancelled: true };
  return { ok: true, path: result.filePaths[0] };
});

app.on("second-instance", (_event, argv) => {
  void handleCliActions(argv).then((handled) => {
    if (!handled) showWindow();
  });
});

app.whenReady().then(async () => {
  cleanupRetiredFolderSyncInstall();
  if (!isDevIsolated) {
    const installedExe = path.join(
      process.env.LOCALAPPDATA || path.join(require("node:os").homedir(), "AppData", "Local"),
      "Programs",
      "desk-console",
      "Desk Console.exe",
    );
    const targetExe = app.isPackaged ? process.execPath : fs.existsSync(installedExe) ? installedExe : "";
    if (targetExe) {
      registerExplorerContextMenu({ execPath: targetExe, iconPath: appIconPath() || targetExe });
    }
  }
  const prefs = writePrefs(readPrefs());
  applyLoginItem(prefs.openAtLogin);
  if (!app.isPackaged && String(process.env.DESK_DIST_WATCH || "") === "1") {
    const { bindDistUiWatch } = require("./lib/dist-ui-watch.cjs");
    bindDistUiWatch({
      distDir: path.join(__dirname, "..", "dist"),
      onReload: () => reloadAllRenderers(),
    });
  }
  await ensureHost();
  refreshPickerSnapshot();
  createTray();
  registerDesktopUpdaterIpc({
    onBeforeQuit: () => {
      app.isQuiting = true;
      try {
        globalShortcut.unregisterAll();
      } catch {
        /* ignore */
      }
      if (hostChild && !hostChild.killed) {
        try {
          hostChild.kill();
        } catch {
          /* ignore */
        }
      }
    },
  });
  if (!wantsHiddenStart()) createWindow();
  await bindShortcuts();
  void handleCliActions(process.argv);
  // Warm picker in background so first Ctrl+Shift+Q is instant (no Vite cold boot).
  setTimeout(() => ensurePickerWarm(), 800).unref?.();
  setTimeout(() => void pollSyncHealthGuard(), 2500).unref?.();
  setInterval(() => void pollSyncHealthGuard(), 25000).unref?.();
  void pollElectronClipboard();
  setInterval(() => void pollElectronClipboard(), 900).unref?.();
  setInterval(() => {
    if (pickerWindow && !pickerWindow.isDestroyed() && pickerWindow.isVisible()) {
      refreshPickerSnapshot();
    }
  }, 2000).unref?.();
  setInterval(() => rememberForeignForeground(), 300).unref?.();
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (hostChild && !hostChild.killed) hostChild.kill();
});

app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("https://") || url.startsWith("file:")) {
      if (url.startsWith("https://")) shell.openExternal(url);
    }
    return { action: "deny" };
  });
});
