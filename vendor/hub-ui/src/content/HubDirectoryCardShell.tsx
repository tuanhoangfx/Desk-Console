import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Pin } from "lucide-react";
import { compactIconSize } from "../ui-scale";

/** Golden directory card surface — shared by Dashboard / Hub / Users / Todo Kanban.
 * Rest border = former hover indigo; hover = border glow only (keep `--panel`). */
export const HUB_DIRECTORY_CARD_SURFACE =
  "hub-directory-card-surface relative flex h-full min-h-[var(--hub-card-min-h)] w-full flex-col rounded-xl border bg-[var(--panel)] transition-[border-color,box-shadow,background-color] duration-200";
export const HUB_DIRECTORY_CARD_SELECTED = "ring-2 ring-inset ring-indigo-400/35 bg-indigo-500/5";
export const HUB_DIRECTORY_CARD_PINNED =
  "border-amber-400/40 shadow-[0_0_0_1px_rgba(251,191,36,0.28),0_8px_28px_rgba(245,158,11,0.14)] hub-directory-card--pinned";

const PANEL_SURFACE =
  "hub-directory-card-surface hub-directory-card-surface--panel relative flex h-full min-h-[var(--hub-card-min-h)] w-full flex-col anim-slide rounded-2xl border bg-[var(--panel)] p-4 pr-10 transition-[border-color,box-shadow,background-color,transform] duration-200 hover:-translate-y-0.5";

export type HubDirectoryCardShellVariant = "grid" | "panel";

export type HubDirectoryCardShellProps = {
  selected?: boolean;
  /** Pinned screen / favorite — amber border glow (Dashboard). */
  pinned?: boolean;
  /** `grid` — P0004 directory card grid (default). `panel` — rounded panel cards (Users). */
  variant?: HubDirectoryCardShellVariant;
  isDetail?: boolean;
  detailRingClass?: string;
  className?: string;
  children: ReactNode;
};

function shellClass({
  selected,
  pinned,
  variant = "grid",
  isDetail,
  detailRingClass,
  className,
}: Omit<HubDirectoryCardShellProps, "children">) {
  const surface = variant === "grid" ? HUB_DIRECTORY_CARD_SURFACE : PANEL_SURFACE;
  return [
    surface,
    selected ? HUB_DIRECTORY_CARD_SELECTED : "",
    pinned ? HUB_DIRECTORY_CARD_PINNED : "",
    isDetail ? `ring-2 ${detailRingClass ?? "ring-emerald-500/40"}` : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Directory card surface — selection/detail rings without click handler. */
export function HubDirectoryCardShell(props: HubDirectoryCardShellProps) {
  return <article className={shellClass(props)}>{props.children}</article>;
}

export type HubDirectoryInteractiveCardProps = HubDirectoryCardShellProps & {
  ariaLabel: string;
  onActivate: () => void;
};

/** Directory card — row click / keyboard opens detail (bots, channels). */
export function HubDirectoryInteractiveCard({ ariaLabel, onActivate, children, ...shell }: HubDirectoryInteractiveCardProps) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`${shellClass(shell)} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35`}
      onClick={onActivate}
      onKeyDown={onKeyDown}
    >
      {children}
    </article>
  );
}

export type HubDirectoryCardCheckboxProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
  /** Absolute top-right inside a `relative` card shell. */
  corner?: boolean;
  className?: string;
};

/** Top-right cluster — pin + checkbox (Dashboard screens). */
export function HubDirectoryCardCornerRail({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute right-3 top-3 z-10 flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export type HubDirectoryCardPinButtonProps = {
  pinned: boolean;
  label: string;
  onClick: () => void;
};

/** Icon-only pin — sits left of the card checkbox (pushpin metaphor). */
export function HubDirectoryCardPinButton({ pinned, label, onClick }: HubDirectoryCardPinButtonProps) {
  const title = pinned ? `Unpin ${label}` : `Pin ${label}`;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onClick();
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pinned}
      onClick={handleClick}
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-md transition-colors ${
        pinned
          ? "text-amber-200 hub-directory-pin-mark"
          : "text-[var(--muted)] opacity-70 hover:text-amber-200/90"
      }`}
    >
      <Pin size={compactIconSize(13)} className={pinned ? "fill-current" : ""} aria-hidden />
    </button>
  );
}

/** Bulk-select checkbox — stops card activation propagation. */
export function HubDirectoryCardCheckbox({
  checked,
  label,
  onChange,
  corner = true,
  className = "",
}: HubDirectoryCardCheckboxProps) {
  return (
    <label
      className={[
        "shrink-0 outline-none",
        corner ? "absolute right-3 top-3 z-10" : "pt-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="hub-checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
    </label>
  );
}
