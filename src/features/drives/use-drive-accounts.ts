import { useCallback, useEffect, useState } from "react";
import { compareDriveCodes } from "../../../host/job-code.mjs";
import { rememberDriveAccountEmails } from "../../lib/job-activity-actor";
import {
  hydrateP0001DrivesMirror,
  readCachedP0001Drives,
  reconcileP0001DrivesDelta,
} from "../../lib/p0001-desk-mirror-store";
import {
  fetchDriveAccountIdentities,
  fetchDriveAccounts,
  fetchDriveInventory,
  type DriveAccount,
} from "../../lib/sync-api";

type StoreState = {
  accounts: DriveAccount[];
  loading: boolean;
  error: string | null;
};

let storeState: StoreState | null = null;
const listeners = new Set<() => void>();
let inflightReload: Promise<void> | null = null;
let hydratedFromIdb = false;
let lastReloadAt = 0;
let pollTimer: number | null = null;
let invTimer: number | null = null;

function getStoreState(): StoreState {
  if (!storeState) {
    const cached = readCachedP0001Drives();
    if (cached.length) rememberDriveAccountEmails(cached);
    storeState = {
      accounts: cached,
      loading: cached.length === 0,
      error: null,
    };
  }
  return storeState;
}

function emitStore(patch: Partial<StoreState>) {
  const prev = getStoreState();
  if (
    (patch.accounts === undefined || patch.accounts === prev.accounts) &&
    (patch.loading === undefined || patch.loading === prev.loading) &&
    (patch.error === undefined || patch.error === prev.error)
  ) {
    return;
  }
  storeState = { ...prev, ...patch };
  for (const fn of listeners) fn();
}

function getPendingInventoryNames(accounts: readonly DriveAccount[]): string[] {
  return accounts
    .filter(
      (account) =>
        !account.deletedAt &&
        account.authorized &&
        account.inventory &&
        (account.inventory.scanning || !account.inventory.scannedAt),
    )
    .map((account) => account.name);
}

async function pullPendingInventories() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  const names = getPendingInventoryNames(getStoreState().accounts);
  if (!names.length) return;
  const rows = await Promise.all(names.map((name) => fetchDriveInventory(name).catch(() => null)));
  const current = getStoreState().accounts;
  const patched = current.map((account) => {
    const hit = rows.find((row) => row && row.name === account.name);
    if (!hit) return account;
    return {
      ...account,
      inventory: hit.inventory,
      fileLog: hit.fileLog,
      contentUpdatedAt: hit.contentUpdatedAt,
    };
  });
  const reconciled = reconcileP0001DrivesDelta(current, patched, { view: "full" });
  if (reconciled.changed) emitStore({ accounts: reconciled.rows });
}

export function reloadDriveAccountsStore(): Promise<void> {
  if (inflightReload) return inflightReload;
  inflightReload = (async () => {
    try {
      const identity = await fetchDriveAccountIdentities().catch(() => null);
      if (identity?.ok && identity.accounts?.length) {
        rememberDriveAccountEmails(identity.accounts);
        const mergedIdentity = reconcileP0001DrivesDelta(
          getStoreState().accounts,
          identity.accounts,
          { view: "identity" },
        );
        emitStore({
          accounts: mergedIdentity.rows,
          loading: false,
        });
      }
      const listed = await fetchDriveAccounts();
      const accounts = listed.accounts || [];
      rememberDriveAccountEmails(accounts);
      const reconciled = reconcileP0001DrivesDelta(getStoreState().accounts, accounts, {
        view: "full",
      });
      lastReloadAt = Date.now();
      emitStore({
        accounts: reconciled.rows,
        loading: false,
        error: listed.ok ? null : listed.error || "Could not load Drive accounts.",
      });
    } catch (e) {
      const current = getStoreState().accounts;
      emitStore({
        accounts: current.length ? current : [],
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      inflightReload = null;
    }
  })();
  return inflightReload;
}

function onStoreVisibilityChange() {
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    if (Date.now() - lastReloadAt > 5_000) void reloadDriveAccountsStore();
  }
}

function attachSubscriber(fn: () => void) {
  const wasEmpty = listeners.size === 0;
  listeners.add(fn);
  if (wasEmpty && typeof window !== "undefined") {
    if (!hydratedFromIdb) {
      hydratedFromIdb = true;
      void hydrateP0001DrivesMirror().then((hydrated) => {
        if (!hydrated.length) return;
        rememberDriveAccountEmails(hydrated);
        const reconciled = reconcileP0001DrivesDelta(getStoreState().accounts, hydrated, {
          mode: "delta",
          persist: false,
        });
        emitStore({
          accounts: reconciled.rows,
          loading: false,
        });
      });
    }
    if (Date.now() - lastReloadAt > 2_500) {
      void reloadDriveAccountsStore();
    }
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reloadDriveAccountsStore();
    }, 60_000);
    invTimer = window.setInterval(() => {
      void pullPendingInventories();
    }, 8_000);
    document.addEventListener("visibilitychange", onStoreVisibilityChange);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && typeof window !== "undefined") {
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (invTimer != null) {
        window.clearInterval(invTimer);
        invTimer = null;
      }
      document.removeEventListener("visibilitychange", onStoreVisibilityChange);
    }
  };
}

export function useDriveAccounts() {
  const [snap, setSnap] = useState<StoreState>(getStoreState);

  useEffect(() => {
    setSnap(getStoreState());
    return attachSubscriber(() => {
      setSnap(getStoreState());
    });
  }, []);

  const reload = useCallback(() => reloadDriveAccountsStore(), []);

  return {
    accounts: snap.accounts,
    loading: snap.loading,
    error: snap.error,
    reload,
  };
}

export function signedInDrives(accounts: DriveAccount[]) {
  return accounts
    .filter((account) => account.authorized && !account.deletedAt)
    .sort((a, b) => compareDriveCodes(a.code, b.code) || a.name.localeCompare(b.name));
}
