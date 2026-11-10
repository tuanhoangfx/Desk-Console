import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildRcloneNetworkArgs,
  buildRcloneProxyEnv,
  getProxyHealthState,
  isProxyConnectionFailure,
  normalizeBwlimit,
  normalizeMaxFileSize,
  normalizeProxyUrl,
  readNetworkSettings,
  recordProxyProbeResult,
   redactProxyUrl,
  refreshProxyHealth,
  writeNetworkSettings,
} from "./network-qos.mjs";

test("normalizeProxyUrl supports standard URLs, host:port, and P0003 host:port:user:pass shorthand", () => {
  assert.equal(normalizeProxyUrl(""), "");
  assert.equal(normalizeProxyUrl("  "), "");
  assert.equal(normalizeProxyUrl("http://127.0.0.1:7890"), "http://127.0.0.1:7890");
  assert.equal(normalizeProxyUrl("socks5://127.0.0.1:1080"), "socks5://127.0.0.1:1080");
  assert.equal(normalizeProxyUrl("127.0.0.1:7890"), "http://127.0.0.1:7890");
  assert.equal(
    normalizeProxyUrl("103.1.2.3:8080:myuser:mypass"),
    "http://myuser:mypass@103.1.2.3:8080",
  );
  assert.equal(
    redactProxyUrl("103.1.2.3:8080:myuser:mypass"),
    "http://myuser:***@103.1.2.3:8080",
  );
});

test("buildRcloneNetworkArgs and buildRcloneProxyEnv resolve global, drive, and job overrides", () => {
  assert.equal(normalizeBwlimit("unlimited"), "");
  assert.equal(normalizeBwlimit("inherit"), "");
  assert.equal(normalizeBwlimit("10m"), "10M");
  assert.deepEqual(
    buildRcloneNetworkArgs({ bwlimit: "10M", tpslimit: 8, transfers: 4 }),
    ["--bwlimit", "10M", "--tpslimit", "8", "--tpslimit-burst", "16", "--transfers", "4"],
  );
  assert.deepEqual(
    buildRcloneNetworkArgs({ bwlimit: "10M", tpslimit: 4, transfers: 2 }, { bwlimit: "25M" }, { maxFileSize: "5G" }),
    ["--bwlimit", "25M", "--tpslimit", "4", "--tpslimit-burst", "8", "--transfers", "2", "--max-size", "5G"],
  );
  assert.equal(normalizeMaxFileSize("unlimited"), "");
  assert.equal(normalizeMaxFileSize("5g"), "5G");
  assert.equal(isProxyConnectionFailure("Post https://www.googleapis.com: proxyconnect tcp: dial tcp 127.0.0.1:7890: connectex: No connection could be made"), true);
  assert.equal(isProxyConnectionFailure("normal file not found error"), false);
  assert.deepEqual(buildRcloneProxyEnv({ proxyUrl: "" }), {});
  const env = buildRcloneProxyEnv(
    { proxyUrl: "http://127.0.0.1:7890" },
    { proxyUrl: "socks5://127.0.0.1:1080" },
  );
  assert.equal(env.HTTP_PROXY, "socks5://127.0.0.1:1080");
  assert.equal(env.HTTPS_PROXY, "socks5://127.0.0.1:1080");
  assert.equal(env.ALL_PROXY, "socks5://127.0.0.1:1080");
  // Per-job "direct" bypasses drive and global proxy
  assert.deepEqual(
    buildRcloneProxyEnv(
      { proxyUrl: "http://127.0.0.1:7890" },
      { proxyUrl: "socks5://127.0.0.1:1080" },
      { proxyUrl: "direct" },
    ),
    {},
  );
  // Per-job custom proxy overrides drive and global proxy
  assert.equal(
    buildRcloneProxyEnv(
      { proxyUrl: "http://127.0.0.1:7890" },
      { proxyUrl: "socks5://127.0.0.1:1080" },
      { proxyUrl: "103.1.2.3:8080:u:p" },
    ).HTTP_PROXY,
    "http://u:p@103.1.2.3:8080",
  );
});

test("writeNetworkSettings and readNetworkSettings persist QoS and proxy config", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-net-"));
  process.env.FOLDER_SYNC_DATA_ROOT = tmp;
  const defaults = readNetworkSettings();
  assert.equal(defaults.bwlimit, "");
  assert.equal(defaults.tpslimit, 8);
  assert.equal(defaults.transfers, 4);
  assert.equal(defaults.proxyUrl, "");

  const saved = writeNetworkSettings({
    bwlimit: "10M",
    tpslimit: 4,
    transfers: 2,
    proxyUrl: "127.0.0.1:7890",
  });
  assert.equal(saved.bwlimit, "10M");
  assert.equal(saved.tpslimit, 4);
  assert.equal(saved.transfers, 2);
  assert.equal(saved.proxyUrl, "http://127.0.0.1:7890");
  assert.equal(readNetworkSettings().proxyUrl, "http://127.0.0.1:7890");
});

test("refreshProxyHealth and recordProxyProbeResult track online, unreachable, and unconfigured states", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-net-health-"));
  process.env.FOLDER_SYNC_DATA_ROOT = tmp;

  writeNetworkSettings({ proxyUrl: "" });
  assert.equal(getProxyHealthState().status, "unconfigured");

  writeNetworkSettings({ proxyUrl: "127.0.0.1:7890", proxyFailoverToDirect: true });
  const onlineState = await refreshProxyHealth({
    probeFn: async () => ({
      ok: true,
      mode: "proxy",
      proxyUrl: "http://127.0.0.1:7890",
      latencyMs: 85,
      message: "Proxy tunnel to Google Drive API ready (85 ms)",
    }),
  });
  assert.equal(onlineState.status, "online");
  assert.equal(onlineState.latencyMs, 85);
  assert.equal(onlineState.failoverActive, false);

  const downState = recordProxyProbeResult(
    {
      ok: false,
      latencyMs: 12,
      message: "Could not reach proxy 127.0.0.1:7890 (ECONNREFUSED)",
    },
    readNetworkSettings(),
  );
  assert.equal(downState.status, "unreachable");
  assert.equal(downState.failoverActive, true);
  assert.match(downState.message, /Auto-Direct failover active/);
});
