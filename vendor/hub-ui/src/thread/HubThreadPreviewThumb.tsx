import { useState } from "react";
import { ImageIcon } from "lucide-react";

export type HubThreadPreviewThumbProps = {
  src: string;
  className?: string;
};

/** Small thread-rail thumbnail with broken-image fallback. */
export function HubThreadPreviewThumb({ src, className }: HubThreadPreviewThumbProps) {
  const [failed, setFailed] = useState(false);
  const baseClass = "hub-thread-preview-thumb shrink-0";
  const merged = className ? `${baseClass} ${className}` : baseClass;

  if (failed) {
    return <ImageIcon size={14} className="shrink-0 text-cyan-300/70" aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      className={merged}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
