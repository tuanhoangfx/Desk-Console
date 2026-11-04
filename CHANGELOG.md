# Changelog

## 2026-11-04 - Autonomous 10m scheduled task self-heal and NSIS installer build

- Version: `3.1.140`
- Timestamp: 2026-11-04 16:35 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Patch bump for uncommitted code changes (P0001).

### Verification

- pending

---
## 2026-11-04 - Autonomous 10m scheduled task self-heal and NSIS installer build

- Version: `3.1.139`
- Timestamp: 2026-11-04 16:16 (UTC+7)
- Type: Patch
- Status: Verified
- Release: https://github.com/tuanhoangfx/Desk-Console/releases/tag/v3.1.139

### Changes

- Added autoHealFailedScheduledTasks (10m sweep with 30m per-task cooldown, zero extra UI buttons) to pc-optimizer.mjs and built Desk Console Setup NSIS installer.

### Verification

- node scripts/run-electron-package.mjs --publish never

---
## 2026-11-04 - Rebuild and assemble win-unpacked desktop bundle

- Version: `3.1.138`
- Timestamp: 2026-11-04 14:22 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Rebuilt dist/ and assembled dist-desktop/win-unpacked with 4-layer zero-popup guard, 7-day .cache retention, and P0004 farm-supervisor separation.

### Verification

- node scripts/assemble-unpacked.mjs --out dist-desktop/win-unpacked

---
## 2026-11-04 - Extract DEFAULT_FARM_JOBS to P0004 farm-supervisor module

- Version: `3.1.137`
- Timestamp: 2026-11-04 14:07 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed 446 lines of DEFAULT_FARM_JOBS and business/social farm telemetry from P0001 pc-optimizer.mjs into P0004/scripts/lib/farm-supervisor.cjs so P0001 remains a pure System/Host Console.

### Verification

- GET http://127.0.0.1:6010/api/tasks?force=1 -> 15/15 Active lastResult=0; node Tool/scripts/hub-ui-parity-check.mjs --code P0001 --screen dashboard -> PASS

---
## 2026-11-04 - Include DevWorkspaceBackup in Scheduled Tasks & 7-day .cache retention

- Version: `3.1.136`
- Timestamp: 2026-11-04 13:15 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added DevWorkspaceBackup and Dev-P0020-Recheck-Appealed-AI descriptions and filter support in windows.mjs; verified all 15 scheduled & daemon tasks report Active with lastResult = 0.

### Verification

- GET http://127.0.0.1:6010/api/tasks?force=1 returns 15 tasks (8 daemons + 7 schtasks) all Active with lastResult = 0

---
## 2026-11-04 - Nightly .cache 7-Day Retention Sweep & Scheduled Task Exit-0 Recovery

- Version: `3.1.135`
- Timestamp: 2026-11-04 13:10 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added automatic 7-day retention pruning for E:\Dev\.cache (preserving allowlisted auth/backup folders) in runNightlyDeepMaintenance; fixed WorkingDirectory resolution in Dev-P0020-Recheck-Appealed-AI and auto-rebase in DevWorkspaceBackup.

### Verification

- GET http://127.0.0.1:6010/api/tasks shows all 14 tasks Active with exit 0

---
## 2026-11-04 - Prune 552MB .cache Orphans, Retire Duplicate Scheduled Tasks & Unconditional Cache Headless Reaper

- Version: `3.1.134`
- Timestamp: 2026-11-04 13:03 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Freed 552+ MB of temporary Chromium profiles and .db files in E:\Dev\.cache; retired Dev-Stealth-Disk-Daily-Prune, Dev-Cursor-Storage-Purge-If-Closed, Dev-Supabase-PhaseD-Reminder, and Dev-Vite-Memory-Gate-P0016; made autoHealSystemHandleLeaks unconditionally reap legacy .cache/g1-support-pw-* chrome-headless-shell processes.

### Verification

- GET http://127.0.0.1:6010/api/tasks lists only active non-duplicate tasks

---
## 2026-11-04 - Playwright Headless Shell PE GUI Subsystem Patcher & Scheduled Task Hygiene

- Version: `3.1.133`
- Timestamp: 2026-11-04 12:07 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added ensurePlaywrightHeadlessShellsGuiSubsystem to patch chrome-headless-shell.exe from PE Subsystem 3 (CUI) to 2 (GUI) so Windows csrss.exe never allocates console windows; sped up suppressTransientConsolePopupsNative to 120ms and added chrome-headless-shell matcher; set global NODE_OPTIONS preload; cleaned duplicate scheduled task.

### Verification

- chrome-headless-shell.exe PE Subsystem verified as 2 (GUI) and P0001 :6010 online

---
## 2026-11-04 - Farm Supervisor 11-Job Coverage, 3-Day Antigravity Retention & 15m Inline Node Reaper

