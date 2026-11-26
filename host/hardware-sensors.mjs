/**
 * P0001 Desk Console — Zero-Spawn Hardware Temperature, PCIe & Stability Telemetry.
 *
 * Uses in-process `koffi` native Win32 bindings (zero child console/PowerShell spawns):
 * - `nvml.dll` for live NVIDIA GPU telemetry (falls back to `nvidia-smi` only if NVML unavailable)
 * - `wevtapi.dll` for Windows System Event Log stability (`Kernel-Power 41`, `WHEA-Logger 17/18/19`, `Display 4101`)
 * - Optional LibreHardwareMonitor HTTP JSON (`127.0.0.1:8085/data.json`) when user opens LHM manually
 * - CrystalDiskInfo SMART fallback (`C:\Program Files\CrystalDiskInfo\Smart\*\Smart.ini`)
 */
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { dataRoot } from "./store.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const LHM_URL = process.env.DESK_LHM_URL || "http://127.0.0.1:8085/data.json";
const LHM_EXE_CANDIDATES = [
  "C:\\Tools\\LibreHardwareMonitor\\LibreHardwareMonitor.exe",
  "E:\\Dev\\.tools\\LibreHardwareMonitor\\LibreHardwareMonitor.exe",
];
const OCCT_EXE = "C:\\Tools\\OCCT\\OCCT.exe";
const CDI_EXE = "C:\\Program Files\\CrystalDiskInfo\\DiskInfo64.exe";
const CDI_SMART_DIR = "C:\\Program Files\\CrystalDiskInfo\\Smart";
const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEV_SHIP_DIR =
  [
    path.resolve(HOST_DIR, "..", "..", ".ship"),
    process.env.DEV_TOOL_SHIP_DIR || "",
    "E:\\Dev\\Tool\\.ship",
  ].find((d) => d && fs.existsSync(d)) || path.resolve(HOST_DIR, "..", "..", ".ship");
const SENSOR_CSV_PATH = path.join(DEV_SHIP_DIR, "logs", "pc-sensors.csv");
const SENSOR_LOCK_PATH = path.join(DEV_SHIP_DIR, "pc-sensor-logger.lock.json");
const WATCHDOG_STATE_PATH = path.join(DEV_SHIP_DIR, "dev-pc-health-watchdog-state.json");

function resolveLhmExe() {
  return LHM_EXE_CANDIDATES.find((p) => fs.existsSync(p)) || LHM_EXE_CANDIDATES[0];
}

const SENSOR_CACHE_TTL_MS = 5_000;
const STABILITY_CACHE_TTL_MS = 60_000;
const HISTORY_WRITE_INTERVAL_MS = 60_000;
const MAX_HISTORY_POINTS = 720;

let sensorCache = null;
let sensorInflight = null;
let stabilityCache = null;
let lastHistoryWriteMs = 0;

let _nvmlBindings = undefined;
let _nvapiBindings = undefined;
let _nvapiDrsBindings = undefined;
let _wevtBindings = undefined;
let _advapiDiskBindings = undefined;

export function toNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "N/A" || s === "[N/A]") return null;
  const normalized = s.replace(/(\d),(\d)/g, "$1.$2");
  const cleaned = normalized.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function hardwareHistoryPath() {
  return path.join(dataRoot(), "hardware-history.json");
}

function readStoredHardwareHistory() {
  try {
    const raw = JSON.parse(fs.readFileSync(hardwareHistoryPath(), "utf8"));
    return Array.isArray(raw?.rows) ? raw.rows : [];
  } catch {
    return [];
  }
}

export function readPcSensorCsvHistory({ csvPath = SENSOR_CSV_PATH, maxBytes = 131_072, maxPoints = 180 } = {}) {
  try {
    if (!fs.existsSync(csvPath)) return { rows: [], lastSample: null, totalTailRows: 0 };
    const st = fs.statSync(csvPath);
    if (st.size === 0) return { rows: [], lastSample: null, totalTailRows: 0 };
    const readSize = Math.min(st.size, maxBytes);
    const fd = fs.openSync(csvPath, "r");
    const buf = Buffer.alloc(readSize);
    try {
      fs.readSync(fd, buf, 0, readSize, st.size - readSize);
    } finally {
      fs.closeSync(fd);
    }
    const rawLines = buf
      .toString("utf8")
      .replace(/\0/g, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("timestamp,"));
    // If read started mid-line, drop the partial first line when offset > 0.
    if (st.size > readSize && rawLines.length > 1) rawLines.shift();

    const parsed = [];
    for (const line of rawLines) {
      const c = line.split(",");
      if (c.length < 11) continue;
      const ts = c[0]?.trim();
      if (!ts || !Number.isFinite(Date.parse(ts))) continue;
      const numOrNull = (idx) => {
        const s = (c[idx] ?? "").trim();
        if (!s) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };
      const nvmeRaw = numOrNull(11);
      parsed.push({
        ts,
        cpuLoadPct: numOrNull(1),
        gpuTempC: numOrNull(3),
        gpuHotSpotC: numOrNull(4),
        gpuPowerW: numOrNull(5),
        pcieWidth: numOrNull(10),
        ssdTempC: nvmeRaw != null && nvmeRaw > 0 ? nvmeRaw : null,
        cpuTempC: numOrNull(12),
        v12: numOrNull(14),
        v33: numOrNull(16),
        topProc: (c[17] ?? "").trim() || null,
      });
    }
    if (parsed.length === 0) return { rows: [], lastSample: null, totalTailRows: 0 };
    const lastSample = parsed[parsed.length - 1];
    if (parsed.length <= maxPoints) {
      return { rows: parsed, lastSample, totalTailRows: parsed.length };
    }
    const step = parsed.length / maxPoints;
    const sampled = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(parsed[Math.min(parsed.length - 1, Math.floor(i * step))]);
    }
    if (sampled[sampled.length - 1]?.ts !== lastSample.ts) sampled.push(lastSample);
    return { rows: sampled, lastSample, totalTailRows: parsed.length };
  } catch {
    return { rows: [], lastSample: null, totalTailRows: 0 };
  }
}

export function readPcSensorLoggerStatus({ lockPath = SENSOR_LOCK_PATH, csvPath = SENSOR_CSV_PATH } = {}) {
  let running = false;
  let pid = null;
  try {
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      const p = Number(lock?.pid || 0);
      if (Number.isInteger(p) && p > 0) {
        try {
          process.kill(p, 0);
          running = true;
          pid = p;
        } catch (err) {
          if (err?.code === "EPERM") {
            running = true;
            pid = p;
          }
        }
      }
    }
  } catch {
    /* ignore lock parse */
  }
  const { rows: recentRows, lastSample, totalTailRows } = readPcSensorCsvHistory({ csvPath, maxBytes: 32_768, maxPoints: 150 });
  const v33Vals = recentRows.map((r) => r.v33).filter((n) => n != null && Number.isFinite(n) && n > 0);
  const v33MinRecent = v33Vals.length > 0 ? Math.min(...v33Vals) : null;
  const v33BelowCount = v33Vals.filter((n) => n < 3.135).length;
  return {
    running,
    pid,
    csvRows: totalTailRows,
    lastSampleAt: lastSample?.ts ?? null,
    cpuLoadPct: lastSample?.cpuLoadPct ?? null,
    v12: lastSample?.v12 ?? null,
    v33: lastSample?.v33 ?? null,
    v33MinRecent,
    v33BelowCount,
    topProc: lastSample?.topProc ?? null,
  };
}

