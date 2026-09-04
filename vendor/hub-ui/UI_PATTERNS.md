# Hub UI patterns (unified)

**Catalog:** `Tool/schemas/ui-patterns.catalog.json`  
**Clone:** `node Tool/scripts/hub-ui-stack.cjs P00xx <screen>`  
**Agent tab:** Kind **Pattern** (ready goldens only)

**Deferred** (không có row Agent — chuẩn hóa sau): `dashboard` → `deferredPatterns[]` trong catalog.

---

## Ready patterns (Agent)

| ID | Layer | Golden |
|----|-------|--------|
| `directory` | screen | P0004/hub-list |
| `document-toc` | screen | P0004/overview-toc |
| `system-panels` | screen | P0004/system |
| `workspace-composer` | screen | P0020/notes |
| `inbox-split` | screen | P0016/inbox |
| `split-directory-filter-pane` | screen-part | P0001/profiles-pane |
| `split-pane-scroll` | primitive | packages/hub-ui/split-pane-scroll |
| `auth-gate` | modal | hub-ui/auth (V2) |
| `user-access-modal` | modal | P0004/users |
| `tab-loading` | shell-part | packages/hub-ui/tab-loading |

**Directory** = card + table via **ViewToggle** (one pattern).  
**System** = Agent table + Quota table inside `panels[]` (not separate rows).

---

## Tab loading (golden — hub-ui)

**Contract:** [HubTabLoadingContract.md](./HubTabLoadingContract.md)

| Piece | Rule |
|-------|------|
| Suspense / chunk | `HubScreenChunkFallback` · `portaled={true}` · `enabled={activeTab}` |
| Directory fetch | Portaled overlay only when `loading && rows.length === 0` |
| Modals | `portaled={false}` · parent `relative min-h-*` |
| Chrome inset | `HubMainChromeStack` + `HubLoaderRoot mainRef={mainRef}` → `--hub-main-chrome-top` |

P0016 wrappers: `ConsoleLoadingView`, `ConsolePaneLoading`. P0004: `AppScreenLoadingView`.

---

## Auth gate (golden V2 — hub-ui)

**Canonical source:** `packages/hub-ui/src/auth/` + `hub-auth-gate.css` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| Component | When to use |
|-----------|-------------|
| `WorkspaceAuthGate` | **Preferred** — tool login adapter + shared forgot-password (`createHubForgotPasswordHandler`) |
| `HubAuthGate` | Low-level gate wrapper — opens modal on mount |
| `HubAuthGateModal` | Sign In / Sign Up / Anonymous tabs (Anonymous optional via `onAnonymous`) |
| `HubWorkspaceUserShell` | **Preferred** — `HubSidebarUserFooter` + `HubWorkspaceUserModal` + sign-out state |
| `HubSidebarUserFooter` | Sidebar User row + `HubAuthSessionBadge` + email label |
| `HubWorkspaceUserModal` | Workspace logout / profile modal (P0020 / P0016) |
| `HubFullUserAccountModal` | Hub admin account modal (P0004) |
| `HubAuthLogoutChip` | Extension header (E0001) — email + LogOut icon |
| `HubAuthSessionBadge` | Anonymous / Signed in pill on User row |
| `HubAccessDeniedPanel` | Access denied card (replaces inline `auth-inline` in tool src) |
| `HubAuthBrandIcon` | **Auth gate header brand** — 56×56 PNG/SVG + soft cyan glow (`hub-auth-brand-icon`) |
| `HubAuthGateGoldenPreview` | Design Template · onboarding examples |

**Rules**

- **No prompt overlay** — modal-only (removed `HubAuthPrompt` / `auth-waiting`).
- P0020: tab **Anonymous** → `onAnonymous` (local session); × / backdrop dismiss same path.
- P0004: **no Anonymous tab** — modal non-dismissible until sign-in.
- Panel **30rem**; backdrop `rgba(8,12,28,0.52)` + `blur(8px)`.
- Settings toggle label: **Anonymous mode** (not Offline).
- **Do not** import `theme/hub-auth.css` in tools — overrides golden `hub-auth-gate.css` (blur 14px / 26rem).
- **Auth header brand** — `headerLeading={<HubAuthBrandIcon src={…} />}` on sign-in / boot / access-denied panels. Do **not** use `HubToolAvatar size="sm"` (22px) or inline Tailwind `drop-shadow-[…]` on auth gates.

**Golden refs (single source)**

- **Canonical UI** — `packages/hub-ui/src/auth/HubAuthGateModal.tsx` · registry ref **`hub-ui/auth`**
- **Factory** — `WorkspaceAuthGate` + `createWorkspaceAuthGate` in `packages/hub-ui/src/auth/WorkspaceAuthGate.tsx`
- **Scaffold** — `node Tool/scripts/sync-hub-ui-screen.cjs P00xx auth` → `examples/GoldenAuthGateAdapter.tsx`
- **authVariant** — `standard` (P0004, P0016) · `anonymous-dual` (P0020) — see `ui-patterns.catalog.json` → `auth-gate.authVariants`
- **Adapters** — P0004 `HubAuthGate.tsx` · P0016 `ChatCenterAuthGate.tsx` · P0020 `NotesAuthGate.tsx`
- **Preview** — `HubAuthGateGoldenPreview` · `examples/GoldenAuthGateScreen.tsx`
- **CI** — `node Tool/scripts/hub-auth-migration-check.mjs`
- **E0001** — `popup.html` / `popup-theme.css` (parity script)

---

## System Design Template (P00xx — empty by default)

**Canonical empty state:** `HubDesignTemplateEmpty` · skill: `.cursor/skills/design-preview-5/SKILL.md`

| Rule | Detail |
|------|--------|
| Nav | System tab — `Settings2` · `iconTone: "cyan"` · route `/system` |
| Default | `DesignTemplatePage` + `FEATURES = []` → `HubDesignTemplateEmpty` only |
| Previews | **Only** when user explicitly requests 5 mockups — mount under `features/system/design-template/design-preview/` (P0004: `system-hub/`) |
| Forbidden | Sidebar footer "Design Template" link · standalone `/design/*` routes (redirect to `/system`) · hosting another tool's previews |
| After lock | Delete preview folder + registry entry → empty state again |
| Prefetch | `lib/system-tab-prefetch.ts` — `prefetchSystemTab()` / `prefetchSystemTabIdle(1200)` |

**Golden refs:** P0016 `features/system/design-template/` · P0020 same · P0004 `features/system-hub/design-template/`

---

## Filter (golden — packages/hub-ui)

**Canonical source:** `packages/hub-ui` (`FilterBar`, dropdown primitives). Fan-out: `node Tool/scripts/sync-hub-ui-vendor.cjs` → product `vendor/hub-ui`.  
**Edit order:** see `Tool/docs/ssot/hub-ui-canonical-map.md` (charts still promote from P0004 vendor — **not** FilterBar).

| Layer | Component | When to use |
|-------|-----------|-------------|
| Screen | `HubDirectoryScreen` + `FilterBar layout="hub"` | Directory tabs (Hub, 2FA, Cookie, Notes, System) |
| Dropdown | `HubSingleFilterDropdown` | Single-select in forms/modals |
| Primitives | `HubFilterDropdownTrigger`, `HubFilterDropdownCircle`, `HUB_FILTER_DROPDOWN_*_CLASS` | Custom multi-select pickers (e.g. note folder tagger) |
| Toolbar | `DirectorySearchToolbar` — `HubTimeRangeSelect` · `HubTablePageSizeSelect` · **`HubDirectoryDisplayPanel`** (single Display button) · `HubResultCount` | FilterBar `toolbar` / `displayBand` |

**Rules**

- Directory screens: **always** `FilterBar layout="hub"` via `HubDirectoryScreen` — never local chip/toolbar CSS.
- Modal / narrow context: `FilterBar layout="inline"` or `HubSingleFilterDropdown`.
- Custom folder/tag pickers: import primitives from `@tool-workspace/hub-ui` only — no per-tool `filter-dropdown-ui` copies.
- Register filter icons once: `configureFilterIcons` in app `setupHubUi()`.
- Inline gaps: `.hub-inline-gap-comfort` on triggers · `.hub-inline-gap-name` on filter chip rows · see **Inline glyph + label gaps**.
- **No facet counts.** FilterBar never paints `totalCount` or `option.count` (closed chip or open panel). KPI / table already show row totals. Do not scan vaults just to label filters.
- **Clear (X).** Optional dropdowns always paint rose Clear beside panel search (`HubFilterDropdownPanelSearch`); mute until a value is set. `allowClear={false}` only for required enums. Card `hub-dropdown-allowclear-ssot`.

**Exceptions (documented)**

- **P0008** — `app/src/components/table/FilterBar.tsx` fork for Next.js RSC (icon keys as strings). Align visually with golden tokens; do not copy into Vite tools.

**Removed legacy:** `ToolFilterBar` + `.filter-toolbar` / `.chip` CSS (P0004, P0020).

**FilterBar hub — two-row layout (P0020 Todo, Notes split)**

| Row | Slot | Content |
|-----|------|---------|
| 1 | search + `toolbar` | Search field · view toggles (Board/Calendar) · **Period** (`HubFilterSelect` / `HubTimeRangeSelect`) |
| 2 | `row2Leading` + filters + `row2Actions` | Admin-only leading filters · golden multi-select dropdowns · **🧹 Clear** when active · **New** (`HubFilterRowButton`) |

**Searchbar Lite** (`hideSearch` + `searchbarLite` default true) — **one row** for report dashboards (P0014 Staff Performance):

| Side | Content |
|------|---------|
| Left | `toolbar` (Period · Display · Default · ViewToggle) · filters · Clear |
| Right | `row2Actions` bulk (`HubBulkActionButton`) |

No search field · no stacked toolbar/filters/actions rows · no table page-size on Staff.

**Do not** render a third “Active:” pill row under hub FilterBar — clearing is via **🧹 Clear** on row 2 only (golden Hub-UI). Optical center: `.hub-filter-clear-btn__icon` + `translateY(-2px)` (Windows emoji em-box).

**Catalog:** `Tool/schemas/ui-patterns.catalog.json` → `filterBarHub` (Agent + parity scripts). Patterns with `"filterBarHub": true`: `directory`, `workspace-composer`, `inbox-split`.

**Period dropdown rules**

- Use `HubSingleFilterDropdown` / `HubFilterSelect` with default **`usePortal={true}`** — never `usePortal={false}` + `w-full` (misaligns panel).
- Trigger: `className="shrink-0"` — same chrome as Notes `HubTimeRangeSelect`.

### Directory toolbar row 1 (golden — hub-ui)

**Order (`DirectorySearchToolbar`):** view toggle (Table/Cards) → **Live/Trash** (`lifecycleMode`, when soft-delete) → **`HubWorkspacePeriodSelect`** (All) → **`HubDirectoryDisplayPanel`** (Display + page size + preset) → result count.

| Rule | SSOT |
|------|------|
| Page size | Lives in **Display** when `displayBand` is set — toolbar must **not** also render `HubTablePageSizeSelect` (hub-ui auto-hides via `resolveDirectoryToolbarShowTablePageSize`). Same rule on `HubDirectoryToolbarSlots` (`displayBand` prop). Only show toolbar page size when there is **no** Display band. |
| Typography | `HUB_DIRECTORY_TOOLBAR_TYPO_CLASS` (`text-xs font-medium`) on row 1 — not `HUB_SHELL_LABEL_TYPO_CLASS` (FilterBar row 2) |
| Trigger | `HubFilterDropdownTrigger` — **`forwardRef`**; portaled panels anchor via trigger rect |
| Icon slot | 13×13 wrapper + `compactIconSize(13)`; label `leading-none` |
| Period (All) | `workspacePeriodTriggerIconColor` — colored calendar icon only, **no dot on trigger**; dots in dropdown rows |
| Preset | `HubDirectoryTableColumnPresetMenu` — same trigger + portal panel; clamp to viewport |

**Golden:** P0020 / P0005 directory — All · Display · Current preset same height; page size only inside Display.

**Header actions rail (Notify · Log · Settings)**

| Component | Slot | Notes |
|-----------|------|-------|
| `HubHeaderOpsPanels` | Tab header trailing | **SSOT** for Notify · Log · Settings on every directory tab |
| `HubNotifyButton` | Inside ops panels | Bell + **Notify** label + unread badge |
| `HubLogButton` | Inside ops panels | Session / tab log |
| Settings | `HubDisplayPrefs` / tool prefs in `trailing` | KPI/charts/price — **not** Table & detail (that stays in Display) |

**User-directory adapter (P0004 Users golden)**

- Use `HubUserDirectoryHeaderActions` for the User header rail and `HubDirectorySettings` for its Settings trigger.
- Products pass their own `HubDisplayPrefs` data (`kpis`, `filters`, `tablePanel`, URL prefs, and log callback); the adapter fixes the User contract to tab-scoped **Settings** with no range/limit controls.
- Do not hand-build another `Notify · Log · Settings` rail in a User screen. This preserves a single migration surface for every future tool.
- Card: `Tool/docs/playbooks/_cards/hub-user-directory-adapter.md`. If P0004 tree is locked/churning, wait + parallelize — `_cards/agent-persistent-progress.md`.

**List modals (Notify, Activity log)**

- Shell: `HubDetailModal` + `HubModalFrame` + `HubModalCloseButton` (red edge ×, 2rem).
- Do not use inline header × icons — breaks golden modal parity.

**Detail / account modals — two close controls (do not merge)**

| Control | SSOT | Class / component | Forbidden |
|---------|------|-------------------|-----------|
| **Edge dismiss** | `HubModalCloseButton` on `HubModalFrame` | `.hub-modal-close` — red circle, `top: -0.55rem`, hover rotate 90° | Legacy `.modal-close` in product CSS; inline header × |
| **Footer Close** | `HubToolDetailModalSecondaryAction` with `close` (or `HubToolDetailModalAccountFooter`) | `.hub-tool-detail-modal__secondary--close` — gray secondary (`rgba(255,255,255,0.04)` idle) | Letting accent footer-nav rule match `--close` (causes white outline bleed); product `modal-close` square button |

Accent footer nav (View customer / orders / …) uses `.hub-tool-detail-modal__secondary--{tone}` only — **must** exclude `--close` via `:not(.hub-tool-detail-modal__secondary--close)` in `hub-modal.css`. Gate: `audit-hub-modal-close.mjs` + `hub-mobile.ssot.test.ts` § Hub modal close SSOT.

---

## Split-pane scroll (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/styles/hub-split-scroll.css` + theme tokens in each tool (`p0008-globals.css` — legacy name; canonical alias **`hub-theme-tokens.css`**, not related to P0008 as hub-ui source) → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

**CSS tokens** (`:root` / `.theme-hub` in `p0008-globals.css` / `hub-theme-tokens.css`):

| Token | Default | Role |
|-------|---------|------|
| `--hub-split-scroll-size` | `10px` | WebKit scrollbar width (matches global `::-webkit-scrollbar`) |
| `--hub-split-scroll-track` | `transparent` | Track |
| `--hub-split-scroll-thumb` | `#2a3158` | Thumb |
| `--hub-split-scroll-thumb-hover` | `#3a4178` | Thumb hover |
| `--hub-split-scroll-radius` | `6px` | Thumb radius |

**Classes**

| Class | When to use |
|-------|-------------|
| `hub-split-scroll` | Any fixed-height split pane body (list rail, editor body, History TOC, diff panes) |
| `hub-split-scroll--rail` | Left TOC / thread list / snapshot rail |
| `hub-split-scroll--panel` | Main editor / message body / compare center |

