'use server';

import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

export interface OrganizationTenantIdRow {
  settingsId: number;
  tenantId: string;
}

export interface OrganizationTenantIdPage {
  rows: OrganizationTenantIdRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function readSettingsRows(data: unknown): Array<{ id?: number; tenantId?: string }> {
  if (Array.isArray(data)) return data as Array<{ id?: number; tenantId?: string }>;
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: Array<{ id?: number; tenantId?: string }> }).content;
  }
  return [];
}

/** One page of website tenant ids owned by an organization. */
export async function fetchOrganizationTenantIdsPage(
  organizationId: number,
  page: number,
  pageSize: number,
): Promise<OrganizationTenantIdPage> {
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 10;
  const params = new URLSearchParams({
    'tenantOrganizationId.equals': String(organizationId),
    page: String(safePage),
    size: String(safeSize),
    sort: 'tenantId,asc',
  });
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error('Could not load the tenant IDs for this organization.');
  }
  const rows = readSettingsRows(await response.json())
    .filter((row) => typeof row.id === 'number' && typeof row.tenantId === 'string' && row.tenantId.trim())
    .map((row) => ({ settingsId: row.id as number, tenantId: (row.tenantId as string).trim() }));
  const headerCount = Number.parseInt(response.headers.get('x-total-count') || '', 10);
  const totalCount = Number.isFinite(headerCount) && headerCount >= 0 ? headerCount : rows.length;
  return { rows, totalCount, page: safePage, pageSize: safeSize };
}
