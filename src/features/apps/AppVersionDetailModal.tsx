import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Layers,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Square,
  Unlock,
} from "lucide-react";
import {
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubAdmPlainRelativeTime,
  HubAdmRecordMetaRow,
  HubAdmSectionBlock,
  HubBulkActionButton,
  HubCrmDetailVaultIdBadge,
  HubDirectoryReadonlyCopyText,
  HubSingleFilterDropdown,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailModalSecondaryAction,
  type FilterOption,
} from "@tool-workspace/hub-ui";
import type { ManagedAppReleaseItem, ManagedAppRow } from "../../lib/api";
import { DeskDetailNoteLogRails } from "../desk/DeskDetailNoteLogRails";
import { DeskDetailReadonlyField } from "../desk/desk-detail-fields";
import {
  DESK_DETAIL_FORM_ROW_ALIGNED_3,
  DESK_DETAIL_FORM_STACK_CLASS,
  DESK_DETAIL_MODAL_SHELL_CLASS,
  DESK_DETAIL_SCAFFOLD_PROPS,
  DeskDetailTocNav,
  deskDetailSectionProps,
} from "../desk/desk-detail-modal-shell";
import { DeskStatusKpiLabel } from "../desk/DeskStatusKpiLabel";
import { DESK_STATUS_KPI_EMOJI } from "../desk/desk-directory-stickers";

type Props = {
  row: ManagedAppRow;
  releases: ManagedAppReleaseItem[];
  busyAction: string | null;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  onRefreshReleases: (force: boolean) => Promise<void>;
  onClose: () => void;
};