export function readHardwareHistory() {
  const stored = readStoredHardwareHistory();
  const { rows: csvRows } = readPcSensorCsvHistory();
  if (csvRows.length === 0) return stored;
  const lastStoredMs = stored.length > 0 ? Date.parse(stored[stored.length - 1]?.ts || "") : 0;
  const freshCsv = Number.isFinite(lastStoredMs) && lastStoredMs > 0
    ? csvRows.filter((r) => Date.parse(r.ts) >= lastStoredMs - 120_000)
    : csvRows;
  const byMinute = new Map();
  for (const r of [...stored, ...freshCsv]) {
    const ms = Date.parse(r?.ts || "");
    if (!Number.isFinite(ms)) continue;
    const key = Math.floor(ms / 20_000);
    byMinute.set(key, r);
  }
  return [...byMinute.values()]
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
    .slice(-MAX_HISTORY_POINTS);
}

function persistHardwarePoint(snapshot) {
  const nowMs = Date.now();
  if (nowMs - lastHistoryWriteMs < HISTORY_WRITE_INTERVAL_MS) return;
  lastHistoryWriteMs = nowMs;
  try {
    const rows = readStoredHardwareHistory();
    const primaryDisk = snapshot.storage?.[0] || null;
    rows.push({
      ts: snapshot.sampledAt,
      gpuTempC: snapshot.gpu?.tempC ?? null,
      gpuHotSpotC: snapshot.gpu?.hotSpotC ?? null,
      gpuPowerW: snapshot.gpu?.powerDrawW ?? null,
      cpuTempC: snapshot.cpu?.packageTempC ?? snapshot.cpu?.coreMaxTempC ?? null,
      ssdTempC: primaryDisk?.tempC ?? null,
      pcieWidth: snapshot.gpu?.pcieLinkWidth ?? null,
    });
    const trimmed = rows.slice(-MAX_HISTORY_POINTS);
    fs.mkdirSync(dataRoot(), { recursive: true });
    fs.writeFileSync(
      hardwareHistoryPath(),
      JSON.stringify({ updatedAt: snapshot.sampledAt, rows: trimmed }, null, 2),
      "utf8",
    );
  } catch {
    /* ignore history write failure */
  }
}

function getNvmlBindings() {
  if (_nvmlBindings !== undefined) return _nvmlBindings;
  if (process.platform !== "win32") {
    _nvmlBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const nvmlPath = fs.existsSync("C:\\Windows\\System32\\nvml.dll")
      ? "C:\\Windows\\System32\\nvml.dll"
      : "nvml.dll";
    const nvml = koffi.load(nvmlPath);
    const nvmlInit = nvml.func("int nvmlInit_v2()");
    if (nvmlInit() !== 0) {
      _nvmlBindings = null;
      return null;
    }
    const UtilStruct = koffi.struct("P0001_NvmlUtil", { gpu: "uint32_t", memory: "uint32_t" });
    const MemStruct = koffi.struct("P0001_NvmlMem", { total: "uint64_t", free: "uint64_t", used: "uint64_t" });
    const b = {
      nvmlGetHandle: nvml.func("int nvmlDeviceGetHandleByIndex_v2(uint32_t index, _Out_ void** device)"),
      nvmlGetName: nvml.func("int nvmlDeviceGetName(void* device, _Out_ uint8_t* name, uint32_t length)"),
      nvmlGetTemp: nvml.func("int nvmlDeviceGetTemperature(void* device, int sensorType, _Out_ uint32_t* temp)"),
      nvmlGetFan: nvml.func("int nvmlDeviceGetFanSpeed(void* device, _Out_ uint32_t* speed)"),
      nvmlGetPower: nvml.func("int nvmlDeviceGetPowerUsage(void* device, _Out_ uint32_t* power)"),
      nvmlGetLimit: nvml.func("int nvmlDeviceGetPowerManagementLimit(void* device, _Out_ uint32_t* limit)"),
      nvmlGetPcieGen: nvml.func("int nvmlDeviceGetCurrPcieLinkGeneration(void* device, _Out_ uint32_t* gen)"),
      nvmlGetMaxPcieGen: nvml.func("int nvmlDeviceGetMaxPcieLinkGeneration(void* device, _Out_ uint32_t* gen)"),
      nvmlGetPcieWidth: nvml.func("int nvmlDeviceGetCurrPcieLinkWidth(void* device, _Out_ uint32_t* width)"),
      nvmlGetMaxPcieWidth: nvml.func("int nvmlDeviceGetMaxPcieLinkWidth(void* device, _Out_ uint32_t* width)"),
      nvmlGetClock: nvml.func("int nvmlDeviceGetClockInfo(void* device, int type, _Out_ uint32_t* clock)"),
      nvmlGetPState: nvml.func("int nvmlDeviceGetPerformanceState(void* device, _Out_ int* pState)"),
      nvmlGetUtil: nvml.func("int nvmlDeviceGetUtilizationRates(void* device, _Out_ P0001_NvmlUtil* util)"),
      nvmlGetMem: nvml.func("int nvmlDeviceGetMemoryInfo(void* device, _Out_ P0001_NvmlMem* mem)"),
      nvmlGetReasons: null,
    };
    try {
      b.nvmlGetReasons = nvml.func("int nvmlDeviceGetCurrentClocksEventReasons(void* device, _Out_ uint64_t* reasons)");
    } catch {
      try {
        b.nvmlGetReasons = nvml.func("int nvmlDeviceGetCurrentClocksThrottleReasons(void* device, _Out_ uint64_t* reasons)");
      } catch {
        b.nvmlGetReasons = null;
      }
    }
    _nvmlBindings = b;
  } catch {
    _nvmlBindings = null;
  }
  return _nvmlBindings;
}

