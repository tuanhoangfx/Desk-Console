const OBJECT_STRING = "[object Object]";

function pickObjectMessage(value: Record<string, unknown>, seen: Set<unknown>): string {
  for (const key of ["message", "error", "details", "hint", "msg"] as const) {
    const inner = value[key];
    if (inner === value || seen.has(inner)) continue;
    const text = formatHubUnknownMessage(inner, "", seen);
    if (text) return text;
  }
  try {
    const json = JSON.stringify(value);
    if (json && json !== "{}" && json !== "[]" && json !== OBJECT_STRING) {
      return json.length > 280 ? `${json.slice(0, 280)}…` : json;
    }
  } catch {
    /* circular */
  }
  return "";
}

/**
 * Toast / sync error text — never render `[object Object]`.
 * Reads Error.message, PostgREST `{ message, details, hint }`, or JSON.
 */
export function formatHubUnknownMessage(
  value: unknown,
  fallback = "",
  seen: Set<unknown> = new Set(),
): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text === OBJECT_STRING) return fallback;
    return text;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) {
    const text = value.message.trim();
    return text && text !== OBJECT_STRING ? text : fallback;
  }
  if (typeof value === "object") {
    if (seen.has(value)) return fallback;
    seen.add(value);
    return pickObjectMessage(value as Record<string, unknown>, seen) || fallback;
  }
  return fallback;
}
