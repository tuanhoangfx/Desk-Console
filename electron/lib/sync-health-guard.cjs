const ONE_GB_BYTES = 1024 * 1024 * 1024;

function formatShortBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "0 MB";
  if (n >= ONE_GB_BYTES) return `${(n / ONE_GB_BYTES).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / (1024 * 1024)))} MB`;
}

/**
 * Evaluate active sync health alerts across jobs and signed-in Google Drive accounts:
 * 1. Job sync error (`status === "error"` or `lastResult.ok === false`)
 * 2. Job conflict files (`conflictCount > 0`)
 * 3. Google Drive low free space (`freeBytes < lowQuotaThresholdBytes`, default 1 GB)
 */
function evaluateSyncHealthAlerts(input = {}) {
  const jobs = Array.isArray(input.jobs) ? input.jobs : [];
  const accounts = Array.isArray(input.accounts) ? input.accounts : [];
  const lowQuotaThresholdBytes =
    typeof input.lowQuotaThresholdBytes === "number" && input.lowQuotaThresholdBytes > 0
      ? input.lowQuotaThresholdBytes
      : ONE_GB_BYTES;

  const liveJobs = jobs.filter((j) => j && !j.deletedAt);
  const liveAccounts = accounts.filter((a) => a && !a.deletedAt && a.authorized);
  const alerts = [];

  for (const job of liveJobs) {
    const label = job.code ? `${job.code} · ${job.name || "Job"}` : job.name || job.id;
    const isFailed = job.status === "error" || (job.lastResult && job.lastResult.ok === false);
    if (isFailed) {
      const stderr = String(job.lastResult?.stderr || "").trim();
      const firstLine = stderr.split(/\r?\n/).find(Boolean) || "Last sync pass failed — click to inspect.";
      alerts.push({
        id: `job-error:${job.id}:${job.lastRunAt || ""}`,
        kind: "job-error",
        severity: "error",
        title: `⚠ ${label} — Sync failed`,
        body: firstLine.slice(0, 140),
        target: { screen: "jobs", jobId: String(job.id) },
      });
    }
    const conflictCount = Number(job.conflictCount) || 0;
    if (conflictCount > 0) {
      alerts.push({
        id: `job-conflict:${job.id}:${conflictCount}`,
        kind: "job-conflict",
        severity: "warn",
        title: `⚠ ${label} — ${conflictCount} conflict ${conflictCount === 1 ? "file" : "files"}`,
        body: "Conflicting edits detected between Local and Google Drive.",
        target: { screen: "jobs", jobId: String(job.id) },
      });
    }
  }

  for (const acc of liveAccounts) {
    const limit = Number(acc.storage?.limitBytes);
    const used = Number(acc.storage?.usedBytes);
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(used) && used >= 0) {
      const freeBytes = Math.max(0, limit - used);
      if (freeBytes < lowQuotaThresholdBytes) {
        const label = acc.code ? `${acc.code} · ${acc.displayName || acc.email || acc.name}` : acc.email || acc.name;
        alerts.push({
          id: `drive-quota:${acc.name}`,
          kind: "drive-quota",
          severity: "warn",
          title: `⚠ ${label} — Low space (${formatShortBytes(freeBytes)} free)`,
          body: `Google Drive free space is below 1 GB (${formatShortBytes(freeBytes)} remaining).`,
          target: { screen: "drives", remoteName: String(acc.name) },
        });
      }
    }
  }

  const healthyJobCount = liveJobs.filter(
    (j) => j.status !== "error" && !(j.lastResult && j.lastResult.ok === false),
  ).length;

  const summaryTooltip =
    alerts.length > 0
      ? `Desk Console — ⚠ ${alerts.length} sync ${alerts.length === 1 ? "alert" : "alerts"}`
      : liveJobs.length > 0
        ? `Desk Console — All ${liveJobs.length} sync ${liveJobs.length === 1 ? "job" : "jobs"} healthy`
        : "Desk Console";

  return {
    alerts,
    liveJobCount: liveJobs.length,
    healthyJobCount,
    summaryTooltip,
  };
}

module.exports = {
  ONE_GB_BYTES,
  formatShortBytes,
  evaluateSyncHealthAlerts,
};
