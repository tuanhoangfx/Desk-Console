"use strict";

/**
 * P0001 Desk Console — Desktop Auto-Updater IPC Adapter
 * Powered by `@dev/hub-desktop-host-kit` (`./lib/desktop-host-kit.cjs`).
 */
const { app, ipcMain } = require("electron");
const {
  compareSemver,
  createDesktopUpdaterIpcController,
  parseLatestYml,
} = require("./lib/desktop-host-kit.cjs");

const controller = createDesktopUpdaterIpcController({
  app,
  ipcMain,
  channelPrefix: "desk",
  productName: "Desk Console",
  githubRepo: "tuanhoangfx/Desk-Console",
  installerFallbackTemplate: "Desk-Console-Setup-{version}.exe",
  electronDir: __dirname,
  autoCheckDelayMs: 6000,
});

function registerDesktopUpdaterIpc(opts = {}) {
  controller.registerIpc(opts);
}

function attachMainWindowForUpdater(win) {
  controller.attachWindow(win);
}

module.exports = {
  registerDesktopUpdaterIpc,
  attachMainWindowForUpdater,
  checkForUpdates: controller.checkForUpdates,
  downloadUpdate: controller.downloadUpdate,
  installUpdate: controller.installUpdate,
  parseLatestYml,
  compareSemver,
};
