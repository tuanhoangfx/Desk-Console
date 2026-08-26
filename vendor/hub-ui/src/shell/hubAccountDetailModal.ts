/** Shell class — wide 3-frame account detail (TOC · main scroll · log rail). */
export const HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS = "hub-account-detail-modal";

/** P0020 2FA / P0004 overview — shared twofa ADM skin on top of hub-account-detail-modal. */
export const HUB_TWOfA_ACCOUNT_DETAIL_SHELL_CLASS = "twofa-account-detail-modal";

/**
 * Layout 3 SSOT tokens — Services Account Detail golden (TOC · Main · Note+Log).
 * Applied by `.hub-account-detail-modal` in hub-account-detail-modal.css.
 * Every Layout 3 modal must use `hubAccountDetailShellClass()` — do not invent per-product TOC/rail widths.
 */
/**
 * ONE modal shell size for every Layout 2 / Layout 3 tool modal (detail, Log, Notify,
 * Update Release, Settings, Add). Reference box = P0005 CRM Service detail.
 * Mirrored by `.modal-shell.hub-tool-detail-modal:not(--fit)` in `styles/hub-modal.css`
 * (asserted in hubLayout3DetailTokens.test.ts) — tools must NOT re-declare
 * `--hub-modal-max-w/h/vh` (including User Access / Users Detail). Ask for a
 * content-sized shell with `--fit` instead.
 */
export const HUB_TOOL_MODAL_SIZE_TOKENS = {
  maxW: "min(88rem, calc(100vw - var(--app-sidebar-width, 0px) - var(--hub-modal-h-margin, 2rem)))",
  maxH: "768px",
  maxVh: "73.6vh",
  minH: "min(512px, var(--hub-modal-max-vh))",
} as const;

/**
 * Confirm / Prompt / Clone — one compact box (`size="compact"` + `--fit`).
 * Do not invent max-w-md/lg or per-dialog `--hub-modal-max-w`.
 */
export const HUB_COMPACT_MODAL_CLASS = "hub-compact-modal";

export const HUB_COMPACT_MODAL_SIZE_TOKENS = {
  maxW: "min(28rem, calc(100vw - var(--hub-modal-h-margin, 2rem)))",
  frameW: "min(28rem, calc(100vw - var(--hub-modal-h-margin, 2rem)))",
} as const;

export const HUB_LAYOUT3_DETAIL_TOKENS = {
  tocW: "10.5rem",
  railW: "min(22rem, 34%)",
  splitMinH: "22.4rem",
  columnsGap: "0.65rem",
  noteFlex: 2,
  logFlex: 3,
  modalMaxH: "768px",
  modalMaxVh: "73.6vh",
} as const;

/** Shared ADM form context — detail modal + add modal (glow tokens, click-edit grid). */
export const HUB_ADM_FORM_SHELL_CLASS = "hub-adm-form-shell";

/** Preset — softer hairline glow (multiply token alphas via --hub-adm-glow-strength). */
export const HUB_ADM_GLOW_SUBTLE_CLASS = "hub-adm-glow--subtle";

export type HubAccountDetailShellOptions = {
  /** Softer hairline glow preset (`hub-adm-glow--subtle`). */
  glowSubtle?: boolean;
  extra?: string;
};

