import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { hubAppVersionPlugin } from "../scripts/embed-app-version.mjs";
import { createHubManualChunks, HUB_CHUNK_SIZE_WARNING_LIMIT_KB } from "../scripts/vite-hub-chunks.mjs";

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const hubUiSrc = path.resolve(toolRoot, "../../packages/hub-ui/src");
const hubIdentitySrc = path.resolve(toolRoot, "../../packages/hub-identity/src");

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
      allow: [toolRoot, hubUiSrc, hubIdentitySrc, path.resolve(toolRoot, "../..")],
    },
    watch: {
      ignored: (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (
          norm.includes("/node_modules/") ||
          norm.includes("/data/") ||
          norm.includes("/logs/") ||
          norm.includes("/dist/") ||
          norm.includes("/dist-desktop/") ||
          norm.includes("/release/") ||
          norm.includes("/resources/") ||
          norm.includes("/.cache/") ||
          norm.includes("/.ship/") ||
          norm.includes("/.git/") ||
          norm.includes("/.runtime/") ||
          norm.endsWith("/tool.manifest.json") ||
          norm.endsWith("/CHANGELOG.md") ||
          norm.endsWith("/.vite-active-lease.txt") ||
          norm.endsWith(".log") ||
          norm.endsWith(".pid") ||
          norm.endsWith(".state.json") ||
          norm.endsWith(".env.json")
        ) {
          return true;
        }
        if (norm.includes("/Tool/") && !norm.includes("/Tool/P0001-Desk-Console")) {
          return true;
        }
        return false;
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["@tool-workspace/hub-ui", "@tool-workspace/hub-identity"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^@tool-workspace\/hub-ui\/(.+)$/, replacement: `${hubUiSrc}/$1` },
      { find: "@tool-workspace/hub-ui", replacement: path.join(hubUiSrc, "index.ts") },
      { find: "@tool-workspace/hub-identity", replacement: path.join(hubIdentitySrc, "index.ts") },
      { find: /^@tool-workspace\/hub-identity\/(.+)$/, replacement: `${hubIdentitySrc}/$1` },
    ],
  },
  build: {
    chunkSizeWarningLimit: HUB_CHUNK_SIZE_WARNING_LIMIT_KB,
    rollupOptions: {
      output: {
        manualChunks: createHubManualChunks({ localOnly: true }),
      },
    },
  },
  test: {
    maxWorkers: 3,
  },
}));
