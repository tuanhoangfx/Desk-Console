import type { HubDirectoryColumnHintLine } from "../table/HubDirectoryColumnHint";

/** CRM Subscription Status cell — P0005 Order directory SSOT. */
export const CRM_SUBSCRIPTION_STATUS = {
  ACTIVE: "♻️ Active",
  EXPIRING_SOON: "🚨 Expiring Soon",
  EXPIRED: "🛑 Expired",
  PENDING: "⏳ Pending",
  CANCEL: "🚫 Cancel",
} as const;

export type CrmSubscriptionStatus =
  (typeof CRM_SUBSCRIPTION_STATUS)[keyof typeof CRM_SUBSCRIPTION_STATUS];

/** Live Subscription Status values — derived only from Days Left (3-value SSOT). */
export const CRM_SUBSCRIPTION_STATUS_LABELS: CrmSubscriptionStatus[] = [
  CRM_SUBSCRIPTION_STATUS.ACTIVE,
  CRM_SUBSCRIPTION_STATUS.EXPIRING_SOON,
  CRM_SUBSCRIPTION_STATUS.EXPIRED,
];

/** Days remaining at/under this threshold → Expiring Soon (single SSOT with Notify warn). */
export const CRM_SUBSCRIPTION_EXPIRING_DAYS = 5;

/** Notify Sample chip warn tone when days-left ≤ this (Detail + directory). */
export const CRM_SAMPLE_NOTIFY_HIGHLIGHT_DAYS = CRM_SUBSCRIPTION_EXPIRING_DAYS;

/** Lifetime-style duration — still Active, skip “expiring soon” noise. */
export const CRM_DURATION_LIFETIME_DAYS = 10000;

/**
 * Days-left colour tier SSOT (P0005 Left column + Usage tooltip):
 * `< 0` expired · `0..1` due · `2..4` expiring soon · `>= 5` safe.
 */
export type OrderDaysLeftTone = "expired" | "due" | "soon" | "safe";

export function orderDaysLeftTone(daysLeft: number): OrderDaysLeftTone {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "due";
  if (daysLeft < CRM_SAMPLE_NOTIFY_HIGHLIGHT_DAYS) return "soon";
  return "safe";
}

/**
 * Days-left tone meta — drives Left-column colour (`orderDaysLeftToneClass`)
 * and the header tooltip legend (`orderDaysLeftLegendLines`).
 */
export const ORDER_DAYS_LEFT_TONE_META: Record<
  OrderDaysLeftTone,
  { textClass: string; emoji: string; label: string; detail: string }
> = {
  safe: {
    textClass: "text-emerald-300",
    emoji: "🟢",
    label: "Green",
    detail: `safe — ≥${CRM_SAMPLE_NOTIFY_HIGHLIGHT_DAYS} days left`,
  },
  soon: {
    textClass: "text-amber-200",
    emoji: "🟡",
    label: "Amber",
    detail: `expiring soon — 2–${CRM_SAMPLE_NOTIFY_HIGHLIGHT_DAYS - 1} days left`,
  },
  due: { textClass: "text-rose-300", emoji: "🔴", label: "Red", detail: "due — 0–1 day left" },
  expired: {
    textClass: "text-violet-300",
    emoji: "🟣",
    label: "Violet",
    detail: "expired — past due date",
  },
};

/** Best → worst display order for the Days Left legend tooltip. */
export const ORDER_DAYS_LEFT_TONE_ORDER: OrderDaysLeftTone[] = ["safe", "soon", "due", "expired"];

export function orderDaysLeftToneClass(daysLeft: number): string {
  return ORDER_DAYS_LEFT_TONE_META[orderDaysLeftTone(daysLeft)].textClass;
}

/** Directory / Detail Left number — same 4 tiers as the tooltip, plus muted. */
export type OrderDaysLeftDisplayTone = OrderDaysLeftTone | "muted";