/** Single shell class string — modal overlay + page embed (P0020 golden). */
export function hubAccountDetailShellClass(options: HubAccountDetailShellOptions = {}): string {
  return [
    HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS,
    HUB_TWOfA_ACCOUNT_DETAIL_SHELL_CLASS,
    options.glowSubtle ? HUB_ADM_GLOW_SUBTLE_CLASS : "",
    options.extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** CSS custom properties for ADM field glow — set on `.hub-account-detail-modal` / `.hub-add-modal`. */
export const HUB_ADM_GLOW_CSS_VARS = {
  strength: "--hub-adm-glow-strength",
  rgb: "--hub-adm-glow-rgb",
  accentRgb: "--hub-adm-glow-accent-rgb",
  hoverBg: "--hub-adm-glow-hover-bg",
  hoverRing: "--hub-adm-glow-hover-ring",
  editBg: "--hub-adm-glow-edit-bg",
  editRing: "--hub-adm-glow-edit-ring",
  focusBorder: "--hub-adm-glow-focus-border",
  focusBg: "--hub-adm-glow-focus-bg",
  focusRing: "--hub-adm-glow-focus-ring",
  sectionGlow: "--hub-adm-section-glow",
} as const;

/** Mono accent tier — TOTP code, vault ID (12px semibold). */
export const HUB_ADM_TYPE_MONO_CLASS = "hub-adm-type-mono";

/** Nav tier — panel/rail heads + TOC labels (12px semibold via `HUB_ADM_TYPE_NAV_CLASS`). */
export const HUB_ADM_TYPE_NAV_CLASS = "hub-adm-type-nav";

/** Log / Activity rail empty + hint text — pairs with `twofa-adm-muted` in CSS. */
export const HUB_ADM_LOG_MUTED_CLASS = "hub-adm-muted";

/** ADM Activity rail title — bulk detail, account detail log rails (P0020 / P0016 SSOT). */
export const HUB_ADM_ACTIVITY_RAIL_TITLE = "Activity";

/** ADM Activity rail empty state when no log lines exist yet. */
export const HUB_ADM_ACTIVITY_LOG_EMPTY_MESSAGE = "No activity for this account yet.";

/** CSS custom properties for ADM typography — set on `.hub-account-detail-modal` / `.hub-add-modal`. */
export const HUB_ADM_TYPE_CSS_VARS = {
  size: "--hub-adm-type-size",
  line: "--hub-adm-type-line",
  labelWeight: "--hub-adm-type-label-weight",
  valueWeight: "--hub-adm-type-value-weight",
  monoWeight: "--hub-adm-type-mono-weight",
  labelColor: "--hub-adm-type-label-color",
  valueColor: "--hub-adm-type-value-color",
  mutedColor: "--hub-adm-type-muted-color",
  navSize: "--hub-adm-type-nav-size",
  navWeight: "--hub-adm-type-nav-weight",
  navLine: "--hub-adm-type-nav-line",
  navColor: "--hub-adm-type-nav-color",
} as const;

export const HUB_ADM_FORM_ROW_CODE_LINE_CLASS = "hub-adm-form-row--code-line";

/** Preserve 3-col grid height when slot 2+3 empty (1 field in row). Do not also add --tail. */
export const HUB_ADM_GRID_SLOT_SPACER_CLASS = "hub-adm-grid-slot-spacer";

/** Empty middle slot only — columns 3–4 (field · empty · field). */
export const HUB_ADM_GRID_SLOT_SPACER_MID_CLASS = "hub-adm-grid-slot-spacer hub-adm-grid-slot-spacer--mid";

/** Preserve 3-col grid height when only slot 3 empty (2 fields in row). */
export const HUB_ADM_GRID_SLOT_SPACER_TAIL_CLASS = "hub-adm-grid-slot-spacer hub-adm-grid-slot-spacer--tail";

/**
 * Class for the single trailing pad after `filledCount` fields in a 3-slot ADM row.
 * - 1 → spacer (cols 3 / -1)
 * - 2 → tail (cols 5 / -1)
 * - 0 / 3+ → null (no pad / full row)
 * Never stack spacers — a second pad wraps into an empty min-height row above the next form line.
 */
export function hubAdmGridSlotPadClass(filledCount: number): string | null {
  const n = Math.floor(Number(filledCount));
  if (n === 1) return HUB_ADM_GRID_SLOT_SPACER_CLASS;
  if (n === 2) return HUB_ADM_GRID_SLOT_SPACER_TAIL_CLASS;
  return null;
}

/** Main column scroll container inside HubToolDetailSplitLayout. */
export const HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS = "hub-account-detail-modal__main-scroll hub-scrollbar";

/** Wraps `HubAccountDetailModalFrame` inside modal scroll — flex fill to rail height. */
export const HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS = "hub-account-detail-modal__content-root";

/** TOC spy + section jump target (main column only — not log rail). */
export const HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT = ".hub-account-detail-modal__main-scroll";