- Version: `3.1.132`
- Timestamp: 2026-11-04 11:55 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added continuous-check-mail-worker, gmail-permanent-forward-worker, and outlook-forwarding-sync to DEFAULT_FARM_JOBS with live state telemetry; updated sweepAntigravityStaleTranscripts retention to 3 days (72h post-Kaizen); added 15m hung inline node script reaper in autoHealSystemHandleLeaks.

### Verification

- GET http://127.0.0.1:6010/api/pc/farm-supervisor returns 11 farm jobs with live PID and telemetry

---
## 2026-11-04 - Reap 1.23 GB Stale .cache Watcher & Headless Shell + Popups Guarded Badge (ok 1, 2, 3)

- Version: `3.1.131`
- Timestamp: 2026-11-04 11:35 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed redundant 10s ssh polling from g1-support-pw-0028/watcher.mjs (ok 1), added Popups Guarded counter to P0001 Core Shield badge (ok 2), and added automatic reaping of completed/expired .cache watchers and chrome-headless-shell processes freeing 1.23 GB RAM (ok 3).

### Verification

- pnpm --dir Tool/P0001-Desk-Console run build + autoHealSystemHandleLeaks reaped 7 stale g1-support-pw-0028 processes

---
## 2026-11-04 - Fast 3-Minute Reclaim for Non-User Headed Farm Profiles (>= 0100)

- Version: `3.1.130`
- Timestamp: 2026-11-04 11:27 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Tighten idle reclaim cap from 20 minutes to 3 minutes for non-protected farm profiles (0100-8999) accidentally opened in Headed mode (headless: false) by background agents, while keeping user protected profiles (0001-0021, 0059, 0069, 0070, 0093) 100% exempt.

### Verification

- Verified #0504 already reclaimed + only user profile #0010 remains headed on :6003

---
## 2026-11-04 - Kill rogue 10s g1-support-pw-0028 ssh loop + Global Preload WindowsHide + 350ms ConsoleWindowClass Suppressor

- Version: `3.1.129`
- Timestamp: 2026-11-04 05:52 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Caught and patched E:\\Dev\\.cache\\g1-support-pw-0028\\watcher.mjs (which was running in a 10s loop inside nodew.exe calling spawnSync('ssh') without windowsHide: true), wired preload-windows-hide.cjs into win-hidden-detach-runner.cjs and read-env-file.cjs + stealth-cdp-client.mjs (ok 1), and added a 350ms FindWindowExW('ConsoleWindowClass') SW_HIDE guard in P0001 (:6010).

### Verification

- Verified 0 visible ConsoleWindowClass windows over 5s desktop EnumWindows probe + :6010 health 200

---
## 2026-11-04 - Zero-Popup Child Process Guard (windowsHide ESM live-binding sync + SSH popup prevention)

- Version: `3.1.128`
- Timestamp: 2026-11-04 05:34 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Patched ensure-hidden-console.mjs and databox-plane-ssot.mjs with installChildProcessWindowsHideGuard() + syncBuiltinESMExports() so all spawn/spawnSync/execSync/execFileSync calls (including inline agent SSH commands, deploy-lenovo-static.mjs, deploy-lenovo-node.mjs, and lenovo-health-watchdog.mjs) automatically enforce windowsHide: true and keep hidden parent console handles without popping up C:\\Windows\\System32\\OpenSSH\\ssh.exe windows.

### Verification

- Verified live ESM binding interception on spawnSync('ssh') + zero visible console window allocation

---
## 2026-11-04 - Register Daemon-Agent-IDE-Optimizer Cron & Wire into Dev-Agent-Daily-Kaizen

- Version: `3.1.127`
- Timestamp: 2026-11-04 05:10 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Register Daemon-Agent-IDE-Optimizer (Every 10 min + Daily 06:45) in BUILTIN_CRON_SPECS on :6010 and wire sweepAntigravityStaleTranscripts() into audit-agent-sessions-rca.mjs (--fix)

### Verification

- Verified Daemon-Agent-IDE-Optimizer listed in /api/tasks and POST /api/tasks/Daemon-Agent-IDE-Optimizer/run succeeds

---
## 2026-11-04 - Cursor User Storage (2.5 GB) & Claude CLI Version Auto-Prune

- Version: `3.1.126`
- Timestamp: 2026-11-04 05:02 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Purge 2,499.8 MB from Cursor User storage (anysphere.cursor-agent-worker zip/versions, >7d History, >14d workspaceStorage, and state.vscdb VACUUM) and 314.9 MB from old Claude CLI versions, and wire automatic retention into sweepAntigravityStaleTranscripts()

### Verification

- Verified Cursor User reduced from 2,795.2 MB to 295.4 MB (-2,499.8 MB) and Claude claude-code reduced from 594.5 MB to 279.6 MB (-314.9 MB)

---
## 2026-11-04 - Unified 5-Agent Auto-Optimizer (Antigravity, Cursor, Claude, Codex, Grok Bot)

