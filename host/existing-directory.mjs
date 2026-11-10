import fs from "node:fs";
import path from "node:path";

/** Deepest existing directory at or above `start`. Empty when nothing on disk matches. */
export function existingDirectory(start) {
  let current = String(start || "").trim();
  const seen = new Set();
  while (current && !seen.has(current.toLowerCase())) {
    seen.add(current.toLowerCase());
    try {
      if (fs.existsSync(current) && fs.statSync(current).isDirectory()) return current;
    } catch {
      /* walk to the parent */
    }
    const parent = path.dirname(current);
    if (!parent || parent === current) break;
    current = parent;
  }
  return "";
}
