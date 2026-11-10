import { useCallback, useMemo, useRef, useState } from "react";
import { ClipboardList, Copy, Pin, RotateCcw } from "lucide-react";
import {
  HubPromptDialog,
  emitHubAppLog,
  type HubDirectoryBulkMoreAction,
  type HubDirectoryLifecycleMode,
} from "@tool-workspace/hub-ui";
import { deskApi, type ClipRow } from "../../lib/api";
import { pushDeskNotifyAlert } from "../../lib/desk-notify";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { useDeskLive } from "../../lib/use-desk-live";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import type { DeskRow } from "../desk/DeskDirectoryTable";
import { ClipDetailModal } from "./ClipDetailModal";
import { clipPickerFormat } from "./clip-picker-filters";
import { detectClipSmartTag } from "./clip-smart-tag";

function toRow(row: ClipRow): DeskRow {
  const text = String(row.text || "");
  const sample = row.kind === "sample";
  const isImage = Boolean(row.imageDataUrl || row.hasImage || row.contentType === "image");
  const smartTag = detectClipSmartTag(row);
  const clipFormat = clipPickerFormat(row);
  const label = isImage ? row.name || text || "Image" : (row.name || text).slice(0, 80) || "(empty)";
  const logMsg = `Captured via ${row.source || "clipboard"} · ${clipFormat}${row.pinned ? " · Pinned" : ""}`;
  return {
    id: row.id,
    name: label,
    status: sample ? "Sample" : "History",
    extra: isImage
      ? `Image clip ${row.imageWidth && row.imageHeight ? `${row.imageWidth}×${row.imageHeight} px` : ""}`.trim()
      : `${smartTag ? `[${smartTag.label}] ` : ""}${text.slice(0, 160)}`,
    log: logMsg,
    activityLog: [
      {
        at: row.updatedAt || row.createdAt || new Date().toISOString(),
        message: logMsg,
        actor: { label: row.source || "Clipboard", source: "system" },
      },
    ],
    updated: row.updatedAt || row.createdAt || "",
    createdAt: row.createdAt,
    project: row.project || "",
    clipFormat,
    pinned: Boolean(row.pinned),
    statusTone: sample ? "online" : "active",
  };
}

