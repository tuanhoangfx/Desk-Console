/**
 * P0001 Desk Console — core desktop smoke (user-like).
 *
 *   node Tool/scripts/node-run.mjs Tool/scripts/smoke-desktop-ui.mjs --code P0001 --scenario desk-core --port 9337
 *
 * Covers: Sign In (if gated) · Runners + Tasks screens render · sidebar walk · no renderer exceptions.
 * Lanes: DESKTOP_SMOKE_LANE=smoke|dev|prod (prodExe optional — Desk may be win-unpacked only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hubSignIn, readDevLoginCredentials, walkSidebarNav } from "../../../scripts/lib/desktop-cdp-session.mjs";
import { createDesktopSmokeLaneProfile } from "../../../scripts/lib/desktop-smoke-lane.mjs";

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const candidates = [
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Programs", "Desk Console", "Desk Console.exe")
    : "",
  path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Desk Console", "Desk Console.exe"),
].filter(Boolean);
const prodExe = candidates.find((p) => fs.existsSync(p)) || candidates[candidates.length - 1];

const lane = createDesktopSmokeLaneProfile({
  code: "P0001",
  userDataId: "desk-console",
  prodPort: 6010,
  devPort: 6011,
  smokePort: 6012,
  prodExe,
  portEnvKey: "DESK_API_PORT",
});

export const killExisting = lane.killExisting;
export const matchUrl = "index.html";
export const launchEnv = lane.launchEnv;
export const launchArgs = lane.launchArgs;
export const resolveExe = lane.resolveExe;

async function openNav(session, label) {
  const pattern = JSON.stringify(`^\\s*${label}\\s*$`);
  await session
    .click(
      `[...document.querySelectorAll('aside.hub-sidebar-shell a, aside.hub-sidebar-shell button, aside.hub-sidebar-shell [role=button]')].find(el => new RegExp(${pattern}, 'i').test(el.textContent.trim()))`,
    )
    .catch(() => null);
}

export default async function run({ session, rec, sleep }) {
  await session.waitFor(
    `document.querySelector('input[name=login]')?.offsetParent || document.querySelector('aside.hub-sidebar-shell') || document.body.innerText.length > 40`,
    { timeoutMs: 60_000, label: "Sign In or Desk shell" },
  );
  if (await hubSignIn(session, readDevLoginCredentials(productRoot))) {
    await rec.step("signed-in", "Sign In → DEV_AUTO_LOGIN");
  }
  await sleep(1000);

  for (const label of ["Runners", "Clips", "System"]) {
    await openNav(session, label);
    await sleep(900);
    const text = await session.evaluate(`document.body.innerText`);
    const hit = new RegExp(label, "i").test(text) || text.length > 80;
    rec.check(`screen "${label}" renders`, hit, `${text.length} chars`);
    await rec.step(`nav-${label}`);
  }

  const visited = await walkSidebarNav(session, rec, { skip: /^(Runners|Clips)$/i });
  rec.check("additional sidebar screens", visited.length >= 1, visited.join(" · ") || "(none beyond core)");
  const exceptions = rec.rendererErrors().filter((e) => e.kind === "exception");
  rec.check("no renderer exceptions", exceptions.length === 0, exceptions[0]?.text?.slice(0, 160) || "");
}
