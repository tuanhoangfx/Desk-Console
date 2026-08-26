/** Distinguishes intentionally missing values from values whose state is unknown. */
export type HubEmptyValueState = "missing" | "unknown";

export type HubEmptyValueProps = {
  state?: HubEmptyValueState;
  className?: string;
  /** Localized copy for an unknown value; missing values intentionally stay blank. */
  unknownLabel?: string;
};

/**
 * Shared fallback for non-directory detail/modal values.
 * Missing data remains visually blank; unknown data is explicitly labelled.
 */
export function HubEmptyValue({
  state = "missing",
  className,
  unknownLabel = "Unknown",
}: HubEmptyValueProps) {
  if (state === "unknown") {
    return <span className={className}>{unknownLabel}</span>;
  }

  return <span className={className} aria-hidden />;
}
