/**
 * Shared Electron window chrome & shortcut helper for desktop tools.
 * 1. Removes the classic native File/Edit/View/Window/Help menu bar on Windows/Linux
 *    (`Menu.setApplicationMenu(null)` + `autoHideMenuBar` + `setMenuBarVisibility(false)`).
 * 2. Applies dark window chrome (`nativeTheme.themeSource = "dark"`, DWM dark attributes,
 *    and `#0b1020` `titleBarOverlay` on Windows via `getDesktopWindowChromeOptions()`).
 * 3. Renders unified `#hub-desktop-titlebar` (`dot + title + DEV` badge, no version pill) when
 *    `windowControlsOverlay` is visible, staying synced across hot-reloads.
 * 4. Preserves essential keyboard shortcuts (`Ctrl+R`/`F5`/`Shift+F5`, `F12`/`Ctrl+Shift+I`,
 *    `F11`, `Ctrl+0/+/-`) via `before-input-event`.
 * 5. Exposes `window.__HUB_DESKTOP_CHROME__` for CDP smoke assertions (`isMenuBarVisible === false`).
 *
 * Packaged apps copy this file to `electron/lib/desktop-app-menu.cjs` via
 * `Tool/scripts/lib/sync-electron-shared-libs.cjs`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Menu, nativeTheme } = require("electron");

const attachedWebContents = new WeakSet();
const attachedChromeSync = new WeakSet();
const attachedTitleSync = new WeakSet();
const MENU_STATE_KEY = "__HUB_DESKTOP_APP_MENU_STATE__";

const TITLEBAR_BG = "#0b1020";
const TITLEBAR_FG = "#e6e8ef";
const TITLEBAR_HEIGHT = 30;

let _dwmSetter = undefined;

function resolveDwmSetWindowAttribute() {
  if (_dwmSetter !== undefined) return _dwmSetter;
  if (process.platform !== "win32") {
    _dwmSetter = null;
    return null;
  }
  let koffi = null;
  const candidates = [
    "koffi",
    process.resourcesPath ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "koffi") : "",
    path.resolve(__dirname, "..", "..", "node_modules", "koffi"),
    path.resolve(__dirname, "..", "..", "..", "node_modules", "koffi"),
    "E:/Dev/node_modules/koffi",
  ].filter(Boolean);
  for (const cand of candidates) {
    try {
      koffi = require(cand);
      if (koffi) break;
    } catch {
      /* try next candidate */
    }
  }
  if (!koffi) {
    _dwmSetter = null;
    return null;
  }
  try {
    const dwmapi = koffi.load("dwmapi.dll");
    _dwmSetter = dwmapi.func(
      "long __stdcall DwmSetWindowAttribute(uintptr_t hwnd, uint32_t dwAttribute, const void *pvAttribute, uint32_t cbAttribute)",
    );
  } catch {
    _dwmSetter = null;
  }
  return _dwmSetter;
}

function applyWindowsDarkTitlebar(win) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) return;
  const fn = resolveDwmSetWindowAttribute();
  if (!fn || typeof win.getNativeWindowHandle !== "function") return;
  try {
    const buf = win.getNativeWindowHandle();
    const hwnd = buf.length >= 8 ? Number(buf.readBigUInt64LE(0)) : buf.readUInt32LE(0);
    if (!hwnd) return;
    const setDword = (attr, val) => {
      const valBuf = Buffer.alloc(4);
      valBuf.writeUInt32LE(val >>> 0, 0);
      fn(hwnd, attr, valBuf, 4);
    };
    setDword(20, 1); // DWMWA_USE_IMMERSIVE_DARK_MODE (Win10 2004+ / Win11)
    setDword(19, 1); // DWMWA_USE_IMMERSIVE_DARK_MODE (Win10 1903-1909 fallback)
    setDword(35, 0x0020100b); // DWMWA_CAPTION_COLOR (#0b1020 in COLORREF 0x00BBGGRR, Win11)
    setDword(36, 0x00efe8e6); // DWMWA_TEXT_COLOR (#e6e8ef, Win11)
  } catch {
    /* ignore unsupported OS builds */
  }
}

