import { useCallback, useState } from "react";
import { Camera, Crop } from "lucide-react";
import { HubBulkActionButton, emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type CaptureRow } from "../../lib/api";
import { pushDeskNotifyAlert } from "../../lib/desk-notify";
import { useDeskLive } from "../../lib/use-desk-live";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import type { DeskRow } from "../desk/DeskDirectoryTable";
import { CaptureRegionOverlay } from "./CaptureRegionOverlay";

function toRow(row: CaptureRow): DeskRow {
  return {
    id: row.id,
    name: row.fileName,
    status: row.mode,
    extra: `${Math.round(row.bytes / 1024)} KB`,
    updated: row.createdAt,
    createdAt: row.createdAt,
    statusTone: row.mode === "region" ? "idle" : "active",
  };
}

export function CapturesScreen({ tabActive = true }: { tabActive?: boolean }) {
  const load = useCallback(async () => {
    const data = await deskApi.captures();
    return data.rows.map(toRow);
  }, []);
  const { rows, refresh } = useDeskLive(load, { scope: "captures", tabActive });
  const [region, setRegion] = useState<{ id: string; src: string } | null>(null);
  const [cropping, setCropping] = useState(false);

  const capture = (mode: "screen" | "region") => {
    void deskApi
      .capture(mode)
      .then((data) => {
        emitHubAppLog({ scope: "P0001", screen: "captures", kind: "create", message: `Captured ${mode}` });
        return refresh().then(() => data);
      })
      .then((data) => {
        if (mode === "region" && data.row) {
          setRegion({ id: data.row.id, src: deskApi.captureSrc(data.row.id) });
        }
      })
      .catch((error) => {
        pushDeskNotifyAlert({
          id: "capture",
          severity: "bad",
          label: "Capture failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
  };

  return (
    <>
      <DeskDirectoryScreen
        screen="captures"
        tabActive={tabActive}
        title="Captures"
        titleIcon={Camera}
        titleIconClass="text-sky-300"
        sectionRuleLabel="Captures"
        rows={rows}
        toolbarActions={
          <>
            <HubBulkActionButton
              icon={<Camera size={14} />}
              label="Capture screen"
              title="Full virtual screen (Ctrl+Alt+S)"
              tone="sky"
              onClick={() => capture("screen")}
            />
            <HubBulkActionButton
              icon={<Crop size={14} />}
              label="Capture region"
              title="Capture then crop a region"
              tone="indigo"
              onClick={() => capture("region")}
            />
          </>
        }
        bulkActions={[
          {
            label: "Delete",
            tone: "rose",
            onClick: (ids) => {
              void Promise.all(ids.map((id) => deskApi.deleteCapture(id))).then(() => {
                emitHubAppLog({
                  scope: "P0001",
                  screen: "captures",
                  kind: "delete",
                  message: `Deleted ${ids.length} capture(s)`,
                });
                return refresh();
              });
            },
          },
        ]}
      />
      {region ? (
        <CaptureRegionOverlay
          src={region.src}
          busy={cropping}
          onCancel={() => setRegion(null)}
          onApply={(box) => {
            setCropping(true);
            void deskApi
              .cropCapture(region.id, box)
              .then(() => {
                emitHubAppLog({ scope: "P0001", screen: "captures", kind: "update", message: "Cropped region capture" });
                setRegion(null);
                return refresh();
              })
              .catch((error) => {
                pushDeskNotifyAlert({
                  id: "crop",
                  severity: "bad",
                  label: "Crop failed",
                  detail: error instanceof Error ? error.message : String(error),
                });
              })
              .finally(() => setCropping(false));
          }}
        />
      ) : null}
    </>
  );
}
