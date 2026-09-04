import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import {
  HubModalCloseButton,
  HubModalDirectoryFilterBar,
  HubResultCount,
  useDirectorySearchQuery,
  type FilterValues,
} from "@tool-workspace/hub-ui";
import { deskApi, type ClipRow } from "../../lib/api";
import {
  clipPickerStatus,
  clipPickerStatusFilterDef,
  matchesClipPickerStatus,
} from "./clip-picker-filters";

const PICKER_LIST_CAP = 80;

type PickerSnap = {
  rows?: ClipRow[];
  labels?: { picker?: string };
};

function hintFrom(labels?: { picker?: string }) {
  return labels?.picker
    ? `${labels.picker} · Click paste at caret · Shift+click copy · Esc close`
    : "Click paste at caret · Shift+click copy · Esc close";
}

function readBridgeSnap(): PickerSnap | null {
  try {
    return window.deskConsole?.pickerSnapshot?.() ?? null;
  } catch {
    return null;
  }
}

function closePicker() {
  window.deskConsole?.closePicker?.();
}

function preview(row: ClipRow) {
  return (row.name || row.text).replace(/\s+/g, " ").trim().slice(0, 88) || "(empty)";
}

export function ClipPickerPage() {
  const boot = typeof window !== "undefined" ? readBridgeSnap() : null;
  const [rows, setRows] = useState<ClipRow[]>(() => boot?.rows ?? []);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(() => hintFrom(boot?.labels));
  const search = useDirectorySearchQuery({ live: true });

  const applySnap = (data: PickerSnap | null | undefined) => {
    if (!data) return;
    if (Array.isArray(data.rows)) {
      setRows(data.rows);
      setError(null);
    }
    if (data.labels?.picker) setHint(hintFrom(data.labels));
  };

  useEffect(() => {
    const unsub = window.deskConsole?.onPickerData?.(applySnap);
    applySnap(readBridgeSnap());
    if (window.deskConsole?.pickerSnapshot) return () => unsub?.();

    const load = () => {
      void deskApi
        .clips()
        .then((data) => {
          setRows(data.rows);
          setError(null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : String(err)));
      void deskApi
        .hotkeys()
        .then((data) => setHint(hintFrom(data.labels)))
        .catch(() => {});
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const statusFilter = useMemo(() => clipPickerStatusFilterDef(), []);

  const filtered = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    return rows
      .filter((row) => matchesClipPickerStatus(row, filterValues))
      .filter((row) => !q || `${row.name || ""} ${row.text}`.toLowerCase().includes(q))
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
      .slice(0, PICKER_LIST_CAP);
  }, [filterValues, rows, search.query]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const copy = async (row: ClipRow) => {
    try {
      setError(null);
      if (window.deskConsole?.copyClip) {
        const result = await window.deskConsole.copyClip(row.id, row.text);
        if (!result?.copied) {
          setError(result?.error || "Could not copy clip");
        }
        return;
      }
      await deskApi.copyClip(row.id);
      closePicker();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const paste = async (row: ClipRow) => {
    try {
      setError(null);
      if (window.deskConsole?.pasteClip) {
        const result = await window.deskConsole.pasteClip(row.id, row.text);
        if (!result?.pasted) {
          setError(result?.error || "Could not paste to previous window");
        }
        return;
      }
      await deskApi.armPicker();
      const result = await deskApi.pasteClip(row.id);
      if (!result.pasted) {
        setError(result.error || "Could not paste to previous window");
        return;
      }
      closePicker();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const row = filtered[index];
        if (row) {
          e.preventDefault();
          void paste(row);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, index]);

  return (
    <div className="hub-app theme-hub flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="hub-modal-frame desk-picker-frame relative flex min-h-0 flex-1 flex-col">
        <header className="desk-picker-drag relative shrink-0 border-b border-white/10 px-4 py-3 pr-12">
          <HubModalCloseButton
            onClose={closePicker}
            className="desk-picker-close desk-picker-no-drag"
            aria-label="Close paste picker"
          />
          <div className="flex items-center gap-2">
            <ClipboardPaste size={16} className="text-emerald-300" aria-hidden />
            <h1 className="text-sm font-semibold">Paste</h1>
            {typeof window !== "undefined" && window.deskConsole?.isDev ? (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                Dev
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
        </header>
        <div className="desk-picker-no-drag shrink-0 border-b border-white/10 px-2 py-2">
          <HubModalDirectoryFilterBar
            shortcutScope="desk-clip-picker"
            layout="hub"
            placeholder="Search clips…"
            filters={[statusFilter]}
            values={filterValues}
            onValuesChange={setFilterValues}
            query={search.queryInput}
            onQueryChange={search.setQueryInput}
            queryPending={search.queryPending}
            toolbar={
              <HubResultCount shown={filtered.length} total={rows.length} label="clips" icon={ClipboardPaste} />
            }
          />
        </div>
        <div className="desk-picker-no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1">
          {error ? (
            <div
              className="mx-2 mb-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-sm text-[var(--muted)]">Copy with Ctrl+C, or add a sample in Clips.</p>
          ) : (
            filtered.map((row, i) => (
              <button
                key={row.id}
                type="button"
                onClick={(event) => {
                  if (event.shiftKey) void copy(row);
                  else void paste(row);
                }}
                onMouseEnter={() => setIndex(i)}
                className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  i === index ? "bg-indigo-500/20 text-[var(--text)]" : "text-[var(--text)] hover:bg-white/5"
                }`}
              >
                <ClipboardPaste
                  size={13}
                  className={`mt-0.5 shrink-0 ${clipPickerStatus(row) === "Sample" ? "text-amber-300" : "text-sky-300"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{preview(row)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