/** Read GPU status directly in-process via `nvml.dll` (zero child process spawn). */
function readGpuInProcessNvml() {
  const b = getNvmlBindings();
  if (!b) return null;
  try {
    const devOut = [null];
    if (b.nvmlGetHandle(0, devOut) !== 0 || !devOut[0]) return null;
    const dev = devOut[0];
    const nameBuf = Buffer.alloc(96);
    const nameRc = b.nvmlGetName(dev, nameBuf, 96);
    const name = nameRc === 0 ? nameBuf.toString("utf8").replace(/\0.*$/, "") : "NVIDIA GPU";

    const temp = [0], fan = [0], pwr = [0], lim = [0];
    const gen = [0], maxGen = [0], width = [0], maxWidth = [0];
    const gClk = [0], mClk = [0], pstate = [0];
    const util = {};
    const mem = {};
    const reasons = [0n];

    const okTemp = b.nvmlGetTemp(dev, 0, temp) === 0;
    const okFan = b.nvmlGetFan(dev, fan) === 0;
    const okPwr = b.nvmlGetPower(dev, pwr) === 0;
    const okLim = b.nvmlGetLimit(dev, lim) === 0;
    const okGen = b.nvmlGetPcieGen(dev, gen) === 0;
    const okMaxGen = b.nvmlGetMaxPcieGen(dev, maxGen) === 0;
    const okWidth = b.nvmlGetPcieWidth(dev, width) === 0;
    const okMaxWidth = b.nvmlGetMaxPcieWidth(dev, maxWidth) === 0;
    const okGClk = b.nvmlGetClock(dev, 0, gClk) === 0;
    const okMClk = b.nvmlGetClock(dev, 2, mClk) === 0;
    const okPState = b.nvmlGetPState(dev, pstate) === 0;
    const okUtil = b.nvmlGetUtil(dev, util) === 0;
    const okMem = b.nvmlGetMem(dev, mem) === 0;
    const okReasons = b.nvmlGetReasons ? b.nvmlGetReasons(dev, reasons) === 0 : false;

    return {
      name,
      tempC: okTemp ? temp[0] : null,
      fanPercent: okFan ? fan[0] : null,
      powerDrawW: okPwr ? Math.round((pwr[0] / 1000) * 100) / 100 : null,
      powerLimitW: okLim ? Math.round((lim[0] / 1000) * 100) / 100 : null,
      utilPercent: okUtil ? util.gpu : null,
      memUtilPercent: okUtil ? util.memory : null,
      vramUsedMB: okMem ? Math.round(Number(mem.used) / 1048576) : null,
      vramTotalMB: okMem ? Math.round(Number(mem.total) / 1048576) : null,
      graphicsClockMHz: okGClk ? gClk[0] : null,
      memoryClockMHz: okMClk ? mClk[0] : null,
      pstate: okPState ? `P${pstate[0]}` : null,
      pcieGen: okGen ? gen[0] : null,
      pcieGenMax: okMaxGen ? maxGen[0] : null,
      pcieLinkWidth: okWidth ? width[0] : null,
      pcieLinkWidthMax: okMaxWidth ? maxWidth[0] : null,
      throttleFlags: okReasons ? `0x${BigInt(reasons[0]).toString(16).padStart(16, "0")}` : "0x0",
    };
  } catch {
    return null;
  }
}

/** Fallback CLI query only if NVML DLL could not load. */
async function readNvidiaSmiFallback() {
  if (process.platform !== "win32") return null;
  try {
    const query = [
      "name",
      "temperature.gpu",
      "fan.speed",
      "power.draw",
      "power.limit",
      "utilization.gpu",
      "utilization.memory",
      "memory.used",
      "memory.total",
      "clocks.current.graphics",
      "clocks.current.memory",
      "pstate",
      "pcie.link.gen.current",
      "pcie.link.gen.max",
      "pcie.link.width.current",
      "pcie.link.width.max",
      "clocks_event_reasons.active",
    ].join(",");
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      [`--query-gpu=${query}`, "--format=csv,noheader,nounits"],
      { windowsHide: true, timeout: 4000, maxBuffer: 256 * 1024 },
    );
    const firstLine = String(stdout || "").trim().split(/\r?\n/)[0];
    if (!firstLine) return null;
    const cols = firstLine.split(",").map((c) => c.trim());
    if (cols.length < 16) return null;
    return {
      name: cols[0],
      tempC: toNum(cols[1]),
      fanPercent: toNum(cols[2]),
      powerDrawW: toNum(cols[3]),
      powerLimitW: toNum(cols[4]),
      utilPercent: toNum(cols[5]),
      memUtilPercent: toNum(cols[6]),
      vramUsedMB: toNum(cols[7]),
      vramTotalMB: toNum(cols[8]),
      graphicsClockMHz: toNum(cols[9]),
      memoryClockMHz: toNum(cols[10]),
      pstate: cols[11] || null,
      pcieGen: toNum(cols[12]),
      pcieGenMax: toNum(cols[13]),
      pcieLinkWidth: toNum(cols[14]),
      pcieLinkWidthMax: toNum(cols[15]),
      throttleFlags: cols[16] || "0x0",
    };
  } catch {
    return null;
  }
}

async function readGpuSensors() {
  const gpu = readGpuInProcessNvml() || (await readNvidiaSmiFallback());
  if (!gpu) return null;
  const hotSpotC = readGpuHotSpotInProcessNvapi();
  return hotSpotC !== null ? { ...gpu, hotSpotC } : gpu;
}

function getNvapiBindings() {
  if (_nvapiBindings !== undefined) return _nvapiBindings;
  if (process.platform !== "win32") {
    _nvapiBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const nvapiPath = fs.existsSync("C:\\Windows\\System32\\nvapi64.dll")
      ? "C:\\Windows\\System32\\nvapi64.dll"
      : "nvapi64.dll";
    const nvapi = koffi.load(nvapiPath);
    const qi = nvapi.func("void* __cdecl nvapi_QueryInterface(uint32_t id)");
    const initPtr = qi(0x0150E828);
    const enumPtr = qi(0xE5AC921F);
    const thermPtr = qi(0x65FE3AAD);
    if (!initPtr || !enumPtr || !thermPtr) {
      _nvapiBindings = null;
      return null;
    }
    const initFn = koffi.decode(initPtr, koffi.proto("int __cdecl P0001_NvApiInit()"));
    if (initFn() !== 0) {
      _nvapiBindings = null;
      return null;
    }
    _nvapiBindings = {
      enumFn: koffi.decode(enumPtr, koffi.proto("int __cdecl P0001_NvApiEnum(_Out_ void** handles, _Out_ uint32_t* count)")),
      thermFn: koffi.decode(thermPtr, koffi.proto("int __cdecl P0001_NvApiTherm(void* handle, _Inout_ uint8_t* info)")),
    };
  } catch {
    _nvapiBindings = null;
  }
  return _nvapiBindings;
}

/** Read GPU Hot Spot temperature directly in-process via `nvapi64.dll` (zero LHM needed). */
function readGpuHotSpotInProcessNvapi() {
  const b = getNvapiBindings();
  if (!b) return null;
  try {
    const handles = new Array(64).fill(null);
    const count = [0];
    if (b.enumFn(handles, count) !== 0 || count[0] < 1 || !handles[0]) return null;
    const buf = Buffer.alloc(168);
    buf.writeUInt32LE(0x000200a8 >>> 0, 0);
    buf.writeUInt32LE(3, 4); // bit 0 = Core, bit 1 = Hot Spot
    if (b.thermFn(handles[0], buf) !== 0) return null;
    const hotSpot = buf.readInt32LE(44) / 256;
    return Number.isFinite(hotSpot) && hotSpot > 10 && hotSpot < 135
      ? Math.round(hotSpot * 10) / 10
      : null;
  } catch {
    return null;
  }
}

