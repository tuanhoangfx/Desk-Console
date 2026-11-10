import { useEffect, useMemo, useState } from "react";
import { ClipboardList, CopyPlus } from "lucide-react";
import {
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubAdmPlainRelativeTime,
  HubAdmRecordMetaRow,
  HubAdmSectionBlock,
  HubCloneConfirmDialog,
  HubCrmDetailVaultIdBadge,
  HubDirectoryReadonlyCopyText,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailModalSecondaryAction,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import { deskApi, type ClipRow } from "../../lib/api";
import { DeskDetailNoteLogRails } from "../desk/DeskDetailNoteLogRails";
import { DeskDetailReadonlyField } from "../desk/desk-detail-fields";
import { DeskStatusKpiLabel } from "../desk/DeskStatusKpiLabel";
import { deskStatusKpiEmoji } from "../desk/desk-directory-stickers";
import {
  DESK_DETAIL_FORM_ROW_ALIGNED_3,
  DESK_DETAIL_FORM_STACK_CLASS,
  DESK_DETAIL_MODAL_SHELL_CLASS,
  DESK_DETAIL_SCAFFOLD_PROPS,
  DeskDetailTocNav,
  deskDetailSectionProps,
} from "../desk/desk-detail-modal-shell";
import { detectClipSmartTag } from "./clip-smart-tag";

const CLIP_DETAIL_TOC = [
  { id: "desk-clip-status", label: "Status", emoji: "🚦" },
  { id: "desk-clip-identity", label: "Identity", emoji: "📛" },
] as const;

type Props = {
  row: ClipRow;
  onClose: () => void;
};

export function ClipDetailModal({ row, onClose }: Props) {
  const sectionIds = useMemo(() => CLIP_DETAIL_TOC.map((item) => item.id), []);
  const title = row.name?.trim() || row.text.slice(0, 48) || "Clip";
  const sample = row.kind === "sample";
  const smartTag = useMemo(() => detectClipSmartTag(row), [row]);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [fullImageDataUrl, setFullImageDataUrl] = useState<string | undefined>(row.imageDataUrl);

  useEffect(() => {
    setFullImageDataUrl(row.imageDataUrl);
    if (!row.imageDataUrl && (row.hasImage || row.contentType === "image")) {
      let active = true;
      void deskApi
        .clip(row.id)
        .then((res) => {
          if (active && res?.row?.imageDataUrl) {
            setFullImageDataUrl(res.row.imageDataUrl);
          }
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }
  }, [row.id, row.imageDataUrl, row.hasImage, row.contentType]);

  async function executeClone(count: number) {
    if (cloneBusy) return;
    setCloneBusy(true);
    try {
      for (let i = 1; i <= count; i++) {
        const cloneName = count === 1 ? `${title} (Copy)` : `${title} (Copy ${i})`;
        if (sample) {
          await deskApi.saveSample(row.text, cloneName);
        } else {
          await deskApi.saveClip(row.text);
        }
      }
      setCloneOpen(false);
      onClose();
    } catch {
      setCloneOpen(false);
    } finally {
      setCloneBusy(false);
    }
  }

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={title}
        titleId="desk-clip-detail-title"
        headerIcon={ClipboardList}
        headerIconClassName="text-emerald-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} clip-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        toc={<DeskDetailTocNav items={[...CLIP_DETAIL_TOC]} />}
        footer={
          <HubToolDetailModalAccountFooter
            onClose={onClose}
            leading={
              <HubToolDetailModalSecondaryAction
                label="Clone"
                icon={CopyPlus}
                disabled={cloneBusy}
                onClick={() => setCloneOpen(true)}
              />
            }
          />
        }
        ariaLabelledBy="desk-clip-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-clip-detail"
          panelTitle="Clip"
          panelTitleEmoji="📋"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy clip ID" />}
                created={<HubAdmPlainRelativeTime at={row.createdAt} />}
                updated={<HubAdmPlainRelativeTime at={row.updatedAt || row.createdAt} />}
                createdLabel="Created"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-clip-status", label: "Status", emoji: deskStatusKpiEmoji(sample ? "Sample" : "History"), sectionKey: "status" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Status" headerEmoji={deskStatusKpiEmoji(sample ? "Sample" : "History")}>
                      <DeskStatusKpiLabel status={sample ? "Sample" : "History"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Pinned" value={row.pinned ? "Yes" : "No"} headerEmoji="📌" />
                    <DeskDetailReadonlyField label="Source" value={row.source || "—"} headerEmoji="🔗" />
                  </div>
                </HubAdmSectionBlock>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-clip-identity", label: "Identity", emoji: "📛", sectionKey: "identity" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Name" headerEmoji="🏷️">
                      <HubDirectoryReadonlyCopyText value={row.name || "—"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Text" headerEmoji="📝">
                      <HubDirectoryReadonlyCopyText value={row.text} multilineHover />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Clip id" headerEmoji="🆔">
                      <HubCrmDetailVaultIdBadge id={row.id} title="Copy clip ID" />
                    </DeskDetailReadonlyField>
                  </div>
                  {fullImageDataUrl ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="mb-1.5 text-xs font-medium text-slate-400">
                        🖼️ Image Preview {row.imageWidth && row.imageHeight ? `(${row.imageWidth}×${row.imageHeight})` : ""}
                      </div>
                      <img
                        src={fullImageDataUrl}
                        alt={title}
                        className="max-h-72 max-w-full rounded-lg border border-white/10 bg-black/50 object-contain"
                      />
                    </div>
                  ) : null}
                  {smartTag?.kind === "color" ? (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                      <span
                        className="h-9 w-9 shrink-0 rounded-lg border border-white/25 shadow-inner"
                        style={{ backgroundColor: smartTag.colorHex }}
                        aria-hidden
                      />
                      <div className="text-xs text-slate-300">
                        <div className="font-semibold text-white">Color Swatch</div>
                        <div className="font-mono text-slate-400">{smartTag.label}</div>
                      </div>
                    </div>
                  ) : null}
                  {smartTag?.kind === "url" ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                      <span className="truncate font-mono text-xs text-sky-300">{smartTag.href}</span>
                      <button
                        type="button"
                        onClick={() => window.open(smartTag.href, "_blank", "noopener,noreferrer")}
                        className="shrink-0 rounded-lg border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-100 hover:bg-sky-500/30"
                      >
                        Open URL
                      </button>
                    </div>
                  ) : null}
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={row.text.slice(0, 500)} />}
        />
      </HubToolDetailModal>
      <HubCloneConfirmDialog
        open={cloneOpen}
        stacked
        sourceLabel={title}
        showKeepProfile={false}
        busy={cloneBusy}
        onClose={() => {
          if (!cloneBusy) setCloneOpen(false);
        }}
        onConfirm={({ count }) => void executeClone(count)}
      />
    </HubAccountDetailSearchProvider>
  );
}
