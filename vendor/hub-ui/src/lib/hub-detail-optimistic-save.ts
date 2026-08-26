/**
 * Hub Detail Save SSOT — optimistic local apply; never hold Saving… on cloud RTT.
 *
 * Contract (all P00xx Detail / Member / Team Save):
 * 1. Validate locally (sync) — fail before busy if invalid.
 * 2. `setBusy(true)` only for the sync local apply window.
 * 3. `applyLocal()` — patch state, log, toast, stay-open create→edit.
 * 3b. `reseedHubDetailDraftAfterSave()` — re-seed form draft/baseline so Save disables (same turn).
 * 4. `setBusy(false)` immediately after local apply.
 * 5. `void persistCloud()` — network / Supabase in background; surface errors via `onCloudError`.
 *
 * Exceptions (document at call site):
 * - Create that must mint a **server PK before any local row** may await insert once,
 *   then applyLocal with the real id (prefer temp-* + replace when stay-open).
 * - Destructive confirm pipelines may keep busy until the user-visible leave animation ends.
 */
export type HubDetailOptimisticSaveOptions = {
  setBusy: (busy: boolean) => void;
  /** Sync or async local apply — must not await cloud. */
  applyLocal: () => void | Promise<void>;
  /** Cloud / remote persist — always fired in background after busy clears. */
  persistCloud: () => Promise<void>;
  onLocalError?: (err: unknown) => void;
  onCloudError?: (err: unknown) => void;
};

export async function runHubDetailOptimisticSave(
  opts: HubDetailOptimisticSaveOptions,
): Promise<"ok" | "local-error"> {
  opts.setBusy(true);
  try {
    await opts.applyLocal();
  } catch (err) {
    opts.onLocalError?.(err);
    opts.setBusy(false);
    return "local-error";
  }
  opts.setBusy(false);
  void opts.persistCloud().catch((err) => {
    opts.onCloudError?.(err);
  });
  return "ok";
}

/**
 * Hub Detail Save step 3b — re-seed form draft/baseline from the persisted row so `dirty` clears
 * and Save disables in the same turn as optimistic apply (Vault baseline ref, Team useState, …).
 * Call inside `applyLocal` immediately after patching display/list state.
 */
export function reseedHubDetailDraftAfterSave<TSaved, TDraft>(
  saved: TSaved,
  buildDraftFromSaved: (saved: TSaved) => TDraft,
  applyDraft: (draft: TDraft) => void,
): void {
  applyDraft(buildDraftFromSaved(saved));
}

/** Seat / row ids minted client-side before cloud insert (Member create→edit). */
export function isHubTempEntityId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("temp-"));
}
