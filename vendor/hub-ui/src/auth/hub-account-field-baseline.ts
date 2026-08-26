import { HUB_WORKSPACE_USER_EMPTY_EMAIL } from "../shell/hub-chrome-messages";

/** Account chrome display sentinels — matched case-insensitively (except em dash). */
const HUB_ACCOUNT_FIELD_SENTINELS = new Set([
  "not linked",
  "not signed in",
  HUB_WORKSPACE_USER_EMPTY_EMAIL.trim().toLowerCase(),
]);

/**
 * Empty / sentinel display values used in Hub account chrome
 * ("—", "Not linked", "Not signed in").
 */
export function hubAccountFieldBaseline(display: string | null | undefined): string {
  const trimmed = String(display ?? "").trim();
  if (!trimmed || trimmed === "—") return "";
  if (HUB_ACCOUNT_FIELD_SENTINELS.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

export type HubAccountFieldDirtyOptions = {
  /** Compare after lower-casing — for email. Sentinel match still runs on the raw display. */
  normalizeCase?: boolean;
};

/** Compare editable draft vs displayed account field without treating sentinels as real values. */
export function hubAccountFieldDirty(
  draft: string,
  display: string | null | undefined,
  opts?: HubAccountFieldDirtyOptions,
): boolean {
  const baseline = hubAccountFieldBaseline(display);
  if (opts?.normalizeCase) {
    return draft.trim().toLowerCase() !== baseline.toLowerCase();
  }
  return draft.trim() !== baseline;
}
