/**
 * Hub multiline draft SSOT — Note rail, Plan Note, Remark, Order Details, Team Note.
 *
 * - **Draft dirty** (`isHubMultilineDraftDirty`): raw normalized compare — guards hydrate/sync
 *   while typing (Enter newlines must not clobber draft).
 * - **Persist dirty** (`isHubMultilinePersistDirty`): trim before compare — Save button / cloud.
 * - **Persist** (`persistHubMultilineDraftText`): trim outer whitespace on save; keeps internal newlines.
 * - **Read** (`readHubMultilinePersistedText`): load from DB without trimming stored body.
 */

export function normalizeHubMultilineDraftText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n");
}

/** Load persisted multiline into an editor — preserve body, normalize line endings only. */
export function readHubMultilinePersistedText(value: string | null | undefined): string {
  return normalizeHubMultilineDraftText(value);
}

/** Value written to DB / API — trim outer whitespace; internal newlines kept. */
export function persistHubMultilineDraftText(value: string): string {
  return normalizeHubMultilineDraftText(value).trim();
}

/** True while draft differs in-editor (incl. trailing newlines mid-edit). */
export function isHubMultilineDraftDirty(draft: string, persisted: string | null | undefined): boolean {
  return normalizeHubMultilineDraftText(draft) !== normalizeHubMultilineDraftText(persisted);
}

/** True when trimmed persist payload would change — Save / cloud delta. */
export function isHubMultilinePersistDirty(draft: string, persisted: string | null | undefined): boolean {
  return persistHubMultilineDraftText(draft) !== persistHubMultilineDraftText(persisted ?? "");
}
