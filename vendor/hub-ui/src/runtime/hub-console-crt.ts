/** Hub SSOT — Desk/ops Console CRT V5 (locked). Classify lines + inline hacker tokens. */

export type HubConsoleLineKind = "cmd" | "meta" | "ok" | "warn" | "err" | "plain";

export type HubConsoleSegmentKind =
  | "ts"
  | "tag"
  | "path"
  | "cmd"
  | "arrow"
  | "ok"
  | "warn"
  | "err"
  | "plain"
  | "key"
  | "num";

export type HubConsoleSegment = { kind: HubConsoleSegmentKind; text: string };

/** Strip leading ISO stamp from host appendTerminalLine before classify/tokenize. */
export function stripHubConsoleHostStamp(line: string): string {
  return String(line || "").replace(/^\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[^\]]+\]\s*/, "");
}

export function classifyHubConsoleLine(line: string): HubConsoleLineKind {
  const body = stripHubConsoleHostStamp(line).trim();
  if (/^\$|^>|^node |^pnpm |^powershell/i.test(body)) return "cmd";
  if (/\berror\b|failed|ENOENT/i.test(body)) return "err";
  if (/\bwarn\b|skipped|\[vite\].*warning/i.test(body)) return "warn";
  if (/→|ready in|listening|started|done ok=/i.test(body)) return "ok";
  if (/^\[[0-9]{4}-|^\[spawn\]|^\d{2}:\d{2}:\d{2}\s|\[vite\]|\[client\]/i.test(body)) return "meta";
  return "plain";
}

const PRIMARY_PATTERN =
  /(\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[^\]]+\]|\d{2}:\d{2}:\d{2}|\$[^\n]+|→[^\n]*|\/@fs\/[^\s'"]+|[A-Za-z]:\\[^\s'"]+|[^\s'"]+\.(?:tsx?|mjs|cjs|jsx|css)|\b(?:error|failed|ENOENT)\b|\b(?:ready in|listening|started)\b|\[(?:vite|client|spawn)[^\]]*\])/gi;

const PLAIN_PATTERN =
  /(\b[a-z][a-z0-9_-]*)(=)(true|false|\d+(?:\.\d+)?|[^\s]+)|\b(true|false)\b|\b\d+(?:\.\d+)?\b|(?:[A-Za-z]:[\\/])?[\w.-]*\/[\w./-]+|\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b|\b(?:start|done|run|stop|poll|apply|session|reload|merge|deploy|preserve|preserved)\b/gi;

const CMD_WORDS = new Set([
  "start",
  "done",
  "run",
  "stop",
  "poll",
  "apply",
  "session",
  "reload",
  "merge",
  "deploy",
  "preserve",
  "preserved",
]);

function segmentKind(raw: string): HubConsoleSegmentKind {
  const text = raw.trim();
  if (/^\[[0-9]{4}-/.test(text) || /^\d{2}:\d{2}:\d{2}$/.test(text)) return "ts";
  if (/^\[(?:vite|client|spawn)/i.test(text)) return "tag";
  if (/^\/@fs\//.test(text) || /^[A-Za-z]:\\/.test(text) || /\.(tsx?|mjs|cjs|jsx|css)$/i.test(text)) return "path";
  if (/^\$/.test(text)) return "cmd";
  if (/^→/.test(text)) return "arrow";
  if (/\b(?:error|failed|ENOENT)\b/i.test(text)) return "err";
  if (/\bwarn\b|skipped/i.test(text)) return "warn";
  if (/\b(?:ready in|listening|started)\b/i.test(text)) return "ok";
  if (text === "true") return "ok";
  if (text === "false") return "warn";
  if (/^\d/.test(text)) return "num";
  if (CMD_WORDS.has(text.toLowerCase()) || /^(?:[a-z][a-z0-9]*-)+[a-z][a-z0-9]*$/i.test(text)) return "cmd";
  if (/=/.test(text) && /^[a-z]/.test(text)) return "key";
  if (/\/|\\/.test(text)) return "path";
  return "plain";
}

function valueKind(val: string): HubConsoleSegmentKind {
  if (val === "true") return "ok";
  if (val === "false") return "warn";
  if (/^\d/.test(val)) return "num";
  if (/\/|\\/.test(val)) return "path";
  return "plain";
}

function pushPlainTokens(text: string, out: HubConsoleSegment[]) {
  if (!text) return;
  let last = 0;
  const re = new RegExp(PLAIN_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push({ kind: "plain", text: text.slice(last, match.index) });
    if (match[1] && match[2] && match[3] !== undefined) {
      out.push({ kind: "key", text: match[1] });
      out.push({ kind: "plain", text: match[2] });
      out.push({ kind: valueKind(match[3]), text: match[3] });
    } else {
      const piece = match[0];
      out.push({ kind: segmentKind(piece), text: piece });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: "plain", text: text.slice(last) });
}

/** Multi-color inline tokens — V5 CRT demo parity (vite lines + deploy/task kv flags). */
export function tokenizeHubConsoleLine(line: string): HubConsoleSegment[] {
  const body = stripHubConsoleHostStamp(line);
  if (!body) return [{ kind: "plain", text: line }];

  const segments: HubConsoleSegment[] = [];
  let last = 0;
  const re = new RegExp(PRIMARY_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) pushPlainTokens(body.slice(last, match.index), segments);
    const piece = match[0];
    segments.push({ kind: segmentKind(piece), text: piece });
    last = match.index + piece.length;
  }
  if (last < body.length) pushPlainTokens(body.slice(last), segments);
  if (!segments.length) segments.push({ kind: "plain", text: body });
  return segments;
}

/** Host log SSOT — prefixes for CRT chip + color classifier. */
export function hubConsoleCmd(text: string): string {
  return `$ ${String(text || "").trim()}`;
}

export function hubConsoleOk(text: string): string {
  return `→ ${String(text || "").trim()}`;
}

export function hubConsoleMeta(text: string): string {
  return `[spawn] ${String(text || "").trim()}`;
}
