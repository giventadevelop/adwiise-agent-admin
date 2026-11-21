'use server';

import { headersForAdminTenantScope } from '@/app/admin/adminAccessServer';
import { loadOrganizationForTenantId } from '@/app/admin/tenant-management/organizations/websiteTenantIdsServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { TenantTournamentDTO } from '@/types';

export async function fetchTenantSiteTypeServer(tenantId: string): Promise<string | null> {
  if (!tenantId) return null;
  try {
    await headersForAdminTenantScope(tenantId);
    const row = await loadOrganizationForTenantId(tenantId);
    return typeof row?.siteType === 'string' ? row.siteType : null;
  } catch (error) {
    console.error('[fetchTenantSiteTypeServer]', error);
    return null;
  }
}

export async function saveTenantTournamentServer(
  payload: TenantTournamentDTO,
  tenantId?: string
): Promise<{ ok: true; tournament: TenantTournamentDTO } | { ok: false; error: string }> {
  try {
    const headers = await headersForAdminTenantScope(tenantId, {
      'Content-Type': payload.id ? 'application/merge-patch+json' : 'application/json',
    });
    const now = new Date().toISOString();
    const body: TenantTournamentDTO = {
      ...payload,
      tenantId: tenantId || payload.tenantId,
      createdAt: payload.createdAt || now,
      updatedAt: now,
    };
    const url = payload.id
      ? `${getApiBaseUrl()}/api/tenant-tournaments/${payload.id}`
      : `${getApiBaseUrl()}/api/tenant-tournaments`;
    const res = await fetchWithJwtRetry(url, {
      method: payload.id ? 'PATCH' : 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `Save failed (${res.status})` };
    }
    const tournament = (await res.json()) as TenantTournamentDTO;
    return { ok: true, tournament };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Save failed' };
  }
}

export async function deleteTenantTournamentServer(id: number, tenantId?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await headersForAdminTenantScope(tenantId);
    const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-tournaments/${id}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}
