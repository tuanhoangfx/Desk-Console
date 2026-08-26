import { useCallback, useState } from "react";
import { ClipboardList, Pin, Plus } from "lucide-react";
import { HubBulkActionButton, HubPromptDialog, emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type ClipRow } from "../../lib/api";
import { pushDeskNotifyAlert } from "../../lib/desk-notify";
import { useDeskLive } from "../../lib/use-desk-live";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import type { DeskRow } from "../desk/DeskDirectoryTable";

function toRow(row: ClipRow): DeskRow {
  const text = String(row.text || "");
  const sample = row.kind === "sample";
  return {
    id: row.id,
    name: (row.name || text).slice(0, 80) || "(empty)",
    status: sample ? "Sample" : "History",
    extra: text.slice(0, 160),
    updated: row.updatedAt || row.createdAt || "",
    createdAt: row.createdAt,
    statusTone: sample ? "online" : "active",
  };
}

export function ClipsScreen({ tabActive = true }: { tabActive?: boolean }) {
  const load = useCallback(async () => {
    const data = await deskApi.clips();
    return data.rows.map(toRow);
  }, []);
  const { rows, refresh } = useDeskLive(load, { scope: "clips", tabActive, intervalMs: 4000 });
  const [sampleOpen, setSampleOpen] = useState(false);

  return (
    <>
      <DeskDirectoryScreen
        screen="clips"
        tabActive={tabActive}
        title="Clips"
        titleIcon={ClipboardList}
        sectionRuleLabel="Clips"
        rows={rows}
        toolbarActions={
          <>
            <HubBulkActionButton
              icon={<ClipboardList size={14} />}
              label="Save clipboard"
              title="Snapshot current Windows clipboard into History"
              tone="indigo"
              onClick={() => {
                void deskApi
                  .saveClip()
                  .then(() => {
                    emitHubAppLog({ scope: "P0001", screen: "clips", kind: "create", message: "Saved clipboard clip" });
                    return refresh();
                  })
                  .catch((error) => {
                    pushDeskNotifyAlert({
                      id: "save-clip",
                      severity: "bad",
                      label: "Save clipboard failed",
                      detail: error instanceof Error ? error.message : String(error),
                    });
                  });
              }}
            />
            <HubBulkActionButton
              icon={<Plus size={14} />}
              label="New sample"
              title="Add a reusable paste sample"
              tone="amber"
              onClick={() => setSampleOpen(true)}
            />
          </>
        }
        bulkActions={[
          {
            label: "Save as sample",
            tone: "amber",
            icon: Pin,
            onClick: (ids) => {
              void Promise.all(ids.map((id) => deskApi.promoteClip(id))).then(() => {
                emitHubAppLog({ scope: "P0001", screen: "clips", kind: "create", message: `Saved ${ids.length} sample(s)` });
                return refresh();
              });
            },
          },
          {
            label: "Copy",
            onClick: (ids) => {
              const id = ids[0];
              if (id) void deskApi.copyClip(id);
            },
          },
          {
            label: "Delete",
            onClick: (ids) => {
              void Promise.all(ids.map((id) => deskApi.deleteClip(id))).then(() => {
                emitHubAppLog({ scope: "P0001", screen: "clips", kind: "delete", message: `Deleted ${ids.length} clip(s)` });
                return refresh();
              });
            },
          },
        ]}
      />
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
            .catch((error) => {
              pushDeskNotifyAlert({
                id: "save-sample",
                severity: "bad",
                label: "Save sample failed",
                detail: error instanceof Error ? error.message : String(error),
              });
            });
        }}
      />
    </>
  );
}
