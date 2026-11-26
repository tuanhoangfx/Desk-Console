#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotDesktopKnownGood } from "../../scripts/lib/desktop-known-good.mjs";

const devRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
snapshotDesktopKnownGood({ devRoot, code: "P0001" });
