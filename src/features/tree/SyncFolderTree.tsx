import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Cloud, FolderOpen, FolderPlus, X } from "lucide-react";
import {
  HubDirectoryColumnHint,
  HubDirectoryCopyText,
  HubDirectoryDateOnlyLabel,
  HubTableColumnHeader,
  HubUsersStatusLabel,
  formatHubTimestampFull,
  type HubDirectoryColumnHintContent,
} from "@tool-workspace/hub-ui";
import { HubFileKindIcon } from "@tool-workspace/hub-ui/file-icons/HubFileKindIcon";
import { FOLDER_OUTLINE_HINTS, folderCompareStatusView } from "../../lib/folder-sync-directory-column-hints";
import { formatDriveBytes } from "../../lib/drive-storage";
import { openJobPath } from "../../lib/open-job-path";
import type { BrowseRow, BrowseSide } from "../../lib/sync-api";
import {
  branchHasLoadedMatch,
  collectLoadedFolderPaths,
  compareOutlineNames,
  computeOutlineVirtualWindow,
  outlineOpenKey,
  readOutlineOpen,
  resolveOutlineSelectedTarget,
  writeOutlineOpen,
} from "../../lib/outline-open-memory.mjs";

type VisibleRow = {
  key: string;
  path: string;
  name: string;
  depth: number;
  kind: BrowseRow["kind"];
  status?: BrowseRow["status"];
  local: BrowseSide;
  remote: BrowseSide;
  folder: boolean;
  expanded: boolean;
  placeholder?: boolean;
};

type Props = {
  mode: "drive" | "job";
  /** Reloads the root when the drive or job changes. */
  resetKey: string;
  load: (dirPath: string) => Promise<BrowseRow[]>;
  /** Hides a row at the level that is already loaded. Parents stay so the branch can open. */
  match?: (row: BrowseRow) => boolean;
  filterKey?: string;
  onSelect?: (dirPath: string, kind: BrowseRow["kind"]) => void;
  className?: string;
  emptyMessage?: string;
  /** Folders to open on this root, parent first. */
  seedExpanded?: string[];
  seedSelected?: string;
  /** Job and Drive files refresh on a timer. A picker does not. */
  live?: boolean;
  treeLabel?: string;
  /** Optional local root path (Job mode) for 1-click Open in Explorer on selected item. */
  localRootPath?: string;
  /** Optional rclone remote spec (`gdrive` or `gdrive:Folder`) for 1-click Open in Drive. */
  remoteSpec?: string;
  /** Show path breadcrumb + Expand/Collapse toolbar (defaults to `live`). */
  showToolbar?: boolean;
  /** Notifies parent when loaded folder cache updates (for Format filter facets). */
  onCacheChange?: (cache: Record<string, BrowseRow[]>) => void;
  /** Optional handler to create a new subfolder directly from the outline toolbar. */
  onCreateFolder?: (parentPath: string, folderName: string) => Promise<string>;
  /** Optional handler to add a folder/file name or `*.ext` pattern directly to the Job's Exclude list. */
  onExcludeToken?: (token: string) => Promise<void> | void;
};

const OUTLINE_ROW_HEIGHT_PX = 26.4;

function statusLabel(status: NonNullable<BrowseRow["status"]>): string {
  return folderCompareStatusView(status)?.label ?? status;
}

function statusTone(status: NonNullable<BrowseRow["status"]>): "online" | "idle" | "offline" | "active" {
  return folderCompareStatusView(status)?.tone ?? "idle";
}

function folderSide(side: BrowseSide, kind: BrowseRow["kind"]) {
  return side?.kind === "folder" || kind === "folder" || kind === "mixed";
}

function sideSize(side: BrowseSide, kind: BrowseRow["kind"]) {
  const folder = folderSide(side, kind);
  if (!side) return "—";
  if (folder && (side.size == null || side.size < 0)) return "—";
  return formatDriveBytes(side.size);
}

