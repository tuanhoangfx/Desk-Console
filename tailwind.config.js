import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rawRootDir =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const rootDir = (realpathSync.native ?? realpathSync)(rawRootDir);
const rel = (p) => path.resolve(rootDir, p).replace(/\\/g, "/");

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    rel("./index.html"),
    rel("./src/**/*.{js,ts,jsx,tsx}"),
    rel("../../packages/hub-ui/src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#0b1020",
          panel: "#121830",
          muted: "#8a93b2",
          accent: "#6366f1",
        },
      },
    },
  },
  plugins: [],
};
