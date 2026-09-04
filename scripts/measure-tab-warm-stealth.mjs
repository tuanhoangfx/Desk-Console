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
const url = `http://127.0.0.1:5180/clips?warm=${Date.now()}`;
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl: url,
  screenshot: false,
  closeWhenDone: false,
});
const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 3500));

// Warm all tabs once
for (const label of ["Runners", "Tasks", "System", "Clips"]) {
  await cdpEvaluate(
    session.send,
    `(() => {
      const btn = [...document.querySelectorAll("button")].find((el) =>
        new RegExp("^\\\\s*" + ${JSON.stringify(label)} + "\\\\s*$", "i").test(el.textContent || ""),
      );
      btn?.click();
      return true;
    })()`,
  );
  await new Promise((r) => setTimeout(r, 1500));
}

const hasMemoBuild = await cdpEvaluate(
  session.send,
  `(() => {
    const src = [...document.querySelectorAll("script[src]")].map((s) => s.src).join(" ");
    return { path: location.pathname, scripts: src.includes("App") };
  })()`,
);

async function warmSwitch(label) {
  return cdpEvaluate(
    session.send,
    `(() => {
      try {
        const btn = [...document.querySelectorAll("button")].find((el) =>
          new RegExp("^\\\\s*" + ${JSON.stringify(label)} + "\\\\s*$", "i").test(el.textContent || ""),
        );
        if (!btn) return { ok: false, reason: "no-btn", label: ${JSON.stringify(label)} };
        const t0 = performance.now();
        btn.click();
        const syncMs = Math.round(performance.now() - t0);
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            const raf1 = Math.round(performance.now() - t0);
            requestAnimationFrame(() => {
              resolve({
                ok: true,
                label: ${JSON.stringify(label)},
                syncMs,
                raf1,
                raf2: Math.round(performance.now() - t0),
                path: location.pathname,
                mounted: document.querySelectorAll("[data-hub-screen]").length,
                activeId: document.querySelector(".desk-tab-panel--active")?.getAttribute("data-hub-screen") || "",
              });
            });
          });
        });
      } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
      }
    })()`,
  );
}

const warm = [];
for (const label of ["Runners", "Tasks", "Clips", "System", "Runners"]) {
  warm.push(await warmSwitch(label));
  await new Promise((r) => setTimeout(r, 400));
}

console.log(JSON.stringify({ profile, hasMemoBuild, warm }, null, 2));
await session.close?.().catch(() => null);
