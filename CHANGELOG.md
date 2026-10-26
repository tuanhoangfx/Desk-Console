# Changelog

## 2026-10-26 - Sibling Video Lab P0006 path sync

- Version: `3.1.59`
- Timestamp: 2026-10-26 19:06 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Updated DESK_SIBLINGS Video Lab code and winUnpackedGlob path from legacy P0010-Video-Lab to P0006-Video-Lab in host/desk-siblings.mjs.

### Verification

- directory-table-col-parity · hub-ui-boot-check

---
## 2026-10-26 - Place Drive Sync above Clips with official Google Drive triangle icon and package NSIS release

- Version: `3.1.58`
- Timestamp: 2026-10-26 18:46 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Move Drive Sync (Jobs, Drives) to the top of the sidebar above Clips, replace generic Google G favicon in google-drive.png with the official 6-color Google Drive triangle logo across all tools, and package Desk Console Setup 3.1.57.exe

### Verification

- node --test Tool/P0001-Desk-Console/host/*.test.mjs + NSIS package + Stealth UI E2E

---
## 2026-10-26 - Drives/Jobs directory-table-col-parity SSOT

- Version: `3.1.57`
- Timestamp: 2026-10-26 18:41 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Extract drives-directory-cells.tsx and jobs-directory-cells.tsx using DirectoryTableBodyCell + buildDirectoryColgroupForShell({ showSelect })

### Verification

- node Tool/scripts/directory-table-col-parity.mjs --code P0001

---
## 2026-10-26 - Group Jobs and Drives under Drive Sync parent menu

- Version: `3.1.56`
- Timestamp: 2026-10-26 18:36 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Group Jobs and Drives sidebar tabs under a collapsible Drive Sync parent menu using the official Google Drive brand icon (brandIcon: google-drive) and HubSidebarNavGroup + NavGroupSubNav SSOT

### Verification

- node --test Tool/P0001-Desk-Console/host/*.test.mjs + Stealth UI E2E

---
## 2026-10-26 - AppErrorBoundary + checkAndReloadIfBundleSkewed

- Version: `3.1.55`
- Timestamp: 2026-10-26 18:32 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Wrap P0001 root in AppErrorBoundary with checkAndReloadIfBundleSkewed on uncaught render crash

### Verification

- node Tool/scripts/hub-ui-boot-check.mjs --code P0001

---
## 2026-10-26 - Hub-UI typography SSOT parity (text-xs across Drives/Jobs/Tree)

- Version: `3.1.54`
- Timestamp: 2026-10-26 17:41 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replaced legacy text-[11px] meta classes with text-xs across 10 Drives, Jobs, Onboarding, and Tree components for Hub-UI typography SSOT parity.

### Verification

- node Tool/scripts/hub-ui-duplication-check.mjs (OK)

---
## 2026-10-26 - Lock Runners tab with Lock icon on End-User machines & retire Folder Sync shortcuts/install

- Version: `3.1.53`
- Timestamp: 2026-10-26 17:07 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added locked + Lock icon support to HubSidebarNavScreenButton when hasDevWorkspace is false on end-user machines, and added automatic cleanup of retired Folder Sync processes, shortcuts, and binary folder on startup and packaging.

### Verification

- tsc --noEmit, vite build, hub-ui-parity-check, 36/36 host unit tests, Prod repackage & launch

---
## 2026-10-26 - Unify P0009 Folder Sync & P0001 Desk Console into unified Desk Console

- Version: `3.1.52`
- Timestamp: 2026-10-26 16:09 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Merged P0009 Folder Sync (Jobs, Drives, Rclone bisync, OAuth, Network QoS) into P0001 Desk Console with 5 unified tabs (Clips, Jobs, Drives, Runners, System), standardized HubSplitDirectoryPane topbar/KPI layout, and bundled rclone + koffi.

### Verification

- tsc --noEmit, vite build, hub-ui-parity-check, 36/36 host unit tests, Prod packaging & E2E smoke

---
## 2026-10-25 - Fix Clips topbar-to-filter/KPI vertical spacing parity

- Version: `3.1.51`
- Timestamp: 2026-10-25 01:33 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Restore var(--app-tab-header-py) bottom padding and var(--app-tab-header-min-h) height on stacked .hub-chrome-sticky > .app-tab-header and deduplicate .hub-tab-kpi-zone top margin in hub-shell-layout.css so P0001 Clips topbar has balanced 10.8px (0.75rem) breathing room above FilterBar/KPI matching Runners and System.

### Verification

- CDP bounding-rect verification on :9311 (Clips header height 52.6px, 10.8px gap above FilterBar, 10.8px gap to KPI strip) + hub-ui-parity-check P0001 passed

---
## 2026-10-25 - FilterBar Progressive Collapse & Desktop Exe SSOT

- Version: `3.1.50`
- Timestamp: 2026-10-25 01:19 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Adopt FilterBar progressive collapse SSOT and desktop-open.mjs SSOT

### Verification

- desktop-exe-ssot --code P0001 --action pack --lane agent

---
## 2026-10-24 - Stage-stamp cache for koffi native modules in assemble-unpacked.mjs

- Version: `3.1.49`
- Timestamp: 2026-10-24 17:49 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added .stage-stamp.json SHA-256 fast-path in scripts/assemble-unpacked.mjs to skip redundant koffi native binary copies on warm builds, and synced electron-builder-pack-guard.cjs.

### Verification

- node ../scripts/lib/sync-electron-shared-libs.cjs

---
## 2026-10-24 - Add --replace & WMI Job-Breakaway to open-dev-electron-window.mjs

- Version: `3.1.48`
- Timestamp: 2026-10-24 17:13 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Support --replace in scripts/open-dev-electron-window.mjs and spawn via WMI Win32_Process.Create first in win-shell-env.cjs so Desk Console survives agent command Job Object close without background sleep daemons.

### Verification

- node scripts/open-dev-electron-window.mjs --replace

---
## 2026-10-24 - Lossless clips-media/<id>.png file storage & transparent migration

- Version: `3.1.47`
- Timestamp: 2026-10-24 09:40 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Extract clipboard PNG base64 strings out of clips.json/samples.json into lossless clips-media/<id>.png files with in-memory hydration cache and GET /api/clips/:id/image endpoint, shrinking clips.json from ~13.3 MB to <150 KB with 100% lossless image fidelity.

### Verification

- 36/36 tests in host/desk-host.test.mjs pass.

---
## 2026-10-24 - Automatic background Stealth headless-farm & smoke-tab sweeper

- Version: `3.1.46`
- Timestamp: 2026-10-24 08:51 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Add startAutoPcMaintenanceWatch() in host/pc-optimizer.mjs and wire it on host startup so leaked Smoke Pool tabs (9990-9999) and idle headless farm profiles (0022-5999, excluding 0001-0021/0059/0069) are automatically cleaned in the background every 2 minutes.

### Verification

- 36/36 tests in host/desk-host.test.mjs pass.

---
## 2026-10-24 - Clips directory summary=1 payload & on-demand detail image load

- Version: `3.1.45`
- Timestamp: 2026-10-24 05:41 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Strip base64 imageDataUrl from GET /api/clips?summary=1 directory polling (<40 KB vs ~15 MB) while preserving hasImage/imageWidth/imageHeight and loading full imageDataUrl on-demand via GET /api/clips/:id in ClipDetailModal.

### Verification

- 36/36 tests in host/desk-host.test.mjs pass; tsc -b && vite build clean.

---
## 2026-10-24 - Win32 SetWindowRgn corner-overhang X close button without outer frame + zero-CPU GetClipboardSequenceNumber & mtimeMs JSON cache

- Version: `3.1.44`
- Timestamp: 2026-10-24 05:08 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Restored overhanging corner X close button (top -9px, right -9px, 32x32) on the Paste modal while eliminating the outer blue frame via Win32 SetWindowRgn (CreateRoundRectRgn + CreateEllipticRgn union in electron/hwnd-once.cjs); added Win32 GetClipboardSequenceNumber fast-path in electron/main.cjs and host/clip-watch.mjs so idle clipboard polling uses 0% CPU and 0 PNG encoding; added mtimeMs+size in-memory JSON cache in host/store.mjs and electron/picker-store.cjs; capped K32EmptyWorkingSet in host/pc-optimizer.mjs to top 16 bloated processes (>=200 MB) and parallelized smoke pool probes.

### Verification

- tsc -b && vite build, desk-host.test.mjs (35/35 pass), live Electron Paste modal SetWindowRgn verification

---
## 2026-10-24 - Remove outer blue border and smartTag row badges in Paste modal for lightweight performance

- Version: `3.1.43`
- Timestamp: 2026-10-24 04:27 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed outer 10px #060911 border/radial-gradient and smartTag badges (Path/URL/WxH) from ClipPickerPage.tsx; stripped backdrop-blur, shadow-2xl, and scale transitions; added async/lazy image decoding for smooth 60fps rendering on any device.

### Verification

- tsc --noEmit, vite build, host/desk-host.test.mjs 35/35, and live CDP screenshot verification on Desk Console DEV v3.1.43

---
## 2026-10-24 - Add Clips Format column, SSOT HubDirectoryRowPinButton, emoji icons in Paste modal, and Quick Image Preview

- Version: `3.1.42`
- Timestamp: 2026-10-24 04:02 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Promoted HubDirectoryRowPinButton to @tool-workspace/hub-ui (shared by P0020 Notes and P0001 Clips); replaced 1..9 count badges with SSOT pin button in Paste modal and Clips Name column; added dedicated Format column to Clips directory table; unified format emoji icons across Paste modal and directory; added Hover/Space Quick Image Preview in Paste modal.

### Verification

- tsc --noEmit, vite build, host/desk-host.test.mjs 35/35, and live CDP screenshot verification on Desk Console DEV v3.1.42

---
## 2026-10-24 - Fix Paste modal freeze on Windows by removing WS_EX_LAYERED transparent window under software acceleration

- Version: `3.1.41`
- Timestamp: 2026-10-24 03:16 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed transparent:true from createPicker() (incompatible with app.disableHardwareAcceleration() on Windows, which froze UpdateLayeredWindow repaints and broke Win32 WM_NCHITTEST mouse hit-testing), removed raw Win32 ShowWindow before pickerWindow.show(), disabled -webkit-app-region:drag HTCAPTION overlap on header/close button, and added direct paste into mainWindow when opened from Desk Console.

### Verification

- tsc --noEmit, vite build, host/desk-host.test.mjs 34/34, and Win32 + CDP live verification on Desk Console DEV v3.1.41

---
## 2026-10-24 - SSOT corner X button on Paste modal, Format filter (Text/Link/Image/JSON/Color/Path), and F search shortcut

- Version: `3.1.40`
- Timestamp: 2026-10-24 02:57 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Positioned HubModalCloseButton at the SSOT modal corner edge (top: -0.55rem; right: -0.55rem) with 12px transparent window padding; added Format filter (Text, Link, Image, JSON, Color, Path) to ClipPickerPage and ClipsScreen; wired setHubActiveScreen and F/Esc keyboard shortcut parity on ClipPickerPage.

### Verification

- tsc --noEmit + vite build + live Electron CDP verification

---
## 2026-10-24 - Auto-compact image history (25 cap) + instant Win32 showPicker near cursor & Ctrl+Backquote alias

- Version: `3.1.39`
- Timestamp: 2026-10-24 02:35 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Implemented IMAGE_HISTORY_CAP = 25 in host/store.mjs to keep clips.json fast (<10ms); updated showPicker in electron/main.cjs to position near cursor, invoke forceShowWindowWin32 + show/focus immediately without waiting for modifier release, and registered Ctrl+Backquote (Ditto standard) alongside Ctrl+Shift+Q.

### Verification

- 34/34 desk-host.test.mjs + live Electron CDP verification

---
## 2026-10-24 - Fix dev black screen when Vite :5180 is offline + add smart clip tags (URL/Color/JSON/Path) & 1-9 hotkeys

- Version: `3.1.38`
- Timestamp: 2026-10-24 00:38 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Auto-start Vite :5180 in open-dev-electron-window.mjs; add automatic dist/index.html fallback on did-fail-load and hide default Electron menu bar in main.cjs; add smart content detection (Color swatch, URL, Path, JSON, Image dimensions) and 1-9 quick paste hotkeys in ClipPickerPage, ClipsScreen, and ClipDetailModal.

### Verification

- tsc --noEmit + vite build + live Electron DOM verification

---
## 2026-10-24 - Win+V parity for Clips (Paste at caret, Image Clipboard, Picker layout & Z-order fix) + remove legacy Tasks screen

- Version: `3.1.37`
- Timestamp: 2026-10-24 00:21 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Fixed Win32 SendInput Ctrl+V in win-paste.cjs (removed KEYEVENTF_UNICODE with wScan=0); fixed mainWindow.blur() Z-order drop on Ctrl+Shift+Q; added native Electron + PowerShell image clipboard capture, storage, preview, and paste; fixed ClipPickerPage close button and filter row layout; removed obsolete Tasks screen; wired win-rename-retry into run-electron-package.mjs and eliminated empty vendor-supabase chunk.

### Verification

- tsc --noEmit + 34/34 desk-host.test.mjs + live Vite build & Electron dev runtime

---
## 2026-10-23 - Clean origin-pg SDK type declarations, HubEntityLogActor SSOT, and production desktop build

- Version: `3.1.36`
- Timestamp: 2026-10-23 23:43 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Updated P0001 origin-pg PostgREST/GoTrue SDK type declarations and DeskDetailNoteLogRails HubEntityLogActor shape so tsc --noEmit passes with 0 errors across P0001, hub-identity, and hub-ui; packaged production win-unpacked and NSIS installer.

### Verification

- tsc --noEmit (0 errors) + run-electron-package.mjs

---
## 2026-10-23 - Fix SystemScreen HubBulkActionButton React child crash, zero TS errors, interactive desktop spawn & boot-recovery listener guard

- Version: `3.1.35`
- Timestamp: 2026-10-23 23:04 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Fixed SystemScreen passing raw forwardRef Lucide components to HubBulkActionButton icon prop (React child crash), resolved all TypeScript strict errors across P0001-Desk-Console/src, promoted spawnInteractiveDesktopProcess (winsta0\default) into Tool/scripts/lib/win-shell-env.cjs, and prevented electron-dev-boot-recovery WebContents did-stop-loading listener accumulation while loading.

### Verification

- tsc --noEmit + vite build + 34/34 unit tests + hub-ui-parity-check + audit-p0001-desk-directory + live Stealth E2E across Clips/Runners/Tasks/System/Picker

---
## 2026-10-23 - Bind open-dev-electron-window to winsta0\\default via CreateProcessW

- Version: `3.1.34`
- Timestamp: 2026-10-23 22:42 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Ensure Dev Electron window spawns on the user's interactive winsta0\\default desktop even when launched from an isolated agent shell.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Force Win32 SW_RESTORE and SW_SHOW on Electron mainWindow

- Version: `3.1.33`
- Timestamp: 2026-10-23 22:35 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Call Win32 ShowWindow(SW_RESTORE/SW_SHOW) via koffi in hwnd-once.cjs so Dev Electron window is always visible even when spawned from a hidden shell.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Spawn electron.exe GUI binary directly with windowsHide false

- Version: `3.1.32`
- Timestamp: 2026-10-23 22:32 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Avoid Windows SW_HIDE inheritance from node.exe wrapper when launching Dev Electron window.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Show Dev Electron window on ready-to-show and fast Toolhelp32 Cursor probe

- Version: `3.1.31`
- Timestamp: 2026-10-23 22:31 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Ensure mainWindow.show() runs on ready-to-show when not --hidden and accelerate shared isCursorProcessRunning() via koffi Toolhelp32.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Fast native Cursor probe on /api/health and Hub-UI SSOT SystemScreen

- Version: `3.1.30`
- Timestamp: 2026-10-23 22:24 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replace synchronous tasklist.exe spawn on /api/health with <2ms koffi Toolhelp32 probe and standardize SystemScreen on KpiStrip, HubBulkActionButton, and DeskDetailReadonlyField.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Standardize SystemScreen UI on Hub-UI SSOT and remove OE sparklines

- Version: `3.1.29`
- Timestamp: 2026-10-23 22:20 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replace custom SVG sparklines, hand-rolled KPI boxes, and raw HTML table in SystemScreen with KpiStrip, HubBulkActionButton, DeskDetailReadonlyField, and HubDirectoryReadonlyCopyText.

### Verification

- node Tool/scripts/hub-ui-parity-check.mjs --code P0001 && node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Add 1-10x Clone to TaskDetailModal and ClipDetailModal

- Version: `3.1.28`
- Timestamp: 2026-10-23 22:18 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added SSOT Clone action (CopyPlus + HubCloneConfirmDialog) to TaskDetailModal and ClipDetailModal in P0001 Desk Console.

### Verification

- tsc --noEmit & hub-modal-detail-footer-gate

---
## 2026-10-23 - PC Optimizer 60-sample telemetry sparklines

- Version: `3.1.27`
- Timestamp: 2026-10-23 22:04 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Add zero-overhead 60-sample ring buffer and SVG sparklines for CPU load, Free RAM, and OS Handles/Smoke tabs in SystemScreen.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - PC Optimizer remove EVKey64 and fast working-set trim

- Version: `3.1.26`
- Timestamp: 2026-10-23 21:10 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Remove EVKey64 hook monitoring/restart from PC Optimizer, replace KPI with Free RAM, and skip K32EmptyWorkingSet on helpers under 25 MB.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-23 - Native Win32 PC Optimizer & Host Diagnostics (System Tab)

- Version: `3.1.25`
- Timestamp: 2026-10-23 20:36 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added host/pc-optimizer.mjs (koffi Toolhelp32 + GetGuiResources + K32EmptyWorkingSet + GetProcessGroupAffinity + Stealth 9990-9999 smoke tab cleaner + EVKey64 hook reset), GET /api/pc/diagnostics, POST /api/pc/optimize, and SystemScreen PC Optimizer section.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs (33/33 pass) + audit-p0001-desk-directory --strict + vite build

---
## 2026-10-23 - Version bump

- Version: `3.1.24`
- Timestamp: 2026-10-23 19:00 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Wire shared electron-builder-pack-guard.cjs (afterExtract + afterPack default_app.asar cleanup and app.asar byte-offset/SHA-256 integrity verification) and exclude workspace @tool-workspace/** + renderer-only node_modules from app.asar.

### Verification

- pending

---
## 2026-10-22 - Version bump

- Version: `3.1.23`
- Timestamp: 2026-10-22 05:14 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Release v3.1.23.

### Verification

- pending

---
## 2026-10-22 - Version bump

- Version: `3.1.22`
- Timestamp: 2026-10-22 04:52 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Release v3.1.22.

### Verification

- pending

---
## 2026-10-22 - Auto-sync shared Electron libs in run-electron-package & duplication parity gate

- Version: `3.1.21`
- Timestamp: 2026-10-22 04:39 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Release v3.1.21.

### Verification

- pending

---
## 2026-10-22 - Shared Electron dev-boot recovery SSOT & hub-boot-fallback auto-reconnect

- Version: `3.1.20`
- Timestamp: 2026-10-22 04:23 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Release v3.1.20.

### Verification

- pending

---
## 2026-10-22 - Patch bump for completed agent task

- Version: `3.1.19`
- Timestamp: 2026-10-22 02:47 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Patch bump for uncommitted code changes (P0001).

### Verification

- pending

---
## 2026-10-20 - Patch bump for completed agent task

- Version: `3.1.18`
- Timestamp: 2026-10-20 18:10 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-20 - Patch bump for completed agent task

- Version: `3.1.17`
- Timestamp: 2026-10-20 17:45 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-20 - Patch bump for completed agent task

- Version: `3.1.16`
- Timestamp: 2026-10-20 15:56 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-18 - Patch bump for completed agent task

- Version: `3.1.15`
- Timestamp: 2026-10-18 04:13 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-18 - Patch bump for completed agent task

- Version: `3.1.14`
- Timestamp: 2026-10-18 03:22 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-18 - Patch bump for completed agent task

- Version: `3.1.13`
- Timestamp: 2026-10-18 01:18 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-18 - Patch bump for completed agent task

- Version: `3.1.12`
- Timestamp: 2026-10-18 00:31 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-10-17 - Patch bump for completed agent task

- Version: `3.1.11`
- Timestamp: 2026-10-17 20:29 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.10`
- Timestamp: 2026-09-15 03:03 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.9`
- Timestamp: 2026-09-15 02:50 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.8`
- Timestamp: 2026-09-15 02:43 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.7`
- Timestamp: 2026-09-15 01:49 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.6`
- Timestamp: 2026-09-15 01:23 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-15 - Patch bump for completed agent task

- Version: `3.1.5`
- Timestamp: 2026-09-15 01:15 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `3.1.4`
- Timestamp: 2026-09-13 07:00 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `3.1.3`
- Timestamp: 2026-09-13 06:26 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Version bump

- Version: `3.1.2`
- Timestamp: 2026-09-13 06:15 (UTC+7)
- Type: Patch
- Status: Verified
- Release: http://127.0.0.1:5180

### Changes

- Release v3.1.2.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task (release)

- Version: `3.1.1`
- Timestamp: 2026-09-13 06:08 (UTC+7)
- Type: Patch
- Status: Verified
- Release: http://127.0.0.1:5180

### Changes

- Release Major bump (P0001): 2.1.7 → 3.1.1 (MAJOR+1, MINOR=1, PATCH=1).

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `2.1.7`
- Timestamp: 2026-09-13 05:58 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `2.1.6`
- Timestamp: 2026-09-13 05:48 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `2.1.5`
- Timestamp: 2026-09-13 05:18 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task

- Version: `2.1.4`
- Timestamp: 2026-09-13 05:03 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-13 - Patch bump for completed agent task (release)

- Version: `2.1.3`
- Timestamp: 2026-09-13 04:50 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-04 - Patch bump for completed agent task (release)

- Version: `2.1.1`
- Timestamp: 2026-09-04 18:58 (UTC+7)
- Type: Patch
- Status: Committed

### Changes

- Release Major bump (P0001): 1.1.1 → 2.1.1 (MAJOR+1, MINOR=1, PATCH=1).

### Verification

- pending

---
## 2026-09-04 - Patch bump for completed agent task (release)

- Version: `1.1.1`
- Timestamp: 2026-09-04 18:55 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Release Major bump (P0001): 0.1.66 → 1.1.1 (MAJOR+1, MINOR=1, PATCH=1).

### Verification

- pending

---
## 2026-09-04 - Patch bump for completed agent task

- Version: `0.1.66`
- Timestamp: 2026-09-04 02:54 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-04 - Patch bump for completed agent task

- Version: `0.1.65`
- Timestamp: 2026-09-04 02:50 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-09-04 - Patch bump for completed agent task

- Version: `0.1.64`
- Timestamp: 2026-09-04 02:45 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-31 - Patch bump for completed agent task

- Version: `0.1.63`
- Timestamp: 2026-08-31 02:29 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-31 - Patch bump for completed agent task

- Version: `0.1.62`
- Timestamp: 2026-08-31 02:13 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-31 - Patch bump for completed agent task

- Version: `0.1.61`
- Timestamp: 2026-08-31 02:09 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-31 - Patch bump for completed agent task

- Version: `0.1.60`
- Timestamp: 2026-08-31 01:59 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.59`
- Timestamp: 2026-08-30 23:16 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.58`
- Timestamp: 2026-08-30 23:09 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.57`
- Timestamp: 2026-08-30 23:04 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.56`
- Timestamp: 2026-08-30 23:04 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.55`
- Timestamp: 2026-08-30 22:48 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.54`
- Timestamp: 2026-08-30 22:43 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.53`
- Timestamp: 2026-08-30 22:23 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.52`
- Timestamp: 2026-08-30 22:10 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.51`
- Timestamp: 2026-08-30 22:08 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.50`
- Timestamp: 2026-08-30 22:04 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.49`
- Timestamp: 2026-08-30 21:59 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.48`
- Timestamp: 2026-08-30 21:52 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.47`
- Timestamp: 2026-08-30 21:51 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.46`
- Timestamp: 2026-08-30 21:50 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.45`
- Timestamp: 2026-08-30 21:46 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.44`
- Timestamp: 2026-08-30 21:33 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.43`
- Timestamp: 2026-08-30 21:32 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.42`
- Timestamp: 2026-08-30 21:31 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.41`
- Timestamp: 2026-08-30 21:16 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.40`
- Timestamp: 2026-08-30 21:15 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.39`
- Timestamp: 2026-08-30 21:15 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.38`
- Timestamp: 2026-08-30 21:13 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.37`
- Timestamp: 2026-08-30 21:04 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.36`
- Timestamp: 2026-08-30 21:02 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.35`
- Timestamp: 2026-08-30 20:59 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.34`
- Timestamp: 2026-08-30 20:55 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.33`
- Timestamp: 2026-08-30 20:52 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.32`
- Timestamp: 2026-08-30 20:46 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.31`
- Timestamp: 2026-08-30 20:44 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.30`
- Timestamp: 2026-08-30 15:48 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-30 - Patch bump for completed agent task

- Version: `0.1.29`
- Timestamp: 2026-08-30 15:27 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Rollback to v0.1.8 (2026-08-24 known-good)

- Version: `0.1.8`
- Timestamp: 2026-08-24 05:14 (UTC+7)
- Type: Rollback
- Status: Draft

### Changes

- Revert P0001 UI to v0.1.8: Runners + Tasks separate, DeskDirectoryScreen full-width.
- URL: ?screen=runners / ?screen=tasks (removed path routing).

---
# Changelog

## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.28`
- Timestamp: 2026-08-29 05:19 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.27`
- Timestamp: 2026-08-29 05:13 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.26`
- Timestamp: 2026-08-29 05:07 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.25`
- Timestamp: 2026-08-29 05:01 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.24`
- Timestamp: 2026-08-29 04:56 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.23`
- Timestamp: 2026-08-29 04:43 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.22`
- Timestamp: 2026-08-29 04:39 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.21`
- Timestamp: 2026-08-29 04:20 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.20`
- Timestamp: 2026-08-29 04:14 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.19`
- Timestamp: 2026-08-29 04:06 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.18`
- Timestamp: 2026-08-29 03:46 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.17`
- Timestamp: 2026-08-29 03:39 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-29 - Patch bump for completed agent task

- Version: `0.1.16`
- Timestamp: 2026-08-29 03:27 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-27 - Patch bump for completed agent task

- Version: `0.1.15`
- Timestamp: 2026-08-27 06:01 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-27 - Patch bump for completed agent task

- Version: `0.1.14`
- Timestamp: 2026-08-27 05:39 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-27 - Patch bump for completed agent task

- Version: `0.1.13`
- Timestamp: 2026-08-27 05:23 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-27 - Patch bump for completed agent task

- Version: `0.1.12`
- Timestamp: 2026-08-27 05:03 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.11`
- Timestamp: 2026-08-24 18:39 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.10`
- Timestamp: 2026-08-24 05:47 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.9`
- Timestamp: 2026-08-24 05:38 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.8`
- Timestamp: 2026-08-24 05:14 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.7`
- Timestamp: 2026-08-24 04:59 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.6`
- Timestamp: 2026-08-24 02:06 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.5`
- Timestamp: 2026-08-24 01:28 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.4`
- Timestamp: 2026-08-24 00:44 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-24 - Patch bump for completed agent task

- Version: `0.1.3`
- Timestamp: 2026-08-24 00:13 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-23 - Patch bump for completed agent task

- Version: `0.1.2`
- Timestamp: 2026-08-23 23:57 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
## 2026-08-23 - Patch bump for completed agent task

- Version: `0.1.1`
- Timestamp: 2026-08-23 23:42 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Automatic patch bump after completed P0001 task.

### Verification

- pending

---
﻿# Desk Console

## 0.1.0 — 2026-08-23

- Onboard P0001 as standalone Desktop host (pipeline golden P0003 Electron + local API).
- V1 tabs: Clips, Captures, Runners, Tasks, System.
- Host API :6010 — clips, captures, runners, Dev-* tasks, Cursor GC.
- Tray + hotkeys: Ctrl+Alt+V save clip, Ctrl+Alt+S capture screen.