**Layout rules (workspace-composer / inbox-split)**

- Tab shell: `hub-main--notes` / `hub-main--inbox` → `overflow: hidden` (no page scroll).
- Flex chain: `hub-tab-content-zone` → `hub-tab-body-zone--split` → `notes-workspace__body` / `inbox-split-pane` — all `flex: 1; min-height: 0; overflow: hidden`.
- **One scroll layer per pane** — attach `hub-split-scroll` on the inner scroll container only; parent `overflow: hidden`.
- Editor textarea: `overflow: hidden` on `.notes-editor__textarea` — long content scrolls on `.notes-editor__body.hub-split-scroll`, not nested scrollbars.
- Import: `@import "…/hub-split-scroll.css"` in tool `hub-ui-styles.css` (after `hub-shell-layout.css`).

---

## Split directory pane (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/shell/HubSplitDirectoryPane.tsx`, `HubSplitDirectoryFilterBar.tsx`, `hub-split-directory-pane.css`.

### Pattern A — `split-directory-filter-pane` (filter **inside** pane)

**When:** Split layout where search/filter belongs to **one pane only** (not full screen width).

| Context | Filter component | Golden |
|---------|------------------|--------|
| Profiles table (left) | `ProfileFilterPane` → `HubSplitDirectoryFilterBar` | P0001 Profiles |
| Workflow rail (right) | `WorkflowFilterPane variant="rail"` | P0001 Profiles rail |
| Scripts workflow list (left) | `WorkflowFilterPane variant="panel"` + bulk row | P0001 Scripts |

**Do not** put `FilterBar` on `HubDirectoryScreen` for these — screen header stays chrome-only (`HubListChromeHeader`).

**Page size SSOT**

```tsx
// useProfiles / useWorkflows
const pageSize = useHubTablePageSize();
const setPageSize = (size) => patchHubListPrefs({ tpage: patchHubTablePageSizeValue(size) });

// FilterPane toolbar + table
<DirectorySearchToolbar showTablePageSize tablePageSize={pageSize} onTablePageSizeChange={setPageSize} />
<HubDirectoryTableShell pageSize={pageSize} resetKey={hubDirectoryListResetKey(...)} />
```

**List reset key:** always `hubDirectoryListResetKey(search, filterValues, sortKey, sortDir)` — **never** manual pipe strings.

**Shared hooks (tool-local):** P0001 `useWorkflowDirectoryFilters`, profile filter state in `ProfileFilterPane`.

### Pattern B — `inbox-split` / `workspace-composer` (filter **screen-level**)

**When:** Master-detail with FilterBar spanning full width above split body.

| Context | Shell | Filter location |
|---------|-------|-----------------|
| Inbox | `HubSplitWorkspaceScreen` | `FilterBar` on screen chrome |
| Notes | `HubSplitWorkspaceScreen` | `directoryToolbar` / `filterToolbar` on screen |

See **inbox-split** / **workspace-composer** catalog entries — **not** the same as Pattern A.

### HubSplitDirectoryPane variants

| Context | Component | Scroll |
|---------|-----------|--------|
| Split workspace left pane (Profiles table) | `HubSplitDirectoryPane` + embedded filter | `scroll` on panel |
| Compact rail (Workflow picker) | `HubSplitDirectoryPane variant="rail" fixedRows={5}` | **none** — pager navigates pages |
| Scripts left pane | `HubSplitDirectoryPane variant="panel" scroll` | panel scroll |

**Structure**

```
HubSplitDirectoryPane scroll? fixedRows?
  ├─ hub-split-directory-pane__filters → HubSplitDirectoryFilterBar (frameless)
  │    └─ toolbar: DirectorySearchToolbar (tablePageSize + onTablePageSizeChange when paginated)
  └─ hub-split-directory-pane__body
       └─ HubDirectoryTableShell flushWrap
            └─ inner .hub-users-table-wrap (border + `--hub-directory-pane-surface` = `var(--panel)`)
```

**Rules**

- Outer pane: one `rounded-2xl border border-white/5 bg-[var(--panel)]`.
- FilterBar: `frameless` — no nested panel chrome.
- Table: `flushWrap` on shell; inner wrap gets golden border via CSS.
- **One scroll layer** — panel uses `scroll` (body `hub-split-scroll--panel`); rail uses `fixedRows` (no scrollbars).
- Never nest `hub-split-scroll` + `hub-directory-table-scroll` in same subtree.

**Golden refs:** P0001 `ProfileFilterPane.tsx`, `WorkflowFilterPane.tsx`, `WorkflowRailPanel.tsx`, `WorkflowDirectoryPanel.tsx`.

---

## Directory table wrap modes (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/table/HubDirectoryTableShell.tsx`, `DirectoryInlineTable.tsx`, `directory-table-scroll.ts`, `styles/hub-directory-table.css`, `styles/hub-split-directory-pane.css`.

### Directory table wrap modes

| Mode | Constant | Component | Scroll | When |
|------|----------|-----------|--------|------|
| **Full-page inline** | `HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS` | `DirectoryInlineTable` | `.hub-main` page scroll | P0004 Hub/Users/Dashboard — default shell wrap |
| **Pane inline** | `HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS` | `DirectoryInlineTable` | None on wrap (`overflow-hidden`) | `HubSplitDirectoryPane` + `flushWrap` — P0003 Profiles/Backup, P0020 panes |
| **Standalone scroll** | `HUB_DIRECTORY_TABLE_SCROLL_CLASS` | `DirectoryInlineTable` | Wrap + sticky `<thead>` | Legacy / explicit opt-in only |
| **Legacy split** *(deprecated)* | `HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS` | `DirectorySplitScrollTable` | `.hub-directory-table-body-scroll` | P0001 until migrated — **do not use in new tools** |

**Import SSOT (never hand-concat wrap strings in tools):**

```tsx
import {
  HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS,
} from "@tool-workspace/hub-ui";

// P0004 Hub/Users — default (omit wrapClassName)
<HubDirectoryTableShell … />

// HubSplitDirectoryPane body — same paint as P0004, flex fill in pane
<HubDirectoryTableShell wrapClassName={HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS} flushWrap … />
```

### Rules

- **Pane = P0004 paint** — `HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS` is `overflow-hidden min-w-0` only; **never** add `hub-directory-table-scroll` on the wrap (scrollbar track causes thead color seam).
- **One table** — pane mode uses `DirectoryInlineTable` (single `<table>`); split head/body only for legacy P0001 flex-pane migration backlog.
- **Thead paint SSOT** — `hub-directory-table.css` golden header; `hub-split-directory-pane.css` owns wrap chrome (border/radius) only — no duplicate `thead th` background.
- **Panel-fill** — `hub-directory-frame--panel-fill` + `panelFillRows` — **opt-in only** (P0003 Profiles equal-height grid). **Default split pane (P0001 Runners/Tasks, P0005 density):** no `panelFillRows`; `hub-directory-frame-table.css` scrolls `.hub-users-table-wrap` inside flex shell with **natural** `tbody tr` height + pager pinned.
- **Partial-page pad** — `padBodyRowsToPageSize` pairs **only** with `panelFillRows` (invisible pad slots). **Cấm** pad without panel-fill.
  - `invisible` — panel-fill keeps full frame height; pad slots have no grid lines (P0003 Profiles / Scripts panel).
  - `visible` — subtle separators on pad slots (workflow rail `fixedRows`).
  - Helpers: `shouldPadDirectoryBodyToPageSize(visible, pageSize)` · `shouldPadDirectoryBodyToFixedRows(visible, fixedRows)`.
  - Do **not** use `compactDirectory` for partial search — it shrinks the shell; use pad rows instead.
  - **Action hit expand** — `HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS` on Run/Stop/Cancel buttons (icon size unchanged).

### Directory table surface tokens (hub-ui 0.2.18+)

**Canonical source:** `packages/hub-ui/src/styles/hub-users-table.css` (`:root`), consumed by `hub-directory-table.css`, `hub-split-directory-pane.css`, `hub-directory-frame-table.css`.

| Token | Value | Applies to |
|-------|-------|------------|
| `--hub-directory-pane-surface` | `var(--panel)` (`#121830`) | `.hub-users-table-wrap`, split-pane inner wrap, modal directory wrap |
| `--hub-directory-thead-surface` | `color-mix(in srgb, var(--panel) 92%, white 8%)` | `thead` / directory golden header |
| `--hub-directory-thead-border` | `rgba(255, 255, 255, 0.08)` | Header bottom rule |

**Layout vs color:** Standalone directories (P0004 Hub/Dashboard/Users) sit on page `--bg`; split panes (P0003 Profiles) add outer `bg-[var(--panel)]` — **table wrap uses the same `--hub-directory-pane-surface` in both**, so perceived brightness matches P0003 Profiles.

**Rules**

- Do **not** set `.hub-users-table-wrap { background: rgba(255,255,255,0.02) }` in tools — use SSOT tokens or omit (inherits from vendor).
- Sheet grid thead overlay (P0020): `background-color: var(--panel)` + `background-image: linear-gradient(var(--hub-directory-thead-surface), …)` — never hardcode old 2% white fallback.
- Legacy `.lib-table` / `.table-view` (P0004 `library.css`) are **not** Hub directory SSOT — migrate to `HubDirectoryTableShell` when touching those screens.

**Verify:** `node Tool/scripts/hub-ui-parity-check.mjs --code P00xx` · browser: `getComputedStyle(.hub-users-table-wrap).backgroundColor` → `rgb(18, 24, 48)`.

### Modal / detail panel surface (hub-ui 0.2.19+)

**Canonical source:** `hub-users-table.css` (`--hub-modal-panel-surface`), `hub-modal.css` (`.hub-tool-detail-section`).

| Token | Value | Applies to |
|-------|-------|------------|
| `--hub-modal-panel-surface` | `var(--hub-directory-pane-surface)` → `var(--panel)` | `.hub-tool-detail-section`, modal stat frames, bulk-input frames, route cards |

**Rules**

- Tool modals (P0013 channel stats, P0020 2FA detail/add, cookie route cards) **must** use `var(--hub-modal-panel-surface, var(--panel))` — never `rgba(255,255,255,0.02)` on panel chrome.
- Product-local vars (e.g. `--twofa-adm-panel`) **alias** `--hub-modal-panel-surface`, do not hardcode rgba.
- Nested list items (recent changes rail) may use `rgba(0,0,0,0.12)` inset — not the outer panel surface.

**Golden refs:** P0013 `p0013-channel-detail-modal.css` · P0020 `twofa-account-detail-modal.css` · hub-ui `.hub-tool-detail-section`

**Verify:** `node Tool/scripts/hub-ui-css-check.mjs --code P0013` (vendor surface token gate).

**Do not**

- Concat `"hub-directory-table-scroll hub-directory-table-scroll--flex-pane"` locally — use constants from `directory-table-scroll.ts`.
- Add tool-local `stealth-directory-table.ts` / `gpm-directory-table.ts` shims that re-export wrap strings — import hub-ui directly.
- Nest `hub-split-scroll` overflow + `hub-directory-table-scroll` on the same subtree.

**Golden refs**

- P0004 — `UserDirectoryTable.tsx`, `HubToolsDirectoryTable.tsx` (default inline)
- P0003 — `SystemBackupDirectoryTable.tsx`, `StealthProfileDirectoryTable.tsx` (`HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS`)
- P0020 — `WorkspaceSidebar.tsx` pane tables
- Legacy — P0001 `gpm-directory-table.ts` (`HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS` — migrate to `HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS`)

**Verify:** `node Tool/scripts/hub-ui-parity-check.mjs --code P00xx` · `node Tool/scripts/hub-directory-split-head-gate.mjs` (legacy split only)

---

## Directory table scroll (legacy split — deprecated)

**Canonical source:** `DirectorySplitScrollTable.tsx`, `directory-split-scrollbar-sync.ts` — **migration backlog for P0001 only.**

| Wrap class | Component | Scrollbar |
|------------|-----------|-----------|
| `HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS` | `DirectorySplitScrollTable` + `--flex-pane` | Body only (`.hub-directory-table-body-scroll`) |

New tools and pane directories **must** use `HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS` (inline paint) instead of split flex-pane.

---

## Virtual list (Notes / Inbox rail)

| Constant | Value | Location |
|----------|-------|----------|
| `VIRTUAL_THRESHOLD` | `48` notes | P0020 `useNotesListVirtualWindow.ts` |
| Row height compact | `38px` | `NOTES_LIST_ROW_HEIGHT.compact` |
| Row height comfortable | `46px` | `NOTES_LIST_ROW_HEIGHT.comfortable` |

**Selected row scroll-into-view**

- P0020 `NotesListRail`: `scrollNoteIntoView(noteId, index)` on `selectedId` change (`block: nearest`, virtual = index × rowHeight math).
- Row button: `data-note-id="{id}"` for non-virtual DOM path.
- Skip scroll when row already in viewport (`isIndexInScrollView` margin `6px`).

**Golden refs**

- CSS — `vendor/hub-ui/src/styles/hub-split-scroll.css`
- P0020 — `NotesListRail.tsx`, `NoteEditorPanel.tsx`, `noteHistoryTocRails.tsx`, `theme/data-box-layout.css`
- P0016 — `InboxThreadsRail.tsx`, `InboxThreadPanel.tsx`, `theme/inbox-layout.css`
- History modal — `note-history-modal.css` + `hub-split-scroll` on TOC / diff panes

**Do not**

- Duplicate webkit scrollbar rules per tool (`inbox-layout.css` local overrides — removed).
- Use `overflow-y: scroll` on both `hub-main` and pane body (double scrollbar).
- Expand textarea to `scrollHeight` without constraining pane height.

---

## Tab header (golden — AppTabHeader)

**Canonical source:** `packages/hub-ui/src/shell/AppTabHeader.tsx` + `app-tab-header.css` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

**Layout contract (P0004 Hub / all directory tabs):**

```
[start]  title · session · version/meta     [center]  centerStats (KPI strip)     [end]  actions only
```

| Column | CSS class | Content | Rules |
|--------|-----------|---------|-------|
| Start | `.app-tab-header__start` | Tab title (icon + h1) · **Session** timer · version meta (`Tag` + `vX.Y.Z` + activity dot + timestamp) | Session **before** version meta; **no** `·` between version and activity dot; activity label uses same `tabular-nums text-[var(--text)]/90` as Session value |
| Center | `.app-tab-header-center-stats` | `statusSlot` (**Live / Syncing…** = `HubDirectorySyncChip`) then `centerStats` | Sync chip SSOT — do not fork MetaChip per tool. Query pending is a **separate** chip. Always `flex`; `justify-self-center` |
| End | `.app-tab-header__end` | `actions` slot — **Notify** · **Log** + **Settings** | No Session, no KPI stats |

**Grid:** `grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)` — symmetric columns so center stats stay viewport-centered.

**Sparse (no center KPI):** When `centerStats`, `centerContent`, and `statusSlot` are all empty → `app-tab-header--sparse` (`1fr auto`; hide center rail). **Do not** leave empty center column gap. Gate: `audit-hub-tab-header-sparse.mjs --strict`.

**App wiring**

| Tool | Header wrapper | Version meta |
|------|----------------|--------------|
| P0004 Dashboard | `DashboardChromeHeader` | `buildVersionMetaItems` + `resolveVersionReleaseMeta` |
| P0004 Hub | `HubStickyHeader` / `HubListChromeHeader` | same |
| P0004 Users | `UserListChromeHeader` | same |
| P0004 System | `SystemTabHeader` | same |
| P0020 workspace | `WorkspaceTabHeader` | `buildVersionMetaItems(semver, publishedAt, live)` — `MetaActivityAt` in `AppTabHeader` |

