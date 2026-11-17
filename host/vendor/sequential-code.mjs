/**
 * Sequential public-code allocator (Node ESM runtime SSOT — mirrored from packages/hub-sync-core).
 * Sync via: node Tool/scripts/sync-hub-sync-core-vendor.cjs
 */

function schemeMin(scheme) {
  return Math.max(0, Math.trunc(scheme.min ?? 0));
}

function schemeMax(scheme) {
  return scheme.max ?? 10 ** scheme.pad - 1;
}

const UPPER_PREFIX_CACHE = new Map();

function getUpperPrefix(prefix) {
  let upper = UPPER_PREFIX_CACHE.get(prefix);
  if (upper === undefined) {
    if (UPPER_PREFIX_CACHE.size >= 128) UPPER_PREFIX_CACHE.clear();
    upper = String(prefix).toUpperCase();
    UPPER_PREFIX_CACHE.set(prefix, upper);
  }
  return upper;
}

function parsePrefixedAsciiCounter(raw, prefix, maxDigits) {
  const pLen = prefix.length;
  const digitCount = raw.length - pLen;
  if (digitCount < 1 || digitCount > maxDigits) return null;
  if (pLen > 0) {
    const pUpper = getUpperPrefix(prefix);
    for (let i = 0; i < pLen; i += 1) {
      let ch = raw.charCodeAt(i);
      if (ch >= 97 && ch <= 122) ch -= 32;
      if (ch !== pUpper.charCodeAt(i)) {
        if (raw.slice(0, pLen).toUpperCase() !== pUpper) return null;
        break;
      }
    }
  }
  let n = 0;
  for (let i = pLen; i < raw.length; i += 1) {
    const d = raw.charCodeAt(i);
    if (d < 48 || d > 57) return null;
    n = n * 10 + (d - 48);
  }
  return n;
}

/** `PREFIX` + zero-padded counter, e.g. buildSequentialCode({prefix:"CS",pad:5}, 0) → `CS00000`. */
export function buildSequentialCode(scheme, counter) {
  const min = schemeMin(scheme);
  const max = schemeMax(scheme);
  const n = Math.min(max, Math.max(min, Math.trunc(Number(counter) || 0)));
  return `${scheme.prefix}${String(n).padStart(scheme.pad, "0")}`;
}

/** Numeric counter from a `PREFIX<digits>` code, or null when it does not match the scheme. */
export function parseSequentialCounter(scheme, value) {
  if (value == null) return null;
  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (!raw) return null;
  const maxDigits = Math.max(scheme.pad, Math.trunc(scheme.maxInputDigits ?? scheme.pad));
  const n = parsePrefixedAsciiCounter(raw, scheme.prefix, maxDigits);
  if (n === null || !Number.isFinite(n) || n < schemeMin(scheme) || n > schemeMax(scheme)) {
    return null;
  }
  return n;
}

/** Canonicalize `PREFIX<digits>` (case-insensitive) to `PREFIX<pad digits>`, or null if out of range. */
export function canonicalizeSequentialCode(scheme, value) {
  const n = parseSequentialCounter(scheme, value);
  return n == null ? null : buildSequentialCode(scheme, n);
}

/** True when `value` is a well-formed code for the scheme (exact pad width). */
export function isSequentialCode(scheme, value) {
  if (value == null) return false;
  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (raw.length !== scheme.prefix.length + scheme.pad) return false;
  return parseSequentialCounter(scheme, raw) !== null;
}

/**
 * Numeric sort rank for `useDirectoryTableSort` / `sortableValue`:
 * returns the parsed integer counter (`min..max`) for valid scheme codes,
 * or `Number.MAX_SAFE_INTEGER` when missing/non-matching so valid codes sort first.
 */
export function sequentialCodeSortRank(scheme, value) {
  return parseSequentialCounter(scheme, value) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Directory sort bucket for keeping primary sequential codes first in both ASC and DESC:
 * - `0` when `value` matches the primary `scheme`
 * - `1..legacyPrefixes.length` when `value` starts with a declared legacy prefix (with non-empty suffix)
 * - `legacyPrefixes.length + 1` (`1` when no legacy prefixes are passed) for empty or arbitrary strings
 */
export function sequentialCodeSortBucket(scheme, value, options) {
  if (parseSequentialCounter(scheme, value) != null) return 0;
  const legacyPrefixes = options?.legacyPrefixes ?? [];
  if (legacyPrefixes.length > 0) {
    const upper = String(value ?? "").trim().toUpperCase();
    for (let i = 0; i < legacyPrefixes.length; i += 1) {
      const p = String(legacyPrefixes[i] ?? "").trim().toUpperCase();
      if (p && upper.startsWith(p) && upper.length > p.length) {
        return i + 1;
      }
    }
  }
  return legacyPrefixes.length + 1;
}

/**
 * Next free code given the set of existing codes: `max(counter) + 1`, skipping any
 * already-used value (case-insensitive). Throws when the scheme space is exhausted.
 */
export function nextSequentialCode(scheme, existingCodes) {
  const min = schemeMin(scheme);
  const max = schemeMax(scheme);
  const existing = new Set();
  let globalMax = min - 1;
  for (const raw of existingCodes) {
    const code = String(raw ?? "").trim();
    if (!code) continue;
    const n = parseSequentialCounter(scheme, code);
    if (n != null) {
      existing.add(buildSequentialCode(scheme, n).toUpperCase());
      if (n > globalMax) globalMax = n;
    } else {
      existing.add(code.toUpperCase());
    }
  }

  let next = Math.max(min, globalMax + 1);
  for (let i = 0; i <= max; i += 1) {
    if (next > max) break;
    const candidate = buildSequentialCode(scheme, next);
    if (!existing.has(candidate.toUpperCase())) return candidate;
    next += 1;
  }

  throw new Error(`Could not allocate unique ${scheme.prefix} code`);
}

const SEQUENTIAL_CODE_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function sequentialCodeSortKey(scheme, value, options) {
  const legacyPrefixes = options?.legacyPrefixes ?? [];
  const raw = value == null ? "" : (typeof value === "string" ? value.trim() : String(value).trim());
  if (!raw) {
    return { rank: legacyPrefixes.length + 1, counter: null, raw: "" };
  }
  const primaryCounter = parseSequentialCounter(scheme, raw);
  if (primaryCounter != null) {
    return {
      rank: 0,
      counter: primaryCounter,
      raw: buildSequentialCode(scheme, primaryCounter),
    };
  }
  for (let i = 0; i < legacyPrefixes.length; i += 1) {
    const p = legacyPrefixes[i];
    if (!p) continue;
    const counter = parsePrefixedAsciiCounter(raw, p, raw.length);
    if (counter != null) {
      return {
        rank: i + 1,
        counter: Number.isFinite(counter) ? counter : null,
        raw,
      };
    }
  }
  return {
    rank: legacyPrefixes.length + 1,
    counter: null,
    raw,
  };
}

export function compareSequentialCodeSortKeys(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.rank === 0 && a.counter != null && b.counter != null) {
    return a.counter - b.counter;
  }
  return SEQUENTIAL_CODE_COLLATOR.compare(a.raw, b.raw);
}

/**
 * Directory sort helper: primary `scheme` codes first (by numeric counter),
 * then any `legacyPrefixes` buckets (in declared order), then remaining strings.
 */
export function compareSequentialCodes(scheme, a, b, options) {
  const av = sequentialCodeSortKey(scheme, a, options);
  const bv = sequentialCodeSortKey(scheme, b, options);
  return compareSequentialCodeSortKeys(av, bv);
}

