const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readPrefs, writePrefs, prefsPath } = require("./prefs.cjs");

test("prefs default openAtLogin and persist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-prefs-"));
  process.env.DESK_CONSOLE_DATA = dir;
  assert.equal(readPrefs().openAtLogin, true);
  assert.equal(writePrefs({ openAtLogin: false }).openAtLogin, false);
  assert.equal(readPrefs().openAtLogin, false);
  assert.ok(fs.existsSync(prefsPath()));
});
