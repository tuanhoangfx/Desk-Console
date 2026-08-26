export type HubAuthBrandIconProps = {
  src: string;
  alt?: string;
  className?: string;
};

/** Auth gate brand mark — golden 56×56 with soft cyan glow (P0003 known-good). */
export function HubAuthBrandIcon({ src, alt = "", className = "" }: HubAuthBrandIconProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={56}
      height={56}
      className={className ? `hub-auth-brand-icon ${className}` : "hub-auth-brand-icon"}
    />
  );
}
