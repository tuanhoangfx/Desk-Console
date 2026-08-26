import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pure freeze contract (no React render) — mirrors useTabFrozenRows semantics.
 * Run: node packages/hub-ui/src/loading/useTabFrozenRows.contract.mjs
 */
function freezeRows(tabActive, frozenRef, compute) {
  if (!tabActive) return frozenRef.current;
  const next = compute();
  frozenRef.current = next;
  return next;
}

const frozenRef = { current: [] };
let computeCount = 0;
const source = [1, 2, 3];

const active1 = freezeRows(true, frozenRef, () => {
  computeCount += 1;
  return source.filter((n) => n > 1);
});
assert.deepEqual(active1, [2, 3]);
assert.equal(computeCount, 1);

const inactive = freezeRows(false, frozenRef, () => {
  computeCount += 1;
  return source.filter((n) => n > 0);
});
assert.equal(inactive, active1);
assert.equal(computeCount, 1, "inactive must not recompute");

source.push(4);
const stillFrozen = freezeRows(false, frozenRef, () => {
  computeCount += 1;
  return source.filter((n) => n > 1);
});
assert.equal(stillFrozen, active1);
assert.equal(computeCount, 1, "source churn while inactive must not recompute");

const active2 = freezeRows(true, frozenRef, () => {
  computeCount += 1;
  return source.filter((n) => n > 1);
});
assert.deepEqual(active2, [2, 3, 4]);
assert.equal(computeCount, 2);

const indexText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../index.ts"), "utf8");
assert.ok(indexText.includes("useTabFrozenRows"), "hub-ui index must export useTabFrozenRows");
assert.ok(indexText.includes("HubInactiveTabContent"), "hub-ui index must export HubInactiveTabContent");

console.log("useTabFrozenRows contract OK");
