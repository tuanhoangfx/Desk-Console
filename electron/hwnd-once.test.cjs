const test = require("node:test");
const assert = require("node:assert/strict");
const { captureForegroundHwnd, hwndFromNativeHandle } = require("./hwnd-once.cjs");

test("hwnd-once returns a numeric foreground handle", () => {
  const hwnd = captureForegroundHwnd();
  assert.match(String(hwnd), /^\d+$/);
  assert.notEqual(hwnd, "0");
});

test("hwndFromNativeHandle reads little-endian HWND buffer", () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x1a2b3c4dn);
  assert.equal(hwndFromNativeHandle(buf), String(0x1a2b3c4dn));
  assert.equal(hwndFromNativeHandle(Buffer.alloc(8)), "");
});