**Version meta layout (release activity):** `v4.3.42` `[gap]` `[dot]` `3h ago` — dot colors: fresh red (≤1h) · recent orange (≤24h) · days blue (1–3d) · week teal (4–7d) · stale gray (>7d); label buckets match `HubActivityTimestampLabel` (directory/rail). Header label typography matches **Session** value span exactly (not `hub-users-status` 10px).

**Version timestamp sources (SSOT):** card `Tool/docs/playbooks/_cards/hub-version-clock-ssot.md` — `resolveHubProductVersionMeta` / `resolveAppVersionReleaseMeta` pick newest of `VITE_APP_BUILT_AT` → matching `latestPublished` → CHANGELOG Timestamp → `manifestUpdatedAt`. Header + Update modal must share that stamp (`ensureHubReleaseNotesIncludeCurrent(..., publishedAt)`). **Cấm** tool tự gán `manifestUpdatedAt` làm `publishedAt`.

**Version triple** (`package.json` · `tool.manifest.json release.version` · CHANGELOG top `- Version:`): kept in sync by `bumpAndSyncDocs` (pre-commit), `ensure-changelog-version-block.mjs --write` (pre-push), and `syncToolManifestReleaseVersion` in `version-sync-lib.cjs`.

**Do not**

- Put Session in `__end` or mix KPI stats into `actions`.
- Fork `AppTabHeader` per tool — re-export from `@tool-workspace/hub-ui` only.
- Use asymmetric grid (`max-content` right column) — breaks center alignment.

**CI**

```bash
node Tool/scripts/hub-ui-parity-check.mjs --code P0004 --screen dashboard
node Tool/scripts/hub-ui-parity-check.mjs --app-tab-header-only
node Tool/scripts/ensure-changelog-version-block.mjs --code P0004 --check
```

Checks: `session-in-start-rail`, `center-stats-always-visible`, `grid-three-column-centered`, vendor byte-sync for `AppTabHeader.tsx` + `app-tab-header.css` across P0004 · P0016 · P0008 · P0020 · P0021.

**CI / hooks:** `Tool/.github/workflows/hub-ui-governance.yml` runs `--app-tab-header-only` + `ensure-changelog-version-block.mjs --all --check`. Pre-push (via `install-product-git-hooks.cjs --all`) runs CHANGELOG ensure `--write` then header check.

**Golden refs**

- Package — `AppTabHeader.tsx`, `WorkspaceTabHeader.tsx` (docstring)
- P0004 — `DashboardChromeHeader.tsx`, `HubStickyHeader.tsx`, `src/lib/app-release.ts`

---

## Sidebar brand (golden — hub-ui)

**Shell:** `HubSidebarShell` — `brandLeading` + `brandTitle` (human product name) only.

### Portal / brand-gateway hosts (P0014 · P0022 · P0015)

Compose Hub chrome once; **do not fork** directory screens into the host.

| Rule | Detail |
|------|--------|
| Golden shell | P0020 + this package |
| Embed Orders | P0022 `StoreOrdersRoute` + `@p0005` + `.embed-vendor` |
| Embed Customers / multi-tab | P0015 `AGENTS.md` · `mainExtraFor` |
| Docs | `Tool/docs/ssot/hub-portal-host-ssot.md` |
| Iframe / split panes | `uiShell.splitScreens` + `overflow-hidden` host main (absolute iframe collapses under directory `overflow-y-auto`) |

| Rule | Detail |
|------|--------|
| **Brand mark** | `HubSidebarBrandIcon` — `src` + `alt`; do **not** use raw `HubAuthBrandIcon`, `ToolAvatar`, or `HubToolAvatar` in sidebar |
| **Title** | Human name only — e.g. `Data Box`, `Tool Hub`, `Chat Center` |
| **Auth gate only** | `HubAuthBrandIcon` (56px + glow) — sign-in / boot panels only |
| **No code** | Do not show `P00xx` in `brandTitle` |
| **No tagline** | Do **not** pass `brandTagline` — prop is `@deprecated` and not rendered; descriptor/version live in tab header (`AppTabHeader` meta) or auth gate only |
| **No version** | Release `vX.Y.Z` lives in tab header meta (`buildVersionMetaItems`) — never duplicate in sidebar |
| **Auth gate subtitle** | `formatHubAuthToolInfo` — optional tagline in login modal only; omit `code` in preset when possible |

**Golden refs (logo + name, no `brandTagline`)**

- P0001 — `DeskSidebar.tsx` (Desk Console)
- S001 — `GpmHubShellSidebar.tsx` (shelved GPM; former P0001)
- P0003 — `StealthHubShellSidebar.tsx`
- P0004 — `SalesSidebar.tsx`
- P0005 — `P0005CrmSidebar.tsx`
- P0016 — `HubShellSidebar.tsx`
- P0020 — `WorkspaceSidebar.tsx`
- P0024 — `MapPlacesSidebar.tsx`

**Verify:** `node Tool/scripts/hub-ui-parity-check.mjs` (sidebar golden phase — `hubSidebarBrandGoldenChecks` forbids `brandTagline=` on every `HubSidebarShell`).

---

## Sidebar nav tones (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/shell/sidebar-nav-tones.ts` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| API | When to use |
|-----|-------------|
| `NavIconTone` | Per menu item — assign once in nav registry (`items[]`, `NAV_STRUCTURE`, `SYSTEM_TAB_ITEMS`) |
| `navIconClass(tone, active)` | Icon color (idle 75% · hover · active) |
| `HUB_CHROME_ICON_PX` + `compactIconSize` | **14px** base glyph — sidebar screen/group/subnav, `AppTabHeader` title, directory card leading |
| `navDotClass` / `navRailClass` | System-style subnav dot + vertical connector |
| `HubSidebarNavGroup` / `NavGroupSubNav` | Expandable group header + dot/rail subnav list |
| `NavScreenGroupConfig` / `NavViewGroupConfig` | Sidebar nav registry — screen children vs URL sub-view children |
| `navGroupSubnavOpenKey` / `flatMapNavScreenItems` | SessionStorage keys + flat nav for tab headers |
| `navActiveBarClass` / `navActiveBgClass` / `navActiveTextClass` | Main nav active row (left bar · gradient · label) |

**Tone palette:** `sky` · `indigo` · `emerald` · `amber` · `cyan` · `violet` · `rose` · `fuchsia` · `blue` — one distinct tone per sidebar item; reuse across Dashboard cards, tab headers, and subnav.

**Rules**

- Import helpers from `@tool-workspace/hub-ui` only — no per-tool `sidebar-nav-tones.ts` copies.
- Every primary nav item **must** declare `iconTone`; subnav items inherit the same contract.
- Footer rows keep fixed tones: User `violet`, Refresh `emerald`, Log `cyan`, Settings `amber`.
- Tab group badges (`HUB_APP_TAB_GROUP_META`) and template badges (`HUB_UI_TEMPLATE_META`) use `iconTone` → `navBadgeIconClass` / `navBadgeVariantClass`.
- Dashboard KPI tiles use `navKpiTone(meta.iconTone)` — `KpiStripTone` matches full `NavIconTone` palette.
- Dashboard header stats use `navBadgeIconClass(meta.iconTone)`; filter **group** / **template** All-icons and options delegate to tab-group / template meta.
- Chart bars/donuts use `navChartColor(meta.iconTone)`; card/table meta lines use `navMetaTextClass(entry.iconTone)`.
- Do **not** hardcode `text-indigo-300` / `from-indigo-500/20` on active sidebar rows when `iconTone` is available.

**Golden refs**

- P0004 — `SalesSidebar.tsx`, `SystemTabSubNav.tsx`, `dashboard-tab-registry.ts` (`iconTone` on `DashboardTabEntry`)
- P0020 — `WorkspaceSidebar.tsx`
- P0016 — `nav-structure.ts`, `HubShellSidebar.tsx` (`HubSidebarNavGroup` + `NavGroupSubNav`)
- P0008 — `layout/Sidebar.tsx`, `system/SystemTabs.tsx`
- P0021 — `workspace/WorkspaceShell.tsx`

**Verify:** `node Tool/scripts/hub-ui-duplication-check.mjs`

---

## Semantic icon registry (golden)

**Canonical:** `packages/hub-ui/src/lib/semantic-icon-registry.ts`  
**Types:** `packages/hub-ui/src/types/semantic-icon.ts`

One semantic key maps icon + tone across **badge**, **KPI strip**, **tab header stat**, and **modal TOC** surfaces.

| Helper | Surface | Example |
|--------|---------|---------|
| `semanticFilterMeta(key)` | Filter chips / MetricBadge | `skill` → Puzzle |
| `semanticKpiIcon(key)` | `KpiStrip` tiles | `{ ...semanticKpiIcon("kpi.inbox.unread") }` → **emojiGlyph** (never Lucide on the tile) |
| `semanticHeaderStat(key)` | Tab header stat line | `{ ...semanticHeaderStat("kpi.fanpages.pages") }` |
| `buildSemanticTocIcon(key)` | Settings / User / Log TOC + section header | `icon={buildSemanticTocIcon("user.account")}` |
| `resolveSemanticIcon(key)` | Raw `{ icon, className, tone }` | Custom wrappers |

**Key namespaces (add new keys here — never hardcode Lucide in screens):**

| Prefix | Use |
|--------|-----|
| `agent.*` | Agent context kind / scope / apply mode |
| `settings.*` | Display prefs modal TOC sections |
| `user.*` | Workspace / full user account modals |
| `log.*` | Usage log panel TOC + trigger |
| `personality.*` | Personality edit modal sections |
| `kpi.*` | Hub / User tab KPI tiles (`kpi.inbox.*`, `kpi.schema.*`, `kpi.jobs.*`, …) |
| `template.*` | Design template KPI |
| `field.custom` | JSONB custom fields |

**Rules**

- Hub / User `*Screen.tsx` and directory `*Page.tsx` KPI tiles **must** spread `semanticKpiIcon("…")` — enforced by `node Tool/scripts/hub-ui-icon-parity-check.mjs`.
- Modal TOC sections use `buildSemanticTocIcon` on **both** TOC rail and `HubToolDetailSection` `icon` prop (Settings golden).
- Dynamic per-row icons (e.g. `createBotAccountKpiIcon`) are allowed; static Lucide in KPI objects is not.
- Fan-out: `node Tool/scripts/sync-hub-ui-vendor.cjs` copies registry to all vendor `hub-ui`.

**Golden refs**

- Settings TOC — `HubDisplayPrefs.tsx` (`settings.*` keys)
- User modal — Layout 3 ADM SSOT: `HubAdmRecordMetaRow` (Created · Update · Vault ID) + `HubUserAccountSections` (`HubAdmReadonlyField` grid) via `HubFullUserAccountModal` / `HubWorkspaceUserModal`. Change sub-modals use `HubUserModalAdmField` (not legacy `HubUserModalFieldTable`).
- Log panel — `HubUsageLogPanel.tsx` (`log.*` keys)
- P0016 directory KPIs — `InboxScreen.tsx`, `FanpagesScreen.tsx`, …
- P0006 jobs directory — `job-semantic-metrics.ts` (`JOB_METRIC_DEFS` → `kpi.jobs.*`)
- P0006 tool-detail sections — `reup-tool-detail-section-icons.tsx` (`REUP_TOOL_DETAIL_SECTION_META`)

**P0006 Content Studio job metrics (`kpi.jobs.*`):**

| Key | Icon | Label | Surface |
|-----|------|-------|---------|
| `kpi.jobs.total` | Clapperboard | Total | Jobs KPI strip + header stat |
| `kpi.jobs.completed` | CheckCircle2 | Completed | Jobs KPI strip + header stat |
| `kpi.jobs.processing` | Loader2 | Processing | Jobs KPI strip + header stat |
| `kpi.jobs.failed` | AlertCircle | Failed | Jobs KPI strip + header stat |

SSOT chain: `job-semantic-metrics.ts` (`JOB_METRIC_DEFS`) → `job-kpi-items.ts` (`semanticKpiIcon`) · `job-header-metrics.ts` (`semanticHeaderStat`). Never hardcode Lucide in job screens.

---

## URL prefs + toolbar (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/lib/hub-url-prefs.ts`, `HubTimeRangeSelect.tsx`, `HubRowLimitSelect.tsx`.

| API | When to use |
|-----|-------------|
| `configureHubUrlPrefs({ defaultRange, defaultLimit, patchImpl, usePrefsChangeEvent })` | Once in app bootstrap / `url-prefs.ts` module load |
| `readHubListPrefsCore()` + app extras | Per-tool `readHubListPrefs()` wrapper |
| `patchHubListPrefs` / `parseHubPrefSet` | Shared URL read/write |
| `HubTimeRangeSelect` / `HubTablePageSizeSelect` | Directory period + pager rows (`tpage`) — via `DirectorySearchToolbar` |
| `HubRowLimitSelect` | **Deprecated** on directory — P0020 vault cap only; use `HubTablePageSizeSelect` |
| `matchesDirectoryTimeRange` | Filter rows by ISO `activityAt` / `updatedAt` |
| `directoryActivityIso` + `matchesDirectoryActivityAt` | Epoch (s/ms) or ISO — P0016 bots/groups `lastActiveAt` |
| `useHubDirectorySelection` | Checkbox prune + card select-all — P0004 Hub, P0016/P0020 directories |
| `DirectorySearchToolbar` `workspacePeriod` | P0020 vault tabs — embeds `HubWorkspacePeriodSelect` (replaces manual `leading`) |
| `DirectorySearchToolbar` `showTimeRange` | Legacy only — prefer `workspacePeriod` (All). Remaining: rare activity filters until migrated |

**Hub `range` vs workspace `*range`**

| Layer | URL key | Select | Filter helper | Tabs |
|-------|---------|--------|---------------|------|
| Hub catalog | `hbrange` / legacy `range` | Prefer `workspacePeriod` (`scope: "hub"`) · legacy `showTimeRange` | `matchesWorkspacePeriod` / `matchesDirectoryTimeRange` | P0004 Hub (when period enabled) |
| Users directory | `usrange` | `workspacePeriod` `scope: "users"` `defaultRange: "all"` | `matchesWorkspacePeriod(createdAt, …)` | P0004 Users |
| P0016 Bots/Groups | `range` | `HubTimeRangeSelect` via `showTimeRange` | `matchesDirectoryActivityAt` | P0016 |
| Workspace vault | `{scope}range` (e.g. `twofarange`) | `workspacePeriod` on `DirectorySearchToolbar` | `readWorkspacePeriod(scope)` + domain date field | P0020 2FA/Cookie/Notes/Todo |

- **Never** show both selectors on one toolbar — `showTimeRange={false}` when `workspacePeriod` is set.
- P0016 tabs without activity timestamps (Inbox, Analytics, Fanpages, Channels, Personalities) — `showTimeRange={false}` (default on `ConsoleDirectorySearchToolbar`).
- P0016 Bots/Groups filter `lastActiveAt` — `showTimeRange` + `matchesDirectoryActivityAt` from hub-ui.
- Directory selection — `useHubDirectorySelection` (prune + card select-all); wrap domain bulk bars in `HubDirectoryBulkActionBar`.

**Rules**

- Do **not** fork toolbar selects per tool — configure defaults via `configureHubUrlPrefs`.
- P0004: custom `patchImpl` (`buildAppUrl` + screen sanitize). P0020: `usePrefsChangeEvent: true`.
- Per-tool `url-prefs.ts` stays Tier 2 (extra fields only).

**Verify:** `node Tool/scripts/hub-ui-duplication-check.mjs`

---

