import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HUB_FILTER_DROPDOWN_LIST_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownCircle,
  HubFilterDropdownPanelSearch,
  HubFilterDropdownTrigger,
  filterDropdownPanelSearchPlaceholder,
  HUB_FILTER_DROPDOWN_TRIGGER_TYPO_CLASS,
} from "../shell/filter-dropdown-primitives";
import { hubPortalPanelPosition } from "../shell/hub-portal-panel-position";
import { pinSelectedFilterOptions } from "../shell/pin-selected-filter-options";
import { HubConfirmDialog } from "../shell/HubConfirmDialog";
import { HubPromptDialog } from "../shell/HubPromptDialog";
import { useHubToast } from "../toast/HubToastContext";
import { compactIconSize } from "../ui-scale";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "../shell/hub-typography";
import type { DirectoryTableColumnPresetManager } from "./directory-table-column-presets";
import {
  PRESET_CURRENT_DOT_COLOR,
  PRESET_DEFAULT_DOT_COLOR,
  presetDotColorFromId,
} from "./preset-dot-color";

export type HubDirectoryTableColumnPresetMenuProps<K extends string = string> = {
  manager: DirectoryTableColumnPresetManager<K>;
  onLog?: (scope: string, message: string) => void;
  /** Smaller control for Settings section headers. */
  compact?: boolean;
};

