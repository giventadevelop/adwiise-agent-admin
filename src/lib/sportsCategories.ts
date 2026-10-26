/**
 * Maps roster catalog rows onto squad forms.
 * Selected sports are stored as team_member_sport rows; sport_profiles.categories
 * remains a code list for readers that still use the JSON.
 */
import type { RosterCatalogDTO } from '@/types/rosterCatalog';

export function parseSportsCategoryCodes(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const categories = (value as { categories?: unknown }).categories;
    if (!Array.isArray(categories)) return [];
    return categories.map((code) => String(code)).filter(Boolean);
  } catch {
    return [];
  }
}

export function selectedSportIds(
  member: { sportCategoryIds?: number[] | null; sportProfiles?: string | null } | null | undefined,
  options: RosterCatalogDTO[]
): number[] {
  if (member?.sportCategoryIds?.length) {
    return member.sportCategoryIds.filter((id) => id != null);
  }
  const codes = new Set(parseSportsCategoryCodes(member?.sportProfiles));
  return options.filter((option) => option.id != null && codes.has(option.code)).map((option) => option.id as number);
}

/** Labels for the roster grid. Prefer the labels the member API already attached. */
export function sportLabelsForMember(member: {
  sportLabels?: string[] | null;
  sportProfiles?: string | null;
}): string[] {
  if (member.sportLabels?.length) return member.sportLabels.filter(Boolean);
  return parseSportsCategoryCodes(member.sportProfiles);
}
