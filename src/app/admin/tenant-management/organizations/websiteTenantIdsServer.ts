import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

type SettingsRow = {
  tenantId?: string;
  tenantOrganizationId?: number;
  tenantOrganization?: { id?: number };
};

function readArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: unknown[] }).content;
  }
  return [];
}

function organizationIdFromSettings(row: SettingsRow): number | null {
  if (typeof row.tenantOrganization?.id === 'number') return row.tenantOrganization.id;
  if (typeof row.tenantOrganizationId === 'number') return row.tenantOrganizationId;
  return null;
}

/** Website tenant ids grouped by organization id, loaded from tenant settings. */
export async function loadWebsiteTenantIdsByOrganization(
  organizationIds: number[],
): Promise<Map<number, string[]>> {
  const grouped = new Map<number, string[]>();
  const uniqueIds = [...new Set(organizationIds.filter((id) => Number.isFinite(id)))];
  const chunkSize = 40;
  for (let start = 0; start < uniqueIds.length; start += chunkSize) {
    const chunk = uniqueIds.slice(start, start + chunkSize);
    let page = 0;
    let total = 0;
    do {
      const params = new URLSearchParams({
        page: String(page),
        size: '200',
        sort: 'tenantId,asc',
      });
      for (const id of chunk) params.append('tenantOrganizationId.in', String(id));
      const response = await fetchWithJwtRetry(
        `${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        throw new Error('Could not load website tenant IDs.');
      }
      const rows = readArray(await response.json()) as SettingsRow[];
      for (const row of rows) {
        const organizationId = organizationIdFromSettings(row);
        const tenantId = row.tenantId?.trim();
        if (organizationId == null || !tenantId) continue;
        const current = grouped.get(organizationId) ?? [];
        if (!current.includes(tenantId)) current.push(tenantId);
        grouped.set(organizationId, current);
      }
      const headerCount = Number.parseInt(response.headers.get('x-total-count') || '', 10);
      total = Number.isFinite(headerCount) && headerCount >= 0 ? headerCount : rows.length;
      page += 1;
      if (rows.length === 0) break;
    } while (page * 200 < total && page < 50);
  }
  return grouped;
}

/** Organization ids that own any of the given website tenant ids. */
export async function loadOrganizationIdsForTenantIds(tenantIds: string[]): Promise<number[]> {
  const ids = new Set<number>();
  const unique = [...new Set(tenantIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  const chunkSize = 40;
  for (let start = 0; start < unique.length; start += chunkSize) {
    const chunk = unique.slice(start, start + chunkSize);
    let page = 0;
    let total = 0;
    do {
      const params = new URLSearchParams({
        page: String(page),
        size: '200',
        sort: 'tenantId,asc',
      });
      for (const tenantId of chunk) params.append('tenantId.in', tenantId);
      const response = await fetchWithJwtRetry(
        `${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        throw new Error(`Could not look up organizations for website tenant IDs (backend status ${response.status}).`);
      }
      const rows = readArray(await response.json()) as SettingsRow[];
      for (const row of rows) {
        const id = organizationIdFromSettings(row);
        if (id != null) ids.add(id);
      }
      const headerCount = Number.parseInt(response.headers.get('x-total-count') || '', 10);
      total = Number.isFinite(headerCount) && headerCount >= 0 ? headerCount : rows.length;
      page += 1;
      if (rows.length === 0) break;
    } while (page * 200 < total && page < 50);
  }
  return [...ids];
}

/**
 * The organization that owns one website tenant id, or null.
 * The organization list has no tenant filter, so `tenant-organizations?tenantId.equals=` returns some other organization.
 */
export async function loadOrganizationForTenantId(tenantId: string): Promise<TenantOrganizationDTO | null> {
  const tid = tenantId.trim();
  if (!tid) return null;
  let organizationId: number | undefined;
  try {
    [organizationId] = await loadOrganizationIdsForTenantIds([tid]);
  } catch (error) {
    // Callers treat null as "no organization". A backend error (for example a database missing a
    // new column) must not break the public layout or the admin pages that only need site type.
    console.warn('[loadOrganizationForTenantId] organization lookup failed for', tid, error instanceof Error ? error.message : error);
    return null;
  }
  if (organizationId == null) return null;
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${organizationId}`, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const organization = (await response.json()) as TenantOrganizationDTO;
  return { ...organization, tenantId: organization.tenantId || tid };
}

/**
 * Copies website tenant ids from tenant settings onto each organization.
 * When settings have no row, the deprecated organization tenantId is kept as the only id.
 */
export async function attachWebsiteTenantIds(
  organizations: TenantOrganizationDTO[],
): Promise<TenantOrganizationDTO[]> {
  const ids = organizations
    .map((org) => org.id)
    .filter((id): id is number => typeof id === 'number');
  const grouped = ids.length > 0 ? await loadWebsiteTenantIdsByOrganization(ids) : new Map<number, string[]>();
  return organizations.map((org) => {
    if (typeof org.id !== 'number') return org;
    const fromSettings = grouped.get(org.id);
    if (fromSettings?.length) return { ...org, websiteTenantIds: fromSettings };
    const legacy = org.tenantId?.trim();
    if (legacy) return { ...org, websiteTenantIds: [legacy] };
    return org;
  });
}
