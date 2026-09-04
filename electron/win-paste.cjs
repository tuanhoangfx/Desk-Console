/**
 * Windows paste — Ditto ExternalWindowTracker + CopyQ WinPlatformWindow:
 * 1) Wait until modifiers are up (CopyQ waitForModifiersReleased)
 * 2) KEYUP leftover modifiers only (Ditto AllKeysUp force list — never blast 0x08–0xFE)
 * 3) SPI_SETFOREGROUNDLOCKTIMEOUT=0 + AttachThreadInput(current FG) + SetForegroundWindow (Ditto/CopyQ)
 * 4) SendInput Ctrl+V (CopyQ: KEYEVENTF_UNICODE, wScan=0, VK_LCONTROL+'V') — not keybd_event
 *    (UWP/Chromium ignore keybd_event). Fallback Shift+Insert, then Ditto keybd_event ^v.
 */
const koffi = require("koffi");

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const ShowWindow = user32.func("bool __stdcall ShowWindow(void *hWnd, int nCmdShow)");
const IsIconic = user32.func("bool __stdcall IsIconic(void *hWnd)");
const IsWindow = user32.func("bool __stdcall IsWindow(void *hWnd)");
const IsWindowVisible = user32.func("bool __stdcall IsWindowVisible(void *hWnd)");
const SetForegroundWindow = user32.func("bool __stdcall SetForegroundWindow(void *hWnd)");
const BringWindowToTop = user32.func("bool __stdcall BringWindowToTop(void *hWnd)");
const SetWindowPos = user32.func(
  "bool __stdcall SetWindowPos(void *hWnd, void *hWndInsertAfter, int X, int Y, int cx, int cy, uint32 uFlags)",
);
const GetForegroundWindow = user32.func("void * __stdcall GetForegroundWindow()");
const GetWindowThreadProcessId = user32.func(
  "uint32 __stdcall GetWindowThreadProcessId(void *hWnd, _Out_ uint32 *lpdwProcessId)",
);
const AttachThreadInput = user32.func("bool __stdcall AttachThreadInput(uint32 idAttach, uint32 idAttachTo, bool fAttach)");
const AllowSetForegroundWindow = user32.func("bool __stdcall AllowSetForegroundWindow(uint32 dwProcessId)");
const SendInput = user32.func("uint32 __stdcall SendInput(uint32 nInputs, void *pInputs, int cbSize)");
const MapVirtualKeyW = user32.func("uint32 __stdcall MapVirtualKeyW(uint32 uCode, uint32 uMapType)");
const GetKeyState = user32.func("short __stdcall GetKeyState(int nVirtKey)");
const keybd_event = user32.func("void __stdcall keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uintptr dwExtraInfo)");
const SystemParametersInfoW = user32.func(
  "bool __stdcall SystemParametersInfoW(uint32 uiAction, uint32 uiParam, void *pvParam, uint32 fWinIni)",
);
const GetCurrentThreadId = kernel32.func("uint32 __stdcall GetCurrentThreadId()");

const SW_RESTORE = 9;
const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_DRAWFRAME = 0x0020;
const SWP_SHOWWINDOW = 0x0040;
const INPUT_KEYBOARD = 1;
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP = 0x0002;
const KEYEVENTF_UNICODE = 0x0004;
const MAPVK_VK_TO_VSC = 0;
const SPI_GETFOREGROUNDLOCKTIMEOUT = 0x2000;
const SPI_SETFOREGROUNDLOCKTIMEOUT = 0x2001;
const ASFW_ANY = 0xffffffff;
const VK_SHIFT = 0x10;
const VK_CONTROL = 0x11;
const VK_MENU = 0x12;
const VK_INSERT = 0x2d;
const VK_LWIN = 0x5b;
const VK_RWIN = 0x5c;
const VK_LSHIFT = 0xa0;
const VK_RSHIFT = 0xa1;
const VK_LCONTROL = 0xa2;
const VK_RCONTROL = 0xa3;
const VK_LMENU = 0xa4;
const VK_RMENU = 0xa5;
const VK_V = 0x56;
const MODIFIER_VKS = [
  VK_SHIFT,
  VK_CONTROL,
  VK_MENU,
  VK_LWIN,
  VK_RWIN,
  VK_LSHIFT,
  VK_RSHIFT,
  VK_LCONTROL,
  VK_RCONTROL,
  VK_LMENU,
  VK_RMENU,
];
const DITTO_EXTENDED = new Set([
  VK_SHIFT,
  VK_CONTROL,
  VK_INSERT,
  0x21,
  0x22,
  0x23,
  0x24,
  0x25,
  0x26,
  0x27,
  0x28,
  0x2e,
]);

