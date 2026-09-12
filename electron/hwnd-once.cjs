/**
 * One-shot GetForegroundWindow — koffi only (no Python/PowerShell spawn).
 * spawnSync was freezing Electron main thread ~0.5–1.5s and freezing the mouse.
 */
const { getKoffi } = require("./lib/load-koffi.cjs");

const koffi = getKoffi();
let user32 = null;
let GetForegroundWindow = null;
let GetWindowLongPtrW = null;
let SetWindowLongPtrW = null;

if (koffi) {
  user32 = koffi.load("user32.dll");
  GetForegroundWindow = user32.func("void * __stdcall GetForegroundWindow()");
  GetWindowLongPtrW = user32.func("int64 __stdcall GetWindowLongPtrW(void *hWnd, int nIndex)");
  SetWindowLongPtrW = user32.func("int64 __stdcall SetWindowLongPtrW(void *hWnd, int nIndex, int64 dwNewLong)");
}

const GWL_EXSTYLE = -20;
const WS_EX_NOACTIVATE = 0x08000000;

function hwndFromNativeHandle(buf) {
  if (!buf || !koffi) return "";
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  try {
    if (b.length >= 8) {
      const n = b.readBigUInt64LE(0);
      return n > 0n ? String(n) : "";
    }
    if (b.length >= 4) {
      const n = b.readUInt32LE(0);
      return n > 0 ? String(n) : "";
    }
  } catch {
    return "";
  }
  return "";
}

function hwndPtr(hwndStr) {
  if (!koffi) return null;
  try {
    const n = BigInt(String(hwndStr || "").trim());
    if (n <= 0n) return null;
    return koffi.as(n, "void *");
  } catch {
    return null;
  }
}

function captureForegroundHwnd() {
  if (!GetForegroundWindow || !koffi) return "";
  try {
    const ptr = GetForegroundWindow();
    if (ptr == null || ptr === 0 || ptr === 0n) return "";
    const n = typeof ptr === "bigint" ? ptr : BigInt(koffi.address(ptr));
    if (n <= 0n) return "";
    return String(n);
  } catch {
    return "";
  }
}

/** Clicks work; window does not steal the caret from Notepad/Cursor (Ditto WS_EX_NOACTIVATE). */
function setWindowNoActivate(hwndStr) {
  if (!GetWindowLongPtrW || !SetWindowLongPtrW) return false;
  const hwnd = hwndPtr(hwndStr);
  if (!hwnd) return false;
  try {
    const prev = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, BigInt(prev) | BigInt(WS_EX_NOACTIVATE));
    return true;
  } catch {
    return false;
  }
}

module.exports = { captureForegroundHwnd, hwndFromNativeHandle, setWindowNoActivate };
