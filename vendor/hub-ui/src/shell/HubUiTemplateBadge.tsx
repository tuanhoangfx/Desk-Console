import { RegistryMetricBadge } from "./MetricBadge";
import { resolveHubAppTabGroupBadge } from "../table/hub-app-tab-group-meta";
import { resolveHubUiTemplateBadge } from "../table/hub-ui-template-meta";

export function HubUiTemplateBadge({ template, className }: { template: string; className?: string }) {
  return <RegistryMetricBadge spec={resolveHubUiTemplateBadge(template)} className={className} />;
}

export function HubAppTabGroupBadge({ group, className }: { group: string; className?: string }) {
  return <RegistryMetricBadge spec={resolveHubAppTabGroupBadge(group)} className={className} />;
}
