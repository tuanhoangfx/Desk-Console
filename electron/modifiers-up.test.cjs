const test = require("node:test");
const assert = require("node:assert/strict");
const { anyModifierDown, whenModifiersUp } = require("./modifiers-up.cjs");

test("anyModifierDown returns boolean without throw", () => {
  assert.equal(typeof anyModifierDown(), "boolean");
});

test("whenModifiersUp invokes callback", async () => {
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 2000);
    whenModifiersUp(
      () => {
        clearTimeout(t);
        resolve();
      },
      { timeoutMs: 50, pollMs: 10 },
    );
  });
});