## KPI + Charts analytics band (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/display-prefs/kpi-visible.ts`, `chart-visible.ts`, `HubDisplayPrefs.tsx`, `KpiStrip.tsx`, `hub-shell-layout.css` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| API / component | When to use |
|-----------------|-------------|
| `MAX_VISIBLE_KPI` (8) | Hard cap — max tiles rendered per tab row |
| `DEFAULT_KPI_ON_COUNT` (4) | Default on-count via `defaultKpiKeysFromDefs(defs)` — do not pass `MAX_VISIBLE_KPI` as default |
| `resolveVisibleKpiKeys` / `useResolvedVisibleKpiKeys` | Filter KPI tile data before `KpiStrip` |
| `enforceKpiMaxOnAdd` | Settings toggle only — drops earliest visible key when user exceeds cap |
| `KpiStrip` | Render filtered tiles; sets `data-kpi-count` for CSS slot grid |
| `HubDisplayPrefs` + `SubTabDisplayConfig` | Settings panel; URL prefs (Hub/Dashboard/Users) or `sessionStorage` (System/Fanpages) |

**Layout rules (KPI strip + Charts band)**

- **Fixed slot grid (1–3 visible)** — `md+` (768px): **4-column** grid; each slot = **1/4 row**. Example: 3 visible → **3/4** width (KPI + Charts).
- **Full row (4–8 KPI / 4 Charts)** — `md+` grid columns = visible count (`repeat(n, 1fr)`); tiles **fill the full line**.
- **Charts band** — `hub-charts-band` + `data-chart-count` (auto via `countAnalyticsBandSlots` in `HubTabScreenBody`; override with `chartCount` prop).
- CSS canonical: `hub-shell-layout.css` only — `node Tool/scripts/hub-ui-duplication-check.mjs` fails on per-tool grid overrides.
- Chart legend icon+label: `.hub-chart-legend-label` + `ChartLegendLabelContent` — emoji split, brand match, `configureChartLegend`; gap `--hub-inline-gap-comfort` (see **Inline glyph + label gaps**).
- **P0016 dashboard** exception: `p0016-hub-charts.css` mirrors golden rules on `.p0016-charts-row[data-chart-count]` inside full-width layout wrapper.

**Settings / multi-select rules**

- KPI · Charts · Hub header stats · Filters · Table columns — single **`HubDirectoryDisplayPanel`** on FilterBar row 1 (`displayBand`).
- Page size (`tpage`) — **`HubTablePageSizeSelect`** only.
- Settings modal (tab scope) — Keyboard shortcuts + tool sections only; global scope keeps header pin toggles.
- KPI toggles are **multi-select** `Set`, not radio. Toolbar label: `KPI n/8`.
- Sub-tab screens (System, Fanpages): `HubDisplayPrefs` must bump `displayTick` after `adapter.patch()` so the open Settings modal re-reads `sessionStorage` (avoid overwrite on 2nd toggle).
- Toggle `on` uses `isVisible(stored, defaults, key)` — not `resolveVisibleKpiKeys().has(key)`.
- When `n >= MAX_VISIBLE_KPI` / `MAX_VISIBLE_CHART`, **disable** unselected toggles; click shows cap message via `onLog` (app log toast). Do **not** silently swap selections — block at cap.
- **Toggle row icons (golden)** — `PrefItem` / `DirectoryTableColumnItem` accept optional `icon` + `iconClassName`. Tools attach via `withPrefItemIcons(defs, ICON_MAP)` and `withDirectoryColumnIcons(cols, ICON_MAP)` from hub-ui; `ToggleRow` renders checkbox + icon + label in `HubDirectoryDisplayPanel`, `HubDisplayVisibilityMenu`, and Settings modal filter sections.
- **Hide analytics frame** when zero KPI and zero charts: pass `kpis={undefined}` / `charts={undefined}` (use `directoryChartBandNode`, not a bare `<DirectoryChartBand />` element).

### Directory table Display settings (golden — hub-ui)

**Section order (P0020 Service/2FA):** Field Display Limit (default OFF) + Allow manual column sort (default OFF) → Fixed default order / Default sort → Password (if any) → Columns (`HubDirectoryFreezeColumnsSetting` **inside** Columns + `DirectoryTableColumnsSettings`).

| API | Role |
|-----|------|
| `DirectoryTableDisplaySettingsShell` | Fixed slot order (toggles → sort → extras → columns) |
| `createDirectoryManualSortPrefs` / `createScopedDirectoryManualSortPrefs` | Opt-in manual sort storage (default OFF) |
| `HubDirectoryManualSortToggle` | Display toggle row |
| `useDirectoryManualSortEnabled` | Subscribe hook |
| `resolveDirectorySortMode` | `manualSortEnabled: false` → `default-order-only` |
| `DirectoryDefaultSortHint` | Documented primary default + Active/Reset |

**Do not promote** per-tool field-limit caps, password toggles, or sort-rule defs into hub-ui. Gate: `Tool/scripts/audit-directory-display-settings.mjs`. Card: `_cards/hub-directory-display-settings.md`.

**Legacy upgrade:** `DirectoryTableLegacyDisplaySettings` — one-call MS + Fixed default order + Columns for columns-only panels (P0016 / P0003 / P0006 / P0024).

### Directory table columns + presets (golden — hub-ui)

**Note column width SSOT:** `HUB_DIRECTORY_NOTE_COL_WIDTH` (`20rem`) in `hub-directory-column-width-registry.ts` — freeform **Note** / Plan Notes only (Plan Package is `26rem`). Ellipsis + rem lock that beats directory neutralize. Do not hand-roll other rem/`%` for that column. Fluid `%` “Notes” on system panels (P0004) stay fluid. Gate: `Tool/scripts/verify-directory-note-width-ssot.mjs`.

**Log column width SSOT:** `HUB_DIRECTORY_LOG_COL_WIDTH` (`15rem`) — same registry file / export. Prefer the named alias (or product `TWOFA_LOG_COL_WIDTH`) over `R.log!.token` literals. Gate: `Tool/scripts/verify-directory-log-width-ssot.mjs`.

**Shared vault chrome (width + sticker):** same semantic column = same rem + same `TWOFA_COLUMN_SHARED_GLYPH` on every screen (Services · Mail · Meta · Teams members · Quota). Tokens: Profile `7.5rem` · Own `5.5rem` · Status `8.75rem` · Usage `8.75rem` · Usage Expired `12rem` · Date/Due/Joined `6.25rem` · Duration/Left `5rem` · Password `8rem` · Recovery `12.5rem` · Full Info `7rem` · Plan Package `26rem`. CSS `--hub-dir-col-profile|own|status|usage|usage-expired|date|plan-left|password|recover|full-info|plan-package`. Teams members stickers import Services glyphs (`fullInfo` = `🆔`, Joined = Created `📅`). Schema stack-align = `width: max-content`. HubRouteAccess shared chrome headers never icon-only (`HUB_ROUTE_ACCESS_HEADER_LABEL_ALWAYS`). Left cells use Services `formatQuotaPlanDaysRemainingLabel` (`N days`). **Forbidden:** Mail 6.5 Status/Update, Team rem/`%` on shared cols, Team Left number-only. Gate: `Tool/scripts/verify-directory-shared-chrome-width-ssot.mjs`.

**Canonical:** `packages/hub-ui/src/prefs/` — `createDirectoryTableColumnPrefs`, `createDynamicDirectoryTableColumnPrefs`, `createDirectoryTableColumnPresetManager`, `DirectoryTableColumnsSettings`, `HubDirectoryTableColumnPresetMenu`.

| Step | Static columns | Runtime columns (browser pivot, sheet grid) |
|------|----------------|---------------------------------------------|
| 1 | `*-table-prefs.ts` via `createDirectoryTableColumnPrefs` | `createDynamicDirectoryTableColumnPrefs` |
| 2 | `*TableColumnsSettings` → `DirectoryTableColumnsSettings` | same |
| 3 | Wire `tableColumnPresets` on `HubDirectoryDisplayPanel` | same |
| 4 | Table reads `prefs.read()` + `prefs.readOrder()` | per-scope manager |

**Rules:** no forked toggle lists; preset after Display; non-directory UIs (Todo Kanban) skip table column SSOT. Onboard: copy `cookie-route-table-prefs.ts` pattern.

**Frame presets (Detail ADM 1:1 — mandatory when the entity has a multi-section Detail modal):**

| Rule | SSOT |
|------|------|
| Names / emoji | Match Detail TOC section labels (e.g. Orders: Customer · Order · Subscription · Sample) |
| Visible columns | Required chrome + fields in that ADM frame only |
| Seed | `upsertDirectoryBuiltinFramePresets()` via `ensure*BuiltinFramePresets()` (idempotent refresh) |
| Delete | Hide Trash for `builtin: true` or `id.startsWith("builtin-")` (`HubDirectoryTableColumnPresetMenu`) |
| Golden | P0020 Mail — Status / Identity / Service / Exchange / Plan (`twofa-mail-display-preset.ts`) |
| Orders | P0005 `order-display-preset.ts` + `ORDER_TABLE_PRESET_*` in `order-table-prefs.ts` |
| Customers / Products | P0005 `customer-display-preset.ts` / `product-display-preset.ts` |

Do **not** invent a second preset menu — only `HubDirectoryTableColumnPresetMenu` via `tableColumnPresets`.

**Coverage:** P0020 Cookie/Notes/Sheet/2FA (Services·Mail·Browser·Quota); P0004 Users/Library/Dashboard/Agent/Supabase/Server; P0005 Orders/Customers/Products frame presets.

**Per-tool wiring**

- Define `*_KPI_DEFS: PrefItem[]` + `DEFAULT_*_KPI_KEYS = defaultKpiKeysFromDefs(defs)` (4 on by default).
- URL tabs: `readHubListPrefs().kpi` + `patchHubListPrefs({ kpi: "a,b,c" })`.
- Sub-tab tabs: `SubTabDisplayConfig` with `changeEvent` (e.g. `system-display-change`); analytics hook listens + `displayTick`.

**Golden refs**

- P0004 — `HubListPage.tsx`, `system-display-prefs.ts`, `DisplayPrefs.tsx` (`SYSTEM_SUBTAB_CFG`)
- P0016 — `fanpage-display-prefs.ts`, `use-screen-display-prefs.ts`
- P0020 — `cookie-display-prefs.ts`, `twofa-display-prefs.ts`

---

## Modal shell (golden — hub-ui)

**CSS SSOT:** `packages/hub-ui/src/styles/hub-modal.css` — `HUB_TOOL_MODAL_SIZE_TOKENS` (`88rem` × `768px` / `73.6vh`) · `HUB_COMPACT_MODAL_SIZE_TOKENS` (`28rem`).

| Class | Box | Use |
|-------|-----|-----|
| `hub-tool-detail-modal` (default) | `88rem` × `768px` / `73.6vh` | Detail · Notify · Log · Update · Settings |
| `hub-header-panel-modal` | same `88rem` box | Settings · Log · Notify · Update (header chrome only) |
| `hub-tool-detail-modal--fit` / `hub-compact-modal` | `28rem` · height auto | Confirm · Prompt · Clone |
| `hub-account-detail-modal` | same `88rem` box | Layout 3 account (TOC · main · Note/Log) |

### Layout 2 — Main + TOC (Tier C form SSOT)

**Simplest tool-detail form** — left TOC · right main sections · footer. **Not** Account detail 3-frame (no log rail / no ADM scaffold).

| Piece | SSOT |
|-------|------|
| Shell | `CookieRouteFormModal` (P0020 Cookie) → `HubToolDetailModal` + `shellClassName="cookie-route-form-modal"` · `size="detail"` · `scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}` |
| TOC | `TocSectionNav` + `OverviewTocItem[]` (emoji + label) |
| Sections | `HubToolDetailSection` (`CookieRouteModalSection`) — title = `{emoji} {label}` |
| Field row | `HUB_TOOL_DETAIL_FORM_GRID_3_CLASS` + `HubFormFieldLabel` / `HubModalFilterField` |
| Filters | `FilterOption.emoji` required for status/access glyphs (`FilterOptionGlyph`) |

**Golden refs:** Cookie Bridge **New user** (`CookieRouteMembers` share modal).

**Do not** wrap Layout 2 in `hubAccountDetailShellClass` / `HubAccountDetailAdmScaffold` (that is Layout 3 / Tier A). Teams **New member / Member detail** (`TwofaTeamAddMemberModal`) is Layout 3 — see Account detail modal below.

**Rules**

- Do **not** pass legacy `panelWidth` / `maxViewHeight` on `HubDisplayPrefs` — removed; shell uses CSS tokens.
- Header-panel modals: `shellClassName="hub-header-panel-modal"` — same `88rem` box. Confirm/Prompt/Clone = `size="compact"` only.
- **Cấm** `shellStyle={{ "--hub-modal-max-w": "…" }}` · `max-w-md` / `max-w-lg` on `HubModalFrame`.
- **Ops panels (Log · Notify · Update Release):** same Layout 2 shell; **one** search via `headerCenter` + `HubActivityFeedToolbar variant="header"`; nest feed sections under `HubOpsFeedFilterProvider` so Vault Live / alert rows share filters — never a second search inside a section.
- **Update Release feed SSOT:** every Push/Deploy/Release regenerates `public/release-notes.json` via `Tool/scripts/generate-release-notes.mjs` (wired in `ship-product.ps1`, `auto-commit-if-ready.mjs`, `post-deploy-manifest.mjs`). Header age uses `HubChromeActivityAge` (never `HubUsersStatusLabel`). One trigger icon: Latest / Update / Download (bundle stale).

### Account detail modal (3-frame — hub-ui)

**New / Detail (locked 2026-08-22):** every new entity New/Detail modal is **Layout 3**. Golden = User Detail (`HubWorkspaceUserModal` / `HubFullUserAccountModal`). Do **not** ship a stacked `HubAdmSectionBlock` column inside a bare `HubToolDetailModal`. Card: `Tool/docs/playbooks/_cards/hub-modal-layout-3-ssot.md`.

**Canonical source:** `packages/hub-ui/src/styles/hub-account-detail-modal.css` · `HubAccountDetailModalFrame` · constants `HUB_ACCOUNT_DETAIL_*` in `hubAccountDetailModal.ts`.

> **Body frame SSOT:** account-detail modals **must** use `HubAccountDetailAdmScaffold` (wraps `HubAccountDetailModalFrame` + `HubToolDetailPanel`) and `HubAdmSectionBlock` for subsections. P0005 `CrmDetailModalFrame` / `CrmDetailSection` are thin deprecated aliases only.

```tsx
<HubAccountDetailAdmScaffold panelId={sectionId} main={<>…<HubAdmSectionBlock sectionKey="identity">…</HubAdmSectionBlock></>} rail={…} />
```

| Frame | Component | Scroll |
|-------|-----------|--------|
| TOC (left) | `HubModalTocNav` / `HubTocSectionNav` | sticky in modal layout |
| Main (center) | `HubToolDetailPanel` / `HubToolDetailSection` inside `HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS` | **main column only** — `scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}` |
| Log (right) | `HubToolDetailRail` | internal rail scroll |
| Header search | `HubAccountDetailSearchProvider` + `HubAccountDetailHeaderSearch` in header center (`headerCenter` or `HubToolDetailIdentityHeader` `center`) | highlights Credentials · Note · Log |

**Shell**

