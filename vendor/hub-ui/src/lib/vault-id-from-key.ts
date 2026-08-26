/**
 * Deterministic "UUID-like" string for non-UUID vault identifiers (e.g. Service grouping keys).
 *
 * Goal: one stable display/copy format across UUID rows (SKU, Order) and string-key entities (Service).
 * Not a standards-compliant UUID — deterministic per input, grouped as 8-4-4-4-12 hex.
 */

const MASK_64 = (1n << 64n) - 1n;
const FNV_64_PRIME = 0x100000001b3n;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRAFT_VAULT_SENTINEL_RE = /^__[a-z0-9][a-z0-9_]*__$/i;

function fnv1a64(input: string, seed: bigint): bigint {
  let hash = seed & MASK_64;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_64_PRIME) & MASK_64;
  }
  return hash;
}

function u128HexFromStringKey(key: string): string {
  const k = key.trim();
  const h1 = fnv1a64(k, 0xcbf29ce484222325n);
  const h2 = fnv1a64(k, 0x84222325cbf29ce4n);
  const hex1 = h1.toString(16).padStart(16, "0");
  const hex2 = h2.toString(16).padStart(16, "0");
  return (hex1 + hex2).slice(0, 32).toLowerCase();
}

export function isUuidVaultId(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export function isDraftVaultSentinelId(id: string): boolean {
  return DRAFT_VAULT_SENTINEL_RE.test(id.trim());
}

export function vaultIdFromStringKey(key: string): string {
  const hex = u128HexFromStringKey(key);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Vault badge display/copy — UUID passthrough, draft sentinel → null, else deterministic UUID-like. */
export function formatVaultIdForDisplay(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (isDraftVaultSentinelId(trimmed)) return null;
  if (isUuidVaultId(trimmed)) return trimmed;
  return vaultIdFromStringKey(trimmed);
}