- Version: `3.1.125`
- Timestamp: 2026-11-04 04:51 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Extend pc-optimizer.mjs 20s priority shield and 10m storage sweeper to cover all 5 AI agents: Antigravity, Cursor (snapshots + caches), Claude (Code Cache + Cache + old project JSONLs), Codex (.tmp + cache), and Grok Bot (Telegram bridge inbox & turns rotation)

### Verification

- Verified sweepAntigravityStaleTranscripts purged 2.3+ GB across Cursor snapshots, Claude caches/sessions, Codex .tmp/cache, and Grok Bot bridge queues

---
## 2026-11-04 - Auto-Rotate Background Farm Logs (>2MB -> 512KB Tail)

- Version: `3.1.124`
- Timestamp: 2026-11-04 04:25 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Automatically trim background farm log files exceeding 2 MB down to the last 512 KB inside sweepAntigravityStaleTranscripts()

### Verification

- Verified fb-fleet-autologin.log rotated from 12,672 KB (12.4 MB) to 512 KB

---
## 2026-11-04 - Antigravity Brain Telemetry Badge, One-Click Purge & 2KB Compact Stdout Guard

- Version: `3.1.123`
- Timestamp: 2026-11-04 04:19 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Display live Antigravity Brain session count and MB size with a one-click Purge AGY button inside the Dual-Xeon Core Shield card on P0001 Dashboard, and enforce a 2 KB per-write compact stdout guard in ensure-hidden-console.mjs and agent-inline-kit.mjs

### Verification

- Verified /api/pc-optimizer/status returns summary.antigravityBrain, POST action=sweep-antigravity succeeds, and >2KB stdout writes are auto-compacted

---
## 2026-11-04 - Antigravity 10 GB Stale Transcript & Task/Step Log Auto-Purge

- Version: `3.1.122`
- Timestamp: 2026-11-04 03:02 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Purge 10.06 GB of inactive Antigravity brain/conversations/task/step logs and add automatic 10-minute sweepAntigravityStaleTranscripts() in pc-optimizer.mjs

### Verification

- Freed 10.06 GB across 92 inactive brain/conversations + 15,263 finished task/step files; verified :6010 live

---
## 2026-11-04 - Search SSOT — diacritic-insensitive Drive Detail job search

- Version: `3.1.121`
- Timestamp: 2026-11-04 03:01 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Switch DriveDetailModal job filter to searchTextIncludes from @tool-workspace/hub-ui.

### Verification

- node Tool/scripts/verify-search-ssot.mjs --code P0001

---
## 2026-11-04 - Antigravity IDE High-Priority Keystroke Shield & Agent Shell Demotion

- Version: `3.1.120`
- Timestamp: 2026-11-04 02:46 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Elevate Antigravity.exe and Cursor.exe UI/Renderer/GPU processes to HIGH_PRIORITY_CLASS (0x80), keep language_server_windows_x64.exe at ABOVE_NORMAL_PRIORITY_CLASS (0x8000), and demote background powershell.exe shells to BELOW_NORMAL_PRIORITY_CLASS (0x4000) for zero-delay IDE typing

### Verification

- Verified Antigravity.exe (pri=128 HIGH), language_server_windows_x64.exe (pri=32768 ABOVE_NORMAL), 1,100+ threads consolidated on Group 0, and :6010 host live

---
## 2026-11-04 - Zero-IPI Native NUMA Scheduling, EVKey Schtask Recovery & RAM WorkingSet Guard

- Version: `3.1.119`
- Timestamp: 2026-11-04 02:22 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed background TH32CS_SNAPTHREAD/SetThreadGroupAffinity/per-PID JobObject polling that caused Dual-Xeon Kernel IPI storms and cross-socket UI stalls, guarded K32EmptyWorkingSet so it never strips RAM working sets when RAM usage is <80% (preventing 20,000+ PageFault/sec stalls), and restored EVKey64 via the elevated '\\EVKey - Vietnamese Keyboard' scheduled task.

### Verification

- Live CPU/PageFault/EVKey64 telemetry verification

---
## 2026-11-04 - Dual-Xeon 50/50 Core Shield & Per-PID JobObject Group Pinning

- Version: `3.1.118`
- Timestamp: 2026-11-04 01:49 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Restored 50/50 deterministic Dual-Xeon CPU balancing across Group 0 (Cores 4-35) and Group 1 (Cores 0-35) while reserving Group 0 Logical Cores 0-3 for HID/csrss/dwm/EVKey64, added per-PID Windows JobObjectGroupInformationEx (14) pinning to eliminate split-brain '0,1' Chrome processes, lowered EVKey64 handle-leak restart threshold to 1200, expanded %TEMP% sweeper, and surfaced the Core Shield badge on Dashboard.

### Verification

- POST /api/pc/optimize + Vite production build

---
## 2026-11-04 - Search SSOT: accent-insensitive search for ClipPicker, DeskDirectory, and NoteLogRails

- Version: `3.1.117`
- Timestamp: 2026-11-04 01:28 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Use searchTextIncludes from @tool-workspace/hub-ui across P0001 search inputs.

