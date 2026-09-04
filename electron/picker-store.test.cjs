const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readPickerSnapshot } = require("./picker-store.cjs");

test("picker-store paints samples then history from disk", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-picker-"));
  process.env.DESK_CONSOLE_DATA = dir;
  fs.writeFileSync(
    path.join(dir, "samples.json"),
    JSON.stringify([{ id: "s1", name: "Follow up", text: "Following up." }]),
  );
  fs.writeFileSync(path.join(dir, "clips.json"), JSON.stringify([{ id: "h1", text: "copied from telegram" }]));
  const snap = readPickerSnapshot();
  assert.equal(snap.rows.length, 2);
  assert.equal(snap.rows[0].kind, "sample");
  assert.equal(snap.rows[0].name, "Follow up");
  assert.equal(snap.rows[1].kind, "history");
  assert.match(snap.labels.picker, /Ctrl/);
});

test("picker-store remaps Alt and Ctrl+Shift+V labels to Ctrl+Shift+Q", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-picker-"));
  process.env.DESK_CONSOLE_DATA = dir;
  fs.writeFileSync(path.join(dir, "hotkeys.json"), JSON.stringify({ picker: "CommandOrControl+Alt+V" }));
  fs.writeFileSync(path.join(dir, "clips.json"), JSON.stringify([]));
  fs.writeFileSync(path.join(dir, "samples.json"), JSON.stringify([]));
  assert.equal(readPickerSnapshot().labels.picker, "Ctrl+Shift+Q");
  fs.writeFileSync(path.join(dir, "hotkeys.json"), JSON.stringify({ picker: "CommandOrControl+Shift+V" }));
  assert.equal(readPickerSnapshot().labels.picker, "Ctrl+Shift+Q");
});