export const NVDRS_SETTING_SIZE = 12320;
export const NVDRS_SETTING_VER1 = 0x00013020;
export const NVDRS_PREFERRED_PSTATE_SETTING_ID = 0x1057eb71;
export const NVDRS_POWER_MODE_NORMAL = 5;

const NVDRS_POWER_MODE_LABELS = {
  0: "Adaptive",
  1: "Prefer Max Perf",
  5: "Normal",
};

/** Build a 12320-byte `NVDRS_SETTING_V1` DWORD buffer cleanly without C++ headers. */
export function buildNvdrsDwordSettingBuffer(settingId, value) {
  const buf = Buffer.alloc(NVDRS_SETTING_SIZE);
  buf.writeUInt32LE(NVDRS_SETTING_VER1 >>> 0, 0);
  buf.writeUInt32LE(settingId >>> 0, 4100);
  buf.writeUInt32LE(0, 4104); // NVDRS_DWORD_TYPE
  buf.writeUInt32LE(value >>> 0, 8220);
  return buf;
}

/** Decode a 12320-byte `NVDRS_SETTING_V1` buffer into structured fields. */
export function parseNvdrsSettingBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < NVDRS_SETTING_SIZE) return null;
  const rawName = buf.subarray(4, 4100).toString("utf16le");
  const nulIdx = rawName.indexOf("\0");
  return {
    version: buf.readUInt32LE(0),
    settingName: nulIdx >= 0 ? rawName.slice(0, nulIdx) : rawName,
    settingId: buf.readUInt32LE(4100),
    settingType: buf.readUInt32LE(4104),
    settingLocation: buf.readUInt32LE(4108),
    isCurrentPredefined: buf.readUInt32LE(4112) !== 0,
    isPredefinedValid: buf.readUInt32LE(4116) !== 0,
    predefinedValue: buf.readUInt32LE(4120),
    currentValue: buf.readUInt32LE(8220),
  };
}

function getNvapiDrsBindings() {
  if (_nvapiDrsBindings !== undefined) return _nvapiDrsBindings;
  if (process.platform !== "win32") {
    _nvapiDrsBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const nvapiPath = fs.existsSync("C:\\Windows\\System32\\nvapi64.dll")
      ? "C:\\Windows\\System32\\nvapi64.dll"
      : "nvapi64.dll";
    const nvapi = koffi.load(nvapiPath);
    const qi = nvapi.func("void* __cdecl nvapi_QueryInterface(uint32_t id)");
    const pInit = qi(0x0150e828);
    const pCreate = qi(0x0694d52e);
    const pLoad = qi(0x375dbd6b);
    const pGlobal = qi(0x617bff9f);
    const pGet = qi(0x73bf8338);
    const pSet = qi(0x577dd202);
    const pSave = qi(0xfcbc7e14);
    const pDestroy = qi(0xdad9cff8);
    if (!pInit || !pCreate || !pLoad || !pGlobal || !pGet || !pSet || !pSave || !pDestroy) {
      _nvapiDrsBindings = null;
      return null;
    }
    const initFn = koffi.decode(pInit, koffi.proto("int __cdecl P0001_NvDrsInit()"));
    if (initFn() !== 0) {
      _nvapiDrsBindings = null;
      return null;
    }
    _nvapiDrsBindings = {
      createSession: koffi.decode(pCreate, koffi.proto("int __cdecl P0001_NvDrsCreate(_Out_ void** ph)")),
      loadSettings: koffi.decode(pLoad, koffi.proto("int __cdecl P0001_NvDrsLoad(void* h)")),
      getCurrentGlobalProfile: koffi.decode(
        pGlobal,
        koffi.proto("int __cdecl P0001_NvDrsGlobal(void* h, _Out_ void** hp)"),
      ),
      getSetting: koffi.decode(
        pGet,
        koffi.proto("int __cdecl P0001_NvDrsGet(void* h, void* hp, uint32_t id, _Inout_ uint8_t* st)"),
      ),
      setSetting: koffi.decode(
        pSet,
        koffi.proto("int __cdecl P0001_NvDrsSet(void* h, void* hp, uint8_t* st)"),
      ),
      saveSettings: koffi.decode(pSave, koffi.proto("int __cdecl P0001_NvDrsSave(void* h)")),
      destroySession: koffi.decode(pDestroy, koffi.proto("int __cdecl P0001_NvDrsDestroy(void* h)")),
    };
  } catch {
    _nvapiDrsBindings = null;
  }
  return _nvapiDrsBindings;
}

function runWithNvidiaDrsGlobalSession(callback) {
  const b = getNvapiDrsBindings();
  if (!b) return null;
  const hs = [null];
  if (b.createSession(hs) !== 0 || !hs[0]) return null;
  try {
    if (b.loadSettings(hs[0]) !== 0) return null;
    const hp = [null];
    if (b.getCurrentGlobalProfile(hs[0], hp) !== 0 || !hp[0]) return null;
    return callback({ b, hSession: hs[0], hProfile: hp[0] });
  } finally {
    try {
      b.destroySession(hs[0]);
    } catch {
      /* ignore session destroy error */
    }
  }
}

/** Read NVIDIA Control Panel Global DRS Power Management Mode in-process (`nvapi64.dll`). */
export function readNvidiaDrsPowerModeInProcess() {
  const out = runWithNvidiaDrsGlobalSession(({ b, hSession, hProfile }) => {
    const buf = Buffer.alloc(NVDRS_SETTING_SIZE);
    buf.writeUInt32LE(NVDRS_SETTING_VER1 >>> 0, 0);
    const rc = b.getSetting(hSession, hProfile, NVDRS_PREFERRED_PSTATE_SETTING_ID, buf);
    if (rc === -160) {
      return {
        supported: true,
        settingId: NVDRS_PREFERRED_PSTATE_SETTING_ID,
        currentValue: null,
        isCurrentPredefined: true,
        label: "Driver Default (Normal)",
      };
    }
    if (rc !== 0) return null;
    const parsed = parseNvdrsSettingBuffer(buf);
    if (!parsed) return null;
    return {
      supported: true,
      settingId: NVDRS_PREFERRED_PSTATE_SETTING_ID,
      currentValue: parsed.currentValue,
      isCurrentPredefined: parsed.isCurrentPredefined,
      label: NVDRS_POWER_MODE_LABELS[parsed.currentValue] || `Mode (${parsed.currentValue})`,
    };
  });
  return out || { supported: false, settingId: NVDRS_PREFERRED_PSTATE_SETTING_ID, currentValue: null, isCurrentPredefined: true, label: null };
}

/**
 * Idempotently ensure NVIDIA Control Panel Global DRS `Power management mode`
 * is explicitly locked to `Normal` (`5`) so driver upgrades never pin idle GPUs at P0.
 */