/** Windows x64 INPUT = 40 bytes (DWORD type + pad + 32-byte union). */
const INPUT_SIZE = 40;

function hwndPtr(hwndStr) {
  const n = BigInt(String(hwndStr || "").trim());
  if (n <= 0n) return null;
  return koffi.as(n, "void *");
}

function hwndToStr(ptr) {
  if (ptr == null || ptr === 0 || ptr === 0n) return "";
  try {
    const n = typeof ptr === "bigint" ? ptr : BigInt(koffi.address(ptr));
    return n > 0n ? String(n) : "";
  } catch {
    return "";
  }
}

function threadId(hwnd) {
  if (!hwnd) return 0;
  const pidOut = [0];
  return GetWindowThreadProcessId(hwnd, pidOut) || 0;
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* settle */
  }
}

function grantForegroundPermission() {
  try {
    AllowSetForegroundWindow(ASFW_ANY);
  } catch {
    /* ignore */
  }
}

function keyIsDown(vk) {
  try {
    return (GetKeyState(vk) & 0x8000) !== 0;
  } catch {
    return false;
  }
}

function isModifierPressed() {
  return MODIFIER_VKS.some((vk) => keyIsDown(vk));
}

function waitForModifiersReleased(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isModifierPressed()) return true;
    sleep(12);
  }
  return !isModifierPressed();
}

/** CopyQ createInput: KEYEVENTF_UNICODE | flags, wScan=0, wVk=virtual key. */
function writeCopyQKey(buf, index, vk, flags) {
  const off = index * INPUT_SIZE;
  buf.writeUInt32LE(INPUT_KEYBOARD, off);
  buf.writeUInt32LE(0, off + 4);
  buf.writeUInt16LE(vk, off + 8);
  buf.writeUInt16LE(0, off + 10);
  buf.writeUInt32LE(KEYEVENTF_UNICODE | flags, off + 12);
  buf.writeUInt32LE(0, off + 16);
  buf.writeUInt32LE(0, off + 20);
  buf.writeBigUInt64LE(0n, off + 24);
}

function sendInputs(count, fill) {
  const buf = Buffer.alloc(INPUT_SIZE * count);
  fill(buf);
  const n = SendInput(count, buf, INPUT_SIZE);
  return n === count;
}

function sendCopyQChord(modifier, key) {
  return sendInputs(4, (buf) => {
    writeCopyQKey(buf, 0, modifier, 0);
    writeCopyQKey(buf, 1, key, 0);
    writeCopyQKey(buf, 2, key, KEYEVENTF_KEYUP);
    writeCopyQKey(buf, 3, modifier, KEYEVENTF_KEYUP);
  });
}

/** Ditto CSendKeys::SendKeyUp — keybd_event, only for leftover modifiers. */
function sendKeyUpKeybd(vk) {
  const scan = MapVirtualKeyW(vk, MAPVK_VK_TO_VSC) & 0xff;
  const flags = KEYEVENTF_KEYUP | (DITTO_EXTENDED.has(vk) ? KEYEVENTF_EXTENDEDKEY : 0);
  keybd_event(vk, scan, flags, 0);
}

function sendKeyDownKeybd(vk) {
  const scan = MapVirtualKeyW(vk, MAPVK_VK_TO_VSC) & 0xff;
  const flags = DITTO_EXTENDED.has(vk) ? KEYEVENTF_EXTENDEDKEY : 0;
  keybd_event(vk, scan, flags, 0);
}

