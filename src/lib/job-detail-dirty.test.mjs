import assert from "node:assert/strict";
import test from "node:test";
import { jobNoteDirty, jobSettingsDraftDirty } from "./job-detail-dirty.mjs";

const baseline = {
  name: "FolderSync verify",
  localPath: "C:\\Data",
  remote: "gdrive:FolderSyncVerify",
  mode: "bisync",
  settleSec: 20,
  proxyUrl: "",
  maxFileSize: "",
  exclude: "node_modules,dist,.git",
};

test("an unchanged job detail draft does not light Save", () => {
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline }), false);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, settleSec: "20" }), false);
  assert.equal(jobSettingsDraftDirty(null, baseline), false);
  assert.equal(jobNoteDirty("", ""), false);
  assert.equal(jobNoteDirty(undefined, ""), false);
});

test("Save lights only when a tracked field or the note differs", () => {
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, name: "Renamed" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, localPath: "D:\\Other" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, remote: "gdrive:Other" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, mode: "mirror-local" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, settleSec: 0 }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, proxyUrl: "direct" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, proxyUrl: "http://127.0.0.1:7890" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, maxFileSize: "5G" }), true);
  assert.equal(jobSettingsDraftDirty(baseline, { ...baseline, exclude: "*.tmp" }), true);
  assert.equal(jobNoteDirty("", "keep this"), true);
  assert.equal(jobNoteDirty("keep this", "keep this"), false);
});
