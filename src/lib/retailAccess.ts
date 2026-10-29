export const RETAIL_OWNER_ROLE = 'RETAIL_OWNER';
export const RETAIL_REGIONAL_MANAGER_ROLE = 'RETAIL_REGIONAL_MANAGER';
export const RETAIL_STORE_MANAGER_ROLE = 'RETAIL_STORE_MANAGER';

export const RETAIL_ALL_LOCATIONS_ROLES = ['SUPER_ADMIN', 'ADMIN', RETAIL_OWNER_ROLE] as const;
export const RETAIL_MORNING_ROLES = [
  ...RETAIL_ALL_LOCATIONS_ROLES,
  RETAIL_REGIONAL_MANAGER_ROLE,
  RETAIL_STORE_MANAGER_ROLE,
] as const;

export type RetailLocationScope = 'ALL' | 'ASSIGNED' | 'NONE';

export function retailScopeForRole(role: string | null | undefined): RetailLocationScope {
  if (!role) return 'NONE';
  if ((RETAIL_ALL_LOCATIONS_ROLES as readonly string[]).includes(role)) return 'ALL';
  if (role === RETAIL_REGIONAL_MANAGER_ROLE || role === RETAIL_STORE_MANAGER_ROLE) return 'ASSIGNED';
  return 'NONE';
}

export function canSeeRetailMorning(role: string | null | undefined): boolean {
  return retailScopeForRole(role) !== 'NONE';
}
