/**
 * Measure sidebar tab-switch latency (paint + URL) on P0001.
 */
import { spawnSync } from "node:child_process";
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { openStealthCdpSession, cdpEvaluate } from "../../scripts/lib/stealth-cdp-session.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
  cwd: "E:/Dev",
  encoding: "utf8",
  windowsHide: true,
  timeout: 15_000,
});
const profile = JSON.parse(assign.stdout || "{}").profile || "9990";
const targetUrl = `http://127.0.0.1:5180/clips?_v=${Date.now()}`;

const raw = await stealthBrowser.listProfiles();
const list = Array.isArray(raw) ? raw : raw?.profiles || [];
const hit = list.find((p) => String(p.name || "").trim() === profile);
if (!hit) throw new Error(`profile missing ${profile}`);
await stealthBrowser.launch(String(hit.id)).catch(() => null);
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl,
  screenshot: false,
  closeWhenDone: false,
});

const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Runtime.enable").catch(() => null);
await session.send("Page.navigate", { url: targetUrl });
await new Promise((r) => setTimeout(r, 2500));

async function measureSwitch(label) {
  return cdpEvaluate(
    session.send,
    `(() => {
      const btn = [...document.querySelectorAll("button")].find((el) =>
        new RegExp("^\\\\s*" + ${JSON.stringify(label)} + "\\\\s*$", "i").test(el.textContent || ""),
      );
      if (!btn) return { ok: false, reason: "missing-btn", label: ${JSON.stringify(label)} };
      const t0 = performance.now();
      btn.click();
      return new Promise((resolve) => {
        let frames = 0;
        const tick = () => {
          frames += 1;
          const path = location.pathname;
          const activeTitle = (document.querySelector("[data-hub-screen]:not([hidden]) .app-tab-header h1")?.textContent || "").trim();
          const hubVisible = Boolean(document.querySelector(".hub-app"));
          const want = ${JSON.stringify("/" + label.toLowerCase())};
          const pathOk = path === want || path === want + "/";
          const titleOk = new RegExp(${JSON.stringify(label)}, "i").test(activeTitle);
          if ((pathOk && (titleOk || frames > 3)) || frames > 90) {
            resolve({
              ok: pathOk,
              label: ${JSON.stringify(label)},
              ms: Math.round(performance.now() - t0),
              frames,
              path,
              activeTitle,
              hubVisible,
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    })()`,
  );
}

const results = [];
for (const label of ["Runners", "Tasks", "Clips", "System", "Runners"]) {
  results.push(await measureSwitch(label));
  await new Promise((r) => setTimeout(r, 200));
}

// Also measure network on tab activate
const net = await cdpEvaluate(
  session.send,
  `(() => {
    const btn = [...document.querySelectorAll("button")].find((el) => /^\\s*Runners\\s*$/i.test(el.textContent || ""));
    const entries = [];
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (String(e.name || "").includes("/api/")) {
          entries.push({ name: e.name, duration: Math.round(e.duration), start: Math.round(e.startTime) });
        }
      }
    });
    obs.observe({ type: "resource", buffered: false });
    const t0 = performance.now();
    btn?.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        obs.disconnect();
        resolve({
          ms: Math.round(performance.now() - t0),
          path: location.pathname,
          api: entries.slice(-8),
        });
      }, 1200);
    });
  })()`,
);

console.log(JSON.stringify({ profile, results, net }, null, 2));
await session.close?.().catch(() => null);