```tsx
<HubAccountDetailSearchProvider>
<HubToolDetailModal
  shellClassName={HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS}
  scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
  headerCenter={<HubAccountDetailHeaderSearch />}
  toc={<HubModalTocNav scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT} … />}
>
  <HubAccountDetailModalFrame
    main={<div className={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}>…panels…</div>}
    rail={<><HubAdmNoteRail mode="editor" … />{/* + log rail */}</>}
  />
</HubToolDetailModal>
</HubAccountDetailSearchProvider>
```

> Note rail `controlClassName` must **not** include a fixed-height single-line control class (e.g. `twofa-adm-control`, height `2rem`) — it collapses the textarea. Use `"field auth-gate-field hub-adm-note-textarea"` so the editor fills the rail (P0020 Mail bug fix).

**Multiline draft SSOT** (`hub-multiline-draft-text.ts` — Note / Plan Note / Remark / Order Details / Team Note):

| Concern | API |
|---------|-----|
| Load | `readHubMultilinePersistedText` |
| Hydrate guard | `isHubMultilineDraftDirty` |
| Save / cloud | `isHubMultilinePersistDirty` · `persistHubMultilineDraftText` |

**Click-multiline:** Enter = newline · blur/Escape = exit. **Gate:** `hub-adm-detail-parity-check.mjs` bans `note*.trim() !==` dirty compares in `src/**`.

Custom identity header (P0016): pass `center={<HubAccountDetailHeaderSearch />}` on `HubToolDetailIdentityHeader` instead of `headerCenter`.

**Column gap SSOT:** `--hub-account-detail-columns-gap: 0.65rem` in `hub-theme-tokens.css` — used by TOC↔main layout and Credentials↔Note split.

**Rules**

- Import `hub-account-detail-modal.css` in tool `hub-ui-styles.css` (includes split layout).
- Wrap the body in `HubAccountDetailModalFrame` (not bare `HubToolDetailSplitLayout`).
- **Do not** combine `hub-header-panel-modal` with account detail — modal will expand to full content height (broken sizing).
- **Do not** use `hub-tool-detail-modal--split` alone for account modals — use `hub-account-detail-modal` (adds main scroll + min-height fill).
- Log rail section id still in `sectionIds` for TOC jump; scroll spy tracks main column only.

**Golden refs:** P0020 `TwofaAccountDetailModal` · P0020 Teams `TwofaTeamAddMemberModal` · P0016 `BotDetailModal` · P0027 `JobDetailModal` (job variant uses `--split` + custom CSS)

**Verify:** `node Tool/scripts/hub-ui-modal-parity-check.mjs --code P00xx --account-detail-only` · `node Tool/scripts/hub-adm-detail-parity-check.mjs --code P0020` · `node Tool/scripts/hub-modal-detail-footer-gate.mjs --code P00xx` · browser: modal max-height ≈ 92vh, main column scrolls, log rail fixed width ~34%.

### Modal footer — Save · Close · … (golden — hub-ui)

**Canonical source:** `HubToolDetailModalAccountFooter` · labels in `hubToolDetailModalFooter.ts` · chrome in `hub-modal.css` (`.hub-tool-detail-modal__footer-bar`).

| Order (LTR, centered) | Component | Label |
|-----------------------|-----------|-------|
| 1 Save | `HubToolDetailModalPrimaryAction` via footer | `Save` (busy → `Saving…`) |
| 2 Functional action (optional) | `leading` on `HubToolDetailModalAccountFooter` | e.g. `Sign Out` |
| 3 Close | `HubToolDetailModalSecondaryAction` via footer | `Close` |
| 4 Delete (optional) | `HubToolDetailModalPrimaryAction` `danger` via `onDelete` | `Delete` |
| 4+ Trailing | `leading` prop (secondary) | `View customer`, `View orders`, … |
| Cancel (inline edit) | footer `closeLabel` | `Cancel` |
| Create form | `saveVariant="create"` + Close secondary | compact forms only |

**Rules**

- Account-detail modals **must** use `HubToolDetailModalAccountFooter` — no raw `hub-tool-detail-modal__confirm` buttons.
- Footer is a **single centered cluster** — do **not** use left/right split (`footer-bar--split`) for account detail.
- **Account Credentials:** `HubUserAccountSections` is a compact, main-panel exception to the
  narrow-rail rule: **Username · Email · Password use one aligned 3-column row**. Use
  `HubAdmClickEditField` / `HubAdmReadonlyField`; never raw `<input>`. `slots="full"` remains
  exclusive to narrow Setting/History/Terminal rails.
- Do **not** fork save labels (`Save changes`, `Save note`, …) — use `HUB_DETAIL_MODAL_SAVE_LABEL`.
- **Busy SSOT (Save / Apply / Delete):** wire the same `busy` flag to footer primary **and** `HubToolDetailModal` `busy` (cursor wait). Primary shows spinner + `Saving…` / `Applying…` / `Deleting…` via `HubToolDetailModalPrimaryAction` — **Delete parity**. Do **not** put a body `HubLoaderOrb` / `HubLoadingView` overlay on detail Save (orb is for tab/directory boot only).
- **Save toast SSOT:** while the button is busy, do **not** fire interim toasts (“Saved locally — syncing…”). Call `clearToasts()` when Save starts, then emit **one** toast after the op completes (success or cloud-pending warn). Notes toolbar uses busy + “Saved” ack instead of a success toast.
- While `busy`, do **not** reset form state / call `setBusy(false)` from hydrate effects when local apply updates the row mid-cloud-flush (see P0020 `shouldHydrateEditFormFromAccount`).
- Delete is **primary danger**, never secondary gray; place after Close when present.
- Optional nav CTAs (`View customer`, `View orders`, `Refresh subscription`, **Add Material**, **Add Service**, **Add Partner**) → `leading` prop (after Close/Delete in the same row). **Create and edit share this footer** — do not ship a lite New modal without Add … actions.
- Nested Add … / field **+** keeps the parent modal mounted (card `hub-nested-detail-modal-ssot.md`). Never switch directory tab to open the child.
- Compact create/edit without Close in footer → `HubToolDetailModalFooterActions` (Personality modal).

**Golden refs:** P0020 `TwofaAccountDetailModal` · P0005 `OrderDetailModal` / `CustomerDetailModal` · P0016 `FacebookPageDetailModal` · P0013 `ChannelDetailModal`

### Record metadata row (account detail — hub-ui)

**Canonical source:** `HubAdmRecordMetaRow` · `HUB_RECORD_META_FIELD_HEADERS` in `hubRecordMeta.ts` · `.hub-adm-record-meta-row` in `hub-account-detail-modal.css`.

| Rule | Detail |
|------|--------|
| Placement | First row inside the primary domain panel (Credentials · Identity · Catalog · Status · Profile) — **no** separate TOC section or "Record" heading |
| Field order | **Created** → **Update** → **Vault ID** (fixed labels across all tools) |
| Values | `HubCopyBadge` for Vault ID when copyable (no ellipsis-clip); Created/Update = `HubAdmPlainRelativeTime` → activity **status dot** + relative ≤24h / `dd/mm/yy`. Labels = `headerEmoji` 📅 / 🔄 — **not** Lucide Clock. Directory cells = `HubActivityTimestampLabel`. |
| Drift | Do **not** duplicate `created_at` / `updated_at` / record id in other form rows — parity gate fails `columnKey="created_at"` and inline `Created` readonly fields |

**Golden refs:** P0020 `TwofaAccountDetailModal` (Credentials) · P0005 `CustomerDetailModal` (Identity) · P0016 `BotDetailModal` (Overview)

```tsx
<HubAdmRecordMetaRow
  vaultId={<HubCopyBadge value={record.id} title="Copy record ID" />}
  created={<HubAdmPlainRelativeTime at={record.createdAt} />}
  updated={<HubAdmPlainRelativeTime at={record.updatedAt} />}
/>
```

### ADM credentials fields (account detail — hub-ui + P0020 golden)

**Canonical source:** `TwofaAccountDetailModal.tsx` · `HubAdmClickEditField` / `HubAdmClickFilterField` / `HubAdmReadonlyField` · `HubAdmInlineFieldLabel` + `HubDirectoryColumnHint` · `hub-account-detail-modal.css`.

| Piece | Rule |
|-------|------|
| Section blocks | `hubAdmSectionBlockClass` + `HubAdmSectionLabel` inside `HubToolDetailPanel` — section heading = **light pill badge** (12px semibold, sentence case, tinted by block class); field labels stay 12px medium |
| Grid | `hub-adm-form-row--aligned` (3-col) — **always 3 slots** even when only 1–2 fields (labels stay aligned); meta row adds `hub-adm-meta-row` |
| Grid pad | `hubAdmGridSlotPadClass(n)` / `<HubAdmGridSlotPad filledCount={n} />` — **1→spacer**, **2→tail**; never stack pads (wraps empty band under the row) |
| **Classification (P0005 Catalog)** | Labels SSOT `SKU_CLASSIFICATION_LABELS` (`Tool/P0005-CRM/src/lib/sku-classification-labels.ts`) — Subscription / Service / Account with emoji; Product Detail = **readonly** badge; Service Detail = editable `HubAdmClickFilterField`; Activity Log via `formatSkuClassificationLogValue` (re-export: `product-sku-classification.ts`) |
| Click-edit | `HubAdmClickEditField` — value shrink-wrap, pencil adjacent, glow on value only |
| Click-filter | `HubAdmClickFilterField` — chevron adjacent to value, emoji + label |
| Read-only | `HubAdmReadonlyField` — **no hover glow** on static values (`hub-adm-readonly-value--static`); tooltip via `title` / label hint · `valueLayout="inline"` for copy badges |
| Full-info copy chip | `HubAdmCopyValueBadge` — `HubDirectoryValuePopover` + `HubCopyBadge` mono (P0020 Mail/Service **Full Info** golden; P0005 Order Sample) — hover shows full multiline · click copies · optional `tone="warn"` · optional `label` (e.g. Order ID) |
| Label hints | `labelHint` / `twofaColumnHintContent` / `botColumnHintContent` → `HubDirectoryColumnHint` popover on hover |
| TOTP code/period | Row `hub-adm-form-row--code-line`: **Code** col1 · **Time** (`period`) col2 · spacer col3 |
| Note rail | `HubAdmNoteRail` (`mode="readonly"` \| `mode="editor"`) · `titleEmoji` optional (sheet sticker) · plain note (no in-rail search; `searchInRail={false}` default) · editor fills rail height (`hub-adm-note-textarea--fill`, scroll inside textarea) · body `hub-adm-note-rail__body` · CSS `hub-adm-note-*` in `hub-account-detail-modal.css` |
| History / Console rail | `HubToolDetailRail` + `titleEmoji` (e.g. 🕒 History · 📋 Console) — same head contract as Note; keep hint titles via `Stealth*RailTitle` children when needed |
| Header search + note | Mirror overlay only when note matches **text terms** (`matchNoteRangesFor`) — numeric/id search highlights Credentials · Log only. Note shell uses **dark editor surface from first paint** (`rgb(15 23 42 / 0.55)`); textarea always `background: transparent` on that shell (no flash when `--searching`). |

**Consume SSOT — do not re-export internals**

- Tools use **public hub-ui components + props** (`HubToolDetailRail`, `HubAdmNoteRail`, `HubAdmClickEditField`, `hubAdmSectionHeader`, …) — logic already lives in `packages/hub-ui`.
- **Do not** suggest exporting private helpers (`resolveHubToolDetailRailHead`, `hubToolDetailTitleWithEmoji`, …) from `index.ts` so P00xx can import them — that is over-engineering.
- If a tool needs new rail/field behavior → extend the **component/prop in hub-ui** (or thin domain wrapper like P0020 `TwofaDetailClickEditField`), not barrel-export internals.

**Typography tokens (modal shell) — unified 12px**

| Tier | Token | Size | Weight | Meaning |
|------|-------|------|--------|---------|
| **Nav** | `--hub-adm-type-nav-*` + `HUB_ADM_TYPE_NAV_CLASS` on `HubToolDetailPanel`/`Rail` `__head` | 12px | **600** (semibold) | Navigate · Credentials · Note · Change log · TOC items |
| **Label** | `--hub-adm-type-label-*` | 12px | **500** (medium) | Field labels, "Search note" |
| **Section** | `.hub-adm-section-label__inner` | 12px | **600** (semibold) | `HubAdmSectionLabel` — sentence-case pill, per-block tint |
| **Value** | `--hub-adm-type-value-*` | 12px | **400** (regular) | Values, inputs, note body, log, muted `—` |
| **Mono** | `--hub-adm-type-mono-*` + `HUB_ADM_TYPE_MONO_CLASS` | 12px | **600** (semibold) | TOTP code, Vault ID |
| **Glyph gap** | `--hub-inline-gap-name` on field labels, section pills, change-log action | 8px | — | `HubAdmInlineFieldLabel`, `HubAdmSectionLabel`, `.twofa-adm-log-row__action` — **no** raw `0.22rem` gaps |

**Change-log action row (SSOT)**

- **Only** `HubDirectoryLogLabel` for glyph + note (directory Log column **and** ADM / Cookie / Teams change-log action).
- Class `twofa-adm-log-row__action` is an **extra** class on that component in modals — **never** raw `<span|div className="twofa-adm-log-row__action">`.
- Gaps: directory table → `--hub-directory-glyph-label-gap` (8px, header glyph↔label); ADM modal → `--hub-inline-gap-name` (8px) via `.twofa-adm-log-row .hub-directory-log-cell.twofa-adm-log-row__action`.
- Gate: `node Tool/scripts/verify-directory-glyph-label-gap.mjs --all` (CSS + consumer scan across active-wave tools).

Weights: **400** = regular · **500** = medium · **600** = semibold (nav + mono). Tokens live on `.hub-account-detail-modal` and `.hub-add-modal`. Export: `HUB_ADM_TYPE_CSS_VARS`.

**Golden clones (must pass `hub-adm-detail-parity-check.mjs`):** P0020 `TwofaAccountDetailModal` · `TwofaQuotaDetailModal` · P0016 `BotDetailModal` · `FacebookAccountDetailModal` · `FacebookPageDetailModal` · P0005 `CustomerDetailModal` · `OrderDetailModal` · `ProductDetailModal` (readonly-only).

**Catalog note line (Order Details / Info / About / Warranty):** always use `HubAdmDetailNoteLineField` inside `hub-adm-form-row--detail-line` — never hand-roll `HubAdmInlineFieldLabel` + `HubAdmNoteEditorField`. Right-rail Note/Remark stays `HubAdmNoteRail`. Inventory gate flags hand-rolled note lines under `--fail-on-tier-c`.

**`--hub-adm-note-line-rows` / `--hub-adm-note-line-row-h` (height SSOT):** `HubAdmDetailNoteLineField` sets `--hub-adm-note-line-rows` from the `rows` prop on the **root** (never redeclare on the textarea — that ignored `rows={3}`). Editor height = `rows × --hub-adm-note-line-row-h (1.15rem) + 0.4rem`, `overflow-y: auto`. Compact Info/About ≈ 3 lines; Order Details default `rows={6}`.

| Use | `rows` | Typical |
|-----|--------|---------|
| **Compact** (SKU Info, Service About / Warranty / Service Note) | `3` | Catalog density under Process/Notify |
| **Default / Order Details** | `6` (component default) | Long credential / order narrative |

**Tier inventory gate:** `node Tool/scripts/hub-detail-modal-inventory.mjs --code P00xx --fail-on-tier-c` — wired in `check-hub-ui-parity-product.cjs`.

