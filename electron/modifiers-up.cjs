/**
 * Wait until Ctrl/Alt/Shift/Win are up before focusing the picker.
 * Focusing while Alt is still down makes Chromium/Cursor treat it as menu/tab chrome.
 */
const { getKoffi } = require("./lib/load-koffi.cjs");

const koffi = getKoffi();
let GetAsyncKeyState = null;
if (koffi) {
  const user32 = koffi.load("user32.dll");
  GetAsyncKeyState = user32.func("short __stdcall GetAsyncKeyState(int vKey)");
}

const VK_SHIFT = 0x10;
const VK_CONTROL = 0x11;
const VK_MENU = 0x12; // Alt
const VK_LWIN = 0x5b;
const VK_RWIN = 0x5c;

function keyDown(vk) {
  if (!GetAsyncKeyState) return false;
  try {
    return (GetAsyncKeyState(vk) & 0x8000) !== 0;
  } catch {
    return false;
  }
}

function anyModifierDown() {
  if (!GetAsyncKeyState) return false;
  return (
    keyDown(VK_SHIFT) ||
    keyDown(VK_CONTROL) ||
    keyDown(VK_MENU) ||
    keyDown(VK_LWIN) ||
    keyDown(VK_RWIN)
  );
}

/**
 * @param {() => void} fn
 * @param {{ timeoutMs?: number, pollMs?: number, onTimeout?: () => void }} [opts]
 */
function whenModifiersUp(fn, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) || 900;
  const pollMs = Number(opts.pollMs) || 16;
  const onTimeout = typeof opts.onTimeout === "function" ? opts.onTimeout : fn;
  const start = Date.now();
  const tick = () => {
    if (!anyModifierDown()) {
      try {
        fn();
      } catch {
        /* ignore */
      }
      return;
    }
    if (Date.now() - start >= timeoutMs) {
      try {
        onTimeout();
      } catch {
        /* ignore */
      }
      return;
    }
    setTimeout(tick, pollMs);
  };
  setTimeout(tick, pollMs);
}

function whenModifiersUpAsync(opts = {}) {
  return new Promise((resolve) => {
    whenModifiersUp(() => resolve(true), {
      timeoutMs: opts.timeoutMs,
      pollMs: opts.pollMs,
      onTimeout: () => resolve(false),
    });
  });
}

module.exports = { anyModifierDown, whenModifiersUp, whenModifiersUpAsync };
