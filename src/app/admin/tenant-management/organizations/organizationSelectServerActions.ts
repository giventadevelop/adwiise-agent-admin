'use server';

import { fetchTenantOrganizations } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { getCurrentAdminAccess } from '@/app/admin/adminAccessServer';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

const TENANT_ORG_SELECT_LIMIT = 20;

async function filterOrgsForCurrentAdmin(
  orgs: TenantOrganizationDTO[],
): Promise<TenantOrganizationDTO[]> {
  const access = await getCurrentAdminAccess();
  if (access.canQueryAllTenants) return orgs;
  const allowed = new Set(access.allowedTenantIds);
  return orgs.filter((org) => (org.websiteTenantIds || []).some((tenantId) => allowed.has(tenantId)));
}

function mergeOrganizationsByKey(
  ...lists: TenantOrganizationDTO[][]
): TenantOrganizationDTO[] {
  const byKey = new Map<string, TenantOrganizationDTO>();
  for (const list of lists) {
    for (const org of list) {
      const key = String(org.id ?? org.tenantId ?? '');
      if (!key || byKey.has(key)) continue;
      byKey.set(key, org);
    }
  }
  return Array.from(byKey.values());
}

/** Latest organizations for settings create / typeahead (newest first). */
export async function fetchRecentTenantOrganizationsForSelectServer(): Promise<TenantOrganizationDTO[]> {
  try {
    const result = await fetchTenantOrganizations(
      { page: 0, pageSize: TENANT_ORG_SELECT_LIMIT },
      { sortBy: 'createdAt', sortOrder: 'desc' },
    );
    return filterOrgsForCurrentAdmin(result.data);
  } catch (error) {
    console.error('[fetchRecentTenantOrganizationsForSelectServer] Failed:', error);
    return [];
  }
}

/**
 * Typeahead search by organization name OR tenant ID (contains), max 20, newest first.
 * Typing "ten" matches tenant_demo_002; typing "techie" matches Techies US.
 */
export async function searchTenantOrganizationsForSelectServer(
  query: string,
): Promise<TenantOrganizationDTO[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fetchRecentTenantOrganizationsForSelectServer();
  }

  try {
    const sort = { sortBy: 'createdAt' as const, sortOrder: 'desc' as const };
    const page = { page: 0, pageSize: TENANT_ORG_SELECT_LIMIT };

    const [byName, byTenantId] = await Promise.all([
      fetchTenantOrganizations(page, { search: trimmed, ...sort }),
      fetchTenantOrganizations(page, { tenantIdContains: trimmed, ...sort }),
    ]);

    return filterOrgsForCurrentAdmin(
      mergeOrganizationsByKey(byTenantId.data, byName.data).slice(0, TENANT_ORG_SELECT_LIMIT),
    );
  } catch (error) {
    console.error('[searchTenantOrganizationsForSelectServer] Failed:', error);
    return [];
  }
}
