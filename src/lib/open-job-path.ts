/** Open a job path: local folder in Explorer, Drive folder in the browser. */
export async function openJobPath(kind: "local" | "remote", target: string): Promise<void> {
  const trimmed = target.trim();
  if (!trimmed) throw new Error("Path is empty");
  if (kind === "local") {
    const viaDesktop = await window.folderSyncDesktop?.openLocal?.(trimmed);
    if (viaDesktop?.ok) return;
    const res = await fetch("/api/open/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return;
  }
  const res = await fetch("/api/open/remote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec: trimmed }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || `HTTP ${res.status}`);
  const viaDesktop = await window.folderSyncDesktop?.openExternal?.(data.url);
  if (viaDesktop?.ok) return;
  window.open(data.url, "_blank", "noopener");
}
