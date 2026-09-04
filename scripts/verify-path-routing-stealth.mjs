/**
 * Stealth smoke: P0001 path routing — /clips → sidebar Runners → /runners.
 * Pool 9990–9999 only. No IDE browser MCP.
 */
import { spawnSync } from "node:child_process";
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { openStealthCdpSession, cdpEvaluate } from "../../scripts/lib/stealth-cdp-session.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";

const ROOT = "E:/Dev";
const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
  cwd: ROOT,
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

async function waitReady() {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const info = await cdpEvaluate(
      session.send,
      `(() => ({
        href: location.href,
        pathname: location.pathname,
        hasHub: Boolean(document.querySelector(".hub-app")),
        runnersBtn: Boolean([...document.querySelectorAll("button,a,[role='button']")].find((el) => /^\\s*Runners\\s*$/i.test(el.textContent || ""))),
        body: (document.body?.innerText || "").slice(0, 120),
      }))()`,
    );
    if (info?.hasHub && /\/clips\/?$/.test(String(info.pathname || ""))) return info;
  }
  throw new Error("Clips path not ready");
}

const boot = await waitReady();

const clicked = await cdpEvaluate(
  session.send,
  `(() => {
    const btn = [...document.querySelectorAll("button,a,[role='button']")].find((el) =>
      /^\\s*Runners\\s*$/i.test(el.textContent || ""),
    );
    if (!btn) return { ok: false, reason: "no-runners-nav" };
    btn.click();
    return { ok: true, label: (btn.textContent || "").trim() };
  })()`,
);

await new Promise((r) => setTimeout(r, 800));

const after = await cdpEvaluate(
  session.send,
  `(() => {
    const active =
      document.querySelector("[data-hub-screen]:not([hidden])") ||
      document.querySelector("main [hidden] ~ *:not([hidden])") ||
      document.querySelector(".hub-app");
    const title =
      active?.querySelector?.(".app-tab-header h1")?.textContent ||
      [...document.querySelectorAll(".app-tab-header h1")]
        .map((el) => el.textContent || "")
        .find((t) => /runners/i.test(t)) ||
      "";
    return {
      href: location.href,
      pathname: location.pathname,
      search: location.search,
      titleText: String(title).trim(),
      hasHub: Boolean(document.querySelector(".hub-app")),
      sidebarActive: ([...document.querySelectorAll("button")]
        .find((el) => /runners/i.test(el.textContent || "") && el.getAttribute("aria-current") === "page")
        ?.textContent || "").trim(),
    };
  })()`,
);

const legacy = await cdpEvaluate(
  session.send,
  `(() => {
    history.replaceState(null, "", "/?screen=tasks");
    location.reload();
    return true;
  })()`,
);

let migrated = null;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  migrated = await cdpEvaluate(
    session.send,
    `(() => ({
      pathname: location.pathname,
      search: location.search,
      href: location.href,
      hasHub: Boolean(document.querySelector(".hub-app")),
    }))()`,
  );
  if (migrated?.hasHub && String(migrated.pathname || "") === "/tasks") break;
}

const report = {
  ok:
    boot?.hasHub === true &&
    clicked?.ok === true &&
    String(after?.pathname || "") === "/runners" &&
    String(migrated?.pathname || "") === "/tasks" &&
    !String(migrated?.search || "").includes("screen="),
  profile,
  boot,
  clicked,
  after,
  migrated,
  legacyOk: Boolean(legacy),
};

console.log(JSON.stringify(report, null, 2));
await session.close?.().catch(() => null);
if (!report.ok) process.exit(1);
