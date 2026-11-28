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
import type {
  DriveVaultSyncStatus,
  ManagedAppReleaseItem,
  ManagedAppRow,
  ManagedAppsResponse,
} from "../../lib/api";
import { DeskDetailNoteLogRails } from "../desk/DeskDetailNoteLogRails";
import { DeskOpsRuntimeRail } from "../desk/DeskOpsRuntimeRail";
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
  cursorReleases?: ManagedAppReleaseItem[];
  driveVaultSync?: DriveVaultSyncStatus | null;
  themeMod?: ManagedAppsResponse["themeMod"] | null;
  busyAction: string | null;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  onRefreshReleases: (force: boolean) => Promise<void>;
  onClose: () => void;
};

export function AppVersionDetailModal({
  row,
  releases,
  cursorReleases = [],
  driveVaultSync = null,
  themeMod = null,
  busyAction,
  onAction,
  onRefreshReleases,
  onClose,
}: Props) {
  const isAntigravity = row.product === "antigravity";
  const isCursor = row.product === "cursor";
  const isZalo = row.product === "zalo";
  const isPrimaryIde = row.kind === "primary" && (row.product === "antigravity" || row.product === "cursor");
  const isSxs = row.kind === "sxs";
  const busy = busyAction !== null;
  const activeReleases = isCursor ? cursorReleases : releases;

  const [selectedReleaseVer, setSelectedReleaseVer] = useState<string>("");
  useEffect(() => {
    if (!activeReleases.length) return;
    setSelectedReleaseVer((prev) => {
      if (prev && activeReleases.some((r) => r.version === prev)) return prev;
      return (
        activeReleases.find((r) => !r.archived && !r.unavailable) ||
        activeReleases.find((r) => r.archived) ||
        activeReleases[0]
      )?.version || "";
    });
  }, [activeReleases]);

  const toc = useMemo(
    () => [
      { id: "desk-app-overview", label: "Version & Status", emoji: "📦" },
      ...(isAntigravity ? [{ id: "desk-app-theme", label: "Theme & Quota", emoji: "🎨" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-guard", label: "Update Guard", emoji: "🛡️" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-installers", label: "Rollback Vault", emoji: "🗂️" }] : []),
      ...(isSxs ? [{ id: "desk-app-sxs", label: "Side-by-Side", emoji: "🔀" }] : []),
      ...(isZalo ? [{ id: "desk-app-zalo", label: "Zalo Multi-Instance", emoji: "💬" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-snapshots", label: "State Snapshots", emoji: "💾" }] : []),
      ...(isPrimaryIde ? [{ id: "desk-app-vsix", label: "Core VSIX", emoji: "🧩" }] : []),
      { id: "desk-app-console", label: "Console & History", emoji: "🖥️" },
    ],
    [isAntigravity, isPrimaryIde, isSxs, isZalo],
  );
  const sectionIds = useMemo(() => toc.map((t) => t.id), [toc]);

  const themePresets = useMemo(
    () =>
      themeMod?.presets || [
        { id: "cyber-horizon", label: "Cyber Horizon", kind: "procedural", accentColor: "#818cf8" },
        { id: "twilight-tide", label: "Twilight Tide", kind: "image", accentColor: "#38bdf8" },
        { id: "midnight-aurora", label: "Midnight Aurora", kind: "procedural", accentColor: "#2dd4bf" },
        { id: "obsidian-ember", label: "Obsidian Ember", kind: "procedural", accentColor: "#f59e0b" },
      ],
    [themeMod?.presets],
  );
  const globalPresetId = themeMod?.config?.preset || "cyber-horizon";
  const globalPresetLabel = themePresets.find((p) => p.id === globalPresetId)?.label || "Cyber Horizon";
  const sxsThemeOptions = useMemo<FilterOption[]>(
    () => [
      ...(isSxs
        ? [{ value: "inherit", label: `Default (${globalPresetLabel})`, emoji: "🎨" }]
        : []),
      ...themePresets.map((p) => ({
        value: p.id,
        label: p.label,
        emoji: p.id === "cyber-horizon" ? "🌌" : "🖼️",
      })),
    ],
    [globalPresetLabel, isSxs, themePresets],
  );
  const currentSxsThemeChoice = isSxs
    ? row.themeOverride
      ? row.themePreset || globalPresetId
      : "inherit"
    : globalPresetId;

  const releaseOptions = useMemo<FilterOption[]>(
    () =>
      activeReleases.map((rel) => ({
        value: rel.version,
        label: `v${rel.version}${
          rel.archived
            ? " · Vaulted"
            : rel.unavailable
              ? ` · Unavailable (${rel.unavailableStatus || 404})`
              : isCursor
                ? " · Cursor Official"
                : " · GCS Official"
        }`,
        emoji: rel.archived ? "✅" : rel.unavailable ? "⛔" : "☁️",
      })),
    [activeReleases, isCursor],
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
                {isZalo ? (
                  <>
                    <HubToolDetailModalSecondaryAction
                      label={row.isRunning ? "Relaunch" : "Launch"}
                      icon={Layers}
                      tone="emerald"
                      disabled={busy}
                      onClick={() => void onAction("launch-zalo", { id: row.id, relaunch: row.isRunning })}
                    />
                    {row.isRunning ? (
                      <HubToolDetailModalSecondaryAction
                        label="Stop"
                        icon={Square}
                        tone="rose"
                        disabled={busy}
                        onClick={() => void onAction("stop-zalo", { id: row.id })}
                      />
                    ) : null}
                    <HubToolDetailModalSecondaryAction
                      label="Sync to Latest"
                      icon={ShieldCheck}
                      tone="amber"
                      disabled={busy}
                      onClick={() =>
                        void onAction("sync-zalo-instances", {
                          instanceIds: [row.id],
                          includePrimary: row.kind === "primary",
                          stopRunning: true,
                          pruneOld: true,
                        })
                      }
                    />
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
                created={<HubAdmPlainRelativeTime at={row.createdAt || row.updated} />}
                updated={<HubAdmPlainRelativeTime at={row.updated} />}
                createdLabel="Created"
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
                      <DeskStatusKpiLabel status={row.status} screen="apps" />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Installed Version" headerEmoji="🏷️">
                      {row.version ? `v${row.version}` : "Not installed"}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Account" headerEmoji="👤">
                      {row.accountLabel || row.boundEmail || row.winUser || `${row.product} (${row.kind})`}
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
                    <DeskDetailReadonlyField label="Live RAM" headerEmoji="🧠" empty={!row.ramLabel}>
                      {row.ramLabel ? <span className="font-mono text-emerald-300">{row.ramLabel}</span> : null}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Pending Update" headerEmoji="⚠️">
                      {row.pendingUpdatePresent ? row.pendingFileName || "Staged updater detected" : "Clean (None)"}
                    </DeskDetailReadonlyField>
                  </div>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField
                      label="Disk Size"
                      headerEmoji="💾"
                      empty={!row.sizeLabel}
                    >
                      {row.sizeLabel ? <span className="font-mono">{row.sizeLabel}</span> : null}
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Created" headerEmoji="📅">
                      <HubAdmPlainRelativeTime at={row.createdAt || row.updated} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Last Updated" headerEmoji="🕒">
                      <HubAdmPlainRelativeTime at={row.updated} />
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

                {isAntigravity ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-theme",
                      label: "Theme & Quota",
                      emoji: "🎨",
                    })}
                  >
                    <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                      <DeskDetailReadonlyField label="ASAR Patch State" headerEmoji="🧩">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>
                            {isSxs
                              ? row.themePatched
                                ? `Patched${row.themeHasBackup ? " · Backup ready" : ""}`
                                : "Stock (Unpatched)"
                              : `${themeMod?.patchedCount ?? 0}/${themeMod?.totalCount ?? 0} SxS Patched`}
                          </span>
                          {row.themeHookRestartNeeded ? (
                            <span
                              className="rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200"
                              title="electron-hook.cjs was updated after this Antigravity window launched — restart IDE to load main-process changes"
                            >
                              Restart needed
                            </span>
                          ) : null}
                        </div>
                      </DeskDetailReadonlyField>
                      <DeskDetailReadonlyField label="Active Preset" headerEmoji="🌌">
                        {isSxs
                          ? `${row.themePresetLabel || globalPresetLabel}${row.themeOverride ? " (Override)" : " (Default)"}`
                          : globalPresetLabel}
                      </DeskDetailReadonlyField>
                      <DeskDetailReadonlyField label="Model Quota" headerEmoji="📊">
                        {row.quotaLabel || row.quotaCreditsLabel ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {row.quotaLabel ? <span className="font-mono text-emerald-300">{row.quotaLabel}</span> : null}
                            {row.quotaTierLabel ? (
                              <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-200">
                                {row.quotaTierLabel}
                              </span>
                            ) : null}
                            {row.quotaCreditsLabel ? (
                              <span
                                className="rounded-full border border-purple-400/35 bg-purple-500/15 px-1.5 py-0.5 font-mono text-[10px] text-purple-200"
                                title="AI Credits"
                              >
                                {row.quotaCreditsLabel}
                              </span>
                            ) : null}
                            {row.quotaUpdatedAt ? (
                              <span
                                className="text-[10px] text-[var(--muted)]"
                                title={new Date(row.quotaUpdatedAt).toLocaleString()}
                              >
                                Synced <HubAdmPlainRelativeTime at={row.quotaUpdatedAt} /> (
                                {new Date(row.quotaUpdatedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: false,
                                })}
                                )
                              </span>
                            ) : null}
                          </div>
                        ) : themeMod?.config?.showSidebarQuota === false ? (
                          "Sidebar Quota Hidden"
                        ) : (
                          "Live Sidebar Quota (Ctrl+Shift+M Zen)"
                        )}
                      </DeskDetailReadonlyField>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      <span className="text-[11px] text-[var(--muted)]">
                        {isSxs
                          ? `Select visual preset for Antigravity v${row.version} (defaults to Cyber Horizon).`
                          : "Global default visual theme for all Antigravity builds — lightweight single-pass glass + seamless borderless sidebar."}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <HubSingleFilterDropdown
                          filterKey={isSxs ? `p0001-theme-${row.version}` : "p0001-theme-global"}
                          label="Theme"
                          options={sxsThemeOptions}
                          value={currentSxsThemeChoice}
                          onChange={(nextVal) => {
                            if (isSxs && row.version) {
                              const scopeKey = `version:v${row.version.replace(/^v/i, "")}`;
                              if (nextVal === "inherit") {
                                void onAction("theme-config", { scopeKey, clearScopeOverride: true });
                              } else {
                                void onAction("theme-config", {
                                  scopeKey,
                                  scopePatch: { preset: nextVal },
                                });
                              }
                            } else {
                              const picked = themePresets.find((p) => p.id === nextVal);
                              void onAction("theme-config", {
                                preset: nextVal,
                                ...(picked ? { accentColor: picked.accentColor } : {}),
                              });
                            }
                          }}
                          disabled={busy}
                          usePortal
                          triggerFormat="value"
                        />
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🎨</span>}
                          label={isSxs ? (row.themePatched ? "Re-apply Mod" : "Apply Theme") : "Apply Closed SxS"}
                          title={
                            isSxs && row.isRunning
                              ? "Close this Antigravity window first before patching ASAR"
                              : "Inject seamless glass backdrop, Cyber Horizon palette & live Sidebar Quota"
                          }
                          tone="emerald"
                          variant="filled"
                          disabled={busy || Boolean(isSxs && row.isRunning)}
                          onClick={() =>
                            void onAction("theme-apply", isSxs && row.version ? { version: row.version } : {})
                          }
                        />
                        {(!isSxs || row.themeHasBackup) ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>↩️</span>}
                            label={isSxs ? "Restore Stock" : "Restore All"}
                            title="Restore original unpatched app.asar from .agy-theme.bak"
                            tone="amber"
                            variant="filled"
                            disabled={busy || Boolean(isSxs && row.isRunning)}
                            onClick={() =>
                              void onAction("theme-restore", isSxs && row.version ? { version: row.version } : {})
                            }
                          />
                        ) : null}
                        {!isSxs ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🌌</span>}
                            label="Reset Cyber Horizon"
                            title="Reset global Theme Mod defaults to lightweight Cyber Horizon + Live Quota"
                            tone="sky"
                            variant="filled"
                            disabled={busy}
                            onClick={() =>
                              void onAction("theme-config", {
                                enabled: true,
                                preset: "cyber-horizon",
                                composerGradient: "cyan-indigo",
                                quotaAccent: "cyan",
                                accentColor: "#818cf8",
                                backdropDim: 0.24,
                                sidebarOpacity: 0.42,
                                panelOpacity: 0.72,
                                codeOpacity: 0.74,
                                quotaOpacity: 0.56,
                                composerOpacity: 0.8,
                                wallpaperBlurPx: 0,
                                showSidebarQuota: true,
                                overrides: {},
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

                {isZalo ? (
                  <HubAdmSectionBlock
                    {...deskDetailSectionProps({
                      id: "desk-app-zalo",
                      label: "Zalo Multi-Instance Controls",
                      emoji: "💬",
                      sectionKey: "identity",
                    })}
                  >
                    <div className="space-y-2 text-xs">
                      <div className="text-[11px] text-[var(--muted)]">
                        Account:{" "}
                        <span className="font-mono text-emerald-300">{row.accountLabel || row.winUser || "Current User"}</span> · Active:{" "}
                        <span className="font-mono text-[var(--text)]">
                          {row.version ? `v${row.version}` : "None"}
                        </span>{" "}
                        · Latest Fleet:{" "}
                        <span className="font-mono text-sky-300">
                          {row.latestVersion ? `v${row.latestVersion}` : "Unknown"}
                        </span>{" "}
                        · Live RAM:{" "}
                        <span className="font-mono text-emerald-300">
                          {row.ramLabel || (row.isRunning ? `${row.runningPids?.length ?? 0} procs` : "Stopped")}
                        </span>{" "}
                        · ZaloData:{" "}
                        <span className="font-mono text-[var(--text)]">
                          {row.zaloDataAccessible
                            ? row.zaloDataOnDBytes
                              ? `On C: ${row.zaloDataOnCLabel || "0 B"} · Junction D: ${row.zaloDataOnDLabel || "0 B"}`
                              : `${row.zaloDataLabel || "0 B"}`
                            : row.winUser
                              ? `User ACL (${row.winUser})`
                              : "Unavailable"}
                        </span>{" "}
                        {row.zaloDataAccessible &&
                        (row.zaloDataJunctions?.media?.linked || row.zaloDataJunctions?.database?.linked) ? (
                          <>
                            · Junctions:{" "}
                            <span className="font-mono text-sky-300">
                              {[
                                row.zaloDataJunctions?.media?.linked
                                  ? `media→D (${row.zaloDataJunctions.media.label || "linked"})`
                                  : null,
                                row.zaloDataJunctions?.database?.linked
                                  ? `Database→D (${row.zaloDataJunctions.database.label || "linked"})`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>{" "}
                          </>
                        ) : null}
                        · Cred:{" "}
                        <span className={row.savedCredReady ? "font-mono text-emerald-300" : "font-mono text-amber-300"}>
                          {row.savedCredReady ? "Saved (/savecred)" : "Needs /savecred"}
                        </span>
                      </div>
                      {!row.savedCredReady && row.savecredCommand ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                          <div>One-time Credential setup for {row.winUser} (run once in elevated/user cmd to cache password):</div>
                          <div className="mt-1">
                            <HubDirectoryReadonlyCopyText value={row.savecredCommand} />
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔄</span>}
                          label={row.outdated ? `Upgrade to v${row.latestVersion || "Latest"}` : "Verify & Repair Instance"}
                          title="Sync this Zalo Desktop directory from the newest verified local build"
                          tone={row.outdated ? "amber" : "emerald"}
                          variant="filled"
                          disabled={busy}
                          onClick={() =>
                            void onAction("sync-zalo-instances", {
                              instanceIds: [row.id],
                              includePrimary: row.kind === "primary",
                              stopRunning: true,
                              pruneOld: true,
                            })
                          }
                        />
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🖥️</span>}
                          label={row.isRunning ? "Relaunch Zalo" : "Launch Zalo"}
                          title={`Launch ${row.name} via ${row.winUser || "current user"}`}
                          tone="indigo"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("launch-zalo", { id: row.id, relaunch: row.isRunning })}
                        />
                        {row.isRunning ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>⏹️</span>}
                            label="Stop Zalo"
                            title={`Stop ${row.name}`}
                            tone="rose"
                            variant="filled"
                            disabled={busy}
                            onClick={() => void onAction("stop-zalo", { id: row.id })}
                          />
                        ) : null}
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🧹</span>}
                          label={
                            row.zaloDataAccessible && (row.zaloDataCacheBytes ?? 0) > 0 && row.zaloDataCacheLabel
                              ? `Clean Cache (${row.zaloDataCacheLabel})`
                              : "Clean Cache"
                          }
                          title="Safely delete Chromium Cache / GPUCache / Code Cache / DawnCache (preserves chat DB & sessions)"
                          tone="sky"
                          variant="filled"
                          disabled={busy}
                          onClick={() => void onAction("clean-zalo-cache", { instanceIds: [row.id] })}
                        />
                        {(row.zaloDataAccessible || row.savedCredReady) && !row.zaloDataJunctions?.media?.linked ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>💾</span>}
                            label={
                              row.zaloDataJunctions?.media?.label
                                ? `Offload Media -> D: (${row.zaloDataJunctions.media.label})`
                                : "Offload Media -> D:"
                            }
                            title={
                              row.isRunning
                                ? "Stop Zalo before offloading media to D:"
                                : row.savecredCommand
                                  ? `Safely copy ${row.winUser} ZaloData/media to D: via /savecred and replace with an NTFS Directory Junction`
                                  : "Safely copy ZaloData/media to D: and replace with an NTFS Directory Junction"
                            }
                            tone="amber"
                            variant="filled"
                            disabled={busy || row.isRunning}
                            onClick={() => void onAction("offload-zalo-data", { instanceId: row.id, folder: "media" })}
                          />
                        ) : null}
                        {(row.zaloDataAccessible || row.savedCredReady) && !row.zaloDataJunctions?.database?.linked ? (
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🗄️</span>}
                            label={
                              row.zaloDataJunctions?.database?.label
                                ? `Offload DB -> D: (${row.zaloDataJunctions.database.label})`
                                : "Offload DB -> D:"
                            }
                            title={
                              row.isRunning
                                ? "Stop Zalo before offloading Database to D:"
                                : row.savecredCommand
                                  ? `Safely copy ${row.winUser} ZaloData/Database to D: via /savecred and replace with an NTFS Directory Junction`
                                  : "Safely copy ZaloData/Database to D: and replace with an NTFS Directory Junction"
                            }
                            tone="amber"
                            variant="filled"
                            disabled={busy || row.isRunning}
                            onClick={() => void onAction("offload-zalo-data", { instanceId: row.id, folder: "Database" })}
                          />
                        ) : null}
                        <HubBulkActionButton
                          icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔗</span>}
                          label="Repair Shortcuts"
                          title={`Create or repair Start Menu & Desktop shortcuts for ${row.name}`}
                          tone="sky"
                          variant="filled"
                          disabled={busy}
                          onClick={() =>
                            void onAction("repair-zalo-shortcuts", {
                              instanceIds: [row.id],
                              createStartMenu: true,
                              createDesktop: true,
                            })
                          }
                        />
                      </div>
                    </div>
                  </HubAdmSectionBlock>
                ) : null}

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
                      {(isAntigravity || isCursor) ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                          <div className="space-y-0.5 text-[11px] text-[var(--muted)]">
                            <div>
                              Cloud Mirror:{" "}
                              <code className="font-mono text-[var(--text)]">
                                {driveVaultSync?.code || "JB0006"} · {driveVaultSync?.remote || "gdrive:IDE-Installers-Vault"}
                              </code>
                            </div>
                            <div>
                              {driveVaultSync
                                ? `${driveVaultSync.syncedCount} synced file(s) · Status: ${driveVaultSync.status}${
                                    driveVaultSync.lastSuccessfulSyncAt
                                      ? ` · Last mirror: ${new Date(driveVaultSync.lastSuccessfulSyncAt).toLocaleString()}`
                                      : ""
                                  }`
                                : "Configure JB0006 in Folder Sync jobs"}
                            </div>
                          </div>
                          <HubBulkActionButton
                            icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>☁️</span>}
                            label={
                              busyAction === "sync-drive-vault" || driveVaultSync?.status === "running"
                                ? "Syncing JB0006..."
                                : "Sync Drive Vault"
                            }
                            title="Run JB0006 mirror-local upload to gdrive:IDE-Installers-Vault now"
                            tone="indigo"
                            variant="filled"
                            disabled={busy || !driveVaultSync?.jobId || driveVaultSync.status === "running"}
                            onClick={() => void onAction("sync-drive-vault")}
                          />
                        </div>
                      ) : null}

                      {(isAntigravity || isCursor) && releaseOptions.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            Download official {isCursor ? "Cursor" : "Antigravity"} releases to{" "}
                            <code className="font-mono text-[var(--text)]">.tools/ide-installers</code>
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <HubSingleFilterDropdown
                              filterKey={isCursor ? "p0001-cursor-release" : "p0001-ag-release"}
                              label={isCursor ? "Cursor Build" : "GCS Build"}
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
                              title={`Download selected ${row.product} release into .tools/ide-installers`}
                              tone="emerald"
                              variant="filled"
                              disabled={busy || !selectedReleaseVer}
                              onClick={() =>
                                void onAction("fetch-release", {
                                  product: row.product,
                                  version: selectedReleaseVer,
                                })
                              }
                            />
                            {isAntigravity ? (
                              <>
                                <HubBulkActionButton
                                  icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>📥</span>}
                                  label={busyAction === "fetch-all-releases" ? "Archiving..." : "Archive All Public"}
                                  title="Archive all public Antigravity releases from GCS into installer vault and add latest builds to Start Menu & Tiles"
                                  tone="indigo"
                                  variant="filled"
                                  disabled={busy}
                                  onClick={() => void onAction("fetch-all-releases", { limit: 0, unpackLatestCount: 3 })}
                                />
                                <HubBulkActionButton
                                  icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🚀</span>}
                                  label={busyAction === "sync-start-menu-latest" ? "Adding..." : "Start Menu Latest"}
                                  title="Unpack latest archived Antigravity builds and pin them to Windows Start Menu & Start Tiles"
                                  tone="sky"
                                  variant="filled"
                                  disabled={busy}
                                  onClick={() => void onAction("sync-start-menu-latest", { latestCount: 3 })}
                                />
                              </>
                            ) : null}
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
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-app-console", label: "Live Console & History", emoji: "🖥️" })}>
                  <div className="h-[420px] overflow-hidden rounded-xl border border-white/10">
                    <DeskOpsRuntimeRail kind="runner" targetId={row.id} targetLabel={row.name} tabActive />
                  </div>
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={row.log} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
