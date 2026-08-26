/** Directory column: `dd/mm hh:mm` tabular — compact absolute without year (Design V2 lock). */
export function formatHubDirectoryDateCompact(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mo} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

/** Picker / vault calendar date — always `dd/mm/yy` (e.g. `12/08/26`). Input `YYYY-MM-DD`. */
export function formatHubCalendarDateCompact(isoDate: string): string {
  const [y, m, d] = isoDate.trim().split("-");
  if (!y || !m || !d) return isoDate;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.slice(-2)}`;
}

/** Local date: `dd/mm/yy` (e.g. `03/06/26`) — stale activity labels, compact directory cells. */
export function formatHubTimestampDateOnly(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${dd}/${mo}/${yy}`;
  } catch {
    return "";
  }
}

/** Local datetime: `hh:mm dd/mm/yy` (e.g. `18:30 03/06/26`) — absolute ISO timestamps (cookie sync, tooltips). */
export function formatHubTimestampCompact(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${mo}/${yy}`;
  } catch {
    return "";
  }
}

/** Log / Detail meta absolute — `hh:mm:ss dd/mm/yy` (e.g. `12:45:00 19/08/26`). */
export function formatHubTimestampLog(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${hh}:${mm}:${ss} ${dd}/${mo}/${yy}`;
  } catch {
    return "";
  }
}

/** Full local datetime for tooltips. */
export function formatHubTimestampFull(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
