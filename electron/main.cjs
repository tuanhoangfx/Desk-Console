const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell, clipboard, Notification } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { applyDeskDevPaths } = require("./lib/user-data-boot.cjs");
const { readPickerSnapshot, snapshotSignature } = require("./picker-store.cjs");
const { captureForegroundHwnd, hwndFromNativeHandle, setWindowNoActivate } = require("./hwnd-once.cjs");
const { pasteToForegroundHwnd, restoreForegroundHwnd, grantForegroundPermission } = require("./win-paste.cjs");
const { whenModifiersUp, whenModifiersUpAsync } = require("./modifiers-up.cjs");
const { readPrefs, writePrefs } = require("./prefs.cjs");
const { resolveAppIconPathIfExists } = require("./lib/desktop-app-icon.cjs");

applyDeskDevPaths();

const isDevIsolated = String(process.env.DESK_DEV_ISOLATED || "") === "1";
app.disableHardwareAcceleration();
app.setAppUserModelId(isDevIsolated ? "vn.infi.desk-console.dev" : "vn.infi.desk-console");

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

async function ensureHost() {
  if (await probeHealth()) return;
  hostChild = spawn(process.execPath, [hostEntry()], {
    cwd: path.join(__dirname, ".."),
    detached: false,
    stdio: "ignore",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DESK_API_PORT: String(API_PORT) },
    windowsHide: true,
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
  if (app.isPackaged) return "Desk Console";
  if (process.env.VITE_DEV_SERVER_URL) return `Desk Console [DEV v${APP_VERSION}]`;
  if (String(process.env.DESK_LOAD_DIST || "") === "1") return `Desk Console [DIST v${APP_VERSION}]`;
  return `Desk Console [DEV v${APP_VERSION}]`;
}

function uiHref(opts) {
  const screen = opts && opts.screen ? String(opts.screen) : "";
  const search = opts && opts.search != null ? String(opts.search) : "";
  const q = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const fromEnv = String(process.env.VITE_DEV_SERVER_URL || "").trim();
  if (!app.isPackaged && fromEnv) {
    const url = new URL(fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`);
    if (screen) {
      url.pathname = `/${screen}`.replace(/\/+/g, "/");
      url.search = q ? q.slice(1) : "";
    } else {
      url.search = q ? q.slice(1) : "";
    }
    return url.toString();
  }
  if (fs.existsSync(distIndexPath())) {
    const sp = new URLSearchParams(q ? q.slice(1) : "");
    if (screen) sp.set("screen", screen);
    const qs = sp.toString();
    return `${pathToFileURL(distIndexPath()).href}${qs ? `?${qs}` : ""}`;
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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: windowTitle(),
    backgroundColor: "#0b1020",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.loadURL(uiHref({ screen: "clips" }));
}

function createPicker() {
  pickerReady = false;
  pickerWindow = new BrowserWindow({
    width: 440,
    height: 560,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    // Do NOT use type:"toolbar" — on Windows it can steal activation / switch desktop focus oddly.
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
  try {
    setWindowNoActivate(hwndFromNativeHandle(pickerWindow.getNativeWindowHandle()));
  } catch {
    /* ignore */
  }
  pickerWindow.on("closed", () => {
    pickerWindow = null;
    pickerReady = false;
  });
  pickerWindow.webContents.on("did-finish-load", () => {
    pickerReady = true;
    refreshPickerSnapshot(true);
    pushPickerData();
  });
  pickerWindow.loadURL(uiHref({ search: "picker=1" }));
}

/** Hide picker without activating Desk Console main window (Electron default steals focus). */
function dismissPickerQuiet() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setFocusable(false);
    } catch {
      /* ignore */
    }
  }
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    try {
      pickerWindow.blur();
    } catch {
      /* ignore */
    }
    pickerWindow.hide();
  }
}

function restoreMainFocusableSoon() {
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setFocusable(true);
      } catch {
        /* ignore */
      }
    }
  }, 500);
}

function hidePicker() {
  if (pickerFocusTimer) {
    clearTimeout(pickerFocusTimer);
    pickerFocusTimer = null;
  }
  const hwnd = armedPickerHwnd;
  dismissPickerQuiet();
  restoreMainFocusableSoon();
  if (hwnd) {
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
  let h = captureForegroundHwnd();
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

  // Keep Desk main inert while picker is open — otherwise Windows activates the whole app
  // and "switches" away from Notepad/Zalo/Cursor (feels like tab change).
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setFocusable(false);
      if (mainWindow.isFocused()) mainWindow.blur();
    } catch {
      /* ignore */
    }
  }

  let revealed = false;
  const reveal = () => {
    if (revealed || !pickerWindow || pickerWindow.isDestroyed()) return;
    revealed = true;
    pickerWindow.setAlwaysOnTop(true, "pop-up-menu");
    try {
      setWindowNoActivate(nativeHwnd(pickerWindow));
    } catch {
      /* ignore */
    }
  };

  const openPicker = () => {
    reveal();
    whenModifiersUp(
      () => {
        if (!pickerWindow || pickerWindow.isDestroyed()) return;
        try {
          // showInactive + no focus — caret stays in the target until paste.
          pickerWindow.showInactive();
        } catch {
          /* ignore */
        }
      },
      {
        timeoutMs: 1200,
        pollMs: 16,
        onTimeout: () => {
          if (!pickerWindow || pickerWindow.isDestroyed()) return;
          try {
            pickerWindow.showInactive();
          } catch {
            /* ignore */
          }
        },
      },
    );
  };

  if (pickerReady && !pickerWindow.webContents.isLoading()) {
    openPicker();
    return;
  }
  pickerWindow.once("ready-to-show", openPicker);
  pickerWindow.webContents.once("did-finish-load", openPicker);
}

function togglePicker() {
  if (pickerWindow && pickerWindow.isVisible()) hidePicker();
  else showPicker();
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.show();
  mainWindow.focus();
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

function createTray() {
  const icon = appIconPath();
  const img = icon ? nativeImage.createFromPath(icon) : nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip("Desk Console");
  tray.setContextMenu(
    Menu.buildFromTemplate([
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
  return { picker: configured, boundPicker: bound || configured };
}

ipcMain.on("desk-picker-close", () => hidePicker());
ipcMain.on("desk-picker-snapshot-sync", (event) => {
  refreshPickerSnapshot(true);
  event.returnValue = lastPicker;
});
ipcMain.handle("desk-clip-copy", async (_event, _id, text) => {
  const clipText = String(text || "");
  if (!clipText) return { ok: false, copied: false, error: "Missing clip text" };
  clipboard.writeText(clipText);
  api("/api/clips/clipboard/prime", "POST", { text: clipText }).catch(() => {});
  hidePicker();
  return { ok: true, copied: true };
});
ipcMain.handle("desk-clip-paste", async (_event, id, text) => {
  const rowId = String(id || "");
  const clipText = String(text || "");
  if (!rowId || !clipText) return { ok: false, pasted: false, error: "Missing clip text" };
  if (!armedPickerHwnd) {
    return {
      ok: false,
      pasted: false,
      error: "No target window — focus the field first, then open the paste picker.",
    };
  }
  const hwnd = armedPickerHwnd;
  grantForegroundPermission();
  dismissPickerQuiet();
  clipboard.writeText(clipText);
  api("/api/clips/clipboard/prime", "POST", { text: clipText }).catch(() => {});
  await whenModifiersUpAsync({ timeoutMs: 900, pollMs: 12 });
  const pasted = pasteToForegroundHwnd(hwnd);
  restoreMainFocusableSoon();
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

app.on("second-instance", () => showWindow());

app.whenReady().then(async () => {
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
  if (!wantsHiddenStart()) createWindow();
  await bindShortcuts();
  // Warm picker in background so first Ctrl+Shift+Q is instant (no Vite cold boot).
  setTimeout(() => ensurePickerWarm(), 800).unref?.();
  setInterval(() => refreshPickerSnapshot(), 2000).unref?.();
  setInterval(() => rememberForeignForeground(), 150).unref?.();
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
