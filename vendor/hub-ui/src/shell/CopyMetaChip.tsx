import { type ReactNode } from "react";
import { HubCopyTickWrap } from "./HubCopyTickWrap";
import { useHubCopyFlash } from "./HubInlineCopyControl";

export type MetaTone = "amber" | "cyan" | "emerald" | "indigo" | "muted" | "rose" | "violet";

export function MetaChip({
  icon,
  label,
  tone,
  className = "",
  labelClassName = "",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: MetaTone;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
  className?: string;
  labelClassName?: string;
  /** When set, chip is a button (e.g. Sync error → open Log). */
  onClick?: () => void;
}) {
  const toneClass = {
    amber: "border-amber-400/30 bg-amber-500/12 text-amber-100 [&_svg]:text-amber-300",
    cyan: "border-cyan-400/30 bg-cyan-500/12 text-cyan-100 [&_svg]:text-cyan-300",
    emerald: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100 [&_svg]:text-emerald-300",
    indigo: "border-indigo-400/30 bg-indigo-500/12 text-indigo-100 [&_svg]:text-indigo-300",
    muted: "border-white/10 bg-white/[.04] text-[var(--muted)] [&_svg]:text-[var(--muted)]",
    rose: "border-rose-400/30 bg-rose-500/12 text-rose-100 [&_svg]:text-rose-300",
    violet: "border-violet-400/30 bg-violet-500/12 text-violet-100 [&_svg]:text-violet-300",
  }[tone];

  const body = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className={labelClassName || "truncate"}>{label}</span>
    </>
  );
  const chipClass = `inline-flex max-w-[11rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 ${toneClass} ${className}`;

  if (onClick) {
    return (
      <button type="button" className={chipClass} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <span className={chipClass}>{body}</span>;
}

export function CopyMetaChip({
  icon,
  label,
  value,
  tone,
  title,
  className = "",
  labelClassName = "",
  onCopied,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: MetaTone;
  title?: string;
  className?: string;
  labelClassName?: string;
  onCopied?: () => void;
}) {
  const { copied, flash } = useHubCopyFlash();

  const chipButton = (
    <button
      type="button"
      className="group inline-flex max-w-full"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => {
          flash();
          onCopied?.();
        });
      }}
    >
      <MetaChip
        icon={icon}
        label={label}
        tone={tone}
        className={className}
        labelClassName={labelClassName}
      />
    </button>
  );

  return (
    <HubCopyTickWrap copied={copied}>{chipButton}</HubCopyTickWrap>
  );
}

/** 2FA Account column + User modal email badge (P0020 / P0004). */
export const HUB_EMAIL_COPY_CHIP_CLASS =
  "inline-flex !max-w-none w-auto max-w-full gap-1 rounded-full border-sky-300/45 bg-sky-400/18 px-2 py-0.5 font-mono text-[10px] font-medium leading-[1.3] text-sky-50 shadow-[0_0_8px_rgba(56,189,248,0.12)]";
