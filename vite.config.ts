import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { hubAppVersionPlugin } from "../scripts/embed-app-version.mjs";

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const vendorHubUi = path.resolve(toolRoot, "vendor/hub-ui/src");
const vendorIdentity = path.resolve(toolRoot, "vendor/hub-identity/src");
const packagesHubUi = path.resolve(toolRoot, "../../packages/hub-ui/src");
const packagesIdentity = path.resolve(toolRoot, "../../packages/hub-identity/src");

/** Monorepo dev: prefer fresh packages; vendor is offline/build fallback. */
function pickHubSrc(preferred: string, fallback: string): string {
  if (fs.existsSync(path.join(preferred, "index.ts"))) return preferred;
  if (fs.existsSync(path.join(fallback, "index.ts"))) return fallback;
  return preferred;
}

const uiSrc = pickHubSrc(packagesHubUi, vendorHubUi);
const identitySrc = pickHubSrc(packagesIdentity, vendorIdentity);

const deskApiPort =
  process.env.DESK_API_PORT ||
  (process.env.DESK_DEV_ISOLATED === "0" ? "6010" : "6011");

/** serve: `base: '/'` so hard-refresh on `/clips` resolves assets. build: `./` for Electron file://. */
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "./",
  plugins: [react(), hubAppVersionPlugin({ root: toolRoot })],
  appType: "spa",
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${deskApiPort}`,
    },
    fs: {
      allow: [toolRoot, uiSrc, identitySrc, path.resolve(toolRoot, "../..")],
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["@tool-workspace/hub-ui", "@tool-workspace/hub-identity"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^@tool-workspace\/hub-ui\/(.+)$/, replacement: `${uiSrc}/$1` },
      { find: "@tool-workspace/hub-ui", replacement: path.join(uiSrc, "index.ts") },
      { find: "@tool-workspace/hub-identity", replacement: path.join(identitySrc, "index.ts") },
      { find: /^@tool-workspace\/hub-identity\/(.+)$/, replacement: `${identitySrc}/$1` },
    ],
  },
}));
