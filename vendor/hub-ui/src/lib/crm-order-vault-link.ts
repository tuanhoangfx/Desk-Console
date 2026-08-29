/**
 * CRM Order → P0020 Services vault id (Usage join SSOT).
 * Persist `order_desk_orders.twofa_account_id` — never a Mail hop / CRM entity id.
 */

import { inferProductCategory } from "./product-category-infer";
import {
  canonicalizeCrmOrderMailbox,
  countCrmOrderDetailMailboxes,
  crmOrderDetailMailboxOrder,
  crmOrderProductMatchesService,
  expandCrmOrderGmailAliases,
  extractCrmOrderDetailIdentityTokens,
  normalizeCrmOrderDetailsIdentifier,
} from "./crm-order-details";

export type CrmOrderVaultCandidate = {
  id: string;
  service: string;
  account: string;
  mailRecover?: string | null;
};

export type CrmOrderVaultLinkQuery = {
  productName?: string | null;
  details?: string | null;
  twofaAccountId?: string | null;
  twofaAccountIds?: readonly string[] | null;
};

/** Mail vault `service` labels — same family as P0020 Mail tab (not Services). */
export const CRM_ORDER_MAIL_VAULT_SERVICES = [
  "gmail",
  "google mail",
  "googlemail",
  "gmail edu",
  "outlook",
  "hotmail",
  "live",
  "msn",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud",
  "icloud.com",
  "temp mail",
] as const;

export function isCrmOrderMailVaultService(service: string | null | undefined): boolean {
  const n = normalizeCrmOrderDetailsIdentifier(service ?? "");
  if (!n) return false;
  return CRM_ORDER_MAIL_VAULT_SERVICES.some((label) => n === label || n.startsWith(`${label} `));
}

export function crmOrderProductIsMailSku(productName: string | null | undefined): boolean {
  const product = productName?.trim() ?? "";
  if (!product) return false;
  if (inferProductCategory(product).groupKey === "acc gmail") return true;
  return CRM_ORDER_MAIL_VAULT_SERVICES.some((label) => crmOrderProductMatchesService(product, label));
}

export function crmOrderVaultCandidateEligible(
  productName: string | null | undefined,
  row: Pick<CrmOrderVaultCandidate, "service">,
): boolean {
  if (!crmOrderProductMatchesService(productName, row.service)) return false;
  const mailVault = isCrmOrderMailVaultService(row.service);
  const mailSku = crmOrderProductIsMailSku(productName);
  if (mailVault !== mailSku) return false;
  return true;
}

export function crmOrderVaultCandidateIdentityHits(
  details: string | null | undefined,
  row: Pick<CrmOrderVaultCandidate, "account" | "mailRecover">,
): boolean {
  const text = details ?? "";
  const tokens = new Set(extractCrmOrderDetailIdentityTokens(text));
  const hitsIdentity = (raw: string) =>
    expandCrmOrderGmailAliases(raw).some((alias) => alias.length >= 3 && tokens.has(alias));
  if (hitsIdentity(row.account ?? "")) return true;
  if (hitsIdentity(row.mailRecover ?? "")) return true;
  return false;
}

function pushCrmOrderVaultId(out: Set<string>, raw: unknown): void {
  if (typeof raw !== "string") return;
  const id = raw.trim();
  if (id) out.add(id);
}

/** All persisted Services vault ids (array + scalar + metadata). Email match stays the primary Usage index. */
export function readCrmOrderServicesVaultIds(row: {
  twofa_account_id?: string | null;
  twofa_account_ids?: readonly string[] | null;
  metadata?: Record<string, unknown> | null;
}): string[] {
  const out = new Set<string>();
  if (Array.isArray(row.twofa_account_ids)) {
    for (const id of row.twofa_account_ids) pushCrmOrderVaultId(out, id);
  }
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : null;
  const metaIds = meta?.twofa_account_ids;
  if (Array.isArray(metaIds)) {
    for (const id of metaIds) pushCrmOrderVaultId(out, id);
  }
  pushCrmOrderVaultId(out, row.twofa_account_id);
  pushCrmOrderVaultId(out, meta?.twofa_account_id);
  pushCrmOrderVaultId(out, meta?.vault_id);
  pushCrmOrderVaultId(out, meta?.vaultId);
  return [...out];
}

export function sameCrmOrderVaultAccountIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, i) => id === b[i]);
}

/** `ChatGPT Plus #2 1m` → 2. Single-seat SKUs → 0. */
export function crmOrderMultiSeatSlot(productName: string | null | undefined): number {
  const match = (productName ?? "").match(/#(\d+)\b/);
  const slot = match ? Number(match[1]) : 0;
  return Number.isFinite(slot) && slot >= 2 ? slot : 0;
}

/** True when persisted Services ids are fewer than Details mailboxes (or a `#2+` SKU is still scalar-only). */
export function crmOrderNeedsServicesVaultBackfill(row: {
  product_name?: string | null;
  twofa_account_id?: string | null;
  twofa_account_ids?: readonly string[] | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  const details = typeof row.metadata?.raw_details === "string" ? row.metadata.raw_details : "";
  const mailboxes = countCrmOrderDetailMailboxes(details);
  const persisted = readCrmOrderServicesVaultIds(row);
  const slot = crmOrderMultiSeatSlot(row.product_name);
  const target = slot >= 2 ? Math.min(slot, mailboxes) : mailboxes;
  if (target < 2) return false;
  return persisted.length < target;
}

/**
 * Every eligible Services (or Mail SKU → Mail vault) hit — union, never pick-one-and-drop.
 * Keeps a still-eligible current link (Share seat) when Details email is a family seat.
 * Does not hop Capcut-recipe → Gmail (OTP-only).
 */
export function resolveCrmOrderServicesVaultIds(
  order: CrmOrderVaultLinkQuery,
  candidates: readonly CrmOrderVaultCandidate[],
): string[] {
  const hits = candidates.filter(
    (row) =>
      crmOrderVaultCandidateEligible(order.productName, row) &&
      crmOrderVaultCandidateIdentityHits(order.details, row),
  );
  const ids = [...new Set(hits.map((row) => row.id))];
  const current = order.twofaAccountId?.trim() || "";
  if (current) {
    const currentRow = candidates.find((row) => row.id === current);
    if (currentRow && crmOrderVaultCandidateEligible(order.productName, currentRow)) {
      if (!ids.includes(current)) ids.unshift(current);
      else return capCrmOrderServicesVaultIds(order, candidates, [current, ...ids.filter((id) => id !== current)]);
    }
  }
  return capCrmOrderServicesVaultIds(order, candidates, ids);
}

/** One Services id per canonical mailbox; `#N` SKU caps at N (no gmail/googlemail twin dump). */
export function capCrmOrderServicesVaultIds(
  order: CrmOrderVaultLinkQuery,
  candidates: readonly CrmOrderVaultCandidate[],
  ids: readonly string[],
): string[] {
  const byId = new Map(candidates.map((row) => [row.id, row]));
  const mailboxOf = (id: string): string => {
    const row = byId.get(id);
    return canonicalizeCrmOrderMailbox(row?.account || row?.mailRecover || "");
  };
  const mailboxes = crmOrderDetailMailboxOrder(order.details ?? "");
  const slot = crmOrderMultiSeatSlot(order.productName);
  // Single-seat: one vault. `ids.length` used to attach every Recover-sharing clone.
  const limit = slot >= 2 ? slot : mailboxes.length > 0 ? mailboxes.length : ids.length;
  const picked: string[] = [];
  const seen = new Set<string>();
  const tryAdd = (id: string) => {
    if (!id || picked.includes(id) || picked.length >= Math.max(limit, 0)) return;
    const key = mailboxOf(id);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    picked.push(id);
  };
  for (const box of mailboxes) {
    const match = ids.find((id) => mailboxOf(id) === box);
    if (match) tryAdd(match);
  }
  for (const id of ids) tryAdd(id);
  return picked;
}

/** First of {@link resolveCrmOrderServicesVaultIds} — scalar `twofa_account_id`. */
export function resolveCrmOrderServicesVaultId(
  order: CrmOrderVaultLinkQuery,
  candidates: readonly CrmOrderVaultCandidate[],
): string | null {
  return resolveCrmOrderServicesVaultIds(order, candidates)[0] ?? null;
}
