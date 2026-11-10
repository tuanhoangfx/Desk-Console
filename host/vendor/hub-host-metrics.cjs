const os = require("node:os");

/** @type {{ idle: number, total: number } | null} */
let lastCpu = null;

function cpuSnapshot() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
}

function sampleHostMetrics() {
  const ramTotalBytes = os.totalmem();
  const ramFreeBytes = os.freemem();
  const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);
  const snap = cpuSnapshot();
  let cpuPercent = 0;
  let cpuReady = false;
  if (lastCpu) {
    const idleDelta = snap.idle - lastCpu.idle;
    const totalDelta = snap.total - lastCpu.total;
    if (totalDelta > 0) {
      cpuReady = true;
      const ratio = 1 - idleDelta / totalDelta;
      cpuPercent = Math.min(100, Math.max(0, ratio * 100));
    }
  }
  lastCpu = snap;
  return {
    ok: true,
    cpuPercent,
    cpuReady,
    ramUsedBytes,
    ramTotalBytes,
    ramPercent: ramTotalBytes > 0 ? (ramUsedBytes / ramTotalBytes) * 100 : 0,
    sampledAt: Date.now(),
  };
}

function resetHostMetricsSample() {
  lastCpu = null;
}

module.exports = { sampleHostMetrics, resetHostMetricsSample };
