import assert from "node:assert/strict";
import test from "node:test";
import { devUiRedirectEnabled, devUiRedirectTarget } from "./dev-ui.mjs";

test("the packaged exe is sent to Vite only for documents", () => {
  assert.equal(devUiRedirectTarget("GET", "/", true), "http://127.0.0.1:3009/");
  assert.equal(devUiRedirectTarget("GET", "/jobs", true), "http://127.0.0.1:3009/jobs");
  assert.equal(devUiRedirectTarget("GET", "/api/jobs", true), null);
  assert.equal(devUiRedirectTarget("GET", "/assets/index-abc.js", true), null);
  assert.equal(devUiRedirectTarget("GET", "/", false), null);
  assert.equal(devUiRedirectTarget("POST", "/", true), null);
});

test("redirect stays off unless the dev host opts in", () => {
  assert.equal(devUiRedirectEnabled({}), false);
  assert.equal(devUiRedirectEnabled({ FOLDER_SYNC_DEV_UI: "0" }), false);
  assert.equal(devUiRedirectEnabled({ FOLDER_SYNC_DEV_UI: "1" }), true);
});