/** One size column. Matching sides show that size; a mismatch shows local / Drive. */
function mergedSize(local: BrowseSide, remote: BrowseSide, kind: BrowseRow["kind"]) {
  const left = sideSize(local, kind);
  const right = sideSize(remote, kind);
  if (left === "—" && right === "—") return "—";
  if (left === "—") return right;
  if (right === "—" || left === right) return left;
  return `${left} / ${right}`;
}

function pickLatestModTime(local?: BrowseSide, remote?: BrowseSide): string {
  const left = local?.modTime || "";
  const right = remote?.modTime || "";
  if (!left) return right;
  if (!right) return left;
  const lt = Date.parse(left);
  const rt = Date.parse(right);
  if (Number.isFinite(lt) && Number.isFinite(rt)) {
    return rt >= lt ? right : left;
  }
  return right || left;
}

/** Hub calendar chip `dd/mm/yy` for both files and folders. */
function OutlineDate({ local, remote }: { local?: BrowseSide; remote?: BrowseSide }) {
  const at = pickLatestModTime(local, remote);
  return (
    <span className="fs-outline-metric" title={formatHubTimestampFull(at) || undefined}>
      <HubDirectoryDateOnlyLabel at={at} fallback="—" />
    </span>
  );
}

function OutlineHeading({
  label,
  emoji,
  hint,
}: {
  label: string;
  emoji: string;
  hint: HubDirectoryColumnHintContent;
}) {
  return (
    <HubDirectoryColumnHint content={hint} titleGlyph={{ emoji }}>
      <HubTableColumnHeader label={label} headerEmoji={emoji} showNativeTitle={false} />
    </HubDirectoryColumnHint>
  );
}

function compareRows(a: BrowseRow, b: BrowseRow) {
  const folderDelta = (a.kind === "file" ? 1 : 0) - (b.kind === "file" ? 1 : 0);
  if (folderDelta) return folderDelta;
  return compareOutlineNames(a.name, b.name);
}