### Verification

- unit-tests

---
## 2026-11-04 - Restore 40 concurrent headless sweet-spot cap and elevate EVKey64 to HIGH_PRIORITY on Core 0-3

- Version: `3.1.116`
- Timestamp: 2026-11-04 00:12 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Raise normal adaptive headless concurrency cap back to 40 (with Group 1 isolation and Core 0-3 shield intact) and boost EVKey64.exe to HIGH_PRIORITY_CLASS on Logical Cores 0-3 so keyboard/mouse never stutter under 40 parallel browsers.

### Verification

- POST /api/pc/optimize

---
## 2026-11-04 - Anti-freeze CPU Core 0-3 shield, Group 1 headless pinning, and 5-session cap

- Version: `3.1.115`
- Timestamp: 2026-11-04 00:05 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Route all headless Chrome roots to Processor Group 1 on Dual-Xeon hosts, mask out Logical Cores 0-3 on Group 0 so Windows USB/HID mouse/keyboard interrupts and DWM never stutter, and enforce a 5-session headless cap with force-close.

### Verification

- POST /api/pc/optimize

---
## 2026-11-03 - PC Optimizer Headless Farm & Idle Session Sweeper Hardening

- Version: `3.1.114`
- Timestamp: 2026-11-03 23:36 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Fixed inspectSmokePoolBrowsers and cleanSmokePoolBrowsers to compute real idle ageMs from Stealth lastActivityAt/launchedAt, sweep non-user headed farm browsers idle >20m, and enforce maxHeadlessConcurrent even when stale agent lock files exist; added baseline reseed to CronDetailModal

### Verification

- audit-hub-detail-chrome-workspace --strict --code P0001 + optimizePcHost live verification

---
## 2026-11-03 - CronDetailModal Enabled Toggle & Schedule Cycle Editor

- Version: `3.1.113`
- Timestamp: 2026-11-03 20:46 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added PUT /api/tasks/:name host API + custom daemon timer + interactive Enabled State & Schedule Cycle editor inside CronDetailModal

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs (43/43 pass) + Vite build + desktop:assemble + live :5180/:6011 smoke

---
## 2026-11-03 - Ignore dist-desktop, data, logs, and resources in Vite file watcher

- Version: `3.1.112`
- Timestamp: 2026-11-03 17:27 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added server.watch.ignored for dist-desktop, data, logs, release, and resources in P0001 vite.config.ts to prevent Chokidar CPU storms during desktop builds and SQLite WAL writes.

### Verification

- Restarted P0001 Vite (:5180) and verified PID CPU delta dropped from 46.8s/1.5s to <0.2s.

---
## 2026-11-03 - Auto-sync P0001-SITE and P0001-INTRO landing on desktop publish

- Version: `3.1.111`
- Timestamp: 2026-11-03 17:04 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Wired deploy-lenovo-static.mjs --code P0001-SITE --code P0001-INTRO --force-build into release-desktop.ps1 and run-electron-package.mjs.

### Verification

- node -c Tool/P0001-Desk-Console/scripts/run-electron-package.mjs

---
## 2026-11-03 - Workspace Directory SSOT Unification + Clean Retired System/Tasks Files

- Version: `3.1.110`
- Timestamp: 2026-11-03 05:48 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Unified Created/Update timestamp variants and Status Dot Color + live pulse across Jobs, Drives, Cron, Runners, and Clips; enforced Workspace-wide timestamp/status SSOT in hub-ui and audit-directory-ssot-all-products; removed retired SystemScreen and legacy tasks references.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-11-03 - Cron Status Dot Color + Created & Log Columns + Execution Telemetry

- Version: `3.1.109`
- Timestamp: 2026-11-03 05:05 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Standardized Status cells and tooltips on HubUsersStatusLabel Dot Color with live pulse effect (Campaign P0002 parity), added Created and Log columns to DeskDirectoryTable with auto-migration, and added duration + freed MB + activityLog telemetry to Cron tasks.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-11-03 - Cron SSOT Create modal + Schedule column + Active status + unified tooltip/cell emoji parity

- Version: `3.1.108`
- Timestamp: 2026-11-03 04:30 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added CronCreateModal (+ New / Detail / Delete / More bulk actions + POST/DELETE /api/tasks), added dedicated Schedule column (10.5rem) with schtasks /V cycle + ISO Last Run parsing, normalized Cron Ready status to Active, replaced broken Segoe UI emojis, widened Update column, added Dashboard failed-cron alert banner, and unified tooltip headerHint/labelHint icons with DeskStatusKpiLabel cell emoji icons

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs && pnpm --dir Tool/P0001-Desk-Console build

---
## 2026-11-03 - Standardize Desk directory cell typography & Vietnamese Inter SSOT

- Version: `3.1.107`
- Timestamp: 2026-11-03 04:21 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Aligned desk-directory-cells.tsx elapsed/schedule spans to Hub-UI 12px/400 Inter SSOT and synced self-hosted Inter vietnamese + latin-ext subsets.

