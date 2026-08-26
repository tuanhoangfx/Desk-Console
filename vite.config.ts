import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { hubAppVersionPlugin } from "../scripts/embed-app-version.mjs";

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const hubUiSrc = path.resolve(toolRoot, "vendor/hub-ui/src");
const hubIdentitySrc = path.resolve(toolRoot, "vendor/hub-identity/src");
const packagesHubUi = path.resolve(toolRoot, "../../packages/hub-ui/src");
const packagesIdentity = path.resolve(toolRoot, "../../packages/hub-identity/src");
const uiSrc = fs.existsSync(path.join(hubUiSrc, "index.ts")) ? hubUiSrc : packagesHubUi;
const identitySrc = fs.existsSync(path.join(hubIdentitySrc, "index.ts"))
  ? hubIdentitySrc
  : packagesIdentity;

export default defineConfig({
  base: "./",
  plugins: [react(), hubAppVersionPlugin({ root: toolRoot })],
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:6010",
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
});
