/** Shared Console / Run History formatting — workflow rail SSOT (P0003, P0027). */

export function formatHubRuntimeLogTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function hubRuntimeConsoleLineClass(level: string): string {
  if (level === "error") return "hub-runtime-term__line--error";
  if (level === "success") return "hub-runtime-term__line--ok";
  if (level === "warn") return "hub-runtime-term__line--warn";
  if (level === "active") return "hub-runtime-term__line--active";
  return "";
}
