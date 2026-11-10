import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-drive-trash-"));
process.env.FOLDER_SYNC_DATA_ROOT = root;

const { readDriveAccountLedger, recordDriveAccount, restoreDriveAccount, trashDriveAccount } = await import(
  "./rclone-ops.mjs"
);

test("Drive account trash stays on the ledger until restore", () => {
  const trashed = trashDriveAccount("Work");
  assert.equal(trashed.ok, true);
  assert.equal(trashed.trashed, true);
  assert.ok(readDriveAccountLedger().Work.deletedAt);

  recordDriveAccount("Work", {
    message: "Signed in",
    changes: [{ field: "status", before: "Sign in", after: "Signed in" }],
  });
  assert.ok(readDriveAccountLedger().Work.deletedAt, "a later account log must not clear Trash");

  assert.equal(restoreDriveAccount("missing").error, "not_in_trash");
  const restored = restoreDriveAccount("Work");
  assert.equal(restored.ok, true);
  assert.equal(readDriveAccountLedger().Work.deletedAt, null);
});

test.after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});
