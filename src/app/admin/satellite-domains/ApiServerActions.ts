'use server';
import {
  appendAdminTenantFilter,
  assertPlatformSuperAdmin,
  resolveAdminMutationTenantId,
} from '@/app/admin/adminAccessServer';

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { revalidateSatelliteConfigCache } from '@/lib/satelliteConfigRuntime';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import type { SatelliteDomainDTO } from '@/types';
import { fetchTenantSettingsByTenantId } from '@/app/admin/tenant-management/settings/ApiServerActions';

const API_BASE_URL = getApiBaseUrl();

/**
 * Returns tenant settings logoImageUrl for a tenant ID (for satellite branding / copy-paste).
 */
export async function fetchTenantLogoUrlFromTenantSettingsServer(
  tenantId: string
): Promise<string | null> {
  const tid = tenantId?.trim();
  if (!tid) return null;
  try {
    const settings = await fetchTenantSettingsByTenantId(tid);
    const url = settings?.logoImageUrl?.trim();
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Fetch paginated list of satellite domains with optional filters.
 */
export async function fetchSatelliteDomainsServer(
  page: number = 0,
  size: number = 20,
  tenantId?: string,
  filters?: {
    satelliteKey?: string;
    hostname?: string;
    enabled?: boolean;
  }
) {
  await assertPlatformSuperAdmin();
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', size.toString());
  params.append('sort', 'displayName,asc');
  await appendAdminTenantFilter(params, tenantId);

  // Apply optional filters
  if (filters?.satelliteKey) {
    params.append('satelliteKey.contains', filters.satelliteKey);
  }
  if (filters?.hostname) {
    params.append('hostname.contains', filters.hostname);
  }
  if (filters?.enabled !== undefined) {
    params.append('enabled.equals', filters.enabled.toString());
  }

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/satellite-domains?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch satellite domains: ${response.statusText}`);
  }

  const data = await response.json();
  const totalCount = parseInt(response.headers.get('x-total-count') || '0', 10);

  // Handle Spring Data REST paginated response format
  if (data._embedded && data._embedded.satelliteDomains) {
    return {
      data: data._embedded.satelliteDomains as SatelliteDomainDTO[],
      totalCount,
    };
  }

  // Handle direct array response
  return {
    data: Array.isArray(data) ? (data as SatelliteDomainDTO[]) : [data as SatelliteDomainDTO],
    totalCount: totalCount || (Array.isArray(data) ? data.length : 1),
  };
}

/**
 * Fetch a single satellite domain by ID.
 */
export async function fetchSatelliteDomainServer(id: number): Promise<SatelliteDomainDTO> {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/satellite-domains/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch satellite domain: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a new satellite domain.
 */
export async function createSatelliteDomainServer(
  domain: Omit<SatelliteDomainDTO, 'id' | 'createdAt' | 'updatedAt'>,
  tenantId?: string
): Promise<SatelliteDomainDTO> {
  await assertPlatformSuperAdmin();
  const currentTime = new Date().toISOString();
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload = {
    ...domain,
    createdAt: currentTime,
    updatedAt: currentTime,
    ...(tid != null ? { tenantId: tid } : {}),
  };

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/satellite-domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create satellite domain: ${errorText}`);
  }

  revalidateSatelliteConfigCache();
  return await response.json();
}

/**
 * Update a satellite domain (partial update via PATCH).
 */
export async function updateSatelliteDomainServer(
  id: number,
  domain: Partial<SatelliteDomainDTO>
): Promise<SatelliteDomainDTO> {
  await assertPlatformSuperAdmin();
  const payload = withTenantId({ ...domain, id });

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/satellite-domains/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update satellite domain: ${errorText}`);
  }

  revalidateSatelliteConfigCache();
  return await response.json();
}

/**
 * Delete a satellite domain by ID.
 */
export async function deleteSatelliteDomainServer(id: number): Promise<boolean> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/satellite-domains/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete satellite domain: ${errorText}`);
  }

  revalidateSatelliteConfigCache();
  return true;
}
