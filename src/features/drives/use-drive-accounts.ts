import { useCallback, useEffect, useState } from "react";
import { compareDriveCodes } from "../../../host/job-code.mjs";
import { rememberDriveAccountEmails } from "../../lib/job-activity-actor";
import {
  fetchDriveAccountIdentities,
  fetchDriveAccounts,
  fetchDriveInventory,
  type DriveAccount,
} from "../../lib/sync-api";

const DRIVE_IDENTITY_CACHE = "p0009.drive-account-identity";

function readCachedIdentities(): DriveAccount[] {
  try {
    const raw = localStorage.getItem(DRIVE_IDENTITY_CACHE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row.name === "string") : [];
  } catch {
    return [];
  }
}

function rememberIdentities(accounts: readonly DriveAccount[]) {
  const slim = accounts.map((account) => ({
    name: account.name,
    code: account.code,
    authorized: account.authorized,
    email: account.email,
    displayName: account.displayName,
    deletedAt: account.deletedAt || null,
  }));
  try {
    localStorage.setItem(DRIVE_IDENTITY_CACHE, JSON.stringify(slim));
  } catch {
    /* quota — the next fetch still fills memory */
  }
  rememberDriveAccountEmails(accounts);
}

/** Keep inventory already on screen while a name/email refresh lands first. */
function mergeDriveIdentity(prev: DriveAccount[], identity: DriveAccount[]): DriveAccount[] {
  const byName = new Map(prev.map((account) => [account.name, account]));
  return identity.map((next) => {
    const old = byName.get(next.name);
    if (!old) return next;
    return {
      ...old,
      code: next.code || old.code,
      authorized: next.authorized,
      email: next.email || old.email,
      displayName: next.displayName || old.displayName,
      deletedAt: next.deletedAt ?? null,
    };
  });
}

type StoreState = {
  accounts: DriveAccount[];
  loading: boolean;
  error: string | null;
};

let storeState: StoreState | null = null;
const listeners = new Set<() => void>();
let inflightReload: Promise<void> | null = null;
let lastReloadAt = 0;
let pollTimer: number | null = null;
let invTimer: number | null = null;

function getStoreState(): StoreState {
  if (!storeState) {
    const cached = readCachedIdentities();
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
  let changed = false;
  const next = current.map((account) => {
    const hit = rows.find((row) => row && row.name === account.name);
    if (!hit) return account;
    changed = true;
    return {
      ...account,
      inventory: hit.inventory,
      fileLog: hit.fileLog,
      contentUpdatedAt: hit.contentUpdatedAt,
    };
  });
  if (changed) emitStore({ accounts: next });
}

export function reloadDriveAccountsStore(): Promise<void> {
  if (inflightReload) return inflightReload;
  inflightReload = (async () => {
    try {
      const identity = await fetchDriveAccountIdentities().catch(() => null);
      if (identity?.ok && identity.accounts?.length) {
        rememberIdentities(identity.accounts);
        emitStore({
          accounts: mergeDriveIdentity(getStoreState().accounts, identity.accounts),
          loading: false,
        });
      }
      const listed = await fetchDriveAccounts();
      const accounts = listed.accounts || [];
      rememberIdentities(accounts);
      lastReloadAt = Date.now();
      emitStore({
        accounts,
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
