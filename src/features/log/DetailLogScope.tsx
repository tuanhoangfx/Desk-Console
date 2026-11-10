import { useMemo, useState, type ReactNode } from "react";

type Change = { before?: string; after?: string; field?: string };
type Entry = { message?: string; changes?: Change[] };

function isBackupPath(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .some((part) => part === "_FolderSyncBackups" || part === ".folder-sync-backup");
}

export function isBackupLogEntry(entry: Entry) {
  const blobs = [entry.message || ""];
  for (const change of entry.changes || []) {
    if (change.before) blobs.push(change.before);
    if (change.after) blobs.push(change.after);
  }
  return blobs.some(isBackupPath);
}

/** Work hides backup copies. All shows the stored rows. */
export function useDetailLogScope<T extends Entry>(entries: T[]) {
  const [scope, setScope] = useState<"work" | "all">("work");
  const shown = useMemo(
    () => (scope === "all" ? entries : entries.filter((entry) => !isBackupLogEntry(entry))),
    [entries, scope],
  );
  return { scope, setScope, shown };
}

export function DetailLogScopeTitle({
  scope,
  onChange,
}: {
  scope: "work" | "all";
  onChange: (scope: "work" | "all") => void;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span>Log</span>
      <span className="inline-flex overflow-hidden rounded-md border border-white/15 text-[10px] font-semibold normal-case tracking-normal">
        <ScopeButton active={scope === "work"} onClick={() => onChange("work")}>
          Work
        </ScopeButton>
        <ScopeButton active={scope === "all"} onClick={() => onChange("all")}>
          All
        </ScopeButton>
      </span>
    </span>
  );
}

export function logActor(
  source: string | undefined,
  label: string,
): { label: string; source: "hub" | "store" | "system" } {
  if (source === "hub" || source === "store" || source === "system") return { label, source };
  return { label, source: "system" };
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`px-1.5 py-0.5 ${active ? "bg-white/15 text-white" : "text-white/55"}`}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
