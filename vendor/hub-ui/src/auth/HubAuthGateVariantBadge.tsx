import {
  hubAuthGateVariantBadgeText,
  type HubAuthGateVariant,
} from "./hub-auth-gate-variant";

export type HubAuthGateVariantBadgeProps = {
  variant: HubAuthGateVariant;
  className?: string;
};

/** Design Template / docs — authVariant label chip. */
export function HubAuthGateVariantBadge({ variant, className = "" }: HubAuthGateVariantBadgeProps) {
  return (
    <span
      className={`auth-gate-variant-badge${variant === "anonymous-dual" ? " auth-gate-variant-badge--dual" : ""}${className ? ` ${className}` : ""}`}
    >
      {hubAuthGateVariantBadgeText(variant)}
    </span>
  );
}
