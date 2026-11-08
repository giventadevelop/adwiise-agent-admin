'use server';

import { appendAdminTenantFilter, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import type { SchoolRecord } from '@/types/school';

const SCHOOL_RESOURCES = new Set([
  'school-departments',
  'school-staff-members',
  'school-facilities',
  'school-activities',
  'school-pages',
  'school-highlights',
  'school-fee-invoices',
  'school-fee-payments',
]);

function assertResource(resource: string): string {
  if (!SCHOOL_RESOURCES.has(resource)) {
    throw new Error('Unknown school resource');
  }
  return resource;
}

function parseList(data: unknown): SchoolRecord[] {
  if (Array.isArray(data)) return data as SchoolRecord[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.content)) return record.content as SchoolRecord[];
  }
  return [];
}

export async function fetchSchoolRecordsServer(
  resource: string,
  page = 0,
  pageSize = 50,
  sort = 'id,asc',
  extra?: Record<string, string>
): Promise<{ rows: SchoolRecord[]; totalCount: number }> {
  const path = assertResource(resource);
  const params = new URLSearchParams({
    page: String(Math.max(0, page)),
    size: String(Math.max(1, pageSize)),
    sort,
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  await appendAdminTenantFilter(params);
  const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/${path}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }
  const totalHeader = res.headers.get('x-total-count') || res.headers.get('X-Total-Count');
  const rows = parseList(await res.json());
  const totalCount = totalHeader ? Number(totalHeader) : rows.length;
  return { rows, totalCount: Number.isFinite(totalCount) ? totalCount : rows.length };
}

export async function saveSchoolRecordServer(
  resource: string,
  payload: SchoolRecord
): Promise<SchoolRecord> {
  const path = assertResource(resource);
  const tenantId = await resolveAdminMutationTenantId(payload.tenantId);
  const id = payload.id;
  const isUpdate = id != null && Number(id) > 0;
  const body = {
    ...payload,
    id: isUpdate ? id : undefined,
    tenantId,
  };
  const res = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/${path}${isUpdate ? `/${id}` : ''}`,
    {
      method: isUpdate ? 'PATCH' : 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': isUpdate ? 'application/merge-patch+json' : 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Failed to save ${path}: ${res.status}`);
  }
  return (await res.json()) as SchoolRecord;
}

export async function deleteSchoolRecordServer(resource: string, id: number): Promise<void> {
  const path = assertResource(resource);
  const tenantId = await resolveAdminMutationTenantId();
  const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/${path}/${id}`, {
    method: 'DELETE',
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete ${path}: ${res.status}`);
  }
}