export function ensureNvidiaDrsNormalPowerMode({ applyIfNeeded = true } = {}) {
  const res = runWithNvidiaDrsGlobalSession(({ b, hSession, hProfile }) => {
    const buf = Buffer.alloc(NVDRS_SETTING_SIZE);
    buf.writeUInt32LE(NVDRS_SETTING_VER1 >>> 0, 0);
    const rc = b.getSetting(hSession, hProfile, NVDRS_PREFERRED_PSTATE_SETTING_ID, buf);
    const parsed = rc === 0 ? parseNvdrsSettingBuffer(buf) : null;
    if (parsed && !parsed.isCurrentPredefined && parsed.currentValue === NVDRS_POWER_MODE_NORMAL) {
      return {
        ok: true,
        supported: true,
        changed: false,
        powerMode: NVDRS_POWER_MODE_NORMAL,
        label: "Normal",
      };
    }
    if (!applyIfNeeded) {
      return {
        ok: false,
        supported: true,
        changed: false,
        powerMode: parsed?.currentValue ?? null,
        label: parsed ? (NVDRS_POWER_MODE_LABELS[parsed.currentValue] || `Mode (${parsed.currentValue})`) : "Driver Default",
      };
    }
    const payload = buildNvdrsDwordSettingBuffer(NVDRS_PREFERRED_PSTATE_SETTING_ID, NVDRS_POWER_MODE_NORMAL);
    const setRc = b.setSetting(hSession, hProfile, payload);
    const saveRc = setRc === 0 ? b.saveSettings(hSession) : -999;
    return {
      ok: setRc === 0 && saveRc === 0,
      supported: true,
      changed: setRc === 0 && saveRc === 0,
      powerMode: NVDRS_POWER_MODE_NORMAL,
      label: "Normal",
      setRc,
      saveRc,
    };
  });
  return res || { ok: false, supported: false, changed: false, powerMode: null, label: null };
}

/** Parse LibreHardwareMonitor tree JSON (`http://127.0.0.1:8085/data.json`). */
function parseLhmTree(root) {
  const cpuNodes = [];
  const storageNodes = [];
  const motherboardNodes = [];
  let gpuHotSpotC = null;
  let gpuFanRpm = null;

  function collectLeaves(node, acc = []) {
    if (!node || typeof node !== "object") return acc;
    if (node.SensorId) acc.push(node);
    if (Array.isArray(node.Children)) {
      for (const ch of node.Children) collectLeaves(ch, acc);
    }
    return acc;
  }

  function walkHardware(node) {
    if (!node || typeof node !== "object") return;
    const img = String(node.ImageURL || "").toLowerCase();
    const text = String(node.Text || "");
    const leaves = collectLeaves(node);

    if (img.includes("cpu.png") && !node.SensorId) {
      const temps = leaves.filter((s) => s.Type === "Temperature");
      const powers = leaves.filter((s) => s.Type === "Power");
      const loads = leaves.filter((s) => s.Type === "Load");
      const pkgTemp = temps.find((s) => /package/i.test(s.Text));
      const coreMax = temps.find((s) => /core max/i.test(s.Text));
      const coreAvg = temps.find((s) => /core average/i.test(s.Text));
      const pkgPower = powers.find((s) => /package/i.test(s.Text));
      const totalLoad = loads.find((s) => /cpu total/i.test(s.Text));
      cpuNodes.push({
        name: text,
        packageTempC: toNum(pkgTemp?.Value),
        coreMaxTempC: toNum(coreMax?.Value),
        coreAvgTempC: toNum(coreAvg?.Value),
        packagePowerW: toNum(pkgPower?.Value),
        loadPercent: toNum(totalLoad?.Value),
      });
      return;
    }

    if (img.includes("hdd.png") && !node.SensorId) {
      const temps = leaves.filter((s) => s.Type === "Temperature");
      const life = leaves.find((s) => s.Type === "Level" && /remaining life/i.test(s.Text));
      const primaryTemp = temps[0];
      storageNodes.push({
        name: text,
        tempC: toNum(primaryTemp?.Value),
        lifePercent: toNum(life?.Value),
        source: "lhm",
      });
      return;
    }

    if ((img.includes("nvidia") || img.includes("ati") || img.includes("intel")) && !node.SensorId) {
      const hs = leaves.find((s) => s.Type === "Temperature" && /hot spot/i.test(s.Text));
      const fan = leaves.find((s) => s.Type === "Fan");
      if (hs) gpuHotSpotC = toNum(hs.Value);
      if (fan) gpuFanRpm = toNum(fan.Value);
    }

    if (img.includes("mainboard.png") && !node.SensorId) {
      const temps = leaves
        .filter((s) => s.Type === "Temperature")
        .map((s) => ({ name: s.Text, valueC: toNum(s.Value) }))
        .filter((s) => s.valueC !== null);
      const fans = leaves
        .filter((s) => s.Type === "Fan")
        .map((s) => ({ name: s.Text, rpm: toNum(s.Value) }))
        .filter((s) => s.rpm !== null);
      const v12 = leaves.find((s) => s.Type === "Voltage" && /\+12v/i.test(s.Text));
      const v33 = leaves.find((s) => s.Type === "Voltage" && /\+3\.3v/i.test(s.Text));
      const avcc = leaves.find((s) => s.Type === "Voltage" && /\bavcc\b/i.test(s.Text));
      if (temps.length > 0 || fans.length > 0 || v12 || v33 || avcc) {
        motherboardNodes.push({
          name: text,
          temps: temps.slice(0, 4),
          fans: fans.slice(0, 4),
          voltage12V: toNum(v12?.Value),
          voltage33V: toNum(v33?.Value),
          voltageAvccV: toNum(avcc?.Value),
        });
      }
    }

    if (Array.isArray(node.Children)) {
      for (const ch of node.Children) walkHardware(ch);
    }
  }

  walkHardware(root);
  return { cpuNodes, storageNodes, motherboardNodes, gpuHotSpotC, gpuFanRpm };
}

async function readLibreHardwareMonitor() {
  try {
    const res = await fetch(LHM_URL, { signal: AbortSignal.timeout(400) });
    if (!res.ok) return { reachable: false };
    const json = await res.json();
    const parsed = parseLhmTree(json);
    return { reachable: true, ...parsed };
  } catch {
    return { reachable: false };
  }
}

