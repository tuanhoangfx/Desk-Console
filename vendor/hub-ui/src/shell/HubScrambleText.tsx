import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/\\[]{}=+";

export type HubScrambleTextProps = {
  /** Final copy. Changing it restarts the decode animation. */
  text: string;
  className?: string;
  /** Frame interval — lower is faster. */
  frameMs?: number;
  /** Frames each character stays scrambled before it locks in. */
  framesPerChar?: number;
};

function scrambleFrame(text: string, revealed: number): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (i < revealed || char === " " || char === "\u2026" || char === ".") {
      out += char;
      continue;
    }
    out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return out;
}

/**
 * Monospace "decode" reveal used for live status copy (P0022 ticker style).
 *
 * The final text is exposed to assistive tech as a stable label while the animated
 * frames stay aria-hidden, and reduced-motion users get the plain string.
 */
export function HubScrambleText({
  text,
  className,
  frameMs = 30,
  framesPerChar = 1.6,
}: HubScrambleTextProps) {
  const [frame, setFrame] = useState(text);
  const timerRef = useRef(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !text) {
      setFrame(text);
      return;
    }

    let tick = 0;
    setFrame(scrambleFrame(text, 0));
    timerRef.current = window.setInterval(() => {
      tick += 1;
      const revealed = Math.floor(tick / framesPerChar);
      setFrame(scrambleFrame(text, revealed));
      if (revealed >= text.length) {
        window.clearInterval(timerRef.current);
        setFrame(text);
      }
    }, frameMs);

    return () => window.clearInterval(timerRef.current);
  }, [text, frameMs, framesPerChar]);

  return (
    <span className={className ? `hub-scramble-text ${className}` : "hub-scramble-text"}>
      <span aria-hidden="true">{frame}</span>
      <span className="hub-scramble-text__sr">{text}</span>
    </span>
  );
}