function allKeysUp() {
  for (const vk of MODIFIER_VKS) {
    if (keyIsDown(vk)) sendKeyUpKeybd(vk);
  }
  for (const vk of [VK_LSHIFT, VK_RSHIFT, VK_LCONTROL, VK_RCONTROL, VK_LMENU, VK_RMENU, VK_LWIN, VK_RWIN]) {
    sendKeyUpKeybd(vk);
  }
}

function sendChordKeybd(modifier, key) {
  sendKeyDownKeybd(modifier);
  sendKeyDownKeybd(key);
  sendKeyUpKeybd(key);
  sendKeyUpKeybd(modifier);
  return true;
}

function withForegroundLockUnlocked(fn) {
  const prev = Buffer.alloc(8);
  let hadPrev = false;
  try {
    hadPrev = Boolean(SystemParametersInfoW(SPI_GETFOREGROUNDLOCKTIMEOUT, 0, prev, 0));
  } catch {
    hadPrev = false;
  }
  try {
    SystemParametersInfoW(SPI_SETFOREGROUNDLOCKTIMEOUT, 0, null, 0);
  } catch {
    /* ignore */
  }
  try {
    return fn();
  } finally {
    if (hadPrev) {
      try {
        const ms = prev.readUInt32LE(0);
        SystemParametersInfoW(SPI_SETFOREGROUNDLOCKTIMEOUT, 0, koffi.as(BigInt(ms), "void *"), 0);
      } catch {
        /* ignore */
      }
    }
  }
}

function waitUntilForeground(target, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hwndToStr(GetForegroundWindow()) === hwndToStr(target)) return true;
    sleep(8);
  }
  return hwndToStr(GetForegroundWindow()) === hwndToStr(target);
}

function raiseWindow(target) {
  grantForegroundPermission();
  try {
    if (IsIconic(target)) ShowWindow(target, SW_RESTORE);
  } catch {
    /* ignore */
  }
  try {
    if (!IsWindowVisible(target)) return false;
  } catch {
    /* still try */
  }
  return withForegroundLockUnlocked(() => {
    const me = GetCurrentThreadId();
    const fg = GetForegroundWindow();
    const fgTid = threadId(fg);
    let attached = false;
    if (fgTid && fgTid !== me) {
      try {
        attached = Boolean(AttachThreadInput(me, fgTid, true));
      } catch {
        attached = false;
      }
    }
    try {
      BringWindowToTop(target);
      SetForegroundWindow(target);
      SetWindowPos(target, null, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_DRAWFRAME);
    } catch {
      /* ignore */
    }
    if (attached) {
      try {
        AttachThreadInput(me, fgTid, false);
      } catch {
        /* ignore */
      }
    }
    return waitUntilForeground(target, 160);
  });
}

function releaseModifierKeys() {
  allKeysUp();
}

function sendPasteChord() {
  if (sendCopyQChord(VK_LCONTROL, VK_V)) return true;
  if (sendCopyQChord(VK_LSHIFT, VK_INSERT)) return true;
  sendChordKeybd(VK_CONTROL, VK_V);
  return true;
}

function sendCtrlKey(vk) {
  waitForModifiersReleased(400);
  allKeysUp();
  sleep(16);
  if (sendCopyQChord(VK_LCONTROL, vk)) return true;
  sendChordKeybd(VK_CONTROL, vk);
  return true;
}

function restoreForegroundHwnd(hwndStr) {
  const target = hwndPtr(hwndStr);
  if (!target || !IsWindow(target)) return false;
  try {
    return raiseWindow(target);
  } catch {
    return false;
  }
}

function pasteToForegroundHwnd(hwndStr) {
  const target = hwndPtr(hwndStr);
  if (!target || !IsWindow(target)) return false;
  try {
    waitForModifiersReleased(400);
    allKeysUp();
    raiseWindow(target);
    sleep(50);
    waitForModifiersReleased(200);
    allKeysUp();
    sleep(16);
    return sendPasteChord();
  } catch {
    return false;
  }
}

module.exports = {
  pasteToForegroundHwnd,
  restoreForegroundHwnd,
  grantForegroundPermission,
  releaseModifierKeys,
  sendCtrlKey,
  allKeysUp,
  INPUT_SIZE,
};
