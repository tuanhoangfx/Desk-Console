/**
 * CRM Usage lookup SSOT — merge hits + team seat / shared-plan resolve.
 * Index build (subscription timeline) stays in the product (P0020).
 */

import {
  countCrmOrderDetailMailboxes,
  crmOrderProductMatchesService,
  expandCrmOrderGmailAliases,
  extractCrmOrderDetailIdentityTokens,
  isCrmOrderCompletedStatus,
  normalizeCrmOrderDetailsIdentifier,
} from "./crm-order-details";
import { isCrmOrderMailVaultService } from "./crm-order-vault-link";

export type CrmOrderUsageSubscriptionBucket = "live" | "expired";

const LIVE_SUBSCRIPTION_MARKERS = ["active", "expiring soon"] as const;

export type CrmOrderUsageHit = {
  orderId: string;
  externalOrderId?: string;
  productName?: string;
  orderStatus?: string | null;
  subscriptionStatus?: string | null;
  orderDateYmd?: string;
  dueDateYmd?: string;
  daysLeft?: number | null;
  lifetime?: boolean;
  details: string;
  mentionCount: number;
  identifiers: string[];
  /** Persisted Services vault ids on this order — empty when CRM has not linked yet. */
  linkedVaultIds?: string[];
};

/** String = subscription-only (legacy / Own heal). Object = live Usage gate + exceptions. */
export type CrmOrderUsageGateInput =
  | string
  | null
  | undefined
  | Pick<CrmOrderUsageHit, "orderStatus" | "subscriptionStatus">;

export type CrmOrderUsage = {
  mentionCount: number;
  orderCount: number;
  identifiers: string[];
  orders: CrmOrderUsageHit[];
};

export type CrmOrderUsageBucket = {
  mentionCount: number;
  orders: Map<string, CrmOrderUsageHit>;
};

export type CrmOrderUsageIndex = {
  byIdentifier: Map<string, CrmOrderUsageBucket>;
  byVaultId: Map<string, CrmOrderUsageBucket>;
  scannedOrderCount: number;
};

export type CrmUsageSubject = {
  id?: string;
  account: string;
  mailRecover?: string | null;
  service: string;
};

export type CrmUsageVaultRow = {
  id: string;
  account?: string | null;
  mailRecover?: string | null;
  service: string;
};

export const EMPTY_CRM_ORDER_USAGE: CrmOrderUsage = {
  mentionCount: 0,
  orderCount: 0,
  identifiers: [],
  orders: [],
};

