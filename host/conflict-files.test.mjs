import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  listConflictFiles,
  parseConflictRelPath,
  resolveConflictFile,
} from "./conflict-files.mjs";

test("parseConflictRelPath detects rclone timestamped and numbered conflict suffixes", () => {
  assert.deepEqual(parseConflictRelPath("docs/notes.conflict-20261022-021500.txt"), {
    isConflict: true,
    originalRelPath: "docs/notes.txt",
    suffix: ".conflict-20261022-021500",
  });
  assert.deepEqual(parseConflictRelPath("docs/notes.txt.conflict1"), {
    isConflict: true,
    originalRelPath: "docs/notes.txt",
    suffix: ".conflict1",
  });
  assert.equal(parseConflictRelPath("docs/notes.txt").isConflict, false);
});

test("listConflictFiles and resolveConflictFile move discarded files into local trash (never permanent delete)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-conflicts-"));
  const trashDir = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-conflicts-trash-"));
  try {
    const orig = path.join(tmpDir, "budget.txt");
    const conf1 = path.join(tmpDir, "budget.conflict-20261022-021500.txt");
    const conf2 = path.join(tmpDir, "budget.conflict2.txt");
    fs.writeFileSync(orig, "local-winner", "utf8");
    fs.writeFileSync(conf1, "remote-loser-1", "utf8");
    fs.writeFileSync(conf2, "remote-loser-2", "utf8");

    const listed = listConflictFiles(tmpDir);
    assert.equal(listed.length, 2);

    const res1 = resolveConflictFile(tmpDir, "budget.conflict-20261022-021500.txt", "keep-local", {
      trashRoot: trashDir,
    });
    assert.equal(res1.ok, true);
    assert.equal(res1.remainingCount, 1);
    assert.equal(fs.readFileSync(orig, "utf8"), "local-winner");
    assert.equal(fs.existsSync(conf1), false);
    assert.equal(res1.trashedPaths.length, 1);
    assert.equal(fs.readFileSync(res1.trashedPaths[0], "utf8"), "remote-loser-1");

    const res2 = resolveConflictFile(tmpDir, "budget.conflict2.txt", "keep-conflict", {
      trashRoot: trashDir,
    });
    assert.equal(res2.ok, true);
    assert.equal(res2.remainingCount, 0);
    assert.equal(fs.readFileSync(orig, "utf8"), "remote-loser-2");
    assert.equal(fs.existsSync(conf2), false);
    assert.ok(res2.trashedPaths.length >= 1);
    assert.equal(fs.readFileSync(res2.trashedPaths[0], "utf8"), "local-winner");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(trashDir, { recursive: true, force: true });
  }
});
