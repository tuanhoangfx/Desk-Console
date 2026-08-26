const test = require("node:test");
const assert = require("node:assert/strict");
const { captureForegroundHwnd } = require("./hwnd-once.cjs");

test("hwnd-once returns a numeric foreground handle", () => {
  const hwnd = captureForegroundHwnd();
  assert.match(String(hwnd), /^\d+$/);
  assert.notEqual(hwnd, "0");
});