function parseIniSection(text, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?:\\n\\[|$)`, "i");
  const m = text.match(re);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([^=]+?)\s*=\s*"?([^"]*)"?\s*$/);
    if (kv) out[kv[1].trim()] = kv[2].trim();
  }
  return out;
}

function getAdvapiRegistryBindings() {
  if (_advapiDiskBindings !== undefined) return _advapiDiskBindings;
  if (process.platform !== "win32") {
    _advapiDiskBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const adv = koffi.load("advapi32.dll");
    _advapiDiskBindings = {
      RegOpenKeyExW: adv.func(
        "uint32_t __stdcall RegOpenKeyExW(uintptr_t hKey, str16 subKey, uint32_t opts, uint32_t sam, _Out_ uintptr_t* phKey)",
      ),
      RegQueryValueExW: adv.func(
        "uint32_t __stdcall RegQueryValueExW(uintptr_t hKey, str16 valName, void* res, _Out_ uint32_t* type, _Out_ uint8_t* data, _Inout_ uint32_t* size)",
      ),
      RegCloseKey: adv.func("uint32_t __stdcall RegCloseKey(uintptr_t hKey)"),
    };
  } catch {
    _advapiDiskBindings = null;
  }
  return _advapiDiskBindings;
}

function readHklmValueInProcess(subKey, valueName, kind = "sz") {
  const b = getAdvapiRegistryBindings();
  if (!b) return null;
  const hKey = [0n];
  if (b.RegOpenKeyExW(0x80000002n, subKey, 0, 0x20019, hKey) !== 0) return null;
  try {
    if (kind === "dword") {
      const buf = Buffer.alloc(4);
      const sz = [4];
      const tp = [0];
      if (b.RegQueryValueExW(hKey[0], valueName, null, tp, buf, sz) !== 0) return null;
      return tp[0] === 4 ? buf.readUInt32LE(0) : null;
    }
    const sBuf = Buffer.alloc(1024);
    const sSz = [1024];
    const sTp = [0];
    if (b.RegQueryValueExW(hKey[0], valueName, null, sTp, sBuf, sSz) !== 0) return null;
    return sBuf.subarray(0, sSz[0]).toString("utf16le").replace(/\0+$/, "");
  } catch {
    return null;
  } finally {
    b.RegCloseKey(hKey[0]);
  }
}

const POWER_SCHEME_NAMES = {
  "e9a42b02-d5df-448d-aa00-03f14749eb61": "Ultimate Performance",
  "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c": "High performance",
  "381b4222-f694-41f0-9685-ff5bb260df2e": "Balanced",
  "a1841308-3541-4fab-bc81-f71556f20b4a": "Power saver",
};

/** Read active Windows Power Plan, NVIDIA PowerMizer, and Realtek *EEE state in-process (zero spawns). */
export function readSystemTuningStateInProcess() {
  if (process.platform !== "win32") return null;
  const schemeGuidRaw = readHklmValueInProcess(
    "SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes",
    "ActivePowerScheme",
    "sz",
  );
  const powerPlanGuid = schemeGuidRaw ? schemeGuidRaw.toLowerCase() : null;
  const powerPlanName = powerPlanGuid
    ? POWER_SCHEME_NAMES[powerPlanGuid] ||
      readHklmValueInProcess(
        `SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes\\${powerPlanGuid}`,
        "FriendlyName",
        "sz",
      ) ||
      powerPlanGuid
    : null;
  const cpuMinPct = powerPlanGuid
    ? readHklmValueInProcess(
        `SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes\\${powerPlanGuid}\\54533251-82be-4824-96c1-47b60b740d00\\893dee8e-2bef-41e0-89c6-b55d0929964c`,
        "ACSettingIndex",
        "dword",
      )
    : null;
  const cpuMaxPct = powerPlanGuid
    ? readHklmValueInProcess(
        `SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes\\${powerPlanGuid}\\54533251-82be-4824-96c1-47b60b740d00\\bc5038f7-23e0-4960-96da-33abaf5935ec`,
        "ACSettingIndex",
        "dword",
      )
    : null;
  const gpuPowerMizerLevel = readHklmValueInProcess(
    "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000",
    "PowerMizerLevel",
    "dword",
  );
  const gpuPowerMizerMode =
    gpuPowerMizerLevel === 0 ? "Prefer Max Perf" : gpuPowerMizerLevel != null ? "Normal / Adaptive" : null;

  let nicEeeEnabled = null;
  for (const idx of ["0009", "0010", "0000", "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008"]) {
    const netKey = `SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\${idx}`;
    const desc = readHklmValueInProcess(netKey, "DriverDesc", "sz");
    if (!desc || !/realtek/i.test(desc)) continue;
    const eee = readHklmValueInProcess(netKey, "*EEE", "sz");
    if (eee !== null) {
      nicEeeEnabled = String(eee).trim() === "1";
      break;
    }
  }

  const drs = readNvidiaDrsPowerModeInProcess();

  return {
    powerPlanGuid,
    powerPlanName,
    cpuMinPct,
    cpuMaxPct,
    gpuPowerMizerLevel,
    gpuPowerMizerMode,
    gpuDrsPowerMode: drs.currentValue,
    gpuDrsPowerModeLabel: drs.label,
    nicEeeEnabled,
  };
}

function readAttachedDiskTokensInProcess() {
  const b = getAdvapiRegistryBindings();
  if (!b) return null;
  const count = readHklmValueInProcess("SYSTEM\\CurrentControlSet\\Services\\disk\\Enum", "Count", "dword");
  if (count === null) return null;
  const tokens = [];
  for (let i = 0; i < count && i < 64; i++) {
    const pnpId = readHklmValueInProcess("SYSTEM\\CurrentControlSet\\Services\\disk\\Enum", String(i), "sz");
    if (!pnpId) continue;
    const prodMatch = pnpId.match(/Prod_([^&\\]+)/i);
    const rawTok = prodMatch ? prodMatch[1] : pnpId;
    const norm = rawTok.replace(/[^a-z0-9]+/gi, "").toLowerCase();
    if (norm.length >= 4) tokens.push(norm);
  }
  return tokens;
}

/** Read CrystalDiskInfo SMART logs as non-admin SSD fallback (filtered to currently attached disks). */
function readCrystalDiskInfoFallback() {
  try {
    if (!fs.existsSync(CDI_SMART_DIR)) return [];
    const attachedTokens = readAttachedDiskTokensInProcess();
    const dirs = fs.readdirSync(CDI_SMART_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
    const results = [];
    for (const dir of dirs) {
      if (Array.isArray(attachedTokens) && attachedTokens.length > 0) {
        const normDir = dir.name.replace(/[^a-z0-9]+/gi, "").toLowerCase();
        if (!attachedTokens.some((tok) => normDir.includes(tok))) continue;
      }
      const iniPath = path.join(CDI_SMART_DIR, dir.name, "Smart.ini");
      if (!fs.existsSync(iniPath)) continue;
      const content = fs.readFileSync(iniPath, "utf8");
      const sect = parseIniSection(content, dir.name);
      if (!sect.Date) continue;
      results.push({
        name: dir.name.replace(/[A-Z0-9]{12,}$/, "").trim() || dir.name,
        tempC: toNum(sect.Temperature),
        lifePercent: toNum(sect.Life),
        powerOnHours: toNum(sect.PowerOnHours),
        healthOk: sect.HealthStatus === "1",
        recordedAt: sect.Date,
        source: "crystaldiskinfo",
      });
    }
    results.sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
    return results;
  } catch {
    return [];
  }
}

function getWevtBindings() {
  if (_wevtBindings !== undefined) return _wevtBindings;
  if (process.platform !== "win32") {
    _wevtBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const wevt = koffi.load("wevtapi.dll");
    _wevtBindings = {
      EvtQuery: wevt.func("void* __stdcall EvtQuery(void* Session, str16 Path, str16 Query, uint32_t Flags)"),
      EvtNext: wevt.func("int __stdcall EvtNext(void* ResultSet, uint32_t EventsSize, _Out_ void** Events, uint32_t Timeout, uint32_t Flags, _Out_ uint32_t* Returned)"),
      EvtRender: wevt.func("int __stdcall EvtRender(void* Context, void* Fragment, uint32_t Flags, uint32_t BufferSize, _Out_ uint8_t* Buffer, _Out_ uint32_t* BufferUsed, _Out_ uint32_t* PropertyCount)"),
      EvtClose: wevt.func("int __stdcall EvtClose(void* Object)"),
    };
  } catch {
    _wevtBindings = null;
  }
  return _wevtBindings;
}

function formatStabilityEventMessage(provider, id, xml) {
  if (provider === "Microsoft-Windows-Kernel-Power" && id === 41) {
    return "The system has rebooted without cleanly shutting down first.";
  }
  if (provider === "Display" && id === 4101) {
    return "Display driver nvlddmkm stopped responding and has successfully recovered.";
  }
  if (provider === "Microsoft-Windows-WHEA-Logger") {
    const devMatch = xml.match(/<Data Name='PrimaryDeviceName'>([^<]+)<\/Data>/i);
    return devMatch
      ? `PCI Express corrected hardware error (${devMatch[1]})`
      : "A corrected PCI Express hardware error occurred.";
  }
  return `${provider} Event #${id}`;
}

