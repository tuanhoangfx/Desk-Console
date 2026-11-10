/** Extract rclone remote name from `gdrive:path` / `gdrive:`. */
export function remoteNameFromSpec(remote: string, fallback = "gdrive"): string {
  const raw = String(remote || "").trim();
  if (!raw) return fallback;
  const colon = raw.indexOf(":");
  const name = (colon >= 0 ? raw.slice(0, colon) : raw).replace(/:$/, "").trim();
  return name || fallback;
}

/** Path after `remote:` — empty means the Drive root. */
export function remotePathFromSpec(remote: string): string {
  const raw = String(remote || "").trim();
  const colon = raw.indexOf(":");
  if (colon < 0) return "";
  return raw
    .slice(colon + 1)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

type DrivePathAccount = { name: string; code?: string | null; email?: string | null; displayName?: string | null };

/** Format a compact Drive account label: `GG0001 · Tuấn Hoàng` or `GG0001 · email`. */
export function formatDriveAccountOptionLabel(account: DrivePathAccount): string {
  const code = String(account.code || "").trim();
  const displayName = String(account.displayName || "").trim();
  const email = String(account.email || "").trim();
  const identity = displayName || email || account.name;
  if (code && identity && code !== identity) return `${code} · ${identity}`;
  return code || identity || account.name;
}

/** Full tooltip for a Drive account option (`GG0001 · Tuấn Hoàng (email)`). */
export function formatDriveAccountOptionTip(account: DrivePathAccount): string {
  const base = formatDriveAccountOptionLabel(account);
  const email = String(account.email || "").trim();
  if (email && !base.includes(email)) return `${base} (${email})`;
  return base;
}

export const LAST_USED_DRIVE_REMOTE_KEY = "p0009_last_used_drive_remote_v1";

/** Return the most recently used Drive remote name if still signed-in, else the first ready Drive. */
export function readLastUsedDriveRemote(readyDriveNames: readonly string[], fallback = "gdrive"): string {
  try {
    const saved = String(globalThis.localStorage?.getItem(LAST_USED_DRIVE_REMOTE_KEY) || "").trim();
    if (saved && readyDriveNames.includes(saved)) return saved;
  } catch {
    /* ignore storage errors */
  }
  return readyDriveNames[0] || fallback;
}

/** Persist the selected Drive remote name so New Job preselects it next time. */
export function writeLastUsedDriveRemote(remoteOrName: string): void {
  const name = remoteNameFromSpec(remoteOrName, "");
  if (!name) return;
  try {
    globalThis.localStorage?.setItem(LAST_USED_DRIVE_REMOTE_KEY, name);
  } catch {
    /* ignore storage errors */
  }
}

/** Detail line: `GG0001 · email/Folder` — same shape as the Local path field. */
export function formatDrivePath(remote: string, accounts: readonly DrivePathAccount[]): string {
  const name = remoteNameFromSpec(remote, "");
  const folder = remotePathFromSpec(remote);
  const account = accounts.find((item) => item.name === name);
  const code = String(account?.code || "").trim();
  const baseWho = (account?.displayName || account?.email || name).trim();
  const who = code && baseWho && code !== baseWho ? `${code} · ${baseWho}` : code || baseWho;
  if (!who) return folder;
  return folder ? `${who}/${folder}` : who;
}

/** Inverse of `formatDrivePath`. A value with no slash stays a folder on the current Drive. */
export function parseDrivePath(text: string, accounts: readonly DrivePathAccount[], fallbackName: string): string {
  const raw = text.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const fallback = fallbackName.replace(/:$/, "").trim() || "gdrive";
  if (!raw) return joinRemoteSpec(fallback, "");
  const slash = raw.indexOf("/");
  const rawHead = (slash >= 0 ? raw.slice(0, slash) : raw).trim();
  const head = rawHead.replace(/^GG\d+\s*·\s*/i, "").trim();
  const codePrefixMatch = /^(GG\d+)\b/i.exec(rawHead);
  const headCode = codePrefixMatch ? codePrefixMatch[1]!.toUpperCase() : "";
  const folder = slash >= 0 ? raw.slice(slash + 1).replace(/^\/+|\/+$/g, "") : "";
  const account = accounts.find(
    (item) =>
      item.name === head ||
      item.name === rawHead ||
      (headCode && String(item.code || "").toUpperCase() === headCode) ||
      item.email === head ||
      item.displayName === head,
  );
  if (account) return joinRemoteSpec(account.name, folder);
  if (slash < 0) return joinRemoteSpec(fallback, head);
  if (head.includes("@")) return joinRemoteSpec(fallback, folder);
  return joinRemoteSpec(head || fallback, folder);
}

export function joinRemoteSpec(name: string, dirPath: string): string {
  const clean = String(name || "gdrive").replace(/:$/, "").trim() || "gdrive";
  const rel = String(dirPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return rel ? `${clean}:${rel}` : `${clean}:`;
}
