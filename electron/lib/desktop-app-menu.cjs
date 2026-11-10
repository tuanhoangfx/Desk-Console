/**
 * Windows/macOS application menu shared by desktop tools.
 * Labels match P0003 Stealth: File, Edit, View, Window, Help.
 * Packaged apps copy this file to electron/lib before electron-builder
 * (see scripts/desktop-dist.mjs). Dev resolves Tool/scripts/lib directly.
 */
const { app, BrowserWindow, Menu } = require("electron");

function defaultReload() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.reload();
  }
}

/**
 * @param {{
 *   onReload?: () => void,
 *   onForceReload?: () => void,
 *   onQuit?: () => void,
 *   helpSubmenu?: Electron.MenuItemConstructorOptions[],
 * }} [options]
 */
function installDesktopAppMenu(options = {}) {
  const onReload = typeof options.onReload === "function" ? options.onReload : defaultReload;
  const onForceReload = typeof options.onForceReload === "function" ? options.onForceReload : onReload;
  const onQuit = typeof options.onQuit === "function" ? options.onQuit : () => app.quit();
  const helpSubmenu = Array.isArray(options.helpSubmenu) ? options.helpSubmenu : [];

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [{ role: "appMenu" }]
        : [
            {
              label: "File",
              submenu: [
                {
                  label: "Quit",
                  accelerator: "Alt+F4",
                  click: () => {
                    void onQuit();
                  },
                },
              ],
            },
          ]),
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => void onReload() },
          { label: "Force Reload", accelerator: "Shift+F5", click: () => void onForceReload() },
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
      { role: "help", submenu: helpSubmenu },
    ]),
  );
}

module.exports = { installDesktopAppMenu };