### Verification

- node Tool/scripts/hub-ui-body-font-weight-check.mjs --code P0001

---
## 2026-11-03 - Fix dev Electron black screen when replacing window and add renderer crash auto-recovery

- Version: `3.1.106`
- Timestamp: 2026-11-03 03:23 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Pass explicit workspace path when spawning Electron dev processes, terminate full parent+child trees atomically on --replace so renderer children are never killed without their parent BrowserWindow, and add render-process-gone/unresponsive auto-reload guards in electron/main.cjs.

### Verification

- pnpm --dir Tool/P0001-Desk-Console build && CDP 9311 DOM verification

---
## 2026-11-03 - Fix deskApi.listTasks / listClips / listRunners and unwrap Dashboard API payloads

- Version: `3.1.105`
- Timestamp: 2026-11-03 02:02 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added listTasks, runTask, setTaskEnabled, listClips, listRunners, and getRunnerWatchdog to deskApi in src/lib/api.ts; fixed DashboardScreen loadAll to unwrap fetchJobs().jobs, fetchDriveAccounts().accounts, and fetchLocalDrives().drives plus fast hostMetrics RAM/CPU telemetry.

### Verification

- pnpm --dir Tool/P0001-Desk-Console build

---
## 2026-11-03 - Unify History-Log-Console 3-panel rail across Jobs and Drives + add persistent Time-Series Telemetry History for Dashboard

- Version: `3.1.104`
- Timestamp: 2026-11-03 01:50 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Upgraded JobsMainAndRail to the 3-panel History-Log-Console (3:3:4) split rail and wired it into DrivesScreen so all 5 split screens (Clips, Jobs, Drives, Runners, Cron) share the exact same runtime rail layout; added persistent telemetry-history.json and GET /api/telemetry/history in host/server.mjs wired to DashboardScreen.

### Verification

- pnpm --dir Tool/P0001-Desk-Console build; node Tool/scripts/hub-ui-parity-check.mjs --code P0001; node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-11-03 - Add Executive Dashboard (8 KPIs), Cron split-directory tab (8 KPIs + Built-in Daemons), and reorder rail to History-Log-Console

- Version: `3.1.103`
- Timestamp: 2026-11-03 01:35 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replaced the legacy System tab with the Executive Dashboard tab (8 KPI Golden Strip, Silk Spline growth chart, 4 MiniBarChart breakdown cards, 4 Live HubPanel cards), moved static configuration sections into DeskSettings, added the Cron split-directory tab managing 7 Built-in Daemons (Daemon-*) and Windows Scheduled Tasks (Dev-*) with 8 KPIs, and reordered DeskOpsRuntimeRail to History -> Log -> Console (3:3:4).

### Verification

- pnpm --dir Tool/P0001-Desk-Console build; node Tool/scripts/hub-ui-parity-check.mjs --code P0001; node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-11-03 - Upgrade P0001 Daily Disk Maintenance & Register Dev-Stealth-Disk-Daily-Prune Task

- Version: `3.1.102`
- Timestamp: 2026-11-03 01:05 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Synced P0001 Nightly Deep Maintenance (pc-optimizer.mjs) with the full 17 disposable Chromium cache paths (including Default/Cache, Service Worker/CacheStorage, ScriptCache, Shared Dictionary) while strictly skipping any profile with an active lockfile regardless of uptime; added D:\Temp sweep, raised Disk Pressure Guard threshold from 25 GB to 60 GB, enabled >=04:00 daily catch-up, fixed future-timestamp cache stall in windows.mjs listDevTasks, and registered Dev-Stealth-Disk-Daily-Prune in P0001 Tasks.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-11-02 - Topbar-only DEV Badge SSOT

- Version: `3.1.101`
- Timestamp: 2026-11-02 02:43 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Keep window title and sidebar brand clean; move DEV badge next to Topbar Version trigger in HubVersionReleaseNotes

### Verification

- node ../scripts/lib/sync-electron-shared-libs.cjs --verify

---
## 2026-11-02 - Unified Desktop Electron DEV Badge SSOT

- Version: `3.1.100`
- Timestamp: 2026-11-02 02:25 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Wire shared electron-dev-badge.cjs (taskbar D overlay + [DEV vX.Y.Z] window title + HubSidebarShell DEV badge)

### Verification

- node --check electron/main.cjs

---
## 2026-10-31 - Register fleet-autonomous-maintainer in Farm Supervisor

- Version: `3.1.99`
- Timestamp: 2026-10-31 01:53 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added fleet-autonomous-maintainer to DEFAULT_FARM_JOBS with autoResume: true in pc-optimizer.mjs.

### Verification

- node --check Tool/P0001-Desk-Console/host/pc-optimizer.mjs

---
## 2026-10-30 - Boot Grace Guard & Self-Contained Native Koffi Host

