/**
 * Device CPU / RAM sample — P0003 `electron/lib/host-metrics.cjs` parity (Desk host HTTP).
 */
import os from "node:os";
import { readProcessorGroupTopology } from "./pc-optimizer.mjs";

/** @typedef {{ idle: number, total: number }} CpuTimes */

/** @type {CpuTimes | null} */
let prevCpu = null;

/**
 * @param {os.CpuInfo[]} cpus
 * @returns {CpuTimes}
 */
function cpuTimes(cpus) {
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.irq + t.idle;
  }
  return { idle, total };
}

export function resetHostMetricsSample() {
  prevCpu = null;
}

export function sampleHostMetrics() {
  const now = cpuTimes(os.cpus());
  let cpuPercent = 0;
  let cpuReady = false;
  if (prevCpu && now.total > prevCpu.total) {
    const idleDelta = now.idle - prevCpu.idle;
    const totalDelta = now.total - prevCpu.total;
    cpuPercent = Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
    cpuReady = true;
  }
  prevCpu = now;

  const ramTotalBytes = os.totalmem();
  const ramFreeBytes = os.freemem();
  const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);
  const ramPercent = ramTotalBytes > 0 ? (ramUsedBytes / ramTotalBytes) * 100 : 0;
  const topology = readProcessorGroupTopology();

  return {
    ok: true,
    cpuPercent,
    cpuReady,
    ramUsedBytes,
    ramTotalBytes,
    ramPercent,
    processorGroupCount: topology.groupCount,
    logicalProcessorCount: topology.logicalCpuCount,
    sampledAt: Date.now(),
  };
}
