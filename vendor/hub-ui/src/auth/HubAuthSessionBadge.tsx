import type { ComponentType } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { MetricBadge } from "../shell/MetricBadge";
import type { HubGlyphComponent, MetricBadgeTone } from "../types/filter-badge";

export type HubAuthSessionMode = "anonymous" | "signed_in";

const AnonymousIcon = UserRound as HubGlyphComponent;
const SignedInIcon = ShieldCheck as HubGlyphComponent;

const SESSION_META: Record<
  HubAuthSessionMode,
  { label: string; tone: MetricBadgeTone; icon: HubGlyphComponent; iconClass: string }
> = {
  anonymous: {
    label: "Anonymous",
    tone: "warn",
    icon: AnonymousIcon,
    iconClass: "text-violet-400",
  },
  signed_in: {
    label: "Signed in",
    tone: "ok",
    icon: SignedInIcon,
    iconClass: "text-emerald-400",
  },
};

export type HubAuthSessionBadgeProps = {
  mode: HubAuthSessionMode;
  className?: string;
};

/** Workspace session pill — Anonymous / Signed in (sidebar User row). */
export function HubAuthSessionBadge({ mode, className = "" }: HubAuthSessionBadgeProps) {
  const meta = SESSION_META[mode];
  const Icon = meta.icon;
  return (
    <MetricBadge
      label={meta.label}
      tone={meta.tone}
      iconMeta={{ icon: Icon, className: meta.iconClass }}
      className={className}
    />
  );
}
