import { addClip } from "./store.mjs";
import {
  getClipboardSequenceNumber,
  readClipboardImageAsync,
  readClipboardText,
  readClipboardTextAsync,
  shouldIgnoreClipboardImage,
  shouldIgnoreClipboardText,
} from "./windows.mjs";

let lastText = "";
let lastImageDataUrl = "";
let lastClipSeq = 0;
let timer = null;
let busy = false;
let primed = false;
let lastElectronClipHeartbeatAt = 0;

export function markElectronClipboardActive() {
  lastElectronClipHeartbeatAt = Date.now();
}

export function ingestClipboardText(text, source = "clipboard") {
  const next = String(text || "").replace(/\r\n/g, "\n").trimEnd();
  if (!next || next === lastText) return null;
  if (shouldIgnoreClipboardText(next)) {
    lastText = next;
    return null;
  }
  lastText = next;
  return addClip({ text: next, contentType: "text", source });
}

export function ingestClipboardImage(img, source = "clipboard") {
  const imageDataUrl = String(img?.imageDataUrl || "").trim();
  if (!imageDataUrl.startsWith("data:image/") || imageDataUrl === lastImageDataUrl) return null;
  if (shouldIgnoreClipboardImage(imageDataUrl)) {
    lastImageDataUrl = imageDataUrl;
    return null;
  }
  lastImageDataUrl = imageDataUrl;
  const imageWidth = Number(img?.imageWidth) || 0;
  const imageHeight = Number(img?.imageHeight) || 0;
  return addClip({
    text: imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]",
    name: imageWidth && imageHeight ? `Image (${imageWidth}×${imageHeight})` : "Image",
    contentType: "image",
    imageDataUrl,
    imageWidth,
    imageHeight,
    source,
  });
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

export function startClipboardWatch(intervalMs = 3000) {
  if (timer) return;
  const tick = () => {
    // When Electron main process is running its 0-overhead native C++ clipboard watcher, skip PowerShell spawn.
    if (process.env.DESK_ELECTRON_CLIP_WATCH === "1" || Date.now() - lastElectronClipHeartbeatAt < 25_000) return;
    const seq = getClipboardSequenceNumber();
    if (primed && seq > 0 && seq === lastClipSeq) return;
    if (seq > 0) lastClipSeq = seq;
    if (busy) return;
    busy = true;
    void Promise.all([readClipboardTextAsync(), readClipboardImageAsync()])
      .then(([text, img]) => {
        if (Date.now() - lastElectronClipHeartbeatAt < 25_000) return;
        if (!primed) {
          primed = true;
          lastText = String(text || "").replace(/\r\n/g, "\n").trimEnd();
          lastImageDataUrl = String(img?.imageDataUrl || "").trim();
          return;
        }
        if (img && img.imageDataUrl) {
          ingestClipboardImage(img, "clipboard");
        }
        if (text) {
          ingestClipboardText(text, "clipboard");
        }
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
  lastImageDataUrl = "";
  lastClipSeq = 0;
  busy = false;
  primed = false;
  lastElectronClipHeartbeatAt = 0;
}