function resolveDesktopChromeVersion(explicitVersion = "") {
  const cleanExplicit = String(explicitVersion || "").trim();
  if (cleanExplicit) return cleanExplicit;
  const candidates = [];
  if (process.env.HUB_HOT_PATCH_DIR) {
    candidates.push(path.join(process.env.HUB_HOT_PATCH_DIR, "package.json"));
  }
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "hot-patch", "package.json"));
  }
  if (typeof app?.getAppPath === "function") {
    try {
      candidates.push(path.join(app.getAppPath(), "package.json"));
    } catch {
      /* ignore */
    }
  }
  candidates.push(path.resolve(__dirname, "..", "..", "package.json"));
  for (const pkgPath of candidates) {
    try {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const v = String(pkg?.version || "").trim();
      if (v) return v;
    } catch {
      /* ignore */
    }
  }
  try {
    if (typeof app?.getVersion === "function") {
      return String(app.getVersion() || "").trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

function resolveDesktopChromeIsDev(explicitIsDev) {
  if (typeof explicitIsDev === "boolean") return explicitIsDev;
  const isWinUnpacked = /[\\/]dist-desktop[\\/]win-unpacked[\\/]/i.test(process.execPath || "");
  return Boolean(!app?.isPackaged || isWinUnpacked);
}

/**
 * Canonical BrowserWindow chrome options shared across all Desktop tools.
 * @param {Electron.BrowserWindowConstructorOptions} [overrides]
 * @returns {Electron.BrowserWindowConstructorOptions}
 */
function getDesktopWindowChromeOptions(overrides = {}) {
  const winChrome =
    process.platform === "win32"
      ? {
          titleBarStyle: "hidden",
          titleBarOverlay: {
            color: TITLEBAR_BG,
            symbolColor: TITLEBAR_FG,
            height: TITLEBAR_HEIGHT,
          },
        }
      : {};
  return {
    autoHideMenuBar: true,
    backgroundColor: TITLEBAR_BG,
    ...winChrome,
    ...overrides,
  };
}

function defaultReload(win) {
  if (win && !win.isDestroyed()) {
    win.webContents.reload();
    return;
  }
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.reload();
  }
}

/**
 * Pure key matcher for menu-less desktop windows.
 * @param {{ type?: string, key?: string, code?: string, control?: boolean, meta?: boolean, shift?: boolean, alt?: boolean, isAutoRepeat?: boolean }} input
 * @returns {"reload" | "forceReload" | "toggleDevTools" | "toggleFullScreen" | "zoomIn" | "zoomOut" | "resetZoom" | null}
 */
function matchDesktopShortcut(input) {
  if (!input || input.type !== "keyDown") return null;
  const key = String(input.key || "");
  const upper = key.toUpperCase();
  const code = String(input.code || "");
  const mod = Boolean(input.control || input.meta);
  const shift = Boolean(input.shift);
  const alt = Boolean(input.alt);
  const repeat = Boolean(input.isAutoRepeat);

  if (!mod && !alt && upper === "F12") return repeat ? null : "toggleDevTools";
  if (mod && shift && !alt && upper === "I") return repeat ? null : "toggleDevTools";
  if (process.platform === "darwin" && input.meta && alt && !input.control && upper === "I") {
    return repeat ? null : "toggleDevTools";
  }
  if (!mod && !alt && !shift && upper === "F11") return repeat ? null : "toggleFullScreen";
  if (!mod && !alt && upper === "F5") return repeat ? null : shift ? "forceReload" : "reload";
  if (mod && !alt && upper === "R") return repeat ? null : shift ? "forceReload" : "reload";
  if (mod && !alt && (key === "=" || key === "+" || code === "Equal" || code === "NumpadAdd")) {
    return "zoomIn";
  }
  if (mod && !alt && !shift && (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract")) {
    return "zoomOut";
  }
  if (mod && !alt && !shift && (key === "0" || code === "Digit0" || code === "Numpad0")) {
    return repeat ? null : "resetZoom";
  }
  return null;
}

function hideWindowMenuBar(win) {
  if (!win || win.isDestroyed()) return;
  try {
    if (typeof win.setAutoHideMenuBar === "function") win.setAutoHideMenuBar(true);
    if (typeof win.setMenuBarVisibility === "function") win.setMenuBarVisibility(false);
  } catch {
    /* ignore */
  }
}

function stripDesktopTitleVersionSuffix(title) {
  return String(title || "")
    .replace(/\s+[—–-]\s*v\d+(?:\.\d+)*(?:[-+][^\s]+)?$/i, "")
    .replace(/\s+v\d+(?:\.\d+)*(?:[-+][^\s]+)?$/i, "")
    .trim();
}

function buildRendererChromeInjectScript(win, state = null) {
  const menuBarVisible = typeof win.isMenuBarVisible === "function" ? Boolean(win.isMenuBarVisible()) : false;
  const autoHideMenuBar = typeof win.isMenuBarAutoHide === "function" ? Boolean(win.isMenuBarAutoHide()) : true;
  const appMenuIsNull = process.platform !== "darwin";
  const rawTitle = stripDesktopTitleVersionSuffix(
    typeof win.getTitle === "function" ? win.getTitle() : "",
  );
  const opts = state?.options || {};
  const resolvedVer = resolveDesktopChromeVersion(opts.version);
  const resolvedIsDev = resolveDesktopChromeIsDev(opts.isDev);

  return `(() => {
    const wco = Boolean(window.navigator?.windowControlsOverlay?.visible);
    const ver = String(window.__HUB_ELECTRON_VERSION__ || ${JSON.stringify(resolvedVer)} || "").trim();
    const isDev = Boolean(window.__HUB_ELECTRON_DEV__ || ${JSON.stringify(resolvedIsDev)});
    window.__HUB_DESKTOP_CHROME__ = {
      appMenuIsNull: ${JSON.stringify(appMenuIsNull)},
      menuBarVisible: ${JSON.stringify(menuBarVisible)},
      autoHideMenuBar: ${JSON.stringify(autoHideMenuBar)},
      titleBarOverlay: wco,
      version: ver,
      isDev,
    };
    if (!wco || !document.head || !document.body) return;
    document.documentElement.classList.add("hub-has-desktop-titlebar");
    let styleEl = document.getElementById("hub-desktop-titlebar-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "hub-desktop-titlebar-style";
      styleEl.textContent = [
        "html.hub-has-desktop-titlebar body { margin: 0 !important; padding-top: ${TITLEBAR_HEIGHT}px !important; height: 100dvh !important; min-height: 0 !important; max-height: 100dvh !important; overflow: hidden !important; box-sizing: border-box !important; }",
        "html.hub-has-desktop-titlebar #root, html.hub-has-desktop-titlebar .hub-app { min-height: 0 !important; height: calc(100dvh - ${TITLEBAR_HEIGHT}px) !important; max-height: calc(100dvh - ${TITLEBAR_HEIGHT}px) !important; }",
        "#hub-desktop-titlebar { position: fixed; top: 0; left: 0; right: 0; height: ${TITLEBAR_HEIGHT}px; background: ${TITLEBAR_BG}; border-bottom: 1px solid rgba(148, 163, 184, 0.14); color: #cbd5e1; display: flex; align-items: center; gap: 8px; padding: 0 144px 0 12px; font: 600 12px/${TITLEBAR_HEIGHT}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing: 0.01em; -webkit-app-region: drag; user-select: none; z-index: 99999; box-sizing: border-box; }",
        "#hub-desktop-titlebar .hub-tb-dot { width: 7px; height: 7px; border-radius: 9999px; background: #10b981; flex: 0 0 auto; opacity: 0.9; }",
        "#hub-desktop-titlebar.hub-tb--dev .hub-tb-dot { background: #f59e0b; }",
        "#hub-desktop-titlebar .hub-tb-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        "#hub-desktop-titlebar .hub-tb-dev { flex: 0 0 auto; font: 700 10px/16px system-ui, sans-serif; letter-spacing: 0.04em; color: #fbbf24; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 9999px; padding: 0 6px; }",
      ].join("\\n");
      document.head.appendChild(styleEl);
    }
    const labelText =
      String(${JSON.stringify(rawTitle)} || document.title || "Console")
        .replace(/\\s+[—–-]\\s*v\\d+(?:\\.\\d+)*(?:[-+][^\\s]+)?$/i, "")
        .replace(/\\s+v\\d+(?:\\.\\d+)*(?:[-+][^\\s]+)?$/i, "")
        .trim() || "Console";
    const syncBar = () => {
      const curVer = String(window.__HUB_ELECTRON_VERSION__ || ver || "").trim();
      const curDev = Boolean(window.__HUB_ELECTRON_DEV__ || isDev);
      if (window.__HUB_DESKTOP_CHROME__) {
        window.__HUB_DESKTOP_CHROME__.version = curVer;
        window.__HUB_DESKTOP_CHROME__.isDev = curDev;
      }
      let barEl = document.getElementById("hub-desktop-titlebar");
      if (!barEl) {
        barEl = document.createElement("div");
        barEl.id = "hub-desktop-titlebar";
        const dot = document.createElement("span");
        dot.className = "hub-tb-dot";
        const span = document.createElement("span");
        span.className = "hub-tb-title";
        const devEl = document.createElement("span");
        devEl.className = "hub-tb-dev";
        devEl.textContent = "DEV";
        barEl.append(dot, span, devEl);
        document.body.prepend(barEl);
      }
      barEl.classList.toggle("hub-tb--dev", curDev);
      const titleEl = barEl.querySelector(".hub-tb-title");
      if (titleEl && titleEl.textContent !== labelText) titleEl.textContent = labelText;
      const staleVerEl = barEl.querySelector(".hub-tb-version");
      if (staleVerEl) staleVerEl.remove();
      const devEl = barEl.querySelector(".hub-tb-dev");
      if (devEl) devEl.style.display = curDev ? "" : "none";
    };
    syncBar();
    if (!window.__HUB_TB_READY_BOUND__) {
      window.__HUB_TB_READY_BOUND__ = true;
      window.addEventListener("hub:electron-dev-ready", syncBar);
    }
  })();`;
}

function syncRendererChromeState(win, state = null) {
  if (!win || win.isDestroyed()) return;
  const wc = win.webContents;
  if (!wc || wc.isDestroyed()) return;
  try {
    void wc.executeJavaScript(buildRendererChromeInjectScript(win, state), true).catch(() => {});
  } catch {
    /* ignore */
  }
}

function bindWindowChrome(win, state) {
  if (!win || win.isDestroyed()) return;
  if (process.platform !== "darwin") {
    hideWindowMenuBar(win);
    applyWindowsDarkTitlebar(win);
  }
  const wc = win.webContents;
  if (!wc) return;

  if (!attachedWebContents.has(wc)) {
    attachedWebContents.add(wc);
    wc.on("before-input-event", (event, input) => {
      if (event.defaultPrevented || win.isDestroyed()) return;
      const opts = state.options || {};
      if (typeof opts.filterWindow === "function" && !opts.filterWindow(win)) return;
      const action = matchDesktopShortcut(input);
      if (!action) return;

      if (action === "reload") {
        event.preventDefault();
        void opts.onReload(win);
      } else if (action === "forceReload") {
        event.preventDefault();
        void opts.onForceReload(win);
      } else if (action === "toggleDevTools") {
        event.preventDefault();
        wc.toggleDevTools();
      } else if (action === "toggleFullScreen") {
        if (typeof win.isResizable === "function" && !win.isResizable()) return;
        event.preventDefault();
        win.setFullScreen(!win.isFullScreen());
      } else if (action === "zoomIn") {
        event.preventDefault();
        wc.setZoomLevel(Math.min(3, wc.getZoomLevel() + 0.5));
      } else if (action === "zoomOut") {
        event.preventDefault();
        wc.setZoomLevel(Math.max(-3, wc.getZoomLevel() - 0.5));
      } else if (action === "resetZoom") {
        event.preventDefault();
        wc.setZoomLevel(0);
      }
    });
  }

  if (!attachedChromeSync.has(wc) && typeof wc.on === "function") {
    attachedChromeSync.add(wc);
    wc.on("dom-ready", () => syncRendererChromeState(win, state));
    wc.on("did-finish-load", () => syncRendererChromeState(win, state));
  }
  if (!attachedTitleSync.has(win) && typeof win.on === "function") {
    attachedTitleSync.add(win);
    win.on("page-title-updated", () => syncRendererChromeState(win, state));
    win.on("ready-to-show", () => {
      if (process.platform !== "darwin") {
        hideWindowMenuBar(win);
        applyWindowsDarkTitlebar(win);
      }
      syncRendererChromeState(win, state);
    });
  }
  if (typeof wc.isLoading === "function" && !wc.isLoading()) {
    syncRendererChromeState(win, state);
  }
}

function installMacApplicationMenu(opts) {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => void opts.onReload() },
          { label: "Force Reload", accelerator: "Shift+F5", click: () => void opts.onForceReload() },
          { type: "separator" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
      { role: "help", submenu: opts.helpSubmenu },
    ]),
  );
}