| Tier | Modals | Shell | ADM fields | Notes |
|------|--------|-------|------------|-------|
| **A — Golden ADM** | P0020 Mail/Quota · P0016 Bot/Channel/Facebook · P0005 Customer/Order/Product/Service | `HUB_ACCOUNT_DETAIL_*` | Full parity gate · `HubAdmDetailNoteLineField` for long notes | Product + FB Account + Channel = readonly-only |
| **B — 3-frame shell only** | P0013 Channel · P0006 Job · P0004 system | `HUB_ACCOUNT_DETAIL_*` or job split | Domain tables/metrics | Not ADM credentials |
| **C — Legacy / domain** | P0020 Cookie · P0023 Post preview | `HUB_TOOL_DETAIL_*` or custom | Custom forms | `hub-detail-modal-inventory: allow-tier-c` to exempt |

**Verify:** `node Tool/scripts/hub-adm-detail-parity-check.mjs --code P00xx` · `node Tool/scripts/hub-ui-modal-parity-check.mjs --code P00xx --account-detail-only` · after hub-ui CSS changes: `node Tool/scripts/sync-hub-ui-vendor-full.cjs --active-account-detail` (P0005 · P0013 · P0016 · P0020 active)

---

## Copy affordance (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/shell/HubCopyBadge.tsx`, `CopyMetaChip.tsx` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| Component | When to use | Feedback |
|-----------|-------------|----------|
| `HubCopyBadge` `display="full"` (default) | Directory table ID column — mono fingerprint chip (P0004 Users, P0016 bots/groups/channels) | Fingerprint + label + **Copy icon always visible**; small **Check** appended on success (~1.4s) |
| `HubAdmCopyValueBadge` | Account-detail **Full Info** / long credential or sample message — popover body + copy chip (`valueLayout="inline"`) | Hover = dark value popover; click = copy toast (P0020 Full Info · P0005 Sample) |
| `HubCopyBadge` `display="chip"` | Runtime rail job ID only (P0006 Run History) — sans Inter 11px via `hub-copy-badge--chip` | Same copy feedback; **never** use `full` mono in rail surfaces |
| `CopyMetaChip` | Meta strip pills (note ID, tagged values) | Tone chip unchanged; **Check** beside chip on success — never swap label to "Copied" |
| `TwofaCopyControl` / `HubTwofaCopyControl` | 2FA table Account / Password / Secret (P0020 production) | Click to copy + toast — no cell hover tooltip |
| `HUB_TWOFA_CODE_BADGE_CLASS` (`hub-twofa-code-badge.css`) | Mail `# Code` OTP chip — locked `dark-glass-amber-glow` | Dark glass pill + soft amber halo; import CSS via hub-ui-styles |
| `HubOrderPriceText` / `HubOrderPriceBadge` (`hub-order-price-badge.css`) | P0005 Orders `# Price` — locked `C3-amber` | Tabular text only — default tone amber `#fcd34d` |
| `HubDirectoryCopyText` | Directory ID / email / login / phone — click-to-copy (P0020 Mail·Service parity) | Wraps `HubTwofaCopyControl` |

**Rules**

- Import from `@tool-workspace/hub-ui` — no per-tool `HubCopyBadge` forks (P0016/P0020 re-export shims are deprecated).
- **`display="full"`** → directory ID columns only (mono). **`display="chip"`** → runtime rail job chips only (sans, table muted size).
- Do **not** replace content with "Copied" text or swap the leading icon for a check.
- Do **not** change chip tone on copy (`CopyMetaChip` keeps original `MetaTone`).
- Table / rail cells: `e.stopPropagation()` on copy button so row select does not fire.

### Typography contract (directory body)

- Header labels (`th`) may be semibold; **body content (`td`) stays regular (400)**.
- Numeric chips use `HubDirectoryMetricBadge` with shared tier palette (low sky · normal emerald · high indigo).
- Currency values use `HubOrderPriceBadge` / `formatHubOrderPricePillLabel` (no bold body text).
- Tab header / KPI money stats: set `valueKind: "money"` on `TabHeaderStatItem` / `KpiTileData` (amber `hub-order-price-text`, truncate).
- Do not create per-tool font-weight overrides for Order ID / Customer / Product / Money / Number columns.
- Gate: `node Tool/scripts/hub-ui-body-font-weight-check.mjs` (package + vendor mirror).

### Directory / chrome tooltips (portal + native)

**Default body cells:** no hover tip on plain truncate/copy. **Allowed body portals** (see card `hub-tooltip-ssot.md`):

| Component | Role |
|-----------|------|
| `HubDirectoryColumnHint` | Rich popover on `<th>` / FilterBar / KPI / bulk `labelHint` |
| `HubDirectoryValuePopover` | Selective value hover (ADM, long Note, metric drill-down) |
| `HubDirectoryTimestampTooltipCell` | Created/Update — compact label + exact `hh:mm dd/mm/yy` hover |
| `HubDirectoryEllipsisCell` | Truncate; set `hoverPopover` for Note/multiline only |
| `directoryCellHoverTitle` | Copy toast label helper only |

**Rules**

- No `HubDirectoryCellTooltip` forks; no native `title=` **long** text on directory body truncate (use portal).
- Click-to-copy still via `HubTwofaCopyControl` / `HubDirectoryCopyText` (toast; optional ValuePopover wrap).
- Import from `@tool-workspace/hub-ui` only.
- **Chrome (not body):** native `title=` on KPI tiles (`KpiStrip`), chart legends (`MiniBarChart`), toolbar/buttons (`HubBulkActionButton`, FilterBar), header ops (`HubHeaderPanelButton`).
- **FilterBar facets:** `FilterDef.labelHint` → `HubDirectoryColumnHint` (prefer over native `title`).
- **Settings:** prefer `labelHint` → ColumnHint; do not put `HubHintTooltip` on Display sort rows.

**Golden refs:** P0020 `twofa-copy-cells.tsx` · P0005 timestamp cells · column hints `HubDirectoryColumnHint` · card `_cards/hub-tooltip-ssot.md`

**Onboard a new P00xx directory (copy order)**

1. **Column meta** — `createDirectoryColumnMetaHelpers()` + `applyStandardDirectoryColumnHints(meta, descriptions, lineDetails)` in `directory-column-meta.ts`.
2. **Rich hints SSOT** — per-tool `*-directory-column-hints.ts`: descriptions, option lines, `columnHintContent(key, title?)`.
3. **Display → Table columns** — `withDirectoryColumnLabelHints(items, columnHintContent)` on `DirectoryTableColumnItem[]` (see `withDirectoryColumnIcons` first).
4. **FilterBar** — map filter keys to column hints + `withFilterLabelHints(filters, resolveHint)` or tool helper like `applyStealthFilterLabelHints`.
5. **Form labels** — `HubFormFieldLabel` / `HubModalFilterField` `labelHint={…}` (same `colHint` content as headers).
6. **Rails / panels** — wrap titles in `HubDirectoryColumnHint` (Console / Run History pattern).

**Hub-ui helpers:** `colHint` · `withDirectoryColumnLabelHints` · `withDirectoryColumnStickers` · `withFilterLabelHints` · `applyStandardDirectoryColumnHints` · `prefIconMapFromHubDirectoryColumnMeta`

**Column header icons:** prefer sheet-parity **emoji stickers** (`headerEmoji` on column meta) over Lucide `semanticDirectoryColumnIcon`. Display → Table columns and FilterBar triggers use the same sticker map (`triggerEmoji` + `suppressDefaultTriggerIcon`).

**Golden refs:** P0020 `twofa-directory-column-hints.ts` · `twofa-vault-stickers.ts` · P0003 `stealth-directory-column-hints.ts` · `stealth-column-stickers.ts` · `stealth-filter-hints.ts`

**Golden refs**

- `HubCopyBadge` `display="full"` — `P0004/UserDirectoryTable.tsx` ID column
- `HubCopyBadge` `display="chip"` — `P0006/ReupJobsRailPanels.tsx` Run History job ID
- `CopyMetaChip` — `P0020/NoteEditorMetaStrip.tsx` note ID
- `HubTwofaCopyControl` — `packages/hub-ui/src/shell/HubTwofaCopyControl.tsx` (P0020 re-exports as `TwofaCopyControl`)

---

## Directory status labels (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/shell/HubUsersStatusLabel.tsx`, `hub-users-table.css`, `hub-directory-table.css`.

| Component / pattern | When |
|---------------------|------|
| `HubUsersStatusLabel` | Enum status (Connected, Listed, Idle) — `tone`: `online` \| `offline` \| `idle` \| `active` |
| `HubUsersOnOffLabel` | Boolean **On/Off** (RAG, toggles) |
| `hub-users-tool-badge` + `compactIconSize(11)` | Icon chip (Ready, model, tool count) |

**Rules**

- Import from `@tool-workspace/hub-ui` — **no** per-feature `*RagBadge`, `*OnOffBadge`, or ad-hoc status wrappers.
- Do **not** use `MetricBadge` or toggle Lucide icons for directory boolean columns.
- Table: wrap in `hub-users-role-cell` when column is status/role styled.
- Card: same components inside `HubDirectoryCardMetaRow`.

**Golden refs:** P0016 `channel-ui.tsx`, `GroupDirectoryTable.tsx`, `PersonalityDirectoryTable.tsx`.

---

## Directory search highlight (golden — hub-ui)

**Canonical source:** `HubDirectorySearchHighlightText` · `directorySearchHighlightTerms` / `getDirectorySearchHighlight` (`directory-id-search.ts`) · mark CSS `.hub-directory-search-highlight` in `hub-directory-table.css`.

| Surface | Component | Mark class | Terms source |
|---------|-----------|------------|--------------|
| Directory table / cards | `HubDirectorySearchHighlightText` | `.hub-directory-search-highlight` (indigo) | `directorySearchHighlightTerms(queryInput)` — **live input**, not debounced filter |
| Account-detail modal | `HubAdmSearchHighlightText` | `.hub-adm-search-mark` (+ `--active`) | `HubAccountDetailSearchProvider` ranges |
| Sheet grid / Inbox body | local split helpers OK | **must** use `.hub-directory-search-highlight` | keep domain match logic; do not fork mark chrome |

**Rules**

- Default `markClassName` is `.hub-directory-search-highlight` — **do not** pass local overrides (`todo-search-highlight`, yellow/cyan forks).
- Bind highlight terms to **live** search input (`queryInput` / shell search) so marks update on each keystroke while filter debounce stays separate.
- P0020: import via `p0020-directory-search.ts` · Browser pivot: `BrowserAccountTable` + `TwofaBrowserValueCell` / account `CopyCell` · Cookie routes/cards + Notes list rail + Route Access user column.
- Account-detail field values / change log: `HubAdmSearchHighlightText` only inside `HubAccountDetailSearchProvider` (same indigo mark family via `.hub-adm-search-mark`).
- **Perf:** highlight runs on **visible** cells only (table page / Notes virtual rail); `buildHighlightSegments` is memoized per cell text+terms. Live `queryInput` re-renders the directory band — filter/haystack stays debounced. Cost is modest vs filter scan; empty query short-circuits to plain text.

**Chrome (directory mark — P0020 Sheet indigo lock)**

Tokens (`hub-theme-tokens.css`): `--hub-search-highlight-bg` · `--hub-search-highlight-fg` · `--hub-search-highlight-ring`.

```css
.hub-directory-search-highlight {
  background: var(--hub-search-highlight-bg);
  color: var(--hub-search-highlight-fg);
  border-radius: 2px;
  padding: 0;
  margin: 0;
  font-weight: inherit; /* no glyph metrics shift */
  box-shadow: none; /* no outward ring over neighbors */
}
```

`--hub-search-highlight-ring` stays in tokens for optional future use; directory/ADM marks do **not** paint an outward ring.

**Verify:** `node Tool/scripts/hub-search-highlight-gate.mjs` · browser CDP `HUB_DIRECTORY_SEARCH_HIGHLIGHT_INDIGO_CDP_CHECK` on `/twofa/browser`.

**Golden refs:** P0020 Twofa directory cells · Browser `BrowserAccountTable` · Cookie routes/cards · Notes list rail · Todo `TaskSearchHighlightText` · Sheet `SheetHighlightedText` · P0016 Inbox `HighlightedText` · P0003 profile cells · P0004 Users/Hub/Dashboard/Links/Versions · P0006 `JobTitleDirectoryCell` · P0005 Customers/Orders/Products directory cells (`p0005-directory-search` + `CustomerCopyText`) · P0024 Places table/cards (`p0024-directory-search`).

---

## Inline glyph + label gaps (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/styles/hub-globals-tokens.css` (`:root` tokens + `.hub-inline-gap-*` utilities). Tool copies sync via `hub-theme-tokens.css` → `p0008-globals.css`.

| Token / class | Default | Use for |
|---------------|---------|---------|
| `--hub-inline-gap-tight` / `.hub-inline-gap-tight` | **4px** | Table meta labels (Status, Ownership), `hub-users-status`, active filter pill icon+text |
| `--hub-inline-gap-meta` / `.hub-inline-gap-meta` | **5px** | Role badge, copy controls, `.btn`, `.twofa-copy-control` |
| `--hub-inline-gap-comfort` / `.hub-inline-gap-comfort` | **6px** | Filter trigger, compact dropdown row, table header icon+label |
| `--hub-inline-gap-name` / `.hub-inline-gap-name` | **8px** | Brand icon + service/name column (`.hub-users-cell-name`), filter dropdown row (full), FilterBar chip row spacing |

**Rules**

- **Do not** use raw Tailwind `gap-1` / `gap-1.5` / `gap-2` for glyph+label or filter chrome — use `.hub-inline-gap-*` or `gap: var(--hub-inline-gap-*)`.
- CSS: `gap: var(--hub-inline-gap-tight)` with fallback optional; prefer class on flex/grid container.
- Filter SSOT: `filter-dropdown-primitives.tsx` — trigger `hub-inline-gap-comfort`, row `hub-inline-gap-name`, compact row `hub-inline-gap-comfort`.
- P0020 2FA: `.twofa-directory-label-row` → `--hub-inline-gap-tight`; filter variant → `hub-inline-gap-comfort`.
- Account-detail ADM (Mail modal): field labels · section pills · change-log action → `--hub-inline-gap-name` (scoped in `hub-account-detail-modal.css`).

**Audit:** `node Tool/scripts/audit-hub-inline-gap.mjs` (report) · `--strict` (CI fail on unmigrated hits).

**Allowlist:** sidebar, modal field grids, zoom slider, layout chrome — see script `ALLOWLIST`.

---

## Activity timestamp age buckets (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/lib/format-hub-activity-time.ts`, `HubActivityTimestampLabel`, `HUB_ACTIVITY_AGE_HINT_LINES`.

| Bucket | Age | Dot color | Label |
|--------|-----|-----------|-------|
| `fresh` | ≤ 1h | Red `var(--hub-activity-age-recent)` `#ef4444` | Relative — `just now`, `45m ago` |
| `recent` | ≤ 24h | Orange `var(--hub-activity-age-aging)` `#f59e0b` | Relative — `5h ago`, `20h ago` |
| `days` | ≤ 3d | Blue `var(--hub-activity-age-days)` `#3b82f6` | `dd/mm/yy` via `formatHubActivityStaleLabel` |
| `week` | ≤ 7d | Teal `var(--hub-activity-age-week)` `#14b8a6` | `dd/mm/yy` via `formatHubActivityStaleLabel` |
| `stale` | > 7d | Gray `var(--hub-activity-age-stale)` `#64748b` | `dd/mm/yy` via `formatHubActivityStaleLabel` |

**Dot CSS:** `hub-users-status-dot--age-recent` (fresh ≤1h) \| `age-aging` (1h–24h) \| `age-days` (1–3d) \| `age-week` (4–7d) \| `age-stale` (>7d) — do not reuse `active`/`idle`/`offline` for activity columns.

