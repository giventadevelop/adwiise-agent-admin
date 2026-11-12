'use server';

import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { PaginatedResponse, TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import type { OrganizationSearchFilters } from '@/app/admin/tenant-management/organizations/organizationSearch';

const EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGES = 200;
const SETTINGS_PAGE_SIZE = 100;

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

function appendContains(params: URLSearchParams, field: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) params.append(`${field}.contains`, trimmed);
}

async function organizationIdsForWebsiteTenant(query: string): Promise<number[]> {
  const ids = new Set<number>();
  let page = 0;
  let total = 0;
  do {
    const params = new URLSearchParams({
      'tenantId.contains': query,
      page: String(page),
      size: String(SETTINGS_PAGE_SIZE),
    });
    const response = await fetchWithJwtRetry(
      `${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      throw new Error('Could not look up organizations by website tenant ID.');
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
  } while (page * SETTINGS_PAGE_SIZE < total && page < 40);

  return [...ids];
}

function buildOrganizationParams(
  filters: OrganizationSearchFilters,
  page: number,
  pageSize: number,
  organizationIds: number[] | null,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    size: String(pageSize),
    sort: 'organizationName,asc',
  });
  appendContains(params, 'organizationName', filters.organizationName);
  appendContains(params, 'domain', filters.domain);
  appendContains(params, 'contactEmail', filters.contactEmail);
  appendContains(params, 'contactPersonName', filters.contactPersonName);
  appendContains(params, 'contactPhone', filters.contactPhone);
  appendContains(params, 'city', filters.city);
  appendContains(params, 'stateProvince', filters.stateProvince);
  appendContains(params, 'zipCode', filters.zipCode);
  appendContains(params, 'country', filters.country);
  appendContains(params, 'websiteUrl', filters.websiteUrl);
  const siteType = filters.siteType.trim();
  if (siteType) params.append('siteType.equals', siteType);
  const subscriptionStatus = filters.subscriptionStatus.trim();
  if (subscriptionStatus) params.append('subscriptionStatus.equals', subscriptionStatus);
  if (filters.isActive === 'true' || filters.isActive === 'false') {
    params.append('isActive.equals', filters.isActive);
  }
  if (organizationIds) {
    for (const id of organizationIds) params.append('id.in', String(id));
  }
  return params;
}

async function loadOrganizationPage(
  filters: OrganizationSearchFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<TenantOrganizationDTO>> {
  const tenantQuery = filters.websiteTenantId.trim();
  const organizationIds = tenantQuery ? await organizationIdsForWebsiteTenant(tenantQuery) : null;
  if (organizationIds && organizationIds.length === 0) {
    return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const params = buildOrganizationParams(filters, page, pageSize, organizationIds);
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/tenant-organizations?${params.toString()}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail.trim() || 'Could not search organizations.');
  }
  const data = readArray(await response.json()) as TenantOrganizationDTO[];
  const headerCount = Number.parseInt(response.headers.get('x-total-count') || '', 10);
  const totalCount = Number.isFinite(headerCount) && headerCount >= 0 ? headerCount : data.length;
  return {
    data,
    totalCount,
    page,
    pageSize,
    totalPages: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
  };
}

/** One page of organizations matching the search form. */
export async function searchOrganizations(
  filters: OrganizationSearchFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<TenantOrganizationDTO>> {
  await assertPlatformSuperAdmin();
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 10;
  return loadOrganizationPage(filters, safePage, safeSize);
}

async function websiteTenantIdsByOrganization(organizationIds: number[]): Promise<Map<number, string[]>> {
  const grouped = new Map<number, string[]>();
  const chunkSize = 40;
  for (let start = 0; start < organizationIds.length; start += chunkSize) {
    const chunk = organizationIds.slice(start, start + chunkSize);
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
        throw new Error('Could not load website tenant IDs for the export.');
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

/** Every organization matching the filters, with website tenant IDs filled in for the spreadsheet. */
export async function listOrganizationsForExport(
  filters: OrganizationSearchFilters,
): Promise<TenantOrganizationDTO[]> {
  await assertPlatformSuperAdmin();
  const rows: TenantOrganizationDTO[] = [];
  let page = 0;
  let total = 0;
  do {
    const result = await loadOrganizationPage(filters, page, EXPORT_PAGE_SIZE);
    rows.push(...result.data);
    total = result.totalCount;
    page += 1;
    if (result.data.length === 0) break;
  } while (rows.length < total && page < MAX_EXPORT_PAGES);

  const ids = rows.map((row) => row.id).filter((id): id is number => typeof id === 'number');
  if (ids.length === 0) return rows;
  const tenantIds = await websiteTenantIdsByOrganization(ids);
  return rows.map((row) => {
    if (row.id == null) return row;
    const fromSettings = tenantIds.get(row.id);
    if (!fromSettings?.length) return row;
    return { ...row, websiteTenantIds: fromSettings };
  });
}
