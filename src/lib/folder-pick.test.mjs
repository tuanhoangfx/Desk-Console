import assert from "node:assert/strict";
import test from "node:test";
import { ancestorPaths, joinLocalRoot, localPickRoot, readLastUsedLocalRoot } from "./folder-pick.mjs";

test("a local folder opens from its drive root", () => {
  assert.deepEqual(localPickRoot("C:\\Users\\CzP\\AppData\\folder-sync\\smoke-fixture"), {
    root: "C:\\",
    rel: "Users/CzP/AppData/folder-sync/smoke-fixture",
  });
  assert.deepEqual(localPickRoot(""), { root: "", rel: "" });
  assert.equal(readLastUsedLocalRoot(["D:\\", "E:\\"]), "D:\\");
  assert.equal(readLastUsedLocalRoot([]), "C:\\");
});

test("the current folder and its parents start open", () => {
  assert.deepEqual(ancestorPaths("Users/CzP/smoke"), ["Users", "Users/CzP", "Users/CzP/smoke"]);
  assert.deepEqual(ancestorPaths(""), []);
  assert.equal(joinLocalRoot("C:\\", "Users/CzP"), "C:\\Users\\CzP");
  assert.equal(joinLocalRoot("C:\\", ""), "C:\\");
});
