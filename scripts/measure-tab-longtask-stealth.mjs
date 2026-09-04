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
const raw = await stealthBrowser.listProfiles();
const list = Array.isArray(raw) ? raw : raw?.profiles || [];
const hit = list.find((p) => String(p.name || "").trim() === profile);
await stealthBrowser.launch(String(hit.id)).catch(() => null);
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl: "http://127.0.0.1:5180/clips",
  screenshot: false,
  closeWhenDone: false,
});
const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Page.navigate", { url: "http://127.0.0.1:5180/clips" });
await new Promise((r) => setTimeout(r, 3000));

const out = await cdpEvaluate(
  session.send,
  `(() => {
    const long = [];
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          long.push({ name: e.name, duration: Math.round(e.duration), start: Math.round(e.startTime) });
        }
      });
      po.observe({ type: "longtask", buffered: true });
    } catch (_) {}
    const btn = [...document.querySelectorAll("button")].find((el) =>
      /^\\s*Tasks\\s*$/i.test(el.textContent || ""),
    );
    const t0 = performance.now();
    btn.click();
    const syncMs = Math.round(performance.now() - t0);
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const raf1 = Math.round(performance.now() - t0);
        requestAnimationFrame(() => {
          const raf2 = Math.round(performance.now() - t0);
          setTimeout(() => {
            resolve({
              syncMs,
              raf1,
              raf2,
              path: location.pathname,
              longTasks: long.slice(-12),
              mountedScreens: [...document.querySelectorAll("[data-hub-screen]")].map((el) => ({
                id: el.getAttribute("data-hub-screen"),
                hidden: el.hasAttribute("hidden"),
                nodes: el.querySelectorAll("*").length,
              })),
            });
          }, 80);
        });
      });
    });
  })()`,
);

console.log(JSON.stringify(out, null, 2));
await session.close?.().catch(() => null);
