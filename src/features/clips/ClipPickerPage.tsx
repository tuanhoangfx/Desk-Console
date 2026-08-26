import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste, Pin } from "lucide-react";
import { HubSearchField } from "@tool-workspace/hub-ui";
import { deskApi, type ClipRow } from "../../lib/api";

type PickerSnap = {
  rows?: ClipRow[];
  labels?: { picker?: string; capture?: string };
};

function hintFrom(labels?: { picker?: string }) {
  return labels?.picker ? `${labels.picker} · Enter paste · Esc close` : "Enter paste · Esc close";
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
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(() => hintFrom(boot?.labels));

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = q
      ? rows.filter((row) => `${row.name || ""} ${row.text}`.toLowerCase().includes(q))
      : rows.slice();
    const samples = next.filter((row) => row.kind === "sample");
    const history = next.filter((row) => row.kind !== "sample");
    return [...samples, ...history];
  }, [query, rows]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const paste = async (row: ClipRow) => {
    try {
      if (window.deskConsole?.pasteClip) await window.deskConsole.pasteClip(row.id);
      else await deskApi.pasteClip(row.id);
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

  let lastKind = "";

  return (
    <div className="hub-app theme-hub flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="desk-picker-drag shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardPaste size={16} className="text-emerald-300" aria-hidden />
          <h1 className="text-sm font-semibold">Paste</h1>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      </header>
      <div className="shrink-0 px-4 py-3">
        <HubSearchField
          value={query}
          onChange={setQuery}
          placeholder="Search history and samples…"
          showShortcutHint={false}
          modalSearch
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {error ? <p className="px-2 text-xs text-rose-300">{error}</p> : null}
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-sm text-[var(--muted)]">Copy with Ctrl+C, or add a sample in Clips.</p>
        ) : (
          filtered.map((row, i) => {
            const kind = row.kind === "sample" ? "sample" : "history";
            const showHead = kind !== lastKind;
            lastKind = kind;
            return (
              <div key={row.id}>
                {showHead ? (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {kind === "sample" ? "Samples" : "History"}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void paste(row)}
                  onMouseEnter={() => setIndex(i)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    i === index ? "bg-indigo-500/20 text-[var(--text)]" : "text-[var(--text)] hover:bg-white/5"
                  }`}
                >
                  {kind === "sample" ? (
                    <Pin size={13} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
                  ) : (
                    <ClipboardPaste size={13} className="mt-0.5 shrink-0 text-sky-300" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{preview(row)}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
