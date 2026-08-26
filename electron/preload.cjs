const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskConsole", {
  apiOrigin: `http://127.0.0.1:${process.env.DESK_API_PORT || 6010}`,
  closePicker: () => ipcRenderer.send("desk-picker-close"),
  rebindHotkeys: () => ipcRenderer.invoke("desk-hotkeys-rebind"),
  pickerSnapshot: () => ipcRenderer.sendSync("desk-picker-snapshot-sync"),
  onPickerData: (cb) => {
    const fn = (_event, data) => cb(data);
    ipcRenderer.on("desk-picker-data", fn);
    return () => ipcRenderer.removeListener("desk-picker-data", fn);
  },
  pasteClip: (id) => ipcRenderer.invoke("desk-clip-paste", id),
  loginItem: (enabled) => ipcRenderer.invoke("desk-prefs-login", enabled),
});
