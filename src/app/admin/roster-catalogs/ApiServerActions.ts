'use server';

import { getCurrentAdminAccess, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { RosterCatalogDTO, RosterCatalogResource } from '@/types/rosterCatalog';

function asList(data: unknown): RosterCatalogDTO[] {
  if (Array.isArray(data)) return data as RosterCatalogDTO[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: RosterCatalogDTO[] }).content;
  }
  return [];
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;
  try {
    const body = JSON.parse(text) as { detail?: string; title?: string; message?: string };
    return body.detail || body.message || body.title || text;
  } catch {
    return text;
  }
}

/**
 * Global rows plus the caller's tenant. Do not add tenantId.equals:
 * that filter would hide the shared rows.
 */
export async function fetchRosterCatalog(
  resource: RosterCatalogResource,
  tenantId?: string | null
): Promise<RosterCatalogDTO[]> {
  const headers: Record<string, string> = {};
  const scoped = tenantId?.trim();
  if (scoped) headers['X-Tenant-ID'] = scoped;
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/${resource}?size=500&sort=sortOrder,asc`,
    { cache: 'no-store', headers }
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return asList(await response.json());
}

async function writeHeaders(shared: boolean, tenantId?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (shared) {
    const access = await getCurrentAdminAccess();
    if (!access.isPlatformSuperAdmin) {
      throw new Error('Only a platform super admin can change a shared catalog row');
    }
    headers['X-Catalog-Global-Write'] = 'true';
    return headers;
  }
  headers['X-Tenant-ID'] = await resolveAdminMutationTenantId(tenantId);
  return headers;
}

export async function saveRosterCatalog(
  resource: RosterCatalogResource,
  row: RosterCatalogDTO,
  shared: boolean,
  tenantId?: string | null
): Promise<RosterCatalogDTO> {
  const headers = await writeHeaders(shared, tenantId);
  const body: RosterCatalogDTO = {
    ...row,
    code: row.code.trim(),
    label: row.label.trim(),
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive !== false,
    tenantId: shared ? null : headers['X-Tenant-ID'],
  };
  const id = row.id;
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/${resource}${id != null ? `/${id}` : ''}`,
    {
      method: id != null ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as RosterCatalogDTO;
}

export async function deleteRosterCatalog(
  resource: RosterCatalogResource,
  row: RosterCatalogDTO
): Promise<void> {
  if (row.id == null) throw new Error('Catalog row has no id');
  const shared = !row.tenantId;
  const headers = await writeHeaders(shared, row.tenantId);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/${resource}/${row.id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok && response.status !== 204) throw new Error(await readError(response));
}
