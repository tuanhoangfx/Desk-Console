const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { readPickerSnapshot, snapshotSignature } = require("./picker-store.cjs");
const { captureForegroundHwnd } = require("./hwnd-once.cjs");
const { readPrefs, writePrefs } = require("./prefs.cjs");
const { resolveAppIconPathIfExists } = require("./lib/desktop-app-icon.cjs");

app.disableHardwareAcceleration();
app.setAppUserModelId("vn.infi.desk-console");

const API_PORT = Number(process.env.DESK_API_PORT || 6010);
const DEFAULT_HOTKEYS = {
  picker: "CommandOrControl+Alt+V",
  capture: "CommandOrControl+Alt+S",
};

let mainWindow = null;
let pickerWindow = null;
let tray = null;
let hostChild = null;
let lastPicker = { rows: [], labels: { picker: "Ctrl+Alt+V", capture: "Ctrl+Alt+S" } };
let lastPickerSig = "";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function api(pathname, method = "GET", body) {
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
    req.setTimeout(1500, () => {
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

function uiHref(search) {
  const q = search.startsWith("?") ? search : `?${search}`;
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    url.search = q.slice(1);
    return url.toString();
  }
  if (app.isPackaged) {
    const index = path.join(__dirname, "..", "dist", "index.html");
    return `${pathToFileURL(index).href}${q}`;
  }
  return `http://127.0.0.1:5180/${q}`;
}

function appIconPath() {
  return resolveAppIconPathIfExists(path.join(__dirname, ".."));
}

function createWindow() {
  const icon = appIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Desk Console",
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
  mainWindow.loadURL(uiHref("?screen=clips"));
}

function createPicker() {
  pickerWindow = new BrowserWindow({
    width: 440,
    height: 560,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pickerWindow.on("closed", () => {
    pickerWindow = null;
  });
  pickerWindow.webContents.on("did-finish-load", () => {
    refreshPickerSnapshot(true);
    pushPickerData();
  });
  pickerWindow.loadURL(uiHref("?picker=1"));
}

function hidePicker() {
  if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.hide();
}

function showPicker() {
  const hwnd = captureForegroundHwnd();
  api("/api/clips/picker/arm", "POST", hwnd ? { hwnd } : {}).catch(() => {});
  refreshPickerSnapshot(true);
  if (!pickerWindow || pickerWindow.isDestroyed()) {
    createPicker();
  } else {
    pushPickerData();
  }
  pickerWindow.show();
  pickerWindow.focus();
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
      { label: "Capture screen", click: () => api("/api/captures", "POST", { mode: "screen" }).catch(() => {}) },
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

async function bindShortcuts() {
  globalShortcut.unregisterAll();
  let keys = DEFAULT_HOTKEYS;
  try {
    const data = await api("/api/hotkeys");
    keys = {
      picker: data.picker || DEFAULT_HOTKEYS.picker,
      capture: data.capture || DEFAULT_HOTKEYS.capture,
    };
  } catch {
    keys = DEFAULT_HOTKEYS;
  }
  if (!globalShortcut.register(keys.picker, togglePicker)) {
    globalShortcut.register(DEFAULT_HOTKEYS.picker, togglePicker);
  }
  if (!globalShortcut.register(keys.capture, () => api("/api/captures", "POST", { mode: "screen" }).catch(() => {}))) {
    globalShortcut.register(DEFAULT_HOTKEYS.capture, () =>
      api("/api/captures", "POST", { mode: "screen" }).catch(() => {}),
    );
  }
  return keys;
}

ipcMain.on("desk-picker-close", () => hidePicker());
ipcMain.on("desk-picker-snapshot-sync", (event) => {
  refreshPickerSnapshot(true);
  event.returnValue = lastPicker;
});
ipcMain.handle("desk-clip-paste", async (_event, id) => {
  const rowId = String(id || "");
  if (!rowId) return { ok: false };
  return api(`/api/clips/${encodeURIComponent(rowId)}/paste`, "POST").catch(() => ({ ok: false }));
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
  await ensureHost();
  refreshPickerSnapshot();
  createTray();
  if (!wantsHiddenStart()) createWindow();
  await bindShortcuts();
  setInterval(() => refreshPickerSnapshot(), 2000).unref?.();
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