- Version: `3.1.98`
- Timestamp: 2026-10-30 18:12 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Disabled default auto-resume on boot for heavy Chromium farm daemons, added 5-minute boot grace window & 1-job-per-tick stagger in runFarmSupervisorTick, and embedded self-contained koffi bindings in windows.mjs.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-30 - Native Toolhelp32 cursorCount & iphlpapi GetExtendedTcpTable port lookup

- Version: `3.1.97`
- Timestamp: 2026-10-30 16:06 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replace PowerShell Get-Process Cursor count in P0001 host/windows.mjs and netstat port scanning in win-shell-env.cjs with native koffi CreateToolhelp32Snapshot, QueryFullProcessImageNameW, and iphlpapi.dll GetExtendedTcpTable.

### Verification

- node --test Tool/scripts/lib/win-native-utils.test.mjs

---
## 2026-10-30 - Native Win32 koffi Clipboard read/write in Desk Console host

- Version: `3.1.96`
- Timestamp: 2026-10-30 15:59 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replace PowerShell Get-Clipboard/Set-Clipboard child process spawns in P0001 host/windows.mjs with in-process koffi user32.dll OpenClipboard/GetClipboardData/SetClipboardData (<0.5ms, 0 child processes).

### Verification

- node --test Tool/scripts/lib/win-native-utils.test.mjs

---
## 2026-10-30 - Created and Update leading directory columns SSOT

- Version: `3.1.95`
- Timestamp: 2026-10-30 15:20 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Standardized Created (7.5rem, calendar emoji, enableFit false) and Update (7.5rem, refresh emoji, enableFit false) at the leading edge of directory tables and Display column pickers via shared hub-ui SSOT.

### Verification

- vitest + verify-directory-shared-chrome-width-ssot + hub-directory-header-sticker-gate

---
## 2026-10-30 - Pin P0016 Chat Center in core Hub Vite allowlist & watchdog

- Version: `3.1.94`
- Timestamp: 2026-10-30 07:52 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Included P0016 in pc-optimizer isCoreHubVite and DEFAULT_PINNED_RUNNERS so P0016 Vite on :5186 is never reaped by background handle/RAM healer

### Verification

- node Tool/P0016-ChatCenter/scripts/smoke-tab-loading.mjs

---
## 2026-10-30 - Update fanpage-fleet-daemon telemetry summary to >0010 pool

- Version: `3.1.93`
- Timestamp: 2026-10-30 07:27 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Updated pc-optimizer.mjs fanpage-fleet-daemon summary label to >0010 and synced to unpacked Desk Console

### Verification

- node Tool/scripts/check-version-sync.mjs

---
## 2026-10-30 - Muse 9Router Pool Live Telemetry & Token Capacity Summary

- Version: `3.1.92`
- Timestamp: 2026-10-30 07:02 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Read ~/.9router/muse-token-pool.json in readFarmJobTelemetry('muse-headless-adapter') to display live readyHeadlessSessionAccounts and totalTokenCapacityBillion in Desk Console.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-30 - Job-Breakaway Hidden Daemon Spawner, Idle Vite Hibernation & Coordinated Headless Lease

- Version: `3.1.91`
- Timestamp: 2026-10-30 06:52 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Switch spawnFarmJobDetached to startHiddenDetachedProcess (WMI Win32_Process.Create + nodew.exe) so background daemons outlive parent Job Objects with zero console window, raise adaptive headless idle cap to 240s/6 concurrent so warmup flows complete cleanly, and hibernate unpinned non-core Vite servers.

### Verification

- node --test Tool/P0001-Desk-Console/host/desk-host.test.mjs

---
## 2026-10-30 - Strict 2-row Mobile FilterBar SSOT (default 2 primary filters + Row 1 Search/Toolbar nowrap)

- Version: `3.1.90`
- Timestamp: 2026-10-30 06:37 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Keep Search and Toolbar on Row 1 on mobile and cap default unselected Row 2 filters to 2.

### Verification

- node Tool/scripts/smoke-hub-mobile-ui.mjs --code P0001 --scenario filterbar --json

---
## 2026-10-30 - Fix Vite 25k handle crash-respawn loop & enforce BelowNormal background CPU priority

- Version: `3.1.89`
- Timestamp: 2026-10-30 06:34 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Stop infinite 20s kill-respawn loop on non-core Vite servers in pc-optimizer.mjs, demote headless Chrome/wireproxy/farm daemons to BELOW_NORMAL_PRIORITY_CLASS via koffi SetPriorityClass, cap maxHeadlessConcurrent at 3, and enrich Farm Supervisor recovery telemetry.

### Verification

- GET :6010/api/pc/farm-supervisor; POST :6010/api/pc/optimize

---
## 2026-10-30 - Zero-Popup nodew Farm Spawner, Conhost Replacer & Wireproxy/Vite Handle Healer

