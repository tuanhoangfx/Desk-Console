import { useEffect, useRef, useState } from "react";

/**
 * Brand `<img>` load gate — resets on `src` change and retries once after a
 * transient failure (Vite restart / brief 404). Without this, a long-lived SPA
 * tab sticks on the empty glyph forever after the first `onError`.
 */
export function useHubBrandImageGate(src: string | undefined): {
  failed: boolean;
  imgSrc: string | undefined;
  onError: () => void;
} {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failedRef = useRef(false);
  failedRef.current = failed;

  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [src]);

  useEffect(() => {
    const recover = () => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      if (!failedRef.current) return;
      setFailed(false);
      setAttempt(0);
    };
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("online", recover);
    return () => {
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("online", recover);
    };
  }, []);

  const imgSrc =
    src && attempt > 0
      ? `${src}${src.includes("?") ? "&" : "?"}hubBrandRetry=${attempt}`
      : src;

  return {
    failed,
    imgSrc,
    onError: () => {
      if (attempt < 1) {
        window.setTimeout(() => setAttempt(1), 350);
        return;
      }
      setFailed(true);
    },
  };
}