export function HubDirectoryTableColumnPresetMenu<K extends string>({
  manager,
  onLog,
  compact = false,
}: HubDirectoryTableColumnPresetMenuProps<K>) {
  const toast = useHubToast();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState(() => manager.readActiveLabel());
  const [presets, setPresets] = useState(() => manager.listPresets());
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288 });
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      setLabel(manager.readActiveLabel());
      setPresets(manager.listPresets());
    };
    window.addEventListener(manager.changeEvent, sync);
    window.addEventListener(manager.prefs.changeEvent, sync);
    return () => {
      window.removeEventListener(manager.changeEvent, sync);
      window.removeEventListener(manager.prefs.changeEvent, sync);
    };
  }, [manager]);

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const { top, left, width } = hubPortalPanelPosition(rect, {
        width: Math.max(rect.width, 288),
        estimatedHeight: Math.min(320, 86 + presets.length * 36),
      });
      setPanelPos({ top, left, width });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, label, presets.length]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if ((e.target as Element).closest?.("[data-hub-column-preset-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function emitLog(message: string) {
    onLog?.("columns", message);
  }

  function notify(message: string, type: "success" | "info" = "success") {
    toast?.pushToast(message, type);
  }

  const activePresetName = label === "Default" || label === "Current" ? null : label;

  const activePreset = presets.find((preset) => preset.name === label);
  const activeEmoji = label === "Default" ? "📌" : activePreset?.emoji;
  const triggerDotColor =
    label === "Current"
      ? PRESET_CURRENT_DOT_COLOR
      : label === "Default"
        ? PRESET_DEFAULT_DOT_COLOR
        : presetDotColorFromId(activePreset?.id ?? "default", activePreset?.color);

  const filteredPresets = pinSelectedFilterOptions(
    presets
      .filter((preset) => !search || preset.name.toLowerCase().includes(search.toLowerCase()) || preset.name === label)
      .map((preset) => ({ ...preset, value: preset.id })),
    activePresetName ? [presets.find((preset) => preset.name === label)?.id ?? ""] : [],
  );

  const showDefaultRow = !search || "default".includes(search.toLowerCase());

  function pickDefault() {
    manager.applyDefault();
    emitLog("Column preset: Default");
    notify("Column preset: Default");
    setOpen(false);
  }

  function pickPreset(id: string, name: string) {
    manager.applyPreset(id);
    emitLog(`Column preset: ${name}`);
    notify(`Column preset: ${name}`);
    setOpen(false);
  }

  function savePreset(name: string) {
    manager.saveCurrentAs(name);
    emitLog(`Saved column preset: ${name}`);
    notify(`Saved preset: ${name}`);
    setSaveOpen(false);
    setOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    manager.deletePreset(deleteTarget.id);
    emitLog(`Deleted column preset: ${deleteTarget.name}`);
    notify(`Deleted preset: ${deleteTarget.name}`);
    setDeleteTarget(null);
  }

  const panelInner = (
    <>
      <HubFilterDropdownPanelSearch
        value={search}
        onChange={setSearch}
        placeholder={filterDropdownPanelSearchPlaceholder("presets")}
        onClearSelection={pickDefault}
        clearSelectionEnabled={label !== "Default"}
      />
      <div className={HUB_FILTER_DROPDOWN_LIST_CLASS}>
        {showDefaultRow ? (
          <button type="button" onClick={pickDefault} className={HUB_FILTER_DROPDOWN_ROW_CLASS}>
            <HubFilterDropdownCircle checked={label === "Default"} />
            <span className="grid h-3.5 w-3.5 shrink-0 place-items-center text-xs leading-none" aria-hidden>
              📌
            </span>
            <span className="min-w-0 flex-1 truncate text-left">Default</span>
          </button>
        ) : null}
        {filteredPresets.map((preset) => (
          <div key={preset.id} className="group flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => pickPreset(preset.id, preset.name)}
              className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} min-w-0 flex-1`}
            >
              <HubFilterDropdownCircle checked={activePresetName === preset.name} />
              {preset.emoji ? (
                <span className="grid h-3.5 w-3.5 shrink-0 place-items-center text-xs leading-none" aria-hidden>
                  {preset.emoji}
                </span>
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{ background: presetDotColorFromId(preset.id, preset.color) }}
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1 truncate text-left" title={preset.name}>
                {preset.name}
              </span>
            </button>
            {preset.builtin || preset.id.startsWith("builtin-") ? null : (
            <button
              type="button"
              className="mr-1 rounded p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
              title={`Delete ${preset.name}`}
              aria-label={`Delete preset ${preset.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: preset.id, name: preset.name });
              }}
            >
              <Trash2 size={compactIconSize(11)} aria-hidden />
            </button>
            )}
          </div>
        ))}
        {filteredPresets.length === 0 && !showDefaultRow ? (
          <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
        ) : null}
      </div>
      <div className="border-t border-white/5 p-1">
        <button
          type="button"
          className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} text-indigo-200`}
          onClick={() => {
            setSaveOpen(true);
            setOpen(false);
          }}
        >
          <Plus size={compactIconSize(12)} className="shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">Save as preset…</span>
        </button>
      </div>
    </>
  );

  const panelEl =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-hub-column-preset-panel
            className={HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
          >
            {panelInner}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={ref} className={`relative shrink-0${compact ? "" : ""}`}>
        <HubFilterDropdownTrigger
          ref={triggerRef}
          active={label !== "Default"}
          open={open}
          label={label}
          onClick={() => {
            setSearch("");
            setOpen((value) => !value);
          }}
          title="Column presets"
          Icon={LayoutTemplate}
          icon={
            activeEmoji ? (
              <span className="inline-flex size-[13px] shrink-0 items-center justify-center text-[12px] leading-none" aria-hidden>
                {activeEmoji}
              </span>
            ) : undefined
          }
          iconColor={activeEmoji ? undefined : triggerDotColor}
          typoClass={compact ? HUB_FILTER_DROPDOWN_TRIGGER_TYPO_CLASS : HUB_DIRECTORY_TOOLBAR_TYPO_CLASS}
          className={compact ? "h-7 px-2" : ""}
        />
      </div>
      {panelEl}
      <HubPromptDialog
        open={saveOpen}
        title="Save column preset"
        label="Preset name"
        placeholder="e.g. Check date"
        confirmLabel="Save preset"
        onConfirm={savePreset}
        onClose={() => setSaveOpen(false)}
      />
      <HubConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete preset"
        message={
          deleteTarget ? (
            <>
              Delete preset <span className="font-medium text-[var(--text)]">&quot;{deleteTarget.name}&quot;</span>?
            </>
          ) : null
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