/** Goodsync outline (Design V1). Chevron opens a folder. The row selects it. */
export function SyncFolderTree({
  mode,
  resetKey,
  load,
  match,
  filterKey = "",
  onSelect,
  className,
  emptyMessage = "No files in this folder.",
  seedExpanded,
  seedSelected = "",
  live = true,
  treeLabel,
  localRootPath,
  remoteSpec,
  showToolbar,
  onCacheChange,
  onCreateFolder,
  onExcludeToken,
}: Props) {
  const loadRef = useRef(load);
  const matchRef = useRef(match);
  const onSelectRef = useRef(onSelect);
  const onCacheChangeRef = useRef(onCacheChange);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  loadRef.current = load;
  matchRef.current = match;
  onSelectRef.current = onSelect;
  onCacheChangeRef.current = onCacheChange;

  const [cache, setCache] = useState<Record<string, BrowseRow[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const expandedRef = useRef(expanded);
  const [loading, setLoading] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  const loadPath = useCallback(async (dirPath: string, reportError = true) => {
    setLoading((prev) => {
      if (prev.has(dirPath)) return prev;
      const next = new Set(prev);
      next.add(dirPath);
      return next;
    });
    try {
      const rows = await loadRef.current(dirPath);
      setCache((prev) => ({ ...prev, [dirPath]: rows }));
      if (reportError) setError(null);
      return true;
    } catch (e) {
      if (reportError) setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading((prev) => {
        if (!prev.has(dirPath)) return prev;
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });
    }
  }, []);

  const seedKey = (seedExpanded || []).join("\n");

  useEffect(() => {
    const key = outlineOpenKey(mode, resetKey);
    const saved = readOutlineOpen(localStorage, key);
    const seeded = [...new Set([...saved, ...(seedKey ? seedKey.split("\n") : [])])];
    expandedRef.current = new Set(seeded);
    setExpanded(new Set(seeded));
    setCache({});
    setSelected(seedSelected);
    setError(null);
    let cancelled = false;
    void (async () => {
      await loadPath("");
      const alive: string[] = [];
      for (const dirPath of seeded) {
        if (cancelled) return;
        if (await loadPath(dirPath, false)) alive.push(dirPath);
      }
      if (cancelled || alive.length === seeded.length) return;
      expandedRef.current = new Set(alive);
      setExpanded(new Set(alive));
      writeOutlineOpen(localStorage, key, alive);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, resetKey, loadPath, seedKey, seedSelected]);

  useEffect(() => {
    if (!live) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const paths = new Set<string>(["", ...expandedRef.current]);
      for (const dirPath of paths) void loadPath(dirPath);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [resetKey, loadPath, live]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    const updateSize = () => {
      if (scroller.clientHeight > 0) setViewportHeight(scroller.clientHeight);
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(updateSize);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    onCacheChangeRef.current?.(cache);
  }, [cache]);

  const visible = useMemo(() => {
    const activeFilter = Boolean(filterKey && filterKey.replace(/\|/g, "").trim());
    const branchMemo = new Map<string, boolean>();
    function placeholder(path: string, depth: number, name: string): VisibleRow {
      return {
        key: `${path}/${name}`,
        path: `${path}/${name}`,
        name,
        depth,
        kind: "file",
        local: null,
        remote: null,
        folder: false,
        expanded: false,
        placeholder: true,
      };
    }
    function walk(parent: string, depth: number): VisibleRow[] {
      const source = cache[parent] || [];
      const matchFn = matchRef.current;
      const rows = source
        .filter((row) => {
          if (!matchFn) return true;
          if (matchFn(row)) return true;
          if (row.kind !== "file") {
            const path = parent ? `${parent}/${row.name}` : row.name;
            return branchHasLoadedMatch(cache, path, matchFn, branchMemo);
          }
          return false;
        })
        .sort(compareRows);
      const out: VisibleRow[] = [];
      for (const row of rows) {
        const path = parent ? `${parent}/${row.name}` : row.name;
        const folder = row.kind !== "file";
        const autoOpenForMatch =
          folder && activeFilter && matchFn
            ? branchHasLoadedMatch(cache, path, matchFn, branchMemo)
            : false;
        const open = expanded.has(path) || autoOpenForMatch;
        out.push({
          key: path,
          path,
          name: row.name,
          depth,
          kind: row.kind,
          status: row.status,
          local: row.local,
          remote: row.remote,
          folder,
          expanded: open,
        });
        if (!folder || !open) continue;
        if (!cache[path]) {
          out.push(placeholder(path, depth + 1, "Loading…"));
          continue;
        }
        const nested = walk(path, depth + 1);
        if (nested.length) out.push(...nested);
        else out.push(placeholder(path, depth + 1, cache[path].length ? "No match" : "Empty folder"));
      }
      return out;
    }
    return walk("", 0);
  }, [cache, expanded, filterKey]);

  const virtualWin = useMemo(
    () =>
      computeOutlineVirtualWindow(visible.length, scrollTop, viewportHeight, {
        rowHeight: OUTLINE_ROW_HEIGHT_PX,
        overscan: 14,
        threshold: 80,
      }),
    [visible.length, scrollTop, viewportHeight],
  );

  const renderedRows = useMemo(
    () => (virtualWin.windowed ? visible.slice(virtualWin.startIndex, virtualWin.endIndex) : visible),
    [visible, virtualWin],
  );

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !selected) return;
    const idx = visible.findIndex((r) => r.path === selected && !r.placeholder);
    if (idx < 0) return;
    const targetTop = idx * OUTLINE_ROW_HEIGHT_PX;
    if (targetTop < scroller.scrollTop || targetTop > scroller.scrollTop + scroller.clientHeight - OUTLINE_ROW_HEIGHT_PX * 2) {
      scroller.scrollTop = Math.max(0, targetTop - OUTLINE_ROW_HEIGHT_PX);
    }
  }, [selected, visible]);

  function selectRow(row: VisibleRow) {
    if (row.placeholder) return;
    setSelected(row.path);
    onSelectRef.current?.(row.path, row.kind);
  }

  function toggleFolder(row: VisibleRow) {
    if (!row.folder || row.placeholder) return;
    const next = new Set(expandedRef.current);
    if (next.has(row.path)) next.delete(row.path);
    else {
      next.add(row.path);
      if (!cache[row.path]) void loadPath(row.path);
    }
    expandedRef.current = next;
    setExpanded(next);
    writeOutlineOpen(localStorage, outlineOpenKey(mode, resetKey), next);
  }

  const loadedFolderPaths = useMemo(() => collectLoadedFolderPaths(cache), [cache]);

  function expandLoadedFolders() {
    if (!loadedFolderPaths.length) return;
    const next = new Set([...expandedRef.current, ...loadedFolderPaths]);
    for (const dirPath of loadedFolderPaths) {
      if (!cache[dirPath]) void loadPath(dirPath, false);
    }
    expandedRef.current = next;
    setExpanded(next);
    writeOutlineOpen(localStorage, outlineOpenKey(mode, resetKey), next);
  }

  function collapseAllFolders() {
    if (expandedRef.current.size === 0) return;
    const next = new Set<string>();
    expandedRef.current = next;
    setExpanded(next);
    writeOutlineOpen(localStorage, outlineOpenKey(mode, resetKey), []);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  const selectedTarget = useMemo(
    () =>
      resolveOutlineSelectedTarget({
        selectedPath: selected,
        localRootPath,
        remoteSpec,
      }),
    [selected, localRootPath, remoteSpec],
  );

  const selectedRow = useMemo(
    () => (selected ? visible.find((r) => r.path === selected && !r.placeholder) || null : null),
    [selected, visible],
  );

  const selectedBaseName = useMemo(() => {
    if (!selected) return "";
    return selectedRow?.name || selected.split("/").pop() || "";
  }, [selected, selectedRow]);

  const selectedExtPattern = useMemo(() => {
    if (!selectedRow || selectedRow.folder || !selectedBaseName) return "";
    const dot = selectedBaseName.lastIndexOf(".");
    if (dot <= 0 || dot === selectedBaseName.length - 1) return "";
    return `*${selectedBaseName.slice(dot).toLowerCase()}`;
  }, [selectedRow, selectedBaseName]);

  const createParentFolder = useMemo(() => {
    if (!selected) return "";
    if (selectedRow && !selectedRow.folder) {
      return selected.includes("/") ? selected.slice(0, selected.lastIndexOf("/")) : "";
    }
    return selected;
  }, [selected, selectedRow]);

  useEffect(() => {
    if (creatingFolder) {
      newFolderInputRef.current?.focus();
    }
  }, [creatingFolder]);

  async function submitNewFolder() {
    if (!onCreateFolder || createBusy) return;
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setCreateError("Folder name is required.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const createdRel = await onCreateFolder(createParentFolder, trimmed);
      if (createParentFolder) {
        const next = new Set(expandedRef.current);
        next.add(createParentFolder);
        expandedRef.current = next;
        setExpanded(next);
        writeOutlineOpen(localStorage, outlineOpenKey(mode, resetKey), next);
      }
      await loadPath(createParentFolder);
      setSelected(createdRel);
      onSelectRef.current?.(createdRel, "folder");
      setCreatingFolder(false);
      setNewFolderName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateBusy(false);
    }
  }

  const rootLoading = loading.has("") && !cache[""];
  const job = mode === "job";
  const toolbarVisible = showToolbar ?? live;

  return (
    <div className={`fs-outline flex min-h-0 flex-col ${className || ""}`}>
      {toolbarVisible ? (
        <div className="fs-outline-toolbar">
          <div className="fs-outline-breadcrumb">
            <button
              type="button"
              className={`fs-outline-crumb-root${!selected ? " is-active" : ""}`}
              title="Select root folder"
              onClick={() => {
                setSelected("");
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
            >
              /
            </button>
            {selectedTarget.relativePath ? (
              <>
                <div className="min-w-0 flex-1">
                  <HubDirectoryCopyText
                    value={selectedTarget.relativePath}
                    copyToastLabel="Path copied"
                  />
                </div>
                {selectedTarget.localTarget ? (
                  <button
                    type="button"
                    className="folder-sync-path-btn"
                    title={`Open in Explorer: ${selectedTarget.localTarget}`}
                    aria-label="Open selected path in Explorer"
                    onClick={() => void openJobPath("local", selectedTarget.localTarget).catch(() => undefined)}
                  >
                    <FolderOpen size={12} aria-hidden />
                  </button>
                ) : null}
                {selectedTarget.remoteTarget ? (
                  <button
                    type="button"
                    className="folder-sync-path-btn"
                    title={`Open in Google Drive: ${selectedTarget.remoteTarget}`}
                    aria-label="Open selected path in Google Drive"
                    onClick={() => void openJobPath("remote", selectedTarget.remoteTarget).catch(() => undefined)}
                  >
                    <Cloud size={12} aria-hidden />
                  </button>
                ) : null}
              </>
            ) : (
              <span className="fs-outline-crumb-placeholder">Click a folder or file to inspect & copy its path</span>
            )}
          </div>
          <div className="fs-outline-actions">
            {onExcludeToken && selectedBaseName ? (
              <>
                <button
                  type="button"
                  className="fs-outline-action-btn"
                  title={`Add "${selectedBaseName}" to this job's Exclude list`}
                  onClick={() => void onExcludeToken(selectedBaseName)}
                >
                  <Ban size={11} aria-hidden />
                  <span className="truncate max-w-[9rem]">Exclude "{selectedBaseName}"</span>
                </button>
                {selectedExtPattern ? (
                  <button
                    type="button"
                    className="fs-outline-action-btn"
                    title={`Exclude all ${selectedExtPattern} files in this job`}
                    onClick={() => void onExcludeToken(selectedExtPattern)}
                  >
                    <Ban size={11} aria-hidden />
                    <span>Exclude {selectedExtPattern}</span>
                  </button>
                ) : null}
              </>
            ) : null}
            {onCreateFolder ? (
              <button
                type="button"
                className="fs-outline-action-btn"
                title={createParentFolder ? `Create subfolder inside /${createParentFolder}` : "Create folder at root"}
                onClick={() => {
                  setCreatingFolder((v) => !v);
                  setCreateError(null);
                }}
              >
                <FolderPlus size={12} aria-hidden />
                <span>New folder</span>
              </button>
            ) : null}
            <button
              type="button"
              className="fs-outline-action-btn"
              disabled={loadedFolderPaths.length === 0}
              title="Expand loaded folders"
              onClick={expandLoadedFolders}
            >
              <ChevronsUpDown size={12} aria-hidden />
              <span>Expand</span>
            </button>
            <button
              type="button"
              className="fs-outline-action-btn"
              disabled={expanded.size === 0}
              title="Collapse all open folders"
              onClick={collapseAllFolders}
            >
              <ChevronsDownUp size={12} aria-hidden />
              <span>Collapse{expanded.size > 0 ? ` (${expanded.size})` : ""}</span>
            </button>
          </div>
        </div>
      ) : null}
      {creatingFolder && onCreateFolder ? (
        <div className="flex flex-col gap-1 border-b border-white/10 bg-black/35 px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/55 truncate max-w-[12rem]" title={`/${createParentFolder}`}>
              In: /{createParentFolder}
            </span>
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              disabled={createBusy}
              placeholder="New folder name…"
              className="min-w-0 flex-1 rounded border border-white/15 bg-white/[0.06] px-2 py-1 text-xs text-white placeholder:text-white/35 focus:border-sky-400/60 focus:outline-none"
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  void submitNewFolder();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setCreatingFolder(false);
                  setCreateError(null);
                }
              }}
            />
            <button
              type="button"
              disabled={createBusy || !newFolderName.trim()}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40"
              title="Create folder"
              aria-label="Create folder"
              onClick={() => void submitNewFolder()}
            >
              <Check size={12} aria-hidden />
            </button>
            <button
              type="button"
              disabled={createBusy}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              title="Cancel"
              aria-label="Cancel"
              onClick={() => {
                setCreatingFolder(false);
                setCreateError(null);
              }}
            >
              <X size={12} aria-hidden />
            </button>
          </div>
          {createError ? <span className="text-xs text-rose-300">{createError}</span> : null}
        </div>
      ) : null}
      {rootLoading ? <p className="fs-outline-note">Loading folder…</p> : null}
      {error ? <p className="fs-outline-note is-error">{error}</p> : null}
      <div
        ref={scrollRef}
        className="fs-outline-scroll"
        role="tree"
        aria-label={treeLabel || (job ? "Job folders" : "Drive folders")}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="fs-outline-line is-caption">
          <div className="fs-outline-namebox is-caption">
            <OutlineHeading label="Name" emoji="📁" hint={FOLDER_OUTLINE_HINTS.name} />
          </div>
          <span className="fs-outline-metric is-head">
            <OutlineHeading label="Size" emoji="💾" hint={FOLDER_OUTLINE_HINTS.size} />
          </span>
          <span className="fs-outline-metric is-head">
            <OutlineHeading label="Date" emoji="🔄" hint={FOLDER_OUTLINE_HINTS.date} />
          </span>
        </div>
        {visible.length === 0 && !rootLoading ? <p className="fs-outline-note">{emptyMessage}</p> : null}
        {virtualWin.topPadPx > 0 ? (
          <div className="fs-outline-spacer" style={{ height: virtualWin.topPadPx }} aria-hidden />
        ) : null}
        {renderedRows.map((row) => (
          <div
            key={row.key}
            className={`fs-outline-line${selected === row.path ? " is-selected" : ""}${row.placeholder ? " is-placeholder" : ""}`}
            role="treeitem"
            aria-expanded={row.folder ? row.expanded : undefined}
            aria-selected={selected === row.path}
            onClick={() => selectRow(row)}
          >
            <div className="fs-outline-namebox" style={{ paddingLeft: row.depth * 16 }}>
              {row.folder ? (
                <button
                  type="button"
                  className="fs-outline-twist"
                  aria-label={row.expanded ? "Collapse folder" : "Expand folder"}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFolder(row);
                  }}
                >
                  {row.expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                </button>
              ) : (
                <span className="fs-outline-twist" />
              )}
              {row.placeholder ? (
                <span className="fs-outline-ico" />
              ) : (
                <HubFileKindIcon name={row.name} folder={row.folder} open={row.expanded} />
              )}
              <span className="fs-outline-name">{row.name}</span>
              {job && !row.placeholder && row.status ? (
                <HubUsersStatusLabel
                  label={statusLabel(row.status)}
                  tone={statusTone(row.status)}
                  capitalize={false}
                  className="ml-auto shrink-0"
                />
              ) : null}
            </div>
            <span className="fs-outline-metric" title={row.placeholder ? undefined : job ? mergedSize(row.local, row.remote, row.kind) : undefined}>
              {row.placeholder ? "" : job ? mergedSize(row.local, row.remote, row.kind) : sideSize(row.remote || row.local, row.kind)}
            </span>
            {row.placeholder ? <span className="fs-outline-metric" /> : <OutlineDate local={row.local} remote={row.remote} />}
          </div>
        ))}
        {virtualWin.bottomPadPx > 0 ? (
          <div className="fs-outline-spacer" style={{ height: virtualWin.bottomPadPx }} aria-hidden />
        ) : null}
      </div>
    </div>
  );
}
