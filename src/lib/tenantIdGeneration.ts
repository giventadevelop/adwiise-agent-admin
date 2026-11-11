/**
 * Tenant ID naming: `{prefix}_{sequence}` e.g. ford_motors_1
 * Sequence is global across all tenant IDs (trailing numeric suffix after last underscore).
 */

export const TENANT_ID_SUFFIX_MIN_DIGITS = 1;
export const TENANT_ID_FIRST_SEQUENCE = 1;
export const TENANT_ID_PREFIX_MAX_LENGTH = 30;

const TENANT_ID_SUFFIX_PATTERN = /_(\d+)$/;
const TENANT_ID_PREFIX_CHAR_PATTERN = /^[a-z0-9_]+$/;

/** Normalize user input into a valid slug prefix (lowercase, underscores). */
export function normalizeTenantIdPrefix(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Extract trailing numeric suffix from tenant IDs like `ford_motors_1`. */
export function extractTenantIdSequence(tenantId: string): number | null {
  const trimmed = tenantId.trim();
  if (!trimmed) return null;
  const match = trimmed.match(TENANT_ID_SUFFIX_PATTERN);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Prefix before trailing _digits (e.g. ford_motors from ford_motors_1). */
export function getTenantIdPrefix(tenantId: string): string | null {
  const trimmed = tenantId.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+)_(\d+)$/);
  return match ? match[1] : null;
}

/** Highest trailing sequence across all tenant IDs; 0 when none match the pattern. */
export function getMaxTenantIdSequence(existingTenantIds: readonly string[]): number {
  let max = 0;
  for (const id of existingTenantIds) {
    const seq = extractTenantIdSequence(id);
    if (seq !== null && seq > max) {
      max = seq;
    }
  }
  return max;
}

/** Next sequence: max + 1, or 1 when no sequenced IDs exist. */
export function getNextTenantIdSequence(existingTenantIds: readonly string[]): number {
  const max = getMaxTenantIdSequence(existingTenantIds);
  return max > 0 ? max + 1 : TENANT_ID_FIRST_SEQUENCE;
}

/**
 * First `{prefix}_{n}` that is not already stored.
 * Starts at the next global sequence and walks forward past exact collisions.
 */
export function findNextFreeTenantId(prefix: string, existingTenantIds: readonly string[]): string {
  const taken = new Set(existingTenantIds.map((id) => id.trim().toLowerCase()).filter(Boolean));
  let sequence = getNextTenantIdSequence(existingTenantIds);
  const limit = sequence + 1000;
  while (sequence < limit) {
    const candidate = buildTenantId(prefix, sequence);
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
    sequence += 1;
  }
  throw new Error('Could not find a free tenant ID');
}

export function formatTenantIdSequence(sequence: number, minDigits = TENANT_ID_SUFFIX_MIN_DIGITS): string {
  return String(Math.max(0, Math.floor(sequence))).padStart(minDigits, '0');
}

export function buildTenantId(prefix: string, sequence: number): string {
  const normalizedPrefix = normalizeTenantIdPrefix(prefix);
  if (getTenantIdPrefixValidationError(normalizedPrefix)) {
    throw new Error('Tenant ID prefix is invalid');
  }
  const formattedSequence = formatTenantIdSequence(sequence);
  return `${normalizedPrefix}_${formattedSequence}`;
}

/** User-facing validation for the name prefix (after normalization). */
export function getTenantIdPrefixValidationError(prefix: string): string | null {
  const normalized = normalizeTenantIdPrefix(prefix);
  if (!normalized) {
    return 'Prefix is required';
  }
  if (normalized.length > TENANT_ID_PREFIX_MAX_LENGTH) {
    return `Prefix must be ${TENANT_ID_PREFIX_MAX_LENGTH} characters or fewer`;
  }
  if (!TENANT_ID_PREFIX_CHAR_PATTERN.test(normalized)) {
    return 'Use only letters, numbers, and underscores (no other special characters)';
  }
  if (!/[a-z]$/.test(normalized)) {
    return 'Prefix must end with a letter';
  }
  return null;
}

export function isValidTenantIdPrefix(prefix: string): boolean {
  return getTenantIdPrefixValidationError(prefix) === null;
}

/** Restrict keystrokes: letters, digits, underscore, space, hyphen; max raw length capped for UX. */
export function sanitizeTenantIdPrefixInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .slice(0, TENANT_ID_PREFIX_MAX_LENGTH + 8);
}

/** Suggest prefix from organization name; trims trailing digits/underscores so it can end with a letter. */
export function suggestTenantIdPrefixFromName(raw: string): string {
  let normalized = normalizeTenantIdPrefix(raw).replace(/[_0-9]+$/g, '');
  if (normalized.length > TENANT_ID_PREFIX_MAX_LENGTH) {
    normalized = normalized.slice(0, TENANT_ID_PREFIX_MAX_LENGTH).replace(/[_0-9]+$/g, '');
  }
  return normalized;
}

export function isValidGeneratedTenantId(tenantId: string): boolean {
  const trimmed = tenantId.trim();
  const match = trimmed.match(new RegExp(`^(.+)_(\\d{${TENANT_ID_SUFFIX_MIN_DIGITS},})$`));
  if (!match) return false;
  return isValidTenantIdPrefix(match[1]);
}