/** Read Windows System Event Log stability indicators in-process via `wevtapi.dll` (zero PowerShell spawns). */
function readSystemStabilityEvents() {
  const empty = { unexpectedShutdowns7d: 0, wheaErrors7d: 0, displayTdrs7d: 0, recentEvents: [] };
  if (process.platform !== "win32") return empty;
  if (stabilityCache && Date.now() - stabilityCache.at < STABILITY_CACHE_TTL_MS) {
    return stabilityCache.data;
  }

  const w = getWevtBindings();
  if (!w) {
    stabilityCache = { at: Date.now(), data: empty };
    return empty;
  }

  const xpath =
    "*[System[((Provider[@Name='Microsoft-Windows-Kernel-Power'] and EventID=41) or (Provider[@Name='Microsoft-Windows-WHEA-Logger'] and (EventID=17 or EventID=18 or EventID=19)) or (Provider[@Name='Display'] and EventID=4101)) and TimeCreated[timediff(@SystemTime) <= 604800000]]]";
  let qh = null;
  try {
    // EvtQueryChannelPath (0x1) | EvtQueryReverseDirection (0x200)
    qh = w.EvtQuery(null, "System", xpath, 0x201);
    if (!qh) {
      stabilityCache = { at: Date.now(), data: empty };
      return empty;
    }
    let unexpectedShutdowns7d = 0;
    let wheaErrors7d = 0;
    let displayTdrs7d = 0;
    const recentEvents = [];
    const handles = new Array(30).fill(null);
    const ret = [0];
    const buf = Buffer.alloc(16384);

    if (w.EvtNext(qh, 30, handles, 2000, 0, ret) && ret[0] > 0) {
      for (let i = 0; i < ret[0]; i++) {
        const h = handles[i];
        if (!h) continue;
        try {
          const used = [0];
          const prop = [0];
          if (w.EvtRender(null, h, 1, buf.length, buf, used, prop) && used[0] > 0) {
            const xml = buf.slice(0, used[0]).toString("utf16le").replace(/\0+$/, "");
            const prov = (xml.match(/Provider Name='([^']+)'/) || [])[1] || "";
            const id = Number((xml.match(/<EventID[^>]*>(\d+)<\/EventID>/) || [])[1] || 0);
            const at = (xml.match(/SystemTime='([^']+)'/) || [])[1] || "";
            if (prov === "Microsoft-Windows-Kernel-Power" && id === 41) unexpectedShutdowns7d += 1;
            else if (prov === "Microsoft-Windows-WHEA-Logger") wheaErrors7d += 1;
            else if (prov === "Display" && id === 4101) displayTdrs7d += 1;
            if (recentEvents.length < 20) {
              recentEvents.push({
                at,
                id,
                provider: prov,
                message: formatStabilityEventMessage(prov, id, xml),
              });
            }
          }
        } finally {
          w.EvtClose(h);
        }
      }
    }
    const data = { unexpectedShutdowns7d, wheaErrors7d, displayTdrs7d, recentEvents };
    stabilityCache = { at: Date.now(), data };
    return data;
  } catch {
    stabilityCache = { at: Date.now(), data: empty };
    return empty;
  } finally {
    if (qh) {
      try {
        w.EvtClose(qh);
      } catch {
        /* ignore close error */
      }
    }
  }
}

export function resolveInstalledHardwareTools() {
  return {
    lhm: LHM_EXE_CANDIDATES.some((p) => fs.existsSync(p)),
    occt: fs.existsSync(OCCT_EXE),
    crystaldiskinfo: fs.existsSync(CDI_EXE),
  };
}

