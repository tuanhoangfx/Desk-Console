import assert from "node:assert/strict";
import test from "node:test";
import { DESK_SIBLINGS, listSiblings, resolveSibling } from "./desk-siblings.mjs";

test("DESK_SIBLINGS includes P0006 and P0009 only (no engine merge)", () => {
  const codes = DESK_SIBLINGS.map((s) => s.code).sort();
  assert.deepEqual(codes, ["P0006", "P0009"]);
});

test("resolveSibling returns structured result for P0009", () => {
  const r = resolveSibling("P0009");
  assert.ok(r);
  assert.equal(r.code, "P0009");
  assert.equal(r.name, "Folder Sync");
  assert.equal(typeof r.exe, "string");
});

test("listSiblings exposes availability flags", () => {
  const rows = listSiblings();
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.ok(row.code);
    assert.ok(row.name);
    assert.equal(typeof row.available, "boolean");
  }
});
