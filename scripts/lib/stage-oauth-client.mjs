/**
 * Stage git-ignored `host/oauth-client.runtime.json` before packaging/assembling P0001 Desk Console.
 *
 * Ensures packaged NSIS / unpacked `Desk Console.exe` has the Desktop Google Drive OAuth client
 * out-of-the-box on fresh customer PCs (`GG0001`, empty `rclone.conf`) while keeping zero raw or
 * Base64 secrets inside Git history (GitHub Push Protection compliant).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function readKeyFromDotEnvFile(filePath, key) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      if (trimmed.slice(0, idx).trim() === key) {
        const val = trimmed
          .slice(idx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (val) return val;
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

function readClientFromRcloneConf(confPath) {
  try {
    if (!confPath || !fs.existsSync(confPath)) return null;
    const lines = fs.readFileSync(confPath, "utf8").split(/\r?\n/);
    let cur = null;
    const flush = (sec) => {
      if (sec && sec.type === "drive" && sec.client_id && sec.client_secret) {
        return {
          clientId: sec.client_id,
          clientSecret: sec.client_secret,
          scope: sec.scope || "drive",
        };
      }
      return null;
    };
    for (const line of lines) {
      const header = line.match(/^\[(.+)\]\s*$/);
      if (header) {
        const hit = flush(cur);
        if (hit) return hit;
        cur = {};
        continue;
      }
      if (!cur) continue;
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      cur[k] = v;
    }
    return flush(cur);
  } catch {
    return null;
  }
}

export function resolveBuildTimeDriveOAuthClient(productRoot) {
  const envFiles = [
    path.join(productRoot, ".env.local"),
    path.join(productRoot, "..", ".env.shared"),
    path.join(productRoot, "..", "..", ".env.shared"),
  ];
  const fromEnv = (key) => {
    const direct = String(process.env[key] || "").trim();
    if (direct) return direct;
    for (const fp of envFiles) {
      const hit = readKeyFromDotEnvFile(fp, key);
      if (hit) return hit;
    }
    return "";
  };

  const clientId = fromEnv("DESK_GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = fromEnv("DESK_GOOGLE_OAUTH_CLIENT_SECRET");
  if (clientId && clientSecret) {
    return { clientId, clientSecret, scope: "drive" };
  }

  const runtimePath = path.join(productRoot, "host", "oauth-client.runtime.json");
  try {
    if (fs.existsSync(runtimePath)) {
      const parsed = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
      if (parsed?.clientId && parsed?.clientSecret) {
        return {
          clientId: String(parsed.clientId).trim(),
          clientSecret: String(parsed.clientSecret).trim(),
          scope: String(parsed.scope || "drive").trim() || "drive",
        };
      }
    }
  } catch {
    /* ignore */
  }

  const rcloneCandidates = [
    process.env.RCLONE_CONFIG,
    path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "rclone", "rclone.conf"),
  ].filter(Boolean);
  for (const rc of rcloneCandidates) {
    const hit = readClientFromRcloneConf(rc);
    if (hit) return hit;
  }

  return null;
}

export function stagePackagedOAuthClient(productRoot) {
  const runtimePath = path.join(productRoot, "host", "oauth-client.runtime.json");
  const resolved = resolveBuildTimeDriveOAuthClient(productRoot);
  if (!resolved) {
    return { staged: false, path: runtimePath };
  }
  const payload = `${JSON.stringify(
    {
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
      scope: resolved.scope || "drive",
    },
    null,
    2,
  )}\n`;
  const prev = fs.existsSync(runtimePath) ? fs.readFileSync(runtimePath, "utf8") : "";
  if (prev !== payload) {
    fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
    fs.writeFileSync(runtimePath, payload, "utf8");
  }
  return { staged: true, path: runtimePath };
}
