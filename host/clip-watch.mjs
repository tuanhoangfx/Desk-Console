import { addClip } from "./store.mjs";
import { readClipboardText, readClipboardTextAsync, shouldIgnoreClipboardText } from "./windows.mjs";

let lastText = "";
let timer = null;
let busy = false;
let primed = false;

export function ingestClipboardText(text, source = "clipboard") {
  const next = String(text || "").replace(/\r\n/g, "\n").trimEnd();
  if (!next || next === lastText) return null;
  if (shouldIgnoreClipboardText(next)) {
    lastText = next;
    return null;
  }
  lastText = next;
  return addClip({ text: next, source });
}

export function tickClipboardWatch() {
  if (busy) return null;
  busy = true;
  try {
    return ingestClipboardText(readClipboardText(), "clipboard");
  } finally {
    busy = false;
  }
}

export function startClipboardWatch(intervalMs = 1500) {
  if (timer) return;
  const tick = () => {
    if (busy) return;
    busy = true;
    void readClipboardTextAsync()
      .then((text) => {
        if (!primed) {
          primed = true;
          lastText = String(text || "").replace(/\r\n/g, "\n").trimEnd();
          return;
        }
        ingestClipboardText(text, "clipboard");
      })
      .finally(() => {
        busy = false;
      });
  };
  timer = setInterval(tick, intervalMs);
  tick();
  if (typeof timer.unref === "function") timer.unref();
}

export function stopClipboardWatch() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function resetClipboardWatchForTests() {
  lastText = "";
  busy = false;
  primed = false;
}
