import type { SemanticIconLookupKey } from "../types/semantic-icon";
import { semanticFilterMeta } from "../lib/semantic-icon-registry";
import type { FilterIconMeta } from "./filter-icons";

/** FilterBar `filter.key` → semantic icon key (SSOT for All-trigger + hub-ui fallback). */
export const FILTER_BAR_SEMANTIC_KEY: Record<string, SemanticIconLookupKey> = {
  folder: "filter.folder",
  pinned: "filter.pinned",
  sync: "filter.sync",
  share: "filter.share",
  service: "filter.service",
  usage: "filter.usage",
  serviceCount: "filter.serviceCount",
  platform: "filter.platform",
  quotaLevel: "filter.quota",
  plan: "filter.plan",
  planStatus: "filter.status",
  billing: "filter.billing",
  probe: "filter.probe",
  health: "filter.health",
  status: "filter.status",
  role: "filter.role",
  sales: "filter.sales",
  revenue: "filter.revenue",
  permission: "filter.permission",
  access: "filter.access",
  note: "filter.note",
  type: "filter.type",
  source: "filter.source",
  project: "filter.project",
  priority: "filter.priority",
  assignee: "filter.creator",
  creator: "filter.creator",
  category: "filter.category",
  deploy: "filter.deploy",
  drift: "filter.drift",
  links: "filter.links",
  dueDate: "filter.dueDate",
  phone: "filter.phone",
  recoveryMail: "filter.recoveryMail",
  ownership: "filter.ownership",
  website: "filter.website",
  rating: "filter.rating",
};

export function semanticFilterAllIcon(filterKey: string): FilterIconMeta | null {
  const semantic = FILTER_BAR_SEMANTIC_KEY[filterKey];
  return semantic ? semanticFilterMeta(semantic) : null;
}
