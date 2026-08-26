import { resolveHubCountry } from "../lib/country-catalog";
import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";
import { flagsApiUrl, type FlagsApiSize, type FlagsApiStyle } from "../lib/locale-flag";

export type HubCountryFlagBadgeProps = {
  countryCode: string | null | undefined;
  style?: FlagsApiStyle;
  size?: FlagsApiSize;
  className?: string;
  title?: string;
};

export function HubCountryFlagBadge({
  countryCode,
  style = "flat",
  size = 24,
  className,
  title,
}: HubCountryFlagBadgeProps) {
  const src = countryCode ? flagsApiUrl(countryCode, style, size) : "";
  const dimClass =
    size >= 32 ? "h-5 w-7" : size >= 24 ? "h-[18px] w-6" : "h-3 w-4";

  if (!src) {
    return (
      <span
        className={`inline-block shrink-0 rounded-[2px] border border-white/10 bg-white/5 ${dimClass}${className ? ` ${className}` : ""}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`${dimClass} shrink-0 rounded-[2px] border border-white/10 object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.18)]${className ? ` ${className}` : ""}`}
      title={title}
      aria-hidden
    />
  );
}

export type HubCountryInlineProps = {
  value: string | null | undefined;
  variant?: "label" | "code";
  className?: string;
  flagSize?: FlagsApiSize;
};

/** Flag + canonical country label — table cells, modals, filter triggers. */
export function HubCountryInline({
  value,
  variant = "label",
  className = "",
  flagSize = 24,
}: HubCountryInlineProps) {
  const meta = resolveHubCountry(value);
  if (!meta.raw) {
    return <HubDirectoryEmptyCell className={`hub-users-cell-muted${className ? ` ${className}` : ""}`} />;
  }

  const text = variant === "code" && meta.code ? meta.code : meta.label;

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`} title={meta.label}>
      {meta.code ? <HubCountryFlagBadge countryCode={meta.code} size={flagSize} title={meta.label} /> : null}
      <span className="truncate">{text}</span>
    </span>
  );
}
