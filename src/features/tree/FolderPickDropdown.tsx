import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, FolderPlus, X } from "lucide-react";
import {
  HUB_FILTER_DROPDOWN_TRIGGER_COMPACT_TYPO_CLASS,
  HubAdmInlineFieldLabel,
  HubSingleFilterDropdown,
  buildHubAdmDetailCopyTrailingAction,
  mergeHubAdmTrailingActions,
  type FilterOption,
} from "@tool-workspace/hub-ui";
import { ancestorPaths } from "../../lib/folder-pick.mjs";
import type { BrowseRow } from "../../lib/sync-api";
import { SyncFolderTree } from "./SyncFolderTree";

export type FolderRootOption = {
  value: string;
  label: string;
  emoji?: string;
  detail?: string;
  tip?: string;
};

type Props = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  resetKey: string;
  selectedPath: string;
  seedExpanded: string[];
  load: (dirPath: string) => Promise<BrowseRow[]>;
  onSelectFolder: (dirPath: string) => void;
  rootOptions?: FolderRootOption[];
  activeRoot?: string;
  onSelectRoot?: (rootValue: string) => void;
  onCreateFolder?: (parentPath: string, folderName: string) => Promise<string>;
};

/**
 * Dropdown-style field for `Local` and `Drive` in Job Detail & New Job modals.
 * Clicking anywhere on the data opens the folder tree dropdown (chevron sits right beside the text, matching HubAdmClickFilterField).
 */