- Version: `3.1.88`
- Timestamp: 2026-10-30 06:20 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Switched Farm Supervisor resolveNodeBinary to prefer GUI-subsystem nodew.exe, added automatic conhost-attached background node.exe replacer, duplicate wireproxy.exe tunnel sweeper, and >25k-handle Vite auto-restarter in autoHealSystemHandleLeaks, and tightened adaptive headless browser caps (6/4/2).

### Verification

- node Tool/P0001-Desk-Console/host/pc-optimizer.mjs

---
## 2026-10-30 - Fix pc-optimizer headless farm sweeper overCap counter and respect active-agent-locks

- Version: `3.1.87`
- Timestamp: 2026-10-30 05:49 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Count CDP-closed headless farm profiles immediately and skip profiles locked in active-agent-locks.json so slow /close calls never cascade-kill active headless browsers.

### Verification

- node --check Tool/P0001-Desk-Console/host/pc-optimizer.mjs

---
## 2026-10-30 - Farm Supervisor: Fanpage Fleet Auto-Resume & Recovery Telemetry

- Version: `3.1.86`
- Timestamp: 2026-10-30 05:20 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Enabled autoResume for fanpage-fleet-daemon and enriched telemetry summaries with Checkpoint 956 OTP unlock, multi-layer password recovery, and 96/191 live fanpage counts.

### Verification

- POST /api/pc/farm-supervisor

---
## 2026-10-30 - PC Optimizer: Leaked Playwright & Chromium Temp Dir Sweeper

- Version: `3.1.85`
- Timestamp: 2026-10-30 04:38 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added os.tmpdir() sweep for >2h old playwright*, scoped_dir*, and chrome_BITS_* folders inside runNightlyDeepMaintenance(), immediately cleaning 2,500+ leaked temp directories.

### Verification

- node os.tmpdir() leak sweep

---
## 2026-10-30 - PC Optimizer: Stale Service Worker CacheStorage (>14d) & Run Artifacts Retention

- Version: `3.1.84`
- Timestamp: 2026-10-30 04:03 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added stale (>14 days idle) Service Worker CacheStorage trim and >7-day debug screenshot / >14-day SQLite runs retention to runNightlyDeepMaintenance().

### Verification

- POST /api/pc/optimize {action: deep-maintenance, maxProfiles: 0}

---
## 2026-10-30 - PC Optimizer: Crashpad/BrowserMetrics/CodeCache Sweep & D: <25GB Disk Pressure Guard

- Version: `3.1.83`
- Timestamp: 2026-10-30 03:40 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Expanded DISPOSABLE_PROFILE_SHADER_REL_PATHS with Crashpad/reports, Crashpad/attachments, BrowserMetrics, DawnCache, and Code Cache (js/wasm) while preserving 100% of Cookies/LocalStorage/IndexedDB/Extensions; added readProfilesDiskPressure() auto-triggering Deep Maintenance if D: free space drops below 25 GB.

### Verification

- POST /api/pc/optimize {action: deep-maintenance, maxProfiles: 0}

---
## 2026-10-30 - PC Optimizer: Full-Fleet 100% Closed Profile Deep Maintenance

- Version: `3.1.82`
- Timestamp: 2026-10-30 01:48 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Removed the 200-profile batch cap in runNightlyDeepMaintenance so both 04:00 AM scheduled runs and manual Deep Clean passes scan and purge shader/GPU caches across 100% of closed profiles with event-loop yielding.

### Verification

- POST /api/pc/optimize {action: deep-maintenance, maxProfiles: 0}

---
## 2026-10-30 - Nightly 04:00 Deep Maintenance + Realtime Farm Telemetry API

- Version: `3.1.81`
- Timestamp: 2026-10-30 01:20 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added 04:00 AM SQLite WAL checkpoint and closed-profile shader/GPU cache purge (unNightlyDeepMaintenance, ction: deep-maintenance) plus live telemetry enrichment in getFarmSupervisorStatus() for P0004 System > Agents.

### Verification

- node --check Tool/P0001-Desk-Console/host/pc-optimizer.mjs && GET :6010/api/pc/farm-supervisor

---
## 2026-10-29 - Add Persistent Farm Job Supervisor & DWM Adaptive Headless Throttling

- Version: `3.1.80`
- Timestamp: 2026-10-29 21:37 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Implemented Persistent Farm Job Supervisor (auto-resume, duplicate script deduplication, /api/pc/farm-supervisor API + SystemScreen UI) and GetProcessTimes DWM Adaptive Headless Throttling + orphan taskbar worker healer in pc-optimizer.mjs.

### Verification

- node --check host/pc-optimizer.mjs

---
## 2026-10-29 - Fast /api/sessions/running headless reaper & 10-headless cap

- Version: `3.1.79`
- Timestamp: 2026-10-29 20:52 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replaced slow /api/profiles 10k-row poll in inspectSmokePoolBrowsers with /api/sessions/running (<5ms) and tuned maxHeadlessConcurrent to 10 so dwm.exe and StateRepository never stall Windows.

### Verification

- node --check host/pc-optimizer.mjs

