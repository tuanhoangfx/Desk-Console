/**
 * One-shot GetForegroundWindow — koffi only (no Python/PowerShell spawn).
 * spawnSync was freezing Electron main thread ~0.5–1.5s and freezing the mouse.
 */
const { getKoffi } = require("./lib/load-koffi.cjs");

const koffi = getKoffi();
let user32 = null;
let gdi32 = null;
let GetForegroundWindow = null;
let GetWindowLongPtrW = null;
let SetWindowLongPtrW = null;
let ShowWindow = null;
let GetClipboardSequenceNumber = null;
let GetWindowRect = null;
let SetWindowRgn = null;
let CreateRoundRectRgn = null;
let CreateEllipticRgn = null;
let CombineRgn = null;
let DeleteObject = null;

if (koffi) {
  user32 = koffi.load("user32.dll");
  gdi32 = koffi.load("gdi32.dll");
  GetForegroundWindow = user32.func("void * __stdcall GetForegroundWindow()");
  GetWindowLongPtrW = user32.func("int64 __stdcall GetWindowLongPtrW(void *hWnd, int nIndex)");
  SetWindowLongPtrW = user32.func("int64 __stdcall SetWindowLongPtrW(void *hWnd, int nIndex, int64 dwNewLong)");
  ShowWindow = user32.func("bool __stdcall ShowWindow(void *hWnd, int nCmdShow)");
  GetClipboardSequenceNumber = user32.func("uint32 __stdcall GetClipboardSequenceNumber()");
  GetWindowRect = user32.func("bool __stdcall GetWindowRect(void *hWnd, _Out_ int32 *lpRect)");
  SetWindowRgn = user32.func("int __stdcall SetWindowRgn(void *hWnd, void *hRgn, bool bRedraw)");
  CreateRoundRectRgn = gdi32.func("void * __stdcall CreateRoundRectRgn(int x1, int y1, int x2, int y2, int w, int h)");
  CreateEllipticRgn = gdi32.func("void * __stdcall CreateEllipticRgn(int x1, int y1, int x2, int y2)");
  CombineRgn = gdi32.func("int __stdcall CombineRgn(void *hrgnDst, void *hrgnSrc1, void *hrgnSrc2, int iMode)");
  DeleteObject = gdi32.func("bool __stdcall DeleteObject(void *ho)");
}

const GWL_EXSTYLE = -20;
const WS_EX_NOACTIVATE = 0x08000000;
const RGN_OR = 2;

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

/** Override Windows STARTUPINFO.wShowWindow = SW_HIDE when Electron is spawned from a hidden shell. */
function forceShowWindowWin32(hwndStr) {
  if (!ShowWindow) return false;
  const hwnd = hwndPtr(hwndStr);
  if (!hwnd) return false;
  try {
    ShowWindow(hwnd, 9); // SW_RESTORE
    ShowWindow(hwnd, 5); // SW_SHOW
    return true;
  } catch {
    return false;
  }
}

/** 0.001ms Win32 sequence counter — increments only when the system clipboard actually changes. */
function getClipboardSequenceNumber() {
  if (!GetClipboardSequenceNumber) return 0;
  try {
    return Number(GetClipboardSequenceNumber()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Clips the picker window via OS SetWindowRgn to the exact union of:
 * 1) the rounded `.desk-picker-shell` card (inset by 10px padding, 12px radius), and
 * 2) the overhanging circular `.desk-picker-close` X button at the top-right corner.
 * Eliminates the outer rectangular frame without using WS_EX_LAYERED / transparent:true.
 */
function applyPickerWindowRegion(hwndStr, scaleFactor = 1, logicalWidth = 480, logicalHeight = 580) {
  if (!SetWindowRgn || !CreateRoundRectRgn || !CreateEllipticRgn || !CombineRgn || !DeleteObject) return false;
  const hwnd = hwndPtr(hwndStr);
  if (!hwnd) return false;
  try {
    let s = Number(scaleFactor) > 0 ? Number(scaleFactor) : 1;
    let physW = Math.round(logicalWidth * s);
    let physH = Math.round(logicalHeight * s);
    if (GetWindowRect) {
      const rect = [0, 0, 0, 0];
      if (GetWindowRect(hwnd, rect)) {
        const w = rect[2] - rect[0];
        const h = rect[3] - rect[1];
        if (w >= 200 && h >= 200) {
          physW = w;
          physH = h;
          s = w / logicalWidth;
        }
      }
    }
    const pad = Math.round(9 * s);
    const cornerDiam = Math.round(22 * s);
    const rgnMain = CreateRoundRectRgn(pad, pad, physW - pad + 1, physH - pad + 1, cornerDiam, cornerDiam);
    if (!rgnMain) return false;
    // Close button: 32x32 circle overhanging top-right corner of .desk-picker-frame (top: -9px, right: -9px -> x: 448..480, y: 0..32)
    const cx1 = physW - Math.round(32 * s);
    const cy1 = 0;
    const cx2 = physW + 1;
    const cy2 = Math.round(32 * s) + 1;
    const rgnClose = CreateEllipticRgn(cx1, cy1, cx2, cy2);
    if (rgnClose) {
      CombineRgn(rgnMain, rgnMain, rgnClose, RGN_OR);
      DeleteObject(rgnClose);
    }
    const res = SetWindowRgn(hwnd, rgnMain, true);
    if (!res) {
      DeleteObject(rgnMain);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  applyPickerWindowRegion,
  captureForegroundHwnd,
  forceShowWindowWin32,
  getClipboardSequenceNumber,
  hwndFromNativeHandle,
  setWindowNoActivate,
};
