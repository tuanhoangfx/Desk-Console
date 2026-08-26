const { spawnSync } = require("node:child_process");

const HWND_PS = `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskHwndOnce {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
[int64][DeskHwndOnce]::GetForegroundWindow()`;

function firstHwnd(stdout) {
  const hwnd = String(stdout || "").trim().split(/\r?\n/).pop() || "";
  return hwnd && hwnd !== "0" ? hwnd : "";
}

/** One-shot user32 — no resident PowerShell. Python ctypes first, PS fallback. */
function captureForegroundHwnd() {
  const py = spawnSync(
    "python",
    ["-c", "import ctypes; print(ctypes.windll.user32.GetForegroundWindow())"],
    { encoding: "utf8", windowsHide: true, timeout: 700 },
  );
  const fromPy = firstHwnd(py.stdout);
  if (fromPy) return fromPy;
  const ps = spawnSync("powershell", ["-NoProfile", "-Command", HWND_PS], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 700,
  });
  return firstHwnd(ps.stdout);
}

module.exports = { captureForegroundHwnd };