/**
 * @param {{
 *   onReload?: (win?: Electron.BrowserWindow) => void,
 *   onForceReload?: (win?: Electron.BrowserWindow) => void,
 *   onQuit?: () => void,
 *   filterWindow?: (win: Electron.BrowserWindow) => boolean,
 *   version?: string,
 *   isDev?: boolean,
 *   helpSubmenu?: Electron.MenuItemConstructorOptions[],
 * }} [options]
 */
function installDesktopAppMenu(options = {}) {
  const onReload = typeof options.onReload === "function" ? options.onReload : defaultReload;
  const onForceReload = typeof options.onForceReload === "function" ? options.onForceReload : onReload;
  const onQuit = typeof options.onQuit === "function" ? options.onQuit : () => app.quit();
  const helpSubmenu = Array.isArray(options.helpSubmenu) ? options.helpSubmenu : [];
  const filterWindow = typeof options.filterWindow === "function" ? options.filterWindow : null;
  const version = typeof options.version === "string" ? options.version.trim() : "";
  const isDev = typeof options.isDev === "boolean" ? options.isDev : undefined;

  const state = globalThis[MENU_STATE_KEY] || { options: null, listenerBound: false };
  state.options = { onReload, onForceReload, onQuit, helpSubmenu, filterWindow, version, isDev };
  globalThis[MENU_STATE_KEY] = state;

  if (process.platform === "darwin") {
    installMacApplicationMenu(state.options);
  } else {
    try {
      if (nativeTheme) nativeTheme.themeSource = "dark";
    } catch {
      /* ignore */
    }
    // Remove the classic white Win32/Linux menu bar (File/Edit/View/Window/Help) from all windows.
    Menu.setApplicationMenu(null);
  }

  for (const win of BrowserWindow.getAllWindows()) {
    bindWindowChrome(win, state);
  }

  if (!state.listenerBound && typeof app?.on === "function") {
    state.listenerBound = true;
    app.on("browser-window-created", (_event, win) => {
      bindWindowChrome(win, state);
    });
  }
}

module.exports = {
  installDesktopAppMenu,
  getDesktopWindowChromeOptions,
  matchDesktopShortcut,
};