export function orderDaysLeftDisplayTone(
  daysLeft: number | null | undefined,
  lifetime?: boolean,
): OrderDaysLeftDisplayTone {
  if (lifetime) return "safe";
  if (daysLeft == null || !Number.isFinite(daysLeft)) return "muted";
  return orderDaysLeftTone(daysLeft);
}

/** Services / Quota / CRM Left cell — hex SSOT in `hub-directory-popover.css`. */
export function orderDaysLeftDirectoryClass(
  daysLeft: number | null | undefined,
  lifetime?: boolean,
): string {
  return `quota-days-left quota-days-left--${orderDaysLeftDisplayTone(daysLeft, lifetime)}`;
}

/** Plan Due date — same 4 tiers as Left (no local `<= 7` warn window). */
export function orderDaysLeftExpiryClass(
  daysLeft: number | null | undefined,
  lifetime?: boolean,
): string {
  return `quota-expiry quota-expiry--${orderDaysLeftDisplayTone(daysLeft, lifetime)}`;
}

/** Header tooltip Option lines for the Days Left column — same SSOT as the cell colour. */
export function orderDaysLeftLegendLines(): HubDirectoryColumnHintLine[] {
  return ORDER_DAYS_LEFT_TONE_ORDER.map((tone) => {
    const meta = ORDER_DAYS_LEFT_TONE_META[tone];
    return { emoji: meta.emoji, label: meta.label, detail: meta.detail };
  });
}

const SUBSCRIPTION_STATUS_BY_DAYS_LEFT_TONE: Record<OrderDaysLeftTone, CrmSubscriptionStatus> = {
  expired: CRM_SUBSCRIPTION_STATUS.EXPIRED,
  due: CRM_SUBSCRIPTION_STATUS.EXPIRING_SOON,
  soon: CRM_SUBSCRIPTION_STATUS.EXPIRING_SOON,
  safe: CRM_SUBSCRIPTION_STATUS.ACTIVE,
};

export function canonicalizeSubscriptionStatus(raw: unknown): CrmSubscriptionStatus | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/cancel/i.test(s) || s.includes("🚫")) return CRM_SUBSCRIPTION_STATUS.CANCEL;
  if (/expiring/i.test(s) || /soon/i.test(s)) return CRM_SUBSCRIPTION_STATUS.EXPIRING_SOON;
  if (/expired/i.test(s) || s.includes("🛑") || s.includes("⌛") || s.includes("⛔")) {
    return CRM_SUBSCRIPTION_STATUS.EXPIRED;
  }
  if (/pending/i.test(s) || s.includes("⏳")) return CRM_SUBSCRIPTION_STATUS.PENDING;
  if (/active/i.test(s) || s.includes("♻")) return CRM_SUBSCRIPTION_STATUS.ACTIVE;
  return null;
}

/**
 * 3-value lifecycle from the shared days-left tier.
 * `🛑 Expired` (< 0) · `🚨 Expiring Soon` (0–4) · `♻️ Active` (≥5 or lifetime).
 */
export function deriveSubscriptionStatusFromDaysLeft(
  daysLeft: number | null,
  opts?: { durationDays?: number | null },
): CrmSubscriptionStatus | null {
  if (daysLeft == null) return null;
  const duration = opts?.durationDays ?? null;
  if (duration != null && duration >= CRM_DURATION_LIFETIME_DAYS) {
    return CRM_SUBSCRIPTION_STATUS.ACTIVE;
  }
  return SUBSCRIPTION_STATUS_BY_DAYS_LEFT_TONE[orderDaysLeftTone(daysLeft)];
}

/** Popover / Services Left hex — Tailwind utilities may be missing in the portal. */
export function orderDaysLeftPopoverClass(
  daysLeft: number | null | undefined,
  lifetime?: boolean,
): string {
  return `hub-directory-popover__days-left hub-directory-popover__days-left--${orderDaysLeftDisplayTone(daysLeft, lifetime)}`;
}
