import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { compactIconSize } from "../ui-scale";

const BEAM_PATH_SEL = "path, circle, line, polyline, polygon, rect, ellipse";

/** Normalize Lucide path length so one dashoffset lap = one icon outline. */
function stampDirectoryEmptyBeamPathLength(host: HTMLSpanElement | null) {
  if (!host) return;
  host.querySelectorAll(BEAM_PATH_SEL).forEach((el) => {
    el.setAttribute("pathLength", "100");
  });
}

export type HubDirectoryEmptyFrameProps = {
  icon: LucideIcon;
  /** Tint for the glyph + traveling stroke (`currentColor`). */
  iconClassName?: string;
  busy?: boolean;
  children: ReactNode;
};

/** Directory body empty / loading — dashed frame + optional stroke-beam on the icon path. */
export function HubDirectoryEmptyFrame({
  icon: Icon,
  iconClassName = "text-amber-300/80",
  busy = false,
  children,
}: HubDirectoryEmptyFrameProps) {
  const size = compactIconSize(28);
  return (
    <div
      className="hub-directory-empty"
      aria-busy={busy || undefined}
      role={busy ? "status" : undefined}
    >
      <div
        className={`hub-directory-empty__mark${busy ? " hub-directory-empty__mark--busy" : ""}${
          iconClassName ? ` ${iconClassName}` : ""
        }`}
      >
        <Icon size={size} className="hub-directory-empty__icon" strokeWidth={1.6} />
        {busy ? (
          <span className="hub-directory-empty__beam-host" ref={stampDirectoryEmptyBeamPathLength}>
            <Icon
              size={size}
              className="hub-directory-empty__beam"
              strokeWidth={2.4}
              aria-hidden
            />
          </span>
        ) : null}
      </div>
      <div className="hub-directory-empty__copy">{children}</div>
    </div>
  );
}
