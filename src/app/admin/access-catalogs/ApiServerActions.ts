'use server';

import { getCurrentAdminAccess, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { AccessRoleDTO, RetailerTypeDTO } from '@/types/accessCatalog';

type CatalogRow = AccessRoleDTO | RetailerTypeDTO;

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: T[] }).content;
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

async function fetchCatalog<T>(resource: string, tenantId?: string | null): Promise<T[]> {
  const headers: Record<string, string> = {};
  const scoped = tenantId?.trim();
  if (scoped) headers['X-Tenant-ID'] = scoped;
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/${resource}?size=500&sort=sortOrder,asc`,
    { cache: 'no-store', headers }
  );
  if (!response.ok) throw new Error(await readError(response));
  return asList<T>(await response.json());
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

async function saveCatalog<T extends CatalogRow>(
  resource: string,
  row: T,
  shared: boolean,
  tenantId?: string | null
): Promise<T> {
  const headers = await writeHeaders(shared, tenantId);
  const body = {
    ...row,
    code: row.code.trim(),
    label: row.label.trim(),
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive !== false,
    tenantId: shared ? null : headers['X-Tenant-ID'],
  };
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/${resource}${row.id != null ? `/${row.id}` : ''}`,
    {
      method: row.id != null ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

async function deleteCatalog(resource: string, row: CatalogRow): Promise<void> {
  if (row.id == null) throw new Error('Catalog row has no id');
  const headers = await writeHeaders(!row.tenantId, row.tenantId);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/${resource}/${row.id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok && response.status !== 204) throw new Error(await readError(response));
}

export function fetchAccessRoles(tenantId?: string | null): Promise<AccessRoleDTO[]> {
  return fetchCatalog<AccessRoleDTO>('access-roles', tenantId);
}

export function fetchRetailerTypes(tenantId?: string | null): Promise<RetailerTypeDTO[]> {
  return fetchCatalog<RetailerTypeDTO>('retailer-types', tenantId);
}

/** Active roles a caller may assign. Platform-super roles stay hidden from tenant admins. */
export async function fetchAssignableAccessRoles(tenantId?: string | null): Promise<AccessRoleDTO[]> {
  const access = await getCurrentAdminAccess();
  const rows = await fetchAccessRoles(tenantId);
  return rows.filter((row) => {
    if (row.isActive === false) return false;
    if (row.platformSuper && !access.isPlatformSuperAdmin) return false;
    return true;
  });
}

export function saveAccessRole(row: AccessRoleDTO, shared: boolean, tenantId?: string | null) {
  return saveCatalog('access-roles', row, shared, tenantId);
}

export function saveRetailerType(row: RetailerTypeDTO, shared: boolean, tenantId?: string | null) {
  return saveCatalog('retailer-types', row, shared, tenantId);
}

export function deleteAccessRole(row: AccessRoleDTO) {
  return deleteCatalog('access-roles', row);
}

export function deleteRetailerType(row: RetailerTypeDTO) {
  return deleteCatalog('retailer-types', row);
}