export function AppVersionDetailModal({
  row,
  releases,
  busyAction,
  onAction,
  onRefreshReleases,
  onClose,
}: Props) {
  const isAntigravity = row.product === "antigravity";
  const isPrimaryIde = row.kind === "primary" && (row.product === "antigravity" || row.product === "cursor");
  const isSxs = row.kind === "sxs";
  const busy = busyAction !== null;

  const [selectedReleaseVer, setSelectedReleaseVer] = useState<string>("");
  useEffect(() => {
    if (!releases.length) return;
    setSelectedReleaseVer((prev) => {
      if (prev && releases.some((r) => r.version === prev)) return prev;
      return (releases.find((r) => !r.archived) || releases[0])?.version || "";
    });
  }, [releases]);

  const toc = useMemo(
    () => [
      { id: "desk-app-overview", label: "Version & Status", emoji: "📦" },
      ...(isPrimaryIde ? [{ id: "desk-app-guard", label: "Update Guard", emoji: "🛡️" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-installers", label: "Rollback Vault", emoji: "🗂️" }] : []),
      ...(isSxs ? [{ id: "desk-app-sxs", label: "Side-by-Side", emoji: "🔀" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-snapshots", label: "State Snapshots", emoji: "💾" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-vsix", label: "Core VSIX", emoji: "🧩" }] : []),
    ],
    [isPrimaryIde, isSxs],
  );
  const sectionIds = useMemo(() => toc.map((t) => t.id), [toc]);

  const releaseOptions = useMemo<FilterOption[]>(
    () =>
      releases.map((rel) => ({
        value: rel.version,
        label: `v${rel.version}${rel.archived ? " · Vaulted" : " · GCS Official"}`,
        emoji: rel.archived ? "✅" : "☁️",
      })),
    [releases],
  );

  const installerItems = row.installerItems || [];
  const stateSnapshots = row.stateSnapshots || [];
  const vsixExtensions = row.vsixExtensions || [];

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={row.name}
        titleId="desk-app-detail-title"
        headerIcon={Boxes}
        headerIconClassName="text-violet-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} desk-app-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        busy={busy}
        toc={<DeskDetailTocNav items={toc} />}
        footer={
          <HubToolDetailModalAccountFooter
            onClose={onClose}
            busy={busy}
            leading={
              <>
                {isPrimaryIde ? (
                  <HubToolDetailModalSecondaryAction
                    label={row.updatePinned ? "Updates Pinned" : "Lock & Purge"}
                    icon={ShieldCheck}
                    tone="emerald"
                    disabled={busy}
                    onClick={() =>
                      void onAction("pin-updates", {
                        pin: true,
                        purgePending: true,
                        lockCursor: true,
                        hardLockAcl: true,
                      })
                    }
                  />
                ) : null}
                {isAntigravity && row.kind === "primary" && (row.brokenTaskbarPins?.length ?? 0) > 0 ? (
                  <HubToolDetailModalSecondaryAction
                    label={`Repair Taskbar (${row.brokenTaskbarPins?.length ?? 0})`}
                    icon={Link2}
                    tone="amber"
                    disabled={busy}
                    onClick={() => void onAction("repair-taskbar-pins")}
                  />
                ) : null}
                {isAntigravity && row.kind === "primary" ? (
                  <HubToolDetailModalSecondaryAction
                    label={row.aclLocked ? "Unlock ACL" : "Hard-Lock ACL"}
                    icon={row.aclLocked ? Unlock : Lock}
                    tone="amber"
                    disabled={busy}
                    onClick={() =>
                      void onAction("pin-updates", {
                        pin: true,
                        purgePending: true,
                        lockCursor: true,
                        hardLockAcl: !row.aclLocked,
                      })
                    }
                  />
                ) : null}
                {isSxs && row.version ? (
                  <>
                    <HubToolDetailModalSecondaryAction
                      label={row.isRunning ? `Relaunch v${row.version}` : `Launch v${row.version}`}
                      icon={Layers}
                      tone="emerald"
                      disabled={busy}
                      onClick={() => void onAction("launch-sxs", { version: row.version, relaunch: row.isRunning })}
                    />
                    {row.isRunning ? (
                      <HubToolDetailModalSecondaryAction
                        label={`Stop v${row.version}`}
                        icon={Square}
                        tone="rose"
                        disabled={busy}
                        onClick={() => void onAction("stop-sxs", { version: row.version })}
                      />
                    ) : null}
                  </>
                ) : null}
                <HubToolDetailModalSecondaryAction
                  label="Refresh Feed"
                  icon={RefreshCw}
                  tone="sky"
                  disabled={busy}
                  onClick={() => void onRefreshReleases(true)}
                />
              </>
            }
          />
        }
        ariaLabelledBy="desk-app-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-app-detail"
          panelTitle="App & Version Ops"
          panelTitleEmoji="📦"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy app ID" />}
                created={<HubAdmPlainRelativeTime at={row.updated} />}
                updated={<HubAdmPlainRelativeTime at={row.updated} />}
                createdLabel="Checked"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock
                  {...deskDetailSectionProps({
                    id: "desk-app-overview",
                    label: "Version & Status",
                    emoji: DESK_STATUS_KPI_EMOJI.up,
                    sectionKey: "status",
                  })}
                >
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Status" headerEmoji="🚦">
                      <DeskStatusKpiLabel status={row.status} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Installed Version" headerEmoji="🏷️">
                      {row.version ? `v${row.version}` : "Not installed"}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Product" headerEmoji="🖥️">
                      {row.product} ({row.kind})
                    </DeskDetailReadonlyField>
                  </div>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField
                      label="Executable / Home"
                      headerEmoji="📁"
                      empty={!(row.exePath || row.isolatedHomeDir)}
                    >
                      {row.exePath || row.isolatedHomeDir ? (
                        <HubDirectoryReadonlyCopyText
                          value={row.exePath || row.isolatedHomeDir || ""}
                        />
                      ) : null}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Update Lock" headerEmoji="🔒">
                      {row.updatePinned
                        ? row.aclLocked
                          ? "Pinned OFF + ACL Locked"
                          : "Pinned OFF"
                        : "Unpinned (Auto-update possible)"}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Pending Update" headerEmoji="⚠️">
                      {row.pendingUpdatePresent ? row.pendingFileName || "Staged updater detected" : "Clean (None)"}
                    </DeskDetailReadonlyField>
                  </div>
                  {row.primaryLockConflict ? (
                    <div className="mt-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                      Shared lock conflict: v{row.primaryLockConflict.version} (PID {row.primaryLockConflict.pid}) launched without{" "}
                      <code className="font-mono">--user-data-dir</code> is holding{" "}
                      <code className="font-mono">%APPDATA%\Antigravity\lockfile</code>.
                    </div>
                  ) : null}
                  {(row.brokenTaskbarPins?.length ?? 0) > 0 ? (
                    <div className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      {row.brokenTaskbarPins?.length} Taskbar SxS shortcut(s) point directly to <code className="font-mono">Antigravity.exe</code> without{" "}
                      <code className="font-mono">--launch-sxs</code> ({row.brokenTaskbarPins?.map((p) => `${p.fileName} -> v${p.version}`).join(", ")}). Click{" "}
                      <strong>Repair Taskbar</strong> below to route them safely through isolated SxS profiles.
                    </div>
                  ) : null}
                </HubAdmSectionBlock>

                {isPrimaryIde ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-guard",
                      label: "Auto-Update Guard & ACL Lock",
                      emoji: "🛡️",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-2 text-xs">
                      <p className="text-[11px] text-[var(--muted)]">
                        Keeps local IDE builds pinned without silent background upgrades breaking OAuth / state.vscdb schemas.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🛡️</span>}
                          label="Pin Updates OFF & Purge"
                          title="Pin auto-updates OFF and purge staged pending installers"
                          tone="emerald"
                          variant="filled"
                          disabled={busy}
                          onClick={() =>
                            void onAction("pin-updates", {
                              pin: true,
                              purgePending: true,
                              lockCursor: true,
                              hardLockAcl: true,
                            })
                          }
                        />
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔓</span>}
                          label="Allow Updates"
                          title="Re-enable automatic IDE updates and unlock pending ACL"
                          tone="amber"
                          variant="filled"
                          disabled={busy}
                          onClick={() =>
                            void onAction("pin-updates", {
                              pin: false,
                              purgePending: false,
                              lockCursor: true,
                              hardLockAcl: false,
                            })
                          }
                        />
                        {isAntigravity ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>{row.aclLocked ? "🔓" : "🔒"}</span>}
                            label={row.aclLocked ? "Unlock Updater ACL" : "Hard-Lock Updater ACL"}
                            title={row.aclLocked ? "Restore write ACL on pending updater folder" : "Deny write ACL on pending updater folder"}
                            tone={row.aclLocked ? "neutral" : "rose"}
                            variant="filled"
                            disabled={busy}
                            onClick={() =>
                              void onAction("pin-updates", {
                                pin: true,
                                purgePending: true,
                                lockCursor: true,
                                hardLockAcl: !row.aclLocked,
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

                {isPrimaryIde ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-installers",
                      label: "GCS Release Feed & Rollback Installer Vault",
                      emoji: "🗂️",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-3 text-xs">
                      {isAntigravity && releaseOptions.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            Download official Antigravity releases to <code className="font-mono text-[var(--text)]">.tools/ide-installers</code>
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <HubSingleFilterDropdown
                              filterKey="p0001-ag-release"
                              label="GCS Build"
                              options={releaseOptions}
                              value={selectedReleaseVer}
                              onChange={setSelectedReleaseVer}
                              disabled={busy}
                              usePortal
                              triggerFormat="value"
                            />
                            <HubBulkActionButton
                              icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📥</span>}
                              label={busyAction === `fetch:${selectedReleaseVer}` ? "Downloading..." : "Fetch Release"}
                              title="Download selected Antigravity release into .tools/ide-installers"
                              tone="emerald"
                              variant="filled"
                              disabled={busy || !selectedReleaseVer}
                              onClick={() => void onAction("fetch-release", { version: selectedReleaseVer })}
                            />
                            <HubBulkActionButton
                              icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📥</span>}
                              label={busyAction === "fetch-all-releases" ? "Archiving..." : "Archive All Public"}
                              title="Archive all public Antigravity releases from GCS into installer vault (with free-disk safety guard)"
                              tone="indigo"
                              variant="filled"
                              disabled={busy}
                              onClick={() => void onAction("fetch-all-releases", { limit: 50 })}
                            />
                          </div>
                        </div>
                      ) : null}

                      {installerItems.length === 0 ? (
                        <p className="text-xs text-[var(--muted)]">
                          No archived installers stored yet. Fetch from GCS feed above or save installers into{" "}
                          <code className="font-mono text-[var(--text)]">.tools/ide-installers/{row.product}</code>.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {installerItems.map((item) => (
                            <div
                              key={item.fileName}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                            >
                              <div className="space-y-0.5">
                                <div className="font-mono font-semibold text-[var(--text)]">
                                  v{item.version}{" "}
                                  {row.version === item.version ? (
                                    <span className="ml-1 text-[10px] text-emerald-300">(System Install)</span>
                                  ) : null}
                                </div>
                                <div className="font-mono text-[10px] text-[var(--muted)]">{item.fileName}</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isAntigravity ? (
                                  <HubBulkActionButton
                                    icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🖥️</span>}
                                    label={`Run v${item.version}`}
                                    title={`Extract or launch isolated Antigravity v${item.version}`}
                                    tone="indigo"
                                    variant="filled"
                                    disabled={busy}
                                    onClick={() => void onAction("launch-sxs", { version: item.version })}
                                  />
                                ) : null}
                                <HubBulkActionButton
                                  icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📦</span>}
                                  label={row.version === item.version ? "Reinstall" : "Install"}
                                  title={`Snapshot current state and launch ${row.product} v${item.version} setup`}
                                  tone="amber"
                                  variant="filled"
                                  disabled={busy}
                                  onClick={() =>
                                    void onAction("launch-installer", {
                                      product: row.product,
                                      version: item.version,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

                {isSxs && row.version ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-sxs",
                      label: "Portable Side-by-Side Build Controls",
                      emoji: "🔀",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-2 text-xs">
                      <div className="text-[11px] text-[var(--muted)]">
                        Bound quota account in P0010:{" "}
                        <span className="font-mono text-emerald-300">{row.boundEmail || "Unbound"}</span>
                        {row.boundTier ? ` (${row.boundTier})` : ""} · Runtime:{" "}
                        <span className="font-mono text-[var(--text)]">
                          {row.isRunning
                            ? `${(row.runningPids || []).length} PIDs${
                                row.memoryMb && row.memoryMb > 0
                                  ? ` · ${row.memoryMb >= 1024 ? `${(row.memoryMb / 1024).toFixed(2)} GB` : `${row.memoryMb} MB`} RAM`
                                  : ""
                              }`
                            : "Stopped"}
                        </span>{" "}
                        · Shortcuts:{" "}
                        {row.desktopShortcutExists && row.startMenuShortcutExists ? "Desktop + Start Menu Ready" : "Missing"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🖥️</span>}
                          label={row.isRunning ? `Focus SxS v${row.version}` : `Launch SxS v${row.version}`}
                          title={row.isRunning ? `Focus SxS v${row.version}` : `Launch SxS v${row.version}`}
                          tone="indigo"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("launch-sxs", { version: row.version, relaunch: false })}
                        />
                        {row.isRunning ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔄</span>}
                            label="Relaunch"
                            title={`Restart SxS Antigravity v${row.version}`}
                            tone="amber"
                            variant="filled"
                            disabled={busy}
                            onClick={() => void onAction("launch-sxs", { version: row.version, relaunch: true })}
                          />
                        ) : null}
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔗</span>}
                          label="Create / Refresh .lnk Shortcuts"
                          title="Create Desktop and Start Menu .lnk shortcuts for this SxS build"
                          tone="neutral"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("create-shortcut", { version: row.version })}
                        />
                      </div>
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

                {isPrimaryIde ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-snapshots",
                      label: "App State Snapshots",
                      emoji: "💾",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--muted)]">
                          Backup and restore <code className="font-mono text-[var(--text)]">globalStorage</code> state before upgrades or rollbacks.
                        </span>
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📸</span>}
                          label="Snapshot Now"
                          title={`Capture backup snapshot of ${row.product} globalStorage`}
                          tone="sky"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("snapshot", { product: row.product, reason: "manual" })}
                        />
                      </div>
                      {stateSnapshots.length === 0 ? (
                        <p className="text-xs text-[var(--muted)]">No snapshots captured yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {stateSnapshots.slice(0, 5).map((snap) => (
                            <div
                              key={snap.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5"
                            >
                              <span className="font-mono text-[11px] text-[var(--text)]">
                                {snap.id} · {snap.reason}
                              </span>
                              <HubBulkActionButton
                                icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>♻️</span>}
                                label="Restore"
                                title={`Restore snapshot ${snap.id}`}
                                tone="amber"
                                variant="filled"
                                disabled={busy}
                                onClick={() =>
                                  void onAction("restore", { product: row.product, snapshotId: snap.id })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

                {isPrimaryIde ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-vsix",
                      label: "Core VSIX Vault",
                      emoji: "🧩",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--muted)]">
                          Offline VSIX extensions stored in <code className="font-mono text-[var(--text)]">.tools/ide-installers/extensions</code>
                        </span>
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔄</span>}
                          label="Sync VSIX Vault"
                          title="Scan and archive installed IDE VSIX extensions"
                          tone="sky"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("vsix-sync", { force: true })}
                        />
                      </div>
                      {vsixExtensions.length === 0 ? (
                        <p className="text-xs text-[var(--muted)]">No archived VSIX extensions found.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {vsixExtensions.map((ext) => (
                            <div
                              key={ext.fileName}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5"
                            >
                              <span className="font-mono text-[11px] text-[var(--text)]">
                                {ext.id} v{ext.version}
                              </span>
                              <HubBulkActionButton
                                icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📦</span>}
                                label="Install VSIX"
                                title={`Install ${ext.id} v${ext.version} into ${row.product}`}
                                tone="emerald"
                                variant="filled"
                                disabled={busy}
                                onClick={() =>
                                  void onAction("vsix-install", {
                                    product: row.product,
                                    fileNameOrId: ext.fileName,
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </HubAdmSectionBlock>
                ) : null}
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={row.log} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
