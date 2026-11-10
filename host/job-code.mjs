import {
  buildSequentialCode,
  compareSequentialCodes,
  isSequentialCode,
  nextSequentialCode,
  parseSequentialCounter,
  sequentialCodeSortBucket,
  sequentialCodeSortRank,
} from "./vendor/sequential-code.mjs";

export {
  buildSequentialCode,
  compareSequentialCodes,
  isSequentialCode,
  nextSequentialCode,
  parseSequentialCounter,
  sequentialCodeSortBucket,
  sequentialCodeSortRank,
};

export const JOB_CODE_SCHEME = { prefix: "JB", pad: 4, min: 1 };
export const DRIVE_CODE_SCHEME = { prefix: "GG", pad: 4, min: 1 };

export function compareJobCodes(a, b) {
  return compareSequentialCodes(JOB_CODE_SCHEME, a, b);
}

export function compareDriveCodes(a, b) {
  return compareSequentialCodes(DRIVE_CODE_SCHEME, a, b);
}

export function sequentialJobCodeSortRank(value) {
  return sequentialCodeSortRank(JOB_CODE_SCHEME, value);
}

export function sequentialDriveCodeSortRank(value) {
  return sequentialCodeSortRank(DRIVE_CODE_SCHEME, value);
}

export function jobCodeSortBucket(value) {
  return sequentialCodeSortBucket(JOB_CODE_SCHEME, value);
}

export function driveCodeSortBucket(value) {
  return sequentialCodeSortBucket(DRIVE_CODE_SCHEME, value);
}

/** Next `JB0001` code. Existing codes stay put. */
export function nextJobCode(jobs) {
  return nextSequentialCode(
    JOB_CODE_SCHEME,
    (jobs || []).map((job) => job?.code),
  );
}

/** Next `GG0001` code for Drive accounts. */
export function nextDriveCode(accounts) {
  return nextSequentialCode(
    DRIVE_CODE_SCHEME,
    (accounts || []).map((acc) => acc?.code),
  );
}

/** Fill missing Drive IDs (`GG0001`, `GG0002`, ...) in Created order. */
export function assignDriveCodes(accounts) {
  const list = Array.isArray(accounts) ? accounts : [];
  const pending = list
    .filter((acc) => !isSequentialCode(DRIVE_CODE_SCHEME, acc?.code))
    .sort(
      (a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
        String(a.name || "").localeCompare(String(b.name || "")),
    );
  if (!pending.length) return { accounts: list, changed: false };
  const codes = new Map();
  let max = 0;
  for (const acc of list) {
    const n = parseSequentialCounter(DRIVE_CODE_SCHEME, acc?.code);
    if (n != null && isSequentialCode(DRIVE_CODE_SCHEME, acc?.code)) {
      max = Math.max(max, n);
    }
  }
  for (const acc of pending) {
    max += 1;
    codes.set(acc, buildSequentialCode(DRIVE_CODE_SCHEME, max));
  }
  return {
    changed: true,
    accounts: list.map((acc) => (codes.has(acc) ? { ...acc, code: codes.get(acc) } : acc)),
  };
}

/** Fill missing or duplicate Job IDs in Created order using max(counter) + 1. */
export function assignJobCodes(jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  const seen = new Set();
  let max = 0;
  const pending = list
    .filter((job) => {
      if (!isSequentialCode(JOB_CODE_SCHEME, job?.code)) return true;
      const upper = String(job.code).trim().toUpperCase();
      if (seen.has(upper)) return true;
      seen.add(upper);
      const n = parseSequentialCounter(JOB_CODE_SCHEME, upper);
      if (n != null) max = Math.max(max, n);
      return false;
    })
    .sort(
      (a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
        String(a.id || "").localeCompare(String(b.id || "")),
    );
  if (!pending.length) return { jobs: list, changed: false };
  const codes = new Map();
  for (const job of pending) {
    max += 1;
    const nextCode = buildSequentialCode(JOB_CODE_SCHEME, max);
    seen.add(nextCode.toUpperCase());
    codes.set(job, nextCode);
  }
  return {
    changed: true,
    jobs: list.map((job) => (codes.has(job) ? { ...job, code: codes.get(job) } : job)),
  };
}
