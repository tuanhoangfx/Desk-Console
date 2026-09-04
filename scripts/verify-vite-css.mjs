import http from "node:http";

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 12_000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const t = Buffer.concat(chunks).toString("utf8");
        resolve({
          url,
          status: res.statusCode,
          len: t.length,
          enoent: /ENOENT: no such file/.test(t),
          epkg: /open ['"]E:\\packages\\hub-ui/.test(t),
          viteError: t.includes("[plugin:vite:css]") || t.includes("[postcss] ENOENT"),
          head: t.slice(0, 220),
        });
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
    req.on("error", reject);
  });
}

const urls = [
  "http://127.0.0.1:5180/src/styles.css",
  "http://127.0.0.1:5180/@fs/E:/Dev/packages/hub-ui/src/styles/hub-fonts.css",
  "http://127.0.0.1:5180/@fs/E:/Dev/packages/hub-ui/src/styles/hub-shell-layout.css",
  "http://127.0.0.1:5180/src/main.tsx",
  "http://127.0.0.1:5180/clips",
  "http://127.0.0.1:6010/api/health",
];

const rows = [];
for (const url of urls) {
  try {
    rows.push(await get(url));
  } catch (err) {
    rows.push({ url, err: String(err) });
  }
}
const fonts = rows.find((r) => r.url?.includes("hub-fonts.css"));
const css = rows.find((r) => r.url?.includes("styles.css"));
let stealth = null;

if (process.argv.includes("--stealth")) {
  const { spawnSync } = await import("node:child_process");
  const { stealthBrowser } = await import("../../scripts/lib/stealth-browser-client.mjs");
  const { openStealthCdpSession, cdpEvaluate } = await import("../../scripts/lib/stealth-cdp-session.mjs");
  const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
    cwd: "E:/Dev",
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
  });
  const profile = JSON.parse(assign.stdout || "{}").profile || "9990";
  const targetUrl = "http://127.0.0.1:5180/clips";
  const raw = await stealthBrowser.listProfiles();
  const list = Array.isArray(raw) ? raw : raw?.profiles || [];
  const hit = list.find((p) => String(p.name || "").trim() === profile) || list.find((p) => String(p.id) === profile);
  if (!hit) throw new Error(`stealth profile missing: ${profile}`);
  await stealthBrowser.launch(String(hit.id)).catch(() => null);
  await stealthBrowser.openUrl({
    profileId: String(hit.id),
    profileName: profile,
    targetUrl,
    screenshot: false,
    closeWhenDone: false,
  });
  await new Promise((r) => setTimeout(r, 2000));
  const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 20_000 });
  stealth = await cdpEvaluate(
    session.send,
    `(() => {
      const overlay = document.querySelector("vite-error-overlay");
      const text = document.body?.innerText || "";
      return {
        href: location.href,
        title: document.title,
        hasOverlay: Boolean(overlay),
        overlayText: overlay ? String(overlay.shadowRoot?.textContent || overlay.textContent || "").slice(0, 240) : "",
        hasHubApp: Boolean(document.querySelector(".hub-app")),
        hasClips: /\\bClips\\b/.test(text),
        hasEnoent: /ENOENT|E:\\\\packages\\\\hub-ui/.test(text),
      };
    })()`,
  );
  await session.close?.().catch(() => {});
}

const out = { http: rows, stealth };
console.log(JSON.stringify(out, null, 2));
const bad =
  !css ||
  css.err ||
  css.status !== 200 ||
  css.enoent ||
  css.viteError ||
  !fonts ||
  fonts.err ||
  fonts.status !== 200 ||
  fonts.enoent ||
  (stealth && (stealth.hasOverlay || stealth.hasEnoent || !stealth.hasHubApp || !stealth.hasClips));
process.exit(bad ? 1 : 0);
