import { useCallback, useRef, useState, type MouseEvent } from "react";

type Box = { x: number; y: number; width: number; height: number };

type Props = {
  src: string;
  onCancel: () => void;
  onApply: (box: Box) => void;
  busy?: boolean;
};

function toImageBox(img: HTMLImageElement, start: { x: number; y: number }, end: { x: number; y: number }): Box | null {
  const rect = img.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const left = Math.min(start.x, end.x) - rect.left;
  const top = Math.min(start.y, end.y) - rect.top;
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 8 || height < 8) return null;
  const sx = img.naturalWidth / rect.width;
  const sy = img.naturalHeight / rect.height;
  return {
    x: Math.max(0, Math.round(left * sx)),
    y: Math.max(0, Math.round(top * sy)),
    width: Math.min(img.naturalWidth, Math.round(width * sx)),
    height: Math.min(img.naturalHeight, Math.round(height * sy)),
  };
}

/** Fullscreen crop overlay — not a Hub New/Detail modal (Layout 3 does not apply). */
export function CaptureRegionOverlay({ src, onCancel, onApply, busy }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  const onDown = useCallback((event: MouseEvent<HTMLImageElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    setPreview({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
    setBox(null);
  }, []);

  const onMove = useCallback((event: MouseEvent<HTMLImageElement>) => {
    if (!drag.current) return;
    const left = Math.min(drag.current.x, event.clientX);
    const top = Math.min(drag.current.y, event.clientY);
    setPreview({
      left,
      top,
      width: Math.abs(event.clientX - drag.current.x),
      height: Math.abs(event.clientY - drag.current.y),
    });
  }, []);

  const onUp = useCallback((event: MouseEvent<HTMLImageElement>) => {
    const start = drag.current;
    drag.current = null;
    const img = imgRef.current;
    if (!start || !img) return;
    setBox(toImageBox(img, start, { x: event.clientX, y: event.clientY }));
  }, []);

  return (
    <div className="desk-region-overlay" role="dialog" aria-label="Capture region">
      <div className="desk-region-overlay__bar">
        <span>Drag to select a region</span>
        <div className="desk-region-overlay__actions">
          <button type="button" className="hub-btn text-xs" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="hub-btn hub-btn--primary text-xs"
            disabled={!box || busy}
            onClick={() => box && onApply(box)}
          >
            {busy ? "Cropping…" : "Apply crop"}
          </button>
        </div>
      </div>
      <div className="desk-region-overlay__stage">
        <img
          ref={imgRef}
          src={src}
          alt="Screen capture"
          draggable={false}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
        />
        {preview && preview.width > 2 ? (
          <div
            className="desk-region-overlay__rect"
            style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}
          />
        ) : null}
      </div>
    </div>
  );
}
