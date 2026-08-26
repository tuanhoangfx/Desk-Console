import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { compactIconSize } from "../ui-scale";

export type HubToolAvatarSize = "sm" | "md" | "lg";

const SIZE: Record<HubToolAvatarSize, number> = { sm: 22, md: 32, lg: 40 };
const GLYPH: Record<HubToolAvatarSize, number> = { sm: 14, md: 20, lg: 26 };
const ICON: Record<HubToolAvatarSize, number> = { sm: 14, md: 16, lg: 20 };

export type HubToolAvatarProps = {
  code: string;
  size?: HubToolAvatarSize;
  svgSrc?: string;
  /** Lucide icon in the glyph overlay */
  icon?: LucideIcon;
  /** Custom glyph node (e.g. MaterialIcon) — used when `icon` is absent */
  glyph?: ReactNode;
  glyphClassName?: string;
  /** When true, apply compactIconSize to dimension tokens (P0004 scale). */
  scaled?: boolean;
};

/** Directory/tool identity avatar — SVG catalog mark, else initials + optional glyph. */
export function HubToolAvatar({
  code,
  icon: Icon,
  glyph,
  glyphClassName = "",
  svgSrc,
  size = "md",
  scaled = false,
}: HubToolAvatarProps) {
  const [svgFailed, setSvgFailed] = useState(false);
  const dim = (n: number) => {
    if (!scaled) return n;
    if (size === "sm") return n;
    return compactIconSize(n);
  };
  const px = dim(SIZE[size]);
  const glyphPx = dim(GLYPH[size]);
  const iconPx = dim(ICON[size]);

  if (svgSrc && !svgFailed) {
    return (
      <div
        className={`tool-avatar tool-avatar-${size} tool-avatar-svg`}
        style={{ width: px, height: px }}
      >
        <img
          src={svgSrc}
          alt={code}
          width={px}
          height={px}
          onError={() => setSvgFailed(true)}
        />
      </div>
    );
  }

  const initials = code.slice(0, 2).toUpperCase();
  return (
    <div className={`tool-avatar tool-avatar-${size}`} style={{ width: px, height: px }}>
      <span className="tool-avatar-initials" aria-hidden="true">
        {initials}
      </span>
      {glyph ? (
        <span className={`tool-avatar-glyph ${glyphClassName}`.trim()}>{glyph}</span>
      ) : Icon ? (
        <span className={`tool-avatar-glyph text-indigo-200 ${glyphClassName}`.trim()}>
          <Icon size={iconPx} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