---
## 2026-10-29 - Native Dual-Xeon Processor Group 50/50 load balancer for Chrome trees (koffi SetThreadGroupAffinity)

- Version: `3.1.78`
- Timestamp: 2026-10-29 20:18 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Add balanceChromeProcessorGroupsNative() in pc-optimizer.mjs using Toolhelp32 + SetThreadGroupAffinity (0 PowerShell) to distribute Chrome browser trees 50/50 across Processor Group 0 and Group 1 on Dual-Xeon workstations.

### Verification

- node --test Tool/P0001-Desk-Console/src/test/pc-optimizer.test.mjs

---
## 2026-10-29 - Raise maxHeadlessConcurrent to 50 (15m idle) while keeping 20s handle-leak self-healer

- Version: `3.1.77`
- Timestamp: 2026-10-29 20:10 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Set maxHeadlessConcurrent to 50 and maxHeadlessIdleMs to 15 minutes in pc-optimizer.mjs so ~40 headless profiles run unimpeded while EVKey64/olk/renderer handle leaks are healed every 20s.

### Verification

- node --test Tool/P0001-Desk-Console/src/test/pc-optimizer.test.mjs

---
## 2026-10-29 - 20s zero-WMI PC auto-healer: headless farm cap (6) + EVKey64/olk/renderer handle leak recovery

- Version: `3.1.76`
- Timestamp: 2026-10-29 20:01 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Upgrade pc-optimizer.mjs so ALL invisible headless:true sessions (excluding 9990-9999 smoke pool) are bounded to maxHeadlessConcurrent: 6 and 2m max idle on a 20s interval, and add autoHealSystemHandleLeaks() to automatically recover EVKey64 (>4k handles), windowless olk (>15k handles), and runaway Chrome --type=renderer (>35k handles) leaks.

### Verification

- node --test Tool/P0001-Desk-Console/src/test/pc-optimizer.test.mjs

---
## 2026-10-29 - Mobile Filter & Display popover viewport clamping

- Version: `3.1.75`
- Timestamp: 2026-10-29 17:18 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Adopt @infi/hub-ui mobile popover clamping and flip-above positioning for 320x568 devices

### Verification

- node Tool/scripts/node-run.mjs Tool/scripts/smoke-hub-mobile-ui.mjs --code P0001 --scenario table-filter-popover --viewport 320x568

---
## 2026-10-29 - Unique folder colClass in jobs directory meta + mobile smoke onboarding

- Version: `3.1.74`
- Timestamp: 2026-10-29 03:12 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Fix duplicate hub-users-col--path colClass on folder column in jobs-directory-meta.ts (now hub-users-col--folder) and onboard P0001 to hub-mobile-ui-smoke.catalog.json.

### Verification

- node Tool/scripts/verify-directory-colclass-unique.mjs --json + smoke-hub-mobile-ui.mjs --code P0001

---
## 2026-10-29 - AppErrorBoundary HMR & popstate auto-recovery

- Version: `3.1.73`
- Timestamp: 2026-10-29 01:46 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Added vite:afterUpdate, popstate, 800ms DEV auto-retry, Retry button, and recordHubCaughtBoundaryError telemetry to AppErrorBoundary.

### Verification

- vitest 15/15 PASS + verify-agent-docs-skills-ssot PASS

---
## 2026-10-29 - Hoist DESK_BASE_COLLATOR in desk-directory-sort

- Version: `3.1.72`
- Timestamp: 2026-10-29 00:29 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replace inline String.prototype.localeCompare options in desk-directory-sort.ts with shared module-level DESK_BASE_COLLATOR to satisfy verify-hub-perf-contract no-inline-locale-compare-options.

### Verification

- node Tool/scripts/verify-hub-perf-contract.mjs --code P0001

---
## 2026-10-26 - DriveDetailModal HubConfirmDialog empty trash

- Version: `3.1.61`
- Timestamp: 2026-10-26 19:22 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Replaced native window.confirm with stacked HubConfirmDialog in DriveDetailModal.tsx for 100% hub-ui-modal-parity-check compliance.

### Verification

- hub-ui-modal-parity-check --all

---
## 2026-10-26 - KPI Strip Border Unclip, Clear Proxy Hierarchy Labels, Explorer Context Menu & Sync Health Guard

- Version: `3.1.60`
- Timestamp: 2026-10-26 19:14 (UTC+7)
- Type: Patch
- Status: Verified

### Changes

- Fixed clipped left/right hover & active ring on KPI strip in JobDetailModal/DriveDetailModal; clarified 2-tier Proxy options (Follow Drive / Direct / Custom); registered HKCU Windows Explorer right-click menu ('Sync with Desk Console' & 'Copy to Desk Console Clips'); added System Tray & Windows Native Toast Sync Health Guard (Conflict / Sync Error / Drive Free Space < 1 GB).

### Verification

- node --test Tool/P0001-Desk-Console/host/*.test.mjs (101/101 pass) + Vite build + Electron package + CDP smoke

---
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
