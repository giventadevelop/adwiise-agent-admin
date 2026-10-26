/**
 * Shared shape for sports_category, achievement_category, and team_type.
 * A null tenantId is a row every tenant can use.
 */
export interface RosterCatalogDTO {
  id?: number | null;
  tenantId?: string | null;
  code: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type RosterCatalogResource = 'sports-categories' | 'achievement-categories' | 'team-types';
