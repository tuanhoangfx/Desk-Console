import { ExternalLink, PhoneCall, type LucideIcon } from "lucide-react";
import type { HubContactChannel } from "../lib/hub-contact-channel-href";
import { hubContactChannelHref } from "../lib/hub-contact-channel-href";
import "./hub-adm-detail-copy-action.css";
import "./hub-directory-copy-control.css";

export type HubContactOpenActionProps = {
  channel: HubContactChannel;
  value: string;
  /** `directory` — muted until hover. `adm` — modal trailing. */
  variant?: "directory" | "adm";
  className?: string;
  title?: string;
};

const CHANNEL_META: Record<
  HubContactChannel,
  { title: string; Icon: LucideIcon; external: boolean }
> = {
  phone: { title: "Call", Icon: PhoneCall, external: false },
  zalo: { title: "Open Zalo", Icon: ExternalLink, external: true },
  telegram: { title: "Open Tele", Icon: ExternalLink, external: true },
  meta: { title: "Open Meta", Icon: ExternalLink, external: true },
};

/** Open/call affordance beside contact text — not a copy glyph. */
export function HubContactOpenAction({
  channel,
  value,
  variant = "directory",
  className = "",
  title,
}: HubContactOpenActionProps) {
  const href = hubContactChannelHref(channel, value);
  if (!href) return null;

  const meta = CHANNEL_META[channel];
  const label = title ?? meta.title;
  const Icon = meta.Icon;
  const base =
    variant === "adm"
      ? "hub-adm-trailing-action hub-adm-detail-field-copy"
      : "hub-directory-row-open";

  return (
    <a
      href={href}
      className={`${base} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...(meta.external ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={(event) => event.stopPropagation()}
    >
      <Icon size={12} aria-hidden />
    </a>
  );
}
