export type HubAuthToolInfo = {
  code?: string;
  name: string;
  tagline?: string;
};

/** One-line tool metadata under the welcome title (e.g. P0020 · Data Box — Notes, cookies & 2FA). */
export function formatHubAuthToolInfo(info: HubAuthToolInfo): string {
  const head = [info.code, info.name].filter(Boolean).join(" · ");
  if (!head) return info.tagline ?? "";
  return info.tagline ? `${head} — ${info.tagline}` : head;
}
