import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import {
  HUB_DIRECTORY_ROW_PINNED_CLASS,
  HUB_FILTER_OPTION_EMOJI_CLASS,
  HubDirectoryRowPinButton,
  HubModalCloseButton,
  HubModalDirectoryFilterBar,
  HubResultCount,
  searchTextIncludes,
  setHubActiveScreen,
  useDirectorySearchQuery,
  type FilterValues,
} from "@tool-workspace/hub-ui";
import { deskApi, resolveClipImageSrc, type ClipRow } from "../../lib/api";
import { DESK_SCREEN_TITLE_EMOJI } from "../desk/desk-directory-stickers";
import {
  clipFormatEmoji,
  clipPickerFormat,
  clipPickerFormatFilterDef,
  clipPickerStatusFilterDef,
  matchesClipPickerFormat,
  matchesClipPickerStatus,
} from "./clip-picker-filters";

const PICKER_LIST_CAP = 80;
const PICKER_SHORTCUT_SCOPE = "desk-clip-picker";

type PickerSnap = {
  rows?: ClipRow[];
  labels?: { picker?: string };
};

function hintFrom(labels?: { picker?: string }) {
  return labels?.picker
    ? `${labels.picker} · Click / Enter paste · F search · Space preview · Shift+click copy · Esc close`
    : "Click / Enter paste · F search · Space preview · Shift+click copy · Esc close";
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
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [spacePreviewId, setSpacePreviewId] = useState<string | null>(null);
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
    setHubActiveScreen(PICKER_SHORTCUT_SCOPE);
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
    }
    const unsub = window.deskConsole?.onPickerData?.((snap) => {
      setHubActiveScreen(PICKER_SHORTCUT_SCOPE);
      applySnap(snap);
    });
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
      if (document.visibilityState === "visible") {
        setHubActiveScreen(PICKER_SHORTCUT_SCOPE);
        load();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const statusFilter = useMemo(() => clipPickerStatusFilterDef(rows), [rows]);
  const formatFilter = useMemo(() => clipPickerFormatFilterDef(rows), [rows]);

  const filtered = useMemo(() => {
    const q = search.query.trim();
    return rows
      .filter((row) => matchesClipPickerStatus(row, filterValues))
      .filter((row) => matchesClipPickerFormat(row, filterValues))
      .filter((row) => !q || searchTextIncludes(`${row.name || ""} ${row.text}`, q))
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
      })
      .slice(0, PICKER_LIST_CAP);
  }, [filterValues, rows, search.query]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const activePreviewRow = useMemo(() => {
    const targetId = spacePreviewId || hoveredImageId;
    if (!targetId) return null;
    return filtered.find((r) => r.id === targetId && Boolean(resolveClipImageSrc(r))) ?? null;
  }, [filtered, hoveredImageId, spacePreviewId]);

  const togglePin = async (row: ClipRow) => {
    const nextPinned = !row.pinned;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, pinned: nextPinned } : r)));
    try {
      if (window.deskConsole?.pinClip) {
        const res = await window.deskConsole.pinClip(row.id, nextPinned);
        if (!res?.ok) {
          setError(res?.error || "Could not update pin");
        }
        return;
      }
      await deskApi.pinClip(row.id, nextPinned);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copy = async (row: ClipRow) => {
    try {
      setError(null);
      if (window.deskConsole?.copyClip) {
        const result = await window.deskConsole.copyClip(row.id, row.text, row.imageDataUrl);
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
        const result = await window.deskConsole.pasteClip(row.id, row.text, row.imageDataUrl);
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
      const targetEl = e.target as HTMLElement | null;
      const inInput = Boolean(
        targetEl && (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA" || targetEl.isContentEditable),
      );
      if (e.key === "Escape") {
        if (spacePreviewId) {
          e.preventDefault();
          setSpacePreviewId(null);
          return;
        }
        if (inInput && targetEl) {
          e.preventDefault();
          targetEl.blur();
          return;
        }
        e.preventDefault();
        closePicker();
        return;
      }
      if (!inInput && e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const row = filtered[index];
        if (resolveClipImageSrc(row)) {
          e.preventDefault();
          setSpacePreviewId((cur) => (cur === row.id ? null : row.id));
          return;
        }
      }
      if (!inInput && (e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector<HTMLInputElement>(
          '.desk-picker-frame input[role="searchbox"], .desk-picker-frame input[name="hub-directory-search"]',
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
          return;
        }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => {
          const next = Math.min(i + 1, Math.max(filtered.length - 1, 0));
          if (spacePreviewId) {
            const nextRow = filtered[next];
            setSpacePreviewId(resolveClipImageSrc(nextRow) ? nextRow.id : null);
          }
          return next;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => {
          const next = Math.max(i - 1, 0);
          if (spacePreviewId) {
            const nextRow = filtered[next];
            setSpacePreviewId(resolveClipImageSrc(nextRow) ? nextRow.id : null);
          }
          return next;
        });
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
  }, [filtered, index, spacePreviewId]);

  return (
    <div className="hub-app theme-hub desk-picker-root flex h-full min-h-0 flex-col overflow-hidden bg-[var(--panel)] p-2.5 text-[var(--text)]">
      <div className="hub-modal-frame desk-picker-frame relative flex min-h-0 flex-1 flex-col">
        <HubModalCloseButton
          onClose={closePicker}
          className="desk-picker-close desk-picker-no-drag"
          aria-label="Close paste picker"
        />
        <div className="desk-picker-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/15 bg-[var(--panel)]">
          <header className="desk-picker-drag relative shrink-0 border-b border-white/10 px-4 py-2.5 pr-9">
            <div className="flex items-center gap-2">
              <span className={`${HUB_FILTER_OPTION_EMOJI_CLASS} text-sm leading-none`} aria-hidden>
                {DESK_SCREEN_TITLE_EMOJI.clips}
              </span>
              <h1 className="text-sm font-semibold">Paste</h1>
              {typeof window !== "undefined" && window.deskConsole?.isDev ? (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-200">
                  Dev
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
          </header>
          <div className="desk-picker-no-drag shrink-0 border-b border-white/10 px-2.5 py-2">
            <HubModalDirectoryFilterBar
              shortcutScope={PICKER_SHORTCUT_SCOPE}
              placeholder="Search clips…"
              filters={[statusFilter, formatFilter]}
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
          <div className="desk-picker-no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-2.5 pt-1">
            {error ? (
              <div
                className="mx-2 mb-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--muted)]">
                Copy text or image with Ctrl+C, or add a sample in Clips.
              </p>
            ) : (
              filtered.map((row, i) => {
                const imgSrc = resolveClipImageSrc(row);
                const isImage = Boolean(imgSrc);
                const fmtLabel = clipPickerFormat(row);
                const fmtEmoji = clipFormatEmoji(fmtLabel);
                return (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      if (event.shiftKey) void copy(row);
                      else void paste(row);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void paste(row);
                      }
                    }}
                    onMouseEnter={() => setIndex(i)}
                    className={`desk-picker-row flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm ${
                      row.pinned ? HUB_DIRECTORY_ROW_PINNED_CLASS : ""
                    } ${i === index ? "bg-indigo-500/20 text-[var(--text)]" : "text-[var(--text)] hover:bg-white/5"}`}
                  >
                    <span
                      className={`${HUB_FILTER_OPTION_EMOJI_CLASS} shrink-0 text-xs leading-none`}
                      title={fmtLabel}
                      aria-hidden
                    >
                      {fmtEmoji}
                    </span>
                    {isImage ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <img
                          src={imgSrc}
                          alt={preview(row)}
                          loading="lazy"
                          decoding="async"
                          onMouseEnter={() => setHoveredImageId(row.id)}
                          onMouseLeave={() => setHoveredImageId((cur) => (cur === row.id ? null : cur))}
                          title="Hover or press Space to preview larger image"
                          className="h-10 w-14 shrink-0 rounded border border-white/15 bg-black/40 object-contain"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{preview(row)}</span>
                      </div>
                    ) : (
                      <span className="min-w-0 flex-1 truncate">{preview(row)}</span>
                    )}
                    <HubDirectoryRowPinButton
                      pinned={Boolean(row.pinned)}
                      itemNoun="clip"
                      onToggle={() => void togglePin(row)}
                    />
                  </div>
                );
              })
            )}
          </div>
          {activePreviewRow ? (
            <div
              className="desk-picker-preview pointer-events-none absolute inset-x-2.5 bottom-2.5 z-30 rounded-lg border border-indigo-400/35 bg-[#070b16] p-2"
              role="region"
              aria-label="Image clip preview"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-1.5 font-medium text-slate-200">
                  <span className={HUB_FILTER_OPTION_EMOJI_CLASS} aria-hidden>
                    🖼️
                  </span>
                  <span className="truncate">{preview(activePreviewRow)}</span>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {spacePreviewId ? "Space / Esc close" : "Hover preview"}
                </span>
              </div>
              <img
                src={resolveClipImageSrc(activePreviewRow)}
                alt={preview(activePreviewRow)}
                decoding="async"
                className="max-h-56 w-full rounded border border-white/10 bg-black/60 object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
