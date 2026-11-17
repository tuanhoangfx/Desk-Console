#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  P0001_DRIVES_FIXED_COLUMNS,
  P0001_JOBS_FIXED_COLUMNS,
} from "./lib/p0001-directory-fixed-columns.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolRoot = resolve(__dirname, "..");
const hubUiModule = resolve(toolRoot, "../../packages/hub-ui/src/lib/directory-fixed-column-css.mjs");
const { generateDirectoryFixedColumnCss } = await import(pathToFileURL(hubUiModule).href);

const outPath = join(toolRoot, "src/styles/p0009-jobs-directory-fixed-cols.generated.css");
const parts = [
  generateDirectoryFixedColumnCss({
    entries: P0001_JOBS_FIXED_COLUMNS,
    tableRoots: [
      "table.hub-users-table.p0009-jobs-directory-table[data-hub-directory-select]",
      "table.hub-users-table.p0009-jobs-directory-table",
    ],
    banner: "/* AUTO-GENERATED — scripts/generate-p0009-jobs-fixed-col-css.mjs */",
  }),
  generateDirectoryFixedColumnCss({
    entries: P0001_DRIVES_FIXED_COLUMNS,
    tableRoots: [
      "table.hub-users-table.p0009-drives-directory-table[data-hub-directory-select]",
      "table.hub-users-table.p0009-drives-directory-table",
    ],
    banner: "/* Drives Directory Fixed Columns */",
  }),
];

writeFileSync(outPath, `${parts.join("\n\n").trimEnd()}\n`, "utf8");
console.log(
  `Wrote ${outPath} (jobs ${P0001_JOBS_FIXED_COLUMNS.length}, drives ${P0001_DRIVES_FIXED_COLUMNS.length})`,
);
