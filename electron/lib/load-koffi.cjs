/**
 * Optional koffi loader — packaged assemble can miss the native .node when
 * electron-builder EPERM-falls-back without a rebuilt binary. Soft-fail so the
 * Desk UI still boots; paste/hwnd helpers degrade to no-ops.
 */
let koffi = null;
let loadError = "";
try {
  koffi = require("koffi");
} catch (err) {
  loadError = err instanceof Error ? err.message : String(err);
  console.warn(`[desk] koffi unavailable — hwnd/paste native helpers disabled: ${loadError}`);
}

function getKoffi() {
  return koffi;
}

function koffiReady() {
  return Boolean(koffi);
}

module.exports = { getKoffi, koffiReady, loadError };