**Verify:** `pnpm -C packages/hub-ui test` · column header hint uses `HUB_ACTIVITY_AGE_HINT_LINES` on Created/Updated/activity keys.

**OPTION legend contract:** every enum/status/age hint list should be ordered by product priority and annotate details via `withSortPriorityHintLines` (`Sort priority N — …`). Tools must not invent alternate OPTION order for the same domain SSOT.

---

## Directory table column contract (golden — hub-ui)

**Canonical source:** `packages/hub-ui/examples/GoldenDirectoryTable.tsx` · P0016 `FacebookAccountDirectoryTable.tsx` · P0004 Users.

| Piece | Contract |
|-------|----------|
| Meta | `directory-column-meta.ts` — **unique `colClass` + `width` per key** (weights; `buildDirectoryColumns` scales visible set to 100%) |
| Columns | `buildDirectoryColumns(keys, meta)` — never hand-roll `COLUMNS` array |
| Colgroup | `buildDirectoryColgroup(columns, { includeSelect: true })` — inline `style.width` per col |
| Body | `DirectoryTableBodyCell` — `td.colClass` must match colgroup |
| Shell | `HubDirectoryTableShell` + `hubDirectoryTableClass("default" \| "dense" \| …)` |
| Select | `data-hub-directory-select`; select col **36px** th/td + **36px** colgroup (never %) |
| Width tiers | Fixed chrome (status/timestamp/count) → **rem/px** via `HUB_DIRECTORY_COLUMN_WIDTH_REGISTRY`; fluid (name/path) → **%** via variant CSS |
| Bulk colgroup | `buildDirectoryColgroupForShell({ showSelect: true })` — **no inline %** on data cols (2FA parity) |
| Read-only colgroup | Inline `%` / rem from meta OK (no select column) |
| Gate | `directory-table-col-parity.mjs` — fixed roles must not use `%` in meta; `directory-table-width-matrix.mjs` — Playwright bands |

**Pre-ship checklist**

- [ ] Meta registry with `width` for every visible key
- [ ] `buildDirectoryColumns` + `buildDirectoryColgroup`
- [ ] Body cells via `DirectoryTableBodyCell` (no hardcoded `td` class drift)
- [ ] Screen: `ViewToggle` + `HubPaginatedCardGrid` + `useHubDirectorySelection` + `listResetKey`
- [ ] `node Tool/scripts/directory-table-col-parity.mjs --code P00xx` passes

Do **not** add per-domain CSS variants (`fb-accounts`, `directory-7`) for width — use column `width` SSOT only. Variant CSS is for min-width / actions padding only.

## Directory table select column (golden — hub-ui)

**Canonical source:** `HubDirectoryTableShell` sets `data-hub-directory-select` on `<table>`; `buildDirectoryColgroup({ includeSelect: true })`; `hub-directory-table.css`.

| Piece | Contract |
|-------|----------|
| Shell | `data-hub-directory-select` when checkbox column shown |
| Colgroup | `buildDirectoryColgroup` / `ForShell` — select colgroup **36px**; th/td **36px** |
| CSS | `hub-directory-table.css` + variant CSS — rem/px tracks; wrap overflow-x (never %) |
| Select belt | `col.hub-users-col--select` **36px !important** (hub-ui only — never product CSS) |

**Pivot / dynamic columns (Profile browser, sheet grids):** under `table-layout:fixed`, pinning **rem on every** content `<col>` leaves no fluid absorber → the select track stretches (~46–49px) and the gap before the first data column looks wrong vs Facebook/Services. Use **`buildChromeRemDirectoryColgroup(columns, chromeKeys)`** (Profile / count / Updated / status); leave runtime service slots without inline `<col>` width (CSS `min-width` floor only). Fixed vaults (Facebook…): `applyChromeRemDirectoryColWidths(cols, cols.map(c => c.key))` + `buildDirectoryColgroup`. Golden: P0020 `BrowserAccountTable` / `TwofaAccountsTable`. Ship light: `browser-profile-select-ssot`.

Do **not** fork select column width per tool — use shell + meta helpers only.

---

## Directory table body typography (golden — product tokens)

**Token SSOT (P0020):** `theme/p0008-globals.css` on `.theme-hub` / `:root`.

| Token | Default | Use |
|-------|---------|-----|
| `--hub-table-body-size` | `12px` | Directory rail + grid body cells |
| `--hub-table-header-size` | `12px` | `th` labels |
| `--hub-table-body-size-dense` | `13px` | Optional dense tables (legacy); 2FA + Sheet use `--hub-table-body-size` |
| `--hub-table-muted-size` | `11px` | Timestamps, empty cells, compact rail meta |
| `--hub-table-body-line-height` | `1.45` | Wrapped CSV / Q&A cells |

**Variant API (hub-ui)**

| Call | Product skin class | P0020 use |
|------|-------------------|-----------|
| `hubDirectoryTableClass("dense")` | `hub-users-table--dense` | Dense rail / compact directory (alias: `--sheet`) |
| `hubDirectoryTableClass("folders")` | `hub-users-table--folders` | Notes folder rail |
| `hubDirectoryTableClass("cookie-routes")` | `hub-users-table--cookie-routes` | Cookie routes table |

**Product CSS:** `theme/hub-users-table.css` — map variants to tokens. **Do not** hardcode `text-[11px]` on directory body cells; use `hub-directory-table-body-text` or variant rules.

**Rail list (non-table):** `hub-directory-rail-title` / `hub-directory-rail-meta` (+ `--compact` modifiers) — Notes list rail.

---

## Directory table body cells — one line per column (golden)

**Table rows are flat.** Each data column = **exactly one truncated line** in the body. Multi-field content belongs in **separate columns** — never stacked under Name. Body cells have **no hover tooltip** (see Directory column header hints).

| Column type | Pattern | Golden |
|-------------|---------|--------|
| **Name** | `hub-users-name-title` + `DIRECTORY_CELL_TRUNCATE` | P0004 `hub-tools-directory-cells.tsx` |
| **Status** | `HubUsersStatusLabel` in **Status** column | Hub tools `status`, P0003 store `status` |
| **Timestamps** | `HubDirectoryTimestampLabel` (= `HubActivityTimestampLabel`) — dot + relative (≤24h) or `dd/mm/yy` stale; **no cell tooltip** | Users, Hub tools `updated`, Created/Last update columns |
| **Icon + label** | `HubDirectoryIconCell` — horizontal single line, no tooltip | Scripts platform, store platform |
| **Long text** | `HubDirectoryEllipsisCell` — truncate only, no tooltip | All directory tables |
| **Copy values** | `HubDirectoryCopyText` / `HubTwofaCopyControl` — click + toast, no hover tooltip | P0020 Mail/Service, P0005 CRM |

**Forbidden in `*directory-cells.tsx`:** `<p>` under name, `line-clamp-2+`, badge flex rows inside one column, description subtitle in Name.

**Card view is different:** `HubDirectoryCardMetaRow` stacks icon + truncated lines — OK in `*Card.tsx` only.

**Gate:** `node Tool/scripts/hub-directory-table-gate.mjs --code P00xx` — rules `directory-cell-single-line`, `directory-cell-no-multiline-clamp`, `directory-cell-name-title-class`.

**Helper:** `DIRECTORY_CELL_TRUNCATE = "block max-w-full truncate"` — P0004 `src/lib/directory-cell-format.ts`; copy per tool.

---

## Workflow runtime rail — Console + Run History (SSOT)

**Canonical:** `packages/hub-ui` — `HubRuntimeChannelBadge`, `HubRuntimeConsoleTerm`, `HubActivityTimestampLabel`, `hub-runtime-rail.css` (typography + sticky grid head).

| Piece | Role |
|-------|------|
| `HubRuntimeChannelBadge` | Pill icon + **Title Case** label — parity P0020 `TodoHubBadge` priority pills |
| `HubRuntimeConsoleTerm` | Legend row + scrollable body (directory table typography, not mono) |
| `HubActivityTimestampLabel` | Run History / directory time — relative age + dot; **no hover tooltip** on body cells |
| `ReupRuntimeActivityTime` / `formatHubActivityRelativeAge` | Console time column — same activity-age SSOT as directory Created |
| `HubCopyBadge` `display="chip"` | Run History job ID chip — sans 11px, not directory mono |
| `reup-runtime-rail.css` (tool-local) | **Layout only** — 4-column subgrid, `@container` head reveal ≥280px; no local `font-size` / `font-mono` |
| `hub-runtime-rail.css` | Typography tokens `--hub-runtime-*` (= `--hub-table-*`), channel badge **10px / 9px compact**, grid head labels, sticky head background |

**Typography scale (P0003 SSOT):**

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Table / rail body | Inter | **12px** (`--hub-table-body-size`) | 400 |
| Table header / grid head | Inter | **12px** (`--hub-table-header-size`) | 700 |
| Muted meta (time console, dur, ID chip) | Inter | **11px** (`--hub-table-muted-size`) | 400–500 |
| Channel badge legend | Inter | **10px** | 600 |
| Channel badge compact (row) | Inter | **9px** | 600 |
| Directory ID (`HubCopyBadge` full) | Mono | **11px** | 500 |

**P0006 V3 grid (golden):**

| Surface | Columns |
|---------|---------|
| Run History | Time · Job (ID chip + title) · Result (✓/✗) · Dur |
| Console | Time · Channel badge · Message · Dur |

Grid header row is **sticky** inside the scroll body when `@container (min-width: 280px)`.

**Product channel registries (local):**

| Tool | Channels (`variant` CSS modifier) |
|------|-----------------------------------|
| P0003 | `workflow`, `profile`, `backup`, `system` |
| P0027 / P0006 | `worker`, `api`, `n8n`, `job`, `ui`, `system` |

**Import CSS:** `@import ".../hub-runtime-rail.css"` in `hub-ui-styles.css` (vendor path) + tool `reup-runtime-rail.css` for layout.

**Do not** duplicate `.stealth-term*` / `.reup-term__tag` — use hub-runtime classes only. **Do not** use `formatHubRuntimeLogTime` or `font-mono` in rail rows.

---

## Platform brand icons vs status dots (SSOT)

Khi entity / catalog source có **icon chuẩn** trong `hub-brand-icons.registry.json`, dùng **`HubBrandIcon` chip** (`WorkflowStoreSourceChip`, filter dropdown, directory cards) — **không** dùng nhãn trạng thái màu (`HubUsersStatusLabel` dot) cho các nền tảng đó.

**Canonical registry:** `packages/hub-ui/src/lib/hub-brand-icons.registry.json` · component `HubBrandIcon` · sync assets: `node Tool/scripts/sync-hub-brand-icons.mjs`.

### Workflow Store catalog sources (P0003)

| `WorkflowStoreSource` | `HubBrandIconId` | Label |
|---------------------|------------------|-------|
| `supabase` | `supabase` | Supabase |
| `drive` | `google-drive` | Drive |

**SSOT implementation:** P0003 `workflow-store-source-brand.tsx` — `WorkflowStoreSourceChip`, `WORKFLOW_STORE_SOURCE_BRAND_ID`.

**Chip chrome:** `hub-chrome-type--micro` + `HubBrandIcon` (`context="filter"`, 11px) — same height as `MetricBadge` (`h-[22px]`).

**Local / Installed:** `MetricBadge` + `resolveLocalOnlyIcon()` — lifecycle status, not catalog source.

**Toolbar:** No aggregate catalog hint in FilterBar — source is per-row/card chip only.

---

## Directory card shell (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/content/HubDirectoryCardShell.tsx` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| Component | When to use |
|-----------|-------------|
| `HubDirectoryCardShell` | Card surface only — footer actions split from body click (Dashboard screens: Open / Preview / Pin) |
| `HubDirectoryInteractiveCard` | Whole card opens detail on click/keyboard (Hub tools, Users) |
| `HubDirectoryCardCheckbox` | Bulk-select — **top-right corner**; `stopPropagation` on label (never inside a `<button>`) |
| `HubDirectoryCardMetaRow` | Meta line — tinted Lucide icon + truncated text (`min-h-[var(--hub-card-meta-min-h)]` stack) |
| `HubDirectoryCardHeader` | Header block — `leading` avatar/icon + `badges` + `title` + optional `trailing` (`items-center` — icon aligns with badge row) |
| `HubDirectoryCardLeadingIcon` | **SSOT** Lucide leading tile — `HUB_DIRECTORY_CARD_ICON_BOX_PX` **22** · glyph **`HUB_CHROME_ICON_PX` (14)** · matches `MetricBadge` `h-[22px]` / `--hub-metric-badge-h` |
| `HubDirectoryCardLeadingTile` | Same 22px box for favicon / platform logo / custom glyph (`children`) + optional status dot |
| `HubDirectorySelectAllChip` | Filter row 2 — **last CTA before More**; default via `HUB_DIRECTORY_SELECT_ALL_LABEL_MODE` → **Select** / **Unselect**; legacy `select-all` only with `@legacy-select-all` (gate) |
| `HubDirectoryBulkMoreMenu` | **Rail tail** — infrequent actions (Clear all, Dedupe, Sync). Row2 end = **Select · More** |
| `HubDirectoryToolbarSelection` | Design **V2 Spectrum Bar** — stacked `x/y` + % hue fill; **table** → FilterBar **toolbar leading** (before ViewToggle) · **card** → **`searchTrailing`** (cạnh search; auto-guard ẩn `HubResultCount`) |
| `HubBulkActionButton` | Filter row 2 bulk CTAs — Pin / Refresh / Edit / Sync (count badge + tooltip) |

**Variants (`variant` prop)**

| Variant | Surface | Hover | Golden clone |
|---------|---------|-------|--------------|
| `grid` (default) | `rounded-xl`, `HUB_DIRECTORY_CARD_SURFACE` + `.hub-directory-card-surface` | rest indigo ring; hover stronger glow | P0004 Dashboard screens, Hub tools |
| `panel` | `rounded-2xl`, padded, `pr-10` + `.hub-directory-card-surface--panel` | rest indigo ring; hover emerald lift | P0004 Users cards |

**Selection ring (mandatory)**

- Selected: `ring-2 ring-inset ring-indigo-400/35 bg-indigo-500/5` (`HUB_DIRECTORY_CARD_SELECTED`)
- **Do not** change `border-color` on select — avoids white `currentColor` border artifact
- Detail open: `isDetail` + `detailRingClass` (e.g. `ring-emerald-500/40` on Users)

**Leading icon (mandatory — card header row)**

| Token / component | Value | Rule |
|-------------------|-------|------|
| `HUB_DIRECTORY_CARD_ICON_BOX_PX` | `22` | Box height/width — same as `MetricBadge` chip row |
| `HUB_CHROME_ICON_PX` | `14` | Sidebar, tab header, directory card leading glyph (via `compactIconSize`) |
| `HUB_DIRECTORY_CARD_ICON_GLYPH_PX` | `14` | Alias of `HUB_CHROME_ICON_PX` — Lucide / img inside leading tile |
| `--hub-directory-card-icon-box-px` | `22px` | CSS token in `hub-shell-layout.css` — box size (zoom-safe) |
| `--hub-directory-card-glyph-px` | `14px` | CSS token — img / glyph inside leading tile |
| `HubDirectoryCardLeadingIcon` | Lucide + `navIconClass` | Dashboard screens, channel cards, any nav-tone icon |
| `HubDirectoryCardLeadingTile` | `children` | Site favicon, 2FA platform logo, custom marks |
| `HubToolAvatar` / `HubCardAvatar` `size="sm"` | 22px box | Tool catalog, System Agent/Supabase cards |

