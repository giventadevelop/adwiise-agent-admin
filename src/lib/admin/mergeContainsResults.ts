/** Lowercase query plus a spaced form so "AI-based" matches stored "ai based". */
export function searchQueryVariants(raw: string): string[] {
  const lower = raw.trim().toLowerCase();
  if (!lower) return [];
  const spaced = lower.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(new Set([lower, spaced].filter(Boolean)));
}

export function textMatchesSearch(haystack: string | null | undefined, query: string): boolean {
  const value = (haystack || '').toLowerCase();
  const variants = searchQueryVariants(query);
  if (variants.length === 0) return true;
  return variants.some((variant) => value.includes(variant));
}

export function mergeById<T extends { id?: number | null }>(groups: T[][]): T[] {
  const byId = new Map<number, T>();
  for (const group of groups) {
    for (const item of group) {
      if (item?.id == null) continue;
      const id = Number(item.id);
      if (!byId.has(id)) byId.set(id, item);
    }
  }
  return Array.from(byId.values());
}

export function slicePage<T>(items: T[], page: number, pageSize: number) {
  const start = Math.max(0, page) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalCount: items.length,
  };
}
