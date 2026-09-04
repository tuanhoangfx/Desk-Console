const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskConsole", {
  apiOrigin: `http://127.0.0.1:${process.env.DESK_API_PORT || 6010}`,
  isDev: Boolean(process.env.VITE_DEV_SERVER_URL),
  appVersion: process.env.DESK_APP_VERSION || "",
  closePicker: () => ipcRenderer.send("desk-picker-close"),
  rebindHotkeys: () => ipcRenderer.invoke("desk-hotkeys-rebind"),
  pickerSnapshot: () => ipcRenderer.sendSync("desk-picker-snapshot-sync"),
  onPickerData: (cb) => {
    const fn = (_event, data) => cb(data);
    ipcRenderer.on("desk-picker-data", fn);
    return () => ipcRenderer.removeListener("desk-picker-data", fn);
  },
  pasteClip: (id, text) => ipcRenderer.invoke("desk-clip-paste", id, text),
  copyClip: (id, text) => ipcRenderer.invoke("desk-clip-copy", id, text),
  loginItem: (enabled) => ipcRenderer.invoke("desk-prefs-login", enabled),
});