- **Do not** use `h-8 w-8`, `h-9 w-9`, or `h-10 w-10` in `HubDirectoryCardHeader` `leading` — causes misalignment with badge + title.
- Status dot: `h-1.5 w-1.5` at `-right-0.5 -top-0.5` with `ring-2 ring-[var(--panel)]`.

**Structure — interactive card (Hub / Users)**

```
HubDirectoryInteractiveCard variant="grid|panel" selected isDetail? onActivate
  ├─ HubDirectoryCardCheckbox (corner)
  └─ div.flex.flex-col.p-4.pr-10
       ├─ avatar + title header
       ├─ HubDirectoryCardMetaRow stack
       └─ chip row + footer
```

**Structure — static shell + footer actions (Dashboard)**

```
HubDirectoryCardShell selected
  ├─ HubDirectoryCardCheckbox (corner)
  ├─ <button> preview body (outline-none focus-visible:ring-inset)
  └─ <footer> Pin · Preview · Open
```

**Filter row 2 (directory tabs)**

```
HubDirectoryBulkActionBar
  ├─ selectAll? → HubDirectorySelectAllChip (card view only)
  └─ children → Hub*DirectoryBulkActions / HubBulkActionButton(s)

**More overflow (infrequent actions)**

Keep row 2 compact — primary CTAs inline (New · Detail · Delete · context actions); move low-frequency maintenance into **`HubDirectoryBulkMoreMenu`** at the rail tail.

| Inline (common) | More menu (infrequent) |
|-----------------|------------------------|
| New, Detail, Clone, Delete | Dedupe, Sync, Import/Export, Refresh, History |

```tsx
<HubDirectoryBulkMoreMenu
  title="More actions"
  actions={[
    { key: "dedupe", label: "Dedupe", icon: CopyMinus, tone: "amber", onClick: onDedupe },
    { key: "sync", label: "Sync", icon: RefreshCw, iconSpinning: busy, onClick: onSync },
  ]}
/>
```

`iconSpinning` spins the Lucide icon (Sync / Save busy) — same contract as `HubBulkActionButton`.

Reference: P0020 `TwofaBulkActionBar` (Dedupe), Quota (Sync/Backup), P0016 bots/fanpages/channels/groups, P0003 Profiles (Groups/Export/Import), Cookie (Refresh).
New tools: inventory `bulkGolden: "more-menu"` + `HubDirectoryBulkMoreMenu`.

DirectorySearchToolbar (row 1)
  ├─ filterSelectionToolbar active → auto-guard hides HubResultCount (table + card)
  ├─ selection chip → HubDirectoryToolbarSelection (table: toolbar leading · card: searchTrailing)
  ├─ hasSearchSelectionChip → omit HubResultCount (SSOT: `shouldShowHubDirectoryResultCount`)
  └─ showResultCount → HubResultCount (only when no bulk selection toolbar registered)

**Rule:** Directory có bulk selection (`filterSelectionToolbar`) → **một** counter x/y duy nhất; không bật `HubResultCount` shown/total song song.
```

Pass as `filterRowActions` on `HubDirectoryScreen` — `FilterBar` aligns end (`ml-auto flex gap-2`).

---

## Analytics typography (golden — hub-ui)

**Canonical:** `hub-shell-layout.css` tokens + `hub-typography.ts` — **no** `text-sm` on chart row label/value.

| Token / class | Size | Weight | Use |
|---------------|------|--------|-----|
| `--hub-analytics-caption-size` → `.hub-analytics-caption` + `HUB_ANALYTICS_CAPTION_TYPO_CLASS` | **10px** (`--hub-kpi-label-size`) | 600 | KPI tile labels (`TOOLS (SHOWN)`) — uppercase, muted |
| `--hub-kpi-sticker-size` → `.hub-kpi-tile__emoji` / `.hub-kpi-tile__icon-svg` + `HUB_KPI_STICKER_TYPO_SSOT` | **18px** (`1.25rem` @ 90%) | — | KPI tile sticker (emoji **and** Lucide/brand). Independent of caption. Box `--hub-kpi-icon` = sticker + 1rem for 1–8 tiles, `overflow: visible` |
| `.hub-chart-panel-title` / `.hub-chart-card .hub-analytics-caption` + `HUB_CHART_PANEL_TITLE_TYPO_SSOT` | **9.6px** text (`--hub-chart-panel-title-size` = 80% of 12px header); title emoji **12px** (`--hub-chart-label-size`, same as legend rows) | 600 | Chart panel titles (`STATUS`, `PRIORITY`) — same weight/color as filter facet / Kanban task title, `--text` |
| `--hub-chart-label-size` → `.hub-chart-legend-label` | **12px** (`--hub-table-body-size`) | 400 | Chart row labels (`Ready`, `Beta`) — same as directory table body |
| `--hub-chart-label-size` → `.hub-chart-row__value` / `.hub-chart-donut-value` | **12px** | 400 · `tabular-nums` | Chart counts (`9`, `3`) — same as table body numerics |
| `--hub-kpi-value-size` | **19px** | 500 | KPI big numbers only (`18`, `9`) |
| `HUB_SHELL_LABEL_TYPO_CLASS` (`text-sm font-medium`) | 14px | 500 | Filter triggers, bulk buttons — **not** chart rows |
| `HUB_DIRECTORY_CARD_METRIC_VALUE_TYPO_SSOT` (`.hub-directory-card-metric-value`) | **12px** (`--hub-table-body-size`) | 600 · `tabular-nums` | Card metric strip values (Hours / Sales / Shifts) — **not** `text-xs` |
| `HUB_DIRECTORY_CARD_TITLE_TYPO_SSOT` (`.hub-directory-card-title`) | **12px** (`--hub-table-header-size`) | 600 | `HubDirectoryCardHeader` string titles — **not** `text-sm` |
| `HUB_DIRECTORY_CARD_META_TYPO_SSOT` (`.hub-directory-card-meta`) | **12px** (`--hub-table-body-size`) | 400 | Card metadata rows — **not** `text-xs` |

**Overlap fixes (hub-ui 0.2.27+):** chart titles no longer use 14px `--hub-chart-caption-size`; row label/value no longer stack `HUB_SHELL_LABEL_TYPO_CLASS` (was forcing 14px over CSS).

**Tool-local drift:** P0001/P0003/P0005/P0016/P0024 `theme/*-globals.css` duplicate `.hub-chart-row` grid only — do not redeclare `font-size` on `.hub-chart-legend-label`.

| `CHART_TOP_N` / `CHART_LEGEND_SLOT_COUNT` | 3 + **Other** | `prepareChartItems` — always reserve 4 legend slots; `--hub-chart-card-min-h` fits 4 rows |

---

## Directory screen golden (P0004 — Hub SSOT)

**Reference:** `src/features/hub/HubListPage.tsx` — clone before syncing P0016/P0020 directory tabs.

| Slot | Golden contract |
|------|-----------------|
| Shell | `HubDirectoryScreen` + `*ChromeHeader` + `sectionRuleLabel` |
| `filterToolbar` | `DirectorySearchToolbar` — `ViewToggle` · `showTimeRange` (when data has `updatedAt`) · `showTablePageSize` (`HubTablePageSizeSelect` / `tpage`) · `HubResultCount` (omit when `filterSelectionToolbar` registered) · `trailing` extras |
| `filterRowActions` | `HubDirectoryBulkActionBar` → `selectAll?` (card; default **Select/Unselect**) + `Hub*DirectoryBulkActions` |
| `filterSelectionToolbar` | `HubDirectoryToolbarSelection` x/y — table: toolbar leading · card: searchTrailing; auto-guard hides duplicate `HubResultCount` |
| KPI / charts | `build*KpiItems` + `directoryChartBandNode` (`resolveVisibleChartKeys` + `*_CHART_DEFS`); `MiniBarChart` always top-3 + **Other** via `prepareChartItems` |
| Card view | `HubPaginatedCardGrid` — **never** raw `HubPaginatedTableShell` + manual grid class |
| Table view | `*DirectoryTable` + checkbox column + same bulk bar as card |

**Per-tab bulk (domain)**

| Tab | `filterRowActions` |
|-----|-------------------|
| Hub | Select / Unselect only (auto-sync; no manual sync/links bulk) |
| Dashboard | Select / Unselect + `HubScreensDirectoryBulkActions` |
| Users | Select / Unselect + `HubUsersDirectoryBulkActions` |

**Rules**

- Import shell primitives from `@tool-workspace/hub-ui` only — no local `border-indigo-400/30` on cards.
- Checkbox parent must be `relative` (built into shell surfaces).
- Card grid: `HubPaginatedCardGrid` + per-item card component file (`*TabCard.tsx`, `*ToolCard.tsx`, `UserCard.tsx`).
- Table view: keep `HubDirectoryTableShell` select column; bulk bar actions shared with card view.

**Golden refs**

| Screen | Card file | Shell |
|--------|-----------|-------|
| P0004 Dashboard | `DashboardTabCard.tsx` | `HubDirectoryCardShell` |
| P0004 Hub | `HubToolCard.tsx` | `HubDirectoryInteractiveCard` `variant="grid"` |
| P0004 Users | `UserCard.tsx` | `HubDirectoryInteractiveCard` `variant="panel"` |

**Clone:** `node Tool/scripts/hub-ui-stack.cjs P00xx directory` then swap card body; keep shell + checkbox + bulk bar pattern.

---

## Table pager (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/content/HubTablePager.tsx`, `HubPaginatedTableShell.tsx`, `HubPaginatedDataTable.tsx` → fan-out via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| Component | When to use |
|-----------|-------------|
| `HubPaginatedDataTable` | Standard `HubDataTable` + columns + `renderRow` (Logs, User access modal, golden directory example) |
| `HubPaginatedTableShell` | Custom `hub-users-table` markup (directory clones, Overview panel tables, Cookie routes) |
| `HubPaginatedCardGrid` | Directory card/grid views (Users, Tools, Groups, …) — bottom pager |
| `useHubTablePagination` + `HubTablePager` | Manual composition when shell layout must split pager/table |

**Rules**

- **20 rows/page** default (`HUB_TABLE_PAGE_SIZE` / `readHubTablePageSize`) — E0001 `route-table-pager` visual parity (prev/next + `Page X of Y · Showing A–B of N`).
- **Page size** 20/25/50/100 via Settings → Display → Page size (`TABLE_PAGE_SIZE_OPTIONS`, `tpage` URL param, `useHubTablePageSize()` in shells).
- Pass `resetKey` when filter/search changes (e.g. `` `${query}|${JSON.stringify(filterValues)}` ``); omit for auto signature from list head/tail.
- Pager sits **below** the table (or card grid); **always visible** by default (even `totalCount ≤ pageSize`). Host may opt-in hide via `configureDirectoryPager({ hideWhenSinglePage: () => true })`.
- Card directory views use `HubPaginatedCardGrid` (or `HubPaginatedTableShell` when the child supplies its own grid).
- **Select all** in directory tables applies to **current page only** (`hubTogglePageSelectAll` / `hubPageAllSelected`); label `"Select all on this page"`.
- Import CSS via `@import "@tool-workspace/hub-ui/styles/hub-users-table.css"` (`.hub-table-pager` tokens).

**Golden refs**

- Overview panel tables — `P0004/ToolLinksTable.tsx`, `ToolVersionsPanel.tsx`
- Directory — `P0004/HubToolsDirectoryTable.tsx`, `UserDirectoryTable.tsx`
- Clone — P0016 bots/groups/channels/logs/fanpages; P0020 cookie/twofa/notes folders

---

## Modal directory section (golden — hub-ui)

**Canonical source:** `packages/hub-ui/src/shell/HubModalDirectorySection.tsx`, `route-detail/HubRouteAboutSummary.tsx`, `table/hub-route-access-table-meta.tsx`.

| Component | When to use |
|-----------|-------------|
| `HubModalDirectorySection` | **Any** `HubToolDetailSection` that has FilterBar + table (User Access tools, Cookie Route access, P0016 modals) |
| `HubModalDirectoryFilterBar` | **Mandatory** modal search/filter — two-row `layout="hub"`, `shortcutScope`, no Active: row |
| `HubToolDetailIdentityHeader` | Modal header row — avatar/icon · title · trailing badges (User Access, Cookie Route, **Hub Tool detail**) |
| `HubModalDirectoryEmptyFiltered` | Zero rows after search/filters — same empty box as P0004 User Access |
| `HubPaginatedDataTable` | Modal table **≤6 columns**, simple rows, optional checkbox in `renderRow` (P0004 User Access tools) |
| `HubRouteAccessDirectoryTable` | Route People & access — `HubPaginatedDataTable` + `--route-access-modal` (same wrap as User Tools) |
| `HubRouteAccessDirectoryTableSkeleton` | Loading placeholder for route access table (7 columns incl. Activity) |
| `HubUserToolsDirectoryTable` | User Access tools table — wraps `HubPaginatedDataTable` + `HUB_USER_TOOLS_*` meta; inject category/access/enterprise cells |
| `HubUserToolsDirectoryTableSkeleton` | Loading placeholder for User Access tools table |
| `HubDirectoryTableShell` | Lower-level directory table with sort, select-all, static columns (Hub/Users directory) |
| `HubRouteAboutSummary` | Route detail About — stat chips row + Route TM + Note ID `CopyMetaChip` |
| `HUB_ROUTE_ACCESS_*` meta | Column classes, colgroup, directory columns for route People & access tables |

**Structure (mandatory — do not add extra panel wrappers)**

```
HubToolDetailModal
  └─ HubToolDetailSection
       └─ HubModalDirectorySection
            ├─ banner? / error?
            ├─ HubModalDirectoryFilterBar (shortcutScope + toolbar + row2Actions)
            └─ HubPaginatedDataTable | HubDirectoryTableShell
```

**Rules**

- Modal sections: **always** `HubModalDirectoryFilterBar` inside `HubModalDirectorySection` — never raw `FilterBar layout="inline"` (Active: row), never local `hub-*-access-panel` wrappers.
- Each modal section needs a unique `shortcutScope` (e.g. `user-access-tools`, `cookie-route-access-{id}`).
- Do **not** use `--flush` / negative-margin section hacks — section padding is golden default.
- Pick table primitive by column complexity (see Table pager section above); both sit inside the same `HubModalDirectorySection`.
- Route About: `HubRouteAboutSummary` — chips + TM sync id + Note ID; publish/share live in About (not access table Route column).
- Import route-access column meta from hub-ui — no copy `hub-route-access-col--*` in tools.
- Access filters: `hubRouteAccessFilterDefs("single-route")` — P0020 Cookie modal (Access + Permission only). `hubRouteAccessFilterDefs("multi-route")` — future P0004 user route directory (+ Publish filter).

**Golden refs**

- P0004 — `UserAccessModal.tsx` → Tools: `HubUserToolsDirectoryTable`; `ToolDetailModal.tsx` → identity header
- P0020 — `CookieRouteMembers.tsx` → Access section; `CookieRouteAccessTable` → `HubRouteAccessDirectoryTable`

---

## Agent Kind (manifest)

| Kind | Nội dung |
|------|----------|
| **pattern** | Hub UI clone goldens |
| **rule** | Cursor rules |
| **skill** | Cursor skills |
| **command** | Slash commands + `Tool/scripts/hub-ui-*.cjs` |
| **doc** | AGENTS.md, UI_PATTERNS, keyboard doc, hub-load refs |

Đã gộp/bỏ: `contract`+`file`→**doc**, `script`→**command**, `table`/`screen`/`component`→**pattern**.

---

## Related

- `ui-screens.catalog.json` — `defaults` + deferred templates
- Legacy: `UI_TABLES.md`, `UI_COMPONENTS.md`
