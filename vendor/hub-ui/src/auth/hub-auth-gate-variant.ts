/** Auth-gate wiring variants — see Tool/schemas/ui-patterns.catalog.json → auth-gate.authVariants */

export type HubAuthGateVariant = "standard" | "anonymous-dual";

export type HubAuthGateVariantMeta = {
  id: HubAuthGateVariant;
  label: string;
  tabCount: 2 | 3;
  dismissible: boolean;
  anonymousTab: boolean;
  adapterNote: string;
};

export const HUB_AUTH_GATE_VARIANTS: Record<HubAuthGateVariant, HubAuthGateVariantMeta> = {
  standard: {
    id: "standard",
    label: "standard",
    tabCount: 2,
    dismissible: false,
    anonymousTab: false,
    adapterNote: "P0004 · P0016 — sign-in required",
  },
  "anonymous-dual": {
    id: "anonymous-dual",
    label: "anonymous-dual",
    tabCount: 3,
    dismissible: true,
    anonymousTab: true,
    adapterNote: "P0020 — Anonymous offline + dual sign-in",
  },
};

export function hubAuthGateVariantBadgeText(variant: HubAuthGateVariant): string {
  const meta = HUB_AUTH_GATE_VARIANTS[variant];
  return `${meta.label} · ${meta.tabCount} tabs · ${meta.dismissible ? "dismissible" : "non-dismissible"}`;
}
