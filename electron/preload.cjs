const { contextBridge, ipcRenderer } = require("electron");
const { createPreloadUpdateBridge } = require("./lib/desktop-host-kit.cjs");

contextBridge.exposeInMainWorld("deskConsole", {
  apiOrigin: `http://127.0.0.1:${process.env.DESK_API_PORT || 6010}`,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  appVersion: process.env.DESK_APP_VERSION || "",
  openPicker: () => ipcRenderer.invoke("desk-picker-open"),
  closePicker: () => ipcRenderer.send("desk-picker-close"),
  rebindHotkeys: () => ipcRenderer.invoke("desk-hotkeys-rebind"),
  pickerSnapshot: () => ipcRenderer.sendSync("desk-picker-snapshot-sync"),
  onPickerData: (cb) => {
    const fn = (_event, data) => cb(data);
    ipcRenderer.on("desk-picker-data", fn);
    return () => ipcRenderer.removeListener("desk-picker-data", fn);
  },
  pasteClip: (id, text, imageDataUrl) => ipcRenderer.invoke("desk-clip-paste", id, text, imageDataUrl),
  copyClip: (id, text, imageDataUrl) => ipcRenderer.invoke("desk-clip-copy", id, text, imageDataUrl),
  pinClip: (id, pinned) => ipcRenderer.invoke("desk-clip-pin", id, pinned),
  loginItem: (enabled) => ipcRenderer.invoke("desk-prefs-login", enabled),
  ...createPreloadUpdateBridge(ipcRenderer, "desk"),
});

contextBridge.exposeInMainWorld("folderSyncDesktop", {
  browseFolder: (initialPath) => ipcRenderer.invoke("folder-sync:browse-folder", initialPath),
  openLocal: (target) => ipcRenderer.invoke("folder-sync:open-local", target),
  openExternal: (url) => ipcRenderer.invoke("folder-sync:open-external", url),
});