export function FolderDropdownField({
  header,
  fieldLabel,
  value,
  placeholder,
  expanded,
  disabled = false,
  onToggle,
  trailingAction,
}: {
  header: { label: string; headerEmoji?: string };
  fieldLabel: string;
  value: string;
  placeholder?: string;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  trailingAction?: ReactNode;
}) {
  const shown = value.trim();
  const empty = !shown;
  const copyAction =
    shown && !disabled
      ? buildHubAdmDetailCopyTrailingAction({
          copyText: shown,
          title: `Copy ${fieldLabel}`,
          copyToastLabel: `${fieldLabel} copied`,
        })
      : null;
  const mergedTrailing = mergeHubAdmTrailingActions(copyAction, trailingAction);

  return (
    <div
      className={`hub-adm-inline-field min-w-0 hub-adm-inline-field--readonly hub-adm-inline-field--click-filter hub-adm-inline-field--multiline hub-adm-inline-field--multiline-1${
        disabled ? " hub-adm-inline-field--disabled" : ""
      }`}
    >
      <HubAdmInlineFieldLabel header={header} />
      <div
        className={`hub-adm-inline-field__value${
          mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""
        }`}
      >
        <div className="hub-adm-click-filter w-full min-w-0">
          <button
            type="button"
            disabled={disabled}
            aria-label={fieldLabel}
            aria-expanded={expanded}
            title={shown || placeholder || fieldLabel}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!disabled) onToggle();
            }}
            className="hub-adm-click-filter__trigger"
          >
            <span
              className={`hub-adm-click-edit__text inline-flex min-w-0 items-center gap-1.5 truncate${
                empty ? " hub-adm-click-edit__text--empty" : ""
              }`}
            >
              {empty ? placeholder || "—" : shown}
            </span>
            <ChevronDown
              size={10}
              className={`fs-browse-chevron hub-adm-click-filter__chevron shrink-0 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
        </div>
        {mergedTrailing ? (
          <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">
            {mergedTrailing}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** One folder tree for Local and Drive. It hangs under the field and matches Drive Files. */
export function FolderPickDropdown({
  open,
  anchorRef,
  onClose,
  resetKey,
  selectedPath,
  seedExpanded,
  load,
  onSelectFolder,
  rootOptions,
  activeRoot,
  onSelectRoot,
  onCreateFolder,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 420 });
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [createdPaths, setCreatedPaths] = useState<string[]>([]);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const target =
      anchor.querySelector<HTMLElement>(".hub-adm-click-filter__trigger, .hub-adm-click-edit") ?? anchor;
    const rect = target.getBoundingClientRect();
    const width = Math.max(360, rect.width);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setBox({ top: rect.bottom, left, width });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCreating(false);
      setNewFolderName("");
      setCreateError(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (creating) {
      newFolderInputRef.current?.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (creating) {
        event.preventDefault();
        event.stopPropagation();
        setCreating(false);
        setCreateError(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-hub-single-filter-panel], [data-hub-multi-filter-panel]")
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, onClose, anchorRef, place, creating]);

  const effectiveSeedExpanded = useMemo(() => {
    const set = new Set(seedExpanded);
    for (const p of createdPaths) {
      for (const anc of ancestorPaths(p)) set.add(anc);
    }
    return Array.from(set);
  }, [seedExpanded, createdPaths]);

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
      const createdRel = await onCreateFolder(selectedPath, trimmed);
      setCreatedPaths((prev) => [...prev, createdRel]);
      onSelectFolder(createdRel);
      setRefreshTick((t) => t + 1);
      setCreating(false);
      setNewFolderName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateBusy(false);
    }
  }

  const rootSelectOptions = useMemo<FilterOption[]>(
    () =>
      (rootOptions || []).map((opt) => ({
        value: opt.value,
        label: opt.label,
        emoji: opt.emoji,
        detail: opt.detail,
        tip: opt.tip,
      })),
    [rootOptions],
  );

  if (!open) return null;

  const hasRootToolbar = Boolean((rootSelectOptions.length > 0 && onSelectRoot) || onCreateFolder);

  return createPortal(
    <div
      ref={panelRef}
      className="fs-drive-folder-dropdown flex flex-col"
      style={{ top: box.top, left: box.left, width: box.width }}
    >
      {hasRootToolbar ? (
        <div className="relative z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-2 py-1.5 shrink-0">
          <div className="flex min-w-0 flex-1 items-center">
            {rootSelectOptions.length > 0 && onSelectRoot ? (
              <HubSingleFilterDropdown
                filterKey="p0009-folder-pick-root"
                label="Account"
                options={rootSelectOptions}
                value={activeRoot || rootSelectOptions[0]?.value || ""}
                onChange={(nextVal) => {
                  if (nextVal) onSelectRoot(nextVal);
                }}
                allowClear={false}
                triggerFormat="value"
                usePortal={false}
                triggerTypoClass={HUB_FILTER_DROPDOWN_TRIGGER_COMPACT_TYPO_CLASS}
                triggerClassName="px-2.5"
                className="min-w-0 max-w-[16rem]"
              />
            ) : null}
          </div>
          {onCreateFolder ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200 hover:bg-emerald-500/25 shrink-0"
              title={selectedPath ? `Create subfolder inside ${selectedPath}` : "Create folder at root"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreating((v) => !v);
                setCreateError(null);
              }}
            >
              <FolderPlus size={12} aria-hidden />
              <span>New folder</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {creating && onCreateFolder ? (
        <div className="flex flex-col gap-1 border-b border-white/10 bg-black/40 px-2.5 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/55 truncate max-w-[9rem]" title={selectedPath || "/"}>
              In: {selectedPath || "/"}
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
                  setCreating(false);
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void submitNewFolder();
              }}
            >
              <Check size={12} aria-hidden />
            </button>
            <button
              type="button"
              disabled={createBusy}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              title="Cancel"
              aria-label="Cancel"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreating(false);
                setCreateError(null);
              }}
            >
              <X size={12} aria-hidden />
            </button>
          </div>
          {createError ? <span className="text-xs text-rose-300">{createError}</span> : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <SyncFolderTree
          mode="drive"
          live={false}
          resetKey={`${resetKey}:${refreshTick}`}
          seedExpanded={effectiveSeedExpanded}
          seedSelected={selectedPath}
          treeLabel="Folders"
          className="h-full"
          emptyMessage="This folder is empty."
          load={load}
          onSelect={(dirPath, kind) => {
            if (kind === "file") return;
            onSelectFolder(dirPath);
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
