import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { existingDirectory } from "./existing-directory.mjs";

test("browse starts at the current folder, or the nearest parent that exists", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-browse-"));
  const folder = path.join(root, "FolderSyncVerify");
  fs.mkdirSync(folder);
  assert.equal(existingDirectory(folder), folder);
  assert.equal(existingDirectory(path.join(folder, "missing", "child")), folder);
  assert.equal(existingDirectory(""), "");
  assert.equal(existingDirectory(path.join(root, "no-such-root-zzz")), root);
  fs.rmSync(root, { recursive: true, force: true });
});
