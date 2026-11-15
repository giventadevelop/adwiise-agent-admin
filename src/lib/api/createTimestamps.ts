/**
 * Fill createdAt and updatedAt on a create payload.
 * JHipster DTOs mark both @NotNull, so a POST that omits them fails
 * validation before the database default can run.
 * Existing non-empty values are kept.
 */
export function stampCreateTimestamps<T extends Record<string, unknown>>(
  payload: T
): T & { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  const createdAt =
    typeof payload.createdAt === 'string' && payload.createdAt.trim()
      ? payload.createdAt
      : now;
  const updatedAt =
    typeof payload.updatedAt === 'string' && payload.updatedAt.trim()
      ? payload.updatedAt
      : now;
  return { ...payload, createdAt, updatedAt };
}