export function launchHardwareTool(toolId) {
  const map = {
    lhm: resolveLhmExe(),
    occt: OCCT_EXE,
    crystaldiskinfo: CDI_EXE,
  };
  const exePath = map[String(toolId || "").toLowerCase()];
  if (!exePath || !fs.existsSync(exePath)) {
    return { ok: false, error: `Tool not installed: ${toolId}` };
  }
  try {
    const child = spawn("explorer.exe", [exePath], {
      windowsHide: true,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { ok: true, tool: toolId, path: exePath };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/** Evaluate hardware health & idle tuning alerts cleanly from sensor snapshots. */
export function evaluateHardwareAlerts({
  gpu = null,
  stability = {},
  maxCpuTemp = null,
  tuning = null,
  motherboard = null,
  sensorLogger = null,
} = {}) {
  const alerts = [];
  const currentV33 = sensorLogger?.v33 ?? motherboard?.voltage33V ?? null;
  const minRecentV33 = sensorLogger?.v33MinRecent ?? null;
  if ((currentV33 != null && currentV33 < 3.135) || (minRecentV33 != null && minRecentV33 < 3.135)) {
    const worstV33 = minRecentV33 != null && minRecentV33 < 3.135 ? minRecentV33 : currentV33;
    alerts.push({
      severity: "critical",
      code: "V33_UNDERVOLTAGE",
      message: `+3.3V rail undervoltage (${worstV33}V < 3.135V ATX floor)`,
    });
  }
  const avccV = motherboard?.voltageAvccV ?? null;
  if (avccV != null && avccV < 3.135) {
    alerts.push({
      severity: "warn",
      code: "AVCC_UNDERVOLTAGE",
      message: `Motherboard AVCC rail low (${avccV}V < 3.135V ATX floor)`,
    });
  }
  if (gpu?.pcieDowngraded) {
    alerts.push({
      severity: "warn",
      code: "PCIE_LINK_WIDTH",
      message: `GPU PCIe link running at x${gpu.pcieLinkWidth} (max x${gpu.pcieLinkWidthMax})`,
    });
  }
  if ((stability?.wheaErrors7d || 0) > 0) {
    alerts.push({
      severity: "critical",
      code: "WHEA_ERRORS",
      message: `${stability.wheaErrors7d} WHEA PCIe/hardware error(s) in last 7 days`,
    });
  }
  if ((stability?.unexpectedShutdowns7d || 0) > 0) {
    alerts.push({
      severity: "critical",
      code: "KERNEL_POWER_41",
      message: `${stability.unexpectedShutdowns7d} unexpected shutdown(s) in last 7 days`,
    });
  }
  if (gpu?.tempC !== null && gpu?.tempC !== undefined && gpu.tempC >= 83) {
    alerts.push({
      severity: "warn",
      code: "GPU_HOT",
      message: `GPU core temperature high (${gpu.tempC} C)`,
    });
  }
  if (maxCpuTemp !== null && maxCpuTemp !== undefined && maxCpuTemp >= 85) {
    alerts.push({
      severity: "warn",
      code: "CPU_HOT",
      message: `CPU temperature high (${maxCpuTemp} C)`,
    });
  }
  if (
    gpu &&
    (gpu.pstate === "P0" || gpu.pstate === "P2") &&
    (gpu.utilPercent ?? 0) <= 15 &&
    (gpu.powerDrawW ?? 0) >= 50 &&
    (tuning?.gpuPowerMizerLevel === 0 || tuning?.gpuDrsPowerMode === 1)
  ) {
    alerts.push({
      severity: "warn",
      code: "GPU_IDLE_P0",
      message: `GPU idle pinned at ${gpu.pstate} (${Math.round(gpu.powerDrawW)}W · ${gpu.tempC} C) — switch NVIDIA Power Mode to Normal`,
    });
  }
  return alerts;
}

function readWatchdogNvmeState() {
  try {
    if (!fs.existsSync(WATCHDOG_STATE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(WATCHDOG_STATE_PATH, "utf8"));
    const nvme = raw?.nvme;
    if (!nvme || !nvme.ok) return null;
    const temp = nvme.temperature != null ? Number(nvme.temperature) : null;
    const tempMax = nvme.temperatureMax != null ? Number(nvme.temperatureMax) : null;
    return {
      name: nvme.friendlyName || "Primary NVMe SSD",
      tempC: Number.isFinite(temp) && temp > 0 ? temp : null,
      tempMaxC: Number.isFinite(tempMax) && tempMax > 0 ? tempMax : null,
      lifePercent: nvme.wear != null && Number.isFinite(Number(nvme.wear)) ? Math.max(0, 100 - Number(nvme.wear)) : null,
      healthOk: String(nvme.healthStatus || "").toLowerCase() === "healthy",
      recordedAt: raw?.checkedAt || null,
      source: "watchdog",
    };
  } catch {
    return null;
  }
}

export async function sampleHardwareSensors({ force = false } = {}) {
  if (!force && sensorCache && Date.now() - sensorCache.at < SENSOR_CACHE_TTL_MS) {
    return sensorCache.data;
  }
  if (!force && sensorInflight) return sensorInflight;

  sensorInflight = (async () => {
    try {
      const [gpu, lhm] = await Promise.all([
        readGpuSensors(),
        readLibreHardwareMonitor(),
      ]);
      const stability = readSystemStabilityEvents();
      const tuning = readSystemTuningStateInProcess();
      const sensorLogger = readPcSensorLoggerStatus();
      const watchdogNvme = readWatchdogNvmeState();

      const cdiDisks = readCrystalDiskInfoFallback();
      let storage = lhm.reachable && lhm.storageNodes?.length > 0
        ? lhm.storageNodes
        : cdiDisks;
      if (watchdogNvme) {
        if (storage.length === 0) {
          storage = [watchdogNvme];
        } else {
          storage = storage.map((d, idx) =>
            idx === 0
              ? {
                  ...d,
                  tempC: d.source === "lhm" ? d.tempC : (watchdogNvme.tempC ?? d.tempC),
                  tempMaxC: watchdogNvme.tempMaxC ?? d.tempMaxC ?? null,
                  recordedAt: watchdogNvme.tempC != null ? watchdogNvme.recordedAt : d.recordedAt,
                }
              : d,
          );
        }
      }

      const cpuPackageTemps = (lhm.cpuNodes || [])
        .map((c) => c.packageTempC ?? c.coreMaxTempC ?? c.coreAvgTempC)
        .filter((v) => v !== null);
      const maxCpuTemp = cpuPackageTemps.length > 0 ? Math.max(...cpuPackageTemps) : null;
      const maxCpuPower = (lhm.cpuNodes || [])
        .map((c) => c.packagePowerW)
        .filter((v) => v !== null)
        .reduce((a, b) => a + b, 0);

      const gpuEnriched = gpu
        ? {
            ...gpu,
            hotSpotC: lhm.gpuHotSpotC ?? gpu.hotSpotC ?? null,
            fanRpm: lhm.gpuFanRpm ?? null,
            pcieDowngraded:
              gpu.pcieLinkWidth !== null &&
              gpu.pcieLinkWidthMax !== null &&
              gpu.pcieLinkWidth < gpu.pcieLinkWidthMax,
          }
        : null;

      const alerts = evaluateHardwareAlerts({
        gpu: gpuEnriched,
        stability,
        maxCpuTemp,
        tuning,
        motherboard: lhm.motherboardNodes?.[0] || null,
        sensorLogger,
      });

      const health = alerts.some((a) => a.severity === "critical")
        ? "critical"
        : alerts.length > 0
          ? "warn"
          : "healthy";

      const data = {
        ok: true,
        sampledAt: new Date().toISOString(),
        health,
        lhmReachable: Boolean(lhm.reachable),
        tools: resolveInstalledHardwareTools(),
        tuning,
        sensorLogger,
        cpu: {
          sockets: lhm.cpuNodes || [],
          packageTempC: maxCpuTemp,
          coreMaxTempC: maxCpuTemp,
          totalPackagePowerW: lhm.cpuNodes?.some((c) => c.packagePowerW !== null)
            ? Math.round(maxCpuPower * 10) / 10
            : null,
        },
        gpu: gpuEnriched,
        storage,
        motherboard: lhm.motherboardNodes?.[0] || null,
        stability,
        alerts,
      };

      sensorCache = { at: Date.now(), data };
      persistHardwarePoint(data);
      return data;
    } finally {
      sensorInflight = null;
    }
  })();
  return sensorInflight;
}