export function ClipsScreen() {
  const tabActive = useDeskTabActive("clips");
  const rawRef = useRef<ClipRow[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lifecycleMode, setLifecycleMode] = useState<HubDirectoryLifecycleMode>("live");
  const [sampleOpen, setSampleOpen] = useState(false);
  const load = useCallback(async () => {
    const data = await deskApi.clips(lifecycleMode === "trash" ? "trash" : "live");
    rawRef.current = data.rows;
    return data.rows.map(toRow);
  }, [lifecycleMode]);
  const { rows, refresh } = useDeskLive(load, {
    scope: `clips:${lifecycleMode}`,
    screenId: "clips",
    intervalMs: 4000,
  });
  const detailClip = useMemo(
    () => rawRef.current.find((row) => row.id === detailId) ?? null,
    [detailId, rows],
  );
  const openDetail = useCallback((ids: string[]) => {
    const id = ids[0];
    if (id) setDetailId(id);
  }, []);

  const notifyError = useCallback((id: string, label: string, error: unknown) => {
    pushDeskNotifyAlert({
      id,
      severity: "bad",
      label,
      detail: error instanceof Error ? error.message : String(error),
    });
  }, []);

  const moreActions = useCallback(
    ({ ids, hasSelection }: { ids: string[]; hasSelection: boolean }): HubDirectoryBulkMoreAction[] => {
      const trash = lifecycleMode === "trash";
      const actions: HubDirectoryBulkMoreAction[] = [];
      if (!trash) {
        actions.push(
          {
            key: "save-clipboard",
            label: "Save clipboard",
            icon: ClipboardList,
            tone: "indigo",
            onClick: () => {
              void deskApi
                .saveClip()
                .then(() => {
                  emitHubAppLog({ scope: "P0001", screen: "clips", kind: "create", message: "Saved clipboard clip" });
                  return refresh();
                })
                .catch((error) => notifyError("save-clip", "Save clipboard failed", error));
            },
          },
          {
            key: "new-sample",
            label: "New sample",
            icon: Pin,
            tone: "amber",
            onClick: () => setSampleOpen(true),
          },
        );
      }
      if (hasSelection && !trash) {
        actions.push(
          {
            key: "save-as-sample",
            label: "Save as sample",
            icon: Pin,
            tone: "amber",
            selectedCount: ids.length,
            onClick: () => {
              void Promise.all(ids.map((id) => deskApi.promoteClip(id))).then(() => {
                emitHubAppLog({ scope: "P0001", screen: "clips", kind: "create", message: `Saved ${ids.length} sample(s)` });
                return refresh();
              });
            },
          },
          {
            key: "copy",
            label: "Copy",
            icon: Copy,
            disabled: ids.length !== 1,
            title: ids.length === 1 ? "Copy to clipboard" : "Select one clip to copy",
            onClick: () => {
              const id = ids[0];
              if (id) void deskApi.copyClip(id);
            },
          },
        );
      }
      if (hasSelection && trash) {
        actions.push({
          key: "restore",
          label: "Restore",
          icon: RotateCcw,
          tone: "emerald",
          selectedCount: ids.length,
          onClick: () => {
            void Promise.all(ids.map((id) => deskApi.restoreClip(id))).then(() => {
              emitHubAppLog({ scope: "P0001", screen: "clips", kind: "update", message: `Restored ${ids.length} clip(s)` });
              return refresh();
            });
          },
        });
      }
      return actions;
    },
    [lifecycleMode, notifyError, refresh],
  );

  return (
    <>
      <DeskDirectoryScreen
        screen="clips"
        title="Clips"
        titleIcon={ClipboardList}
        sectionRuleLabel="Clips"
        rows={rows}
        tabActive={tabActive}
        onRowFocus={setDetailId}
        onPinToggle={(id, nextPinned) => {
          void deskApi
            .pinClip(id, nextPinned)
            .then(() => {
              emitHubAppLog({
                scope: "P0001",
                screen: "clips",
                kind: "update",
                message: nextPinned ? "Pinned clip" : "Unpinned clip",
              });
              return refresh();
            })
            .catch((error) => notifyError("pin-clip", "Pin clip failed", error));
        }}
        lifecycleMode={lifecycleMode}
        onLifecycleModeChange={setLifecycleMode}
        crudBulk={{
          newTitle: "New sample",
          newDisabled: lifecycleMode === "trash",
          onNew: () => setSampleOpen(true),
          onDetail: openDetail,
          deleteTitle: lifecycleMode === "trash" ? "Delete forever" : "Move selected to Trash",
          deleteLabel: lifecycleMode === "trash" ? "Delete forever" : "Delete",
          onDelete: (ids) => {
            if (!ids.length) return;
            void Promise.all(
              ids.map((id) => (lifecycleMode === "trash" ? deskApi.purgeClipForever(id) : deskApi.deleteClip(id))),
            ).then(() => {
              emitHubAppLog({
                scope: "P0001",
                screen: "clips",
                kind: "delete",
                message:
                  lifecycleMode === "trash"
                    ? `Purged ${ids.length} clip(s) forever`
                    : `Moved ${ids.length} clip(s) to Trash`,
              });
              return refresh();
            });
          },
          moreActions,
        }}
      />
      {detailClip ? <ClipDetailModal row={detailClip} onClose={() => setDetailId(null)} /> : null}
      <HubPromptDialog
        open={sampleOpen}
        title="New sample"
        label="Sample text"
        placeholder="Reusable text to paste later"
        confirmLabel="Save sample"
        onClose={() => setSampleOpen(false)}
        onConfirm={(text) => {
          setSampleOpen(false);
          void deskApi
            .saveSample(text)
            .then(() => {
              emitHubAppLog({ scope: "P0001", screen: "clips", kind: "create", message: "Added sample" });
              return refresh();
            })
            .catch((error) => notifyError("save-sample", "Save sample failed", error));
        }}
      />
    </>
  );
}