function subscriptionStatusNormalized(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function asUsageGateHit(
  input: CrmOrderUsageGateInput,
): Pick<CrmOrderUsageHit, "orderStatus" | "subscriptionStatus"> {
  if (input && typeof input === "object") return input;
  return { subscriptionStatus: input };
}

export function crmOrderSubscriptionIsLive(status: string | null | undefined): boolean {
  const normalized = subscriptionStatusNormalized(status);
  if (!normalized) return true;
  return LIVE_SUBSCRIPTION_MARKERS.some((marker) => normalized.includes(marker));
}

/** Live Usage: Completed (when status is present) + Active / Expiring Soon / blank subscription. */
export function crmOrderCountsForLiveUsage(input: CrmOrderUsageGateInput): boolean {
  const hit = asUsageGateHit(input);
  if (hit.orderStatus != null && String(hit.orderStatus).trim() && !isCrmOrderCompletedStatus(hit.orderStatus)) {
    return false;
  }
  return crmOrderSubscriptionIsLive(hit.subscriptionStatus);
}

/** Usage Expired = every exception to live Usage (non-Completed desk status or Completed + Expired). */
export function crmOrderCountsForExpiredUsage(input: CrmOrderUsageGateInput): boolean {
  return !crmOrderCountsForLiveUsage(input);
}

export function crmOrderCountsForUsageBucket(
  input: CrmOrderUsageGateInput,
  bucket: CrmOrderUsageSubscriptionBucket,
): boolean {
  return bucket === "expired"
    ? crmOrderCountsForExpiredUsage(input)
    : crmOrderCountsForLiveUsage(input);
}

function mergeUsageOrderHits(
  mergedOrders: Map<string, CrmOrderUsageHit>,
  hits: Iterable<CrmOrderUsageHit>,
): void {
  for (const hit of hits) {
    const existing = mergedOrders.get(hit.orderId);
    if (!existing) {
      mergedOrders.set(hit.orderId, { ...hit, identifiers: [...hit.identifiers] });
      continue;
    }
    mergedOrders.set(hit.orderId, {
      ...existing,
      mentionCount: Math.max(existing.mentionCount, hit.mentionCount),
      identifiers: [...new Set([...existing.identifiers, ...hit.identifiers])],
    });
  }
}

export function mergeCrmOrderUsage(left: CrmOrderUsage, right: CrmOrderUsage): CrmOrderUsage {
  if (!right.orderCount) return left;
  if (!left.orderCount) return right;
  const mergedOrders = new Map<string, CrmOrderUsageHit>();
  mergeUsageOrderHits(mergedOrders, left.orders);
  mergeUsageOrderHits(mergedOrders, right.orders);
  const orders = [...mergedOrders.values()].sort((a, b) => {
    if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
    return (a.externalOrderId ?? a.orderId).localeCompare(b.externalOrderId ?? b.orderId);
  });
  return {
    mentionCount: orders.reduce((sum, hit) => sum + hit.mentionCount, 0),
    orderCount: orders.length,
    identifiers: [...new Set([...left.identifiers, ...right.identifiers])],
    orders,
  };
}

function accountUsageIdentifiers(row: { account?: string | null; mailRecover?: string | null }): string[] {
  const values = new Set<string>();
  const push = (raw: string) => {
    const value = normalizeCrmOrderDetailsIdentifier(raw);
    if (value.length < 3) return;
    for (const alias of expandCrmOrderGmailAliases(value)) values.add(alias);
  };
  push(row.account ?? "");
  push(row.mailRecover ?? "");
  return [...values];
}

function usageHitIdentitySet(hit: Pick<CrmOrderUsageHit, "details" | "identifiers">): Set<string> {
  const out = new Set<string>();
  for (const identifier of hit.identifiers ?? []) {
    for (const alias of expandCrmOrderGmailAliases(identifier)) {
      if (alias.length >= 3) out.add(alias);
    }
  }
  for (const token of extractCrmOrderDetailIdentityTokens(hit.details ?? "")) {
    if (token.length >= 3) out.add(token);
  }
  return out;
}

function subjectKeysInIdentity(
  row: { account?: string | null; mailRecover?: string | null },
  identity: Set<string>,
): boolean {
  return accountUsageIdentifiers(row).some((key) => identity.has(key));
}

/**
 * Usage join: Account email or a real vault-id link.
 * Recover-only hitchhikers (new ChatGPT row sharing Recover of an already-linked
 * single-seat order) must not inherit Usage / Own.
 */
export function crmOrderUsageHitAllowedForSubject(
  subject: CrmUsageSubject,
  hit: CrmOrderUsageHit,
): boolean {
  const identity = usageHitIdentitySet(hit);
  const linked = [...new Set((hit.linkedVaultIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const vaultId = subject.id?.trim() ?? "";
  const recoverHit = subjectKeysInIdentity({ account: "", mailRecover: subject.mailRecover }, identity);
  const mailboxCount = countCrmOrderDetailMailboxes(hit.details ?? "");

  if (subjectKeysInIdentity({ account: subject.account, mailRecover: "" }, identity)) {
    if (!linked.length) return true;
    if (vaultId && linked.includes(vaultId)) return true;
    return false;
  }

  if (vaultId && linked.includes(vaultId) && linked.length > 1 && mailboxCount <= 1) {
    return false;
  }
  if (vaultId && linked.includes(vaultId)) return true;
  if (recoverHit && linked.length === 0) return true;
  if (recoverHit && linked.length === 1 && vaultId && linked[0] === vaultId) return true;
  return false;
}

export function lookupCrmOrderUsage(
  index: CrmOrderUsageIndex,
  subject: CrmUsageSubject,
  bucket: CrmOrderUsageSubscriptionBucket = "live",
): CrmOrderUsage {
  const identifiers = accountUsageIdentifiers(subject);
  const vaultId = subject.id?.trim() ?? "";
  if (!identifiers.length && !vaultId) return EMPTY_CRM_ORDER_USAGE;

  const mergedOrders = new Map<string, CrmOrderUsageHit>();
  const matchedIdentifiers: string[] = [];

  for (const identifier of identifiers) {
    const idBucket = index.byIdentifier.get(identifier);
    if (!idBucket) continue;
    matchedIdentifiers.push(identifier);
    mergeUsageOrderHits(mergedOrders, idBucket.orders.values());
  }
  if (vaultId) {
    const vaultBucket = index.byVaultId.get(vaultId);
    if (vaultBucket) mergeUsageOrderHits(mergedOrders, vaultBucket.orders.values());
  }

  if (!mergedOrders.size) return EMPTY_CRM_ORDER_USAGE;

  const orders = [...mergedOrders.values()]
    .filter((hit) => crmOrderUsageHitAllowedForSubject(subject, hit))
    .filter((hit) => crmOrderCountsForUsageBucket(hit, bucket))
    .filter((hit) => crmOrderProductMatchesService(hit.productName, subject.service))
    .sort((a, b) => {
      if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
      return (a.externalOrderId ?? a.orderId).localeCompare(b.externalOrderId ?? b.orderId);
    });
  if (!orders.length) return EMPTY_CRM_ORDER_USAGE;

  return {
    mentionCount: orders.reduce((sum, hit) => sum + hit.mentionCount, 0),
    orderCount: orders.length,
    identifiers: matchedIdentifiers,
    orders,
  };
}

export function resolveTeamMemberCrmUsageVaultAccount<T extends CrmUsageVaultRow>(member: {
  linkedAccount?: T | null;
  servicePlanAccount?: T | null;
}): T | null {
  const linked = member.linkedAccount;
  if (linked && !isCrmOrderMailVaultService(linked.service)) return linked;
  const plan = member.servicePlanAccount;
  if (plan && !isCrmOrderMailVaultService(plan.service)) return plan;
  return null;
}

export function teamMemberToCrmUsageSubject<T extends CrmUsageVaultRow>(
  member: {
    email: string;
    linkedAccount?: T | null;
    servicePlanAccount?: T | null;
    mailAccount?: T | null;
    mailRecover?: string | null;
  },
  team?: { site?: string; teamType?: string } | null,
): CrmUsageSubject | null {
  const vault = resolveTeamMemberCrmUsageVaultAccount(member);
  if (vault) {
    return {
      id: vault.id,
      account: vault.account ?? "",
      mailRecover: vault.mailRecover,
      service: vault.service,
    };
  }
  const service = String(team?.site ?? "").trim() || String(team?.teamType ?? "").trim();
  const account = String(member.email ?? "").trim();
  if (!account) return null;
  return {
    account,
    mailRecover: member.mailAccount?.mailRecover?.trim() || String(member.mailRecover ?? "").trim() || "",
    service,
  };
}

function teamProductService(team?: { site?: string; teamType?: string } | null): string {
  return String(team?.site ?? "").trim() || String(team?.teamType ?? "").trim();
}

export function lookupTeamSharedPlanCrmOrderUsage<T extends CrmUsageVaultRow>(
  index: CrmOrderUsageIndex,
  team:
    | {
        site?: string;
        teamType?: string;
        ownerEmail?: string;
        baseAccount?: T | null;
        members?: readonly { email?: string }[];
      }
    | null
    | undefined,
  bucket: CrmOrderUsageSubscriptionBucket = "live",
): CrmOrderUsage {
  if (!team) return EMPTY_CRM_ORDER_USAGE;
  const service = teamProductService(team);
  if (!service) return EMPTY_CRM_ORDER_USAGE;
  let merged = EMPTY_CRM_ORDER_USAGE;
  const plan = team.baseAccount;
  if (plan && !isCrmOrderMailVaultService(plan.service)) {
    merged = lookupCrmOrderUsage(
      index,
      {
        id: plan.id,
        account: plan.account ?? "",
        mailRecover: plan.mailRecover,
        service: plan.service,
      },
      bucket,
    );
  }
  const emails = new Set<string>();
  const push = (value?: string | null) => {
    const key = String(value ?? "").trim();
    if (key.includes("@")) emails.add(key);
  };
  push(team.ownerEmail);
  push(plan?.account);
  push(plan?.mailRecover);
  for (const member of team.members ?? []) push(member.email);
  for (const email of emails) {
    merged = mergeCrmOrderUsage(merged, lookupCrmOrderUsage(index, { account: email, service }, bucket));
  }
  return merged;
}

export function lookupTeamMemberCrmOrderUsage<T extends CrmUsageVaultRow>(
  index: CrmOrderUsageIndex,
  member: {
    email: string;
    linkedAccount?: T | null;
    servicePlanAccount?: T | null;
    mailAccount?: T | null;
    mailRecover?: string | null;
  },
  team?: {
    site?: string;
    teamType?: string;
    ownerEmail?: string;
    baseAccount?: T | null;
    members?: readonly { email?: string }[];
  } | null,
  bucket: CrmOrderUsageSubscriptionBucket = "live",
): CrmOrderUsage {
  const emailSubject = teamMemberToCrmUsageSubject(
    {
      email: member.email,
      linkedAccount: null,
      servicePlanAccount: null,
      mailAccount: member.mailAccount,
      mailRecover: member.mailRecover,
    },
    team,
  );
  const emailUsage = emailSubject
    ? lookupCrmOrderUsage(index, emailSubject, bucket)
    : EMPTY_CRM_ORDER_USAGE;
  const vault = resolveTeamMemberCrmUsageVaultAccount(member);
  const vaultUsage = vault
    ? lookupCrmOrderUsage(
        index,
        {
          id: vault.id,
          account: vault.account ?? "",
          mailRecover: vault.mailRecover,
          service: vault.service,
        },
        bucket,
      )
    : EMPTY_CRM_ORDER_USAGE;
  // Per-seat only — do not inherit Shared Account / teammate orders onto a blank seat
  // (Capcut Team painted the same 33 on every member).
  return mergeCrmOrderUsage(emailUsage, vaultUsage);
}
