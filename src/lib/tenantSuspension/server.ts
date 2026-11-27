import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import {
  combineSuspension,
  notSuspended,
  type EffectiveTenantSuspension,
  type TenantSuspensionFlags,
} from './types';

/**
 * Reads whether a tenant ID's website or dashboard is suspended.
 * Results are cached in memory for a short time because the public site checks on every page.
 * Lookup errors fail open (not suspended) so a backend hiccup never takes a paying site down.
 */
const CACHE_TTL_MS = 30_000;
const ERROR_TTL_MS = 10_000;

type CacheEntry = { value: EffectiveTenantSuspension; expiresAt: number };
const cache = new Map<string, CacheEntry>();

type SettingsRow = TenantSuspensionFlags & {
  id?: number;
  tenantId?: string;
  tenantOrganization?: (TenantSuspensionFlags & { id?: number; parentOrganizationId?: number | null }) | null;
};

type OrganizationRow = TenantSuspensionFlags & { id?: number; parentOrganizationId?: number | null };

function hasSuspensionKeys(row: object | null | undefined): boolean {
  return Boolean(row && ('websiteSuspended' in row || 'dashboardSuspended' in row));
}

async function fetchOrganizationFlags(id: number): Promise<OrganizationRow | null> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${id}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`organization ${id}: ${response.status}`);
  return (await response.json()) as OrganizationRow;
}

/** Merge an organization's flags with its parent client organization's flags (one level). */
async function organizationFlagsWithParent(
  org: OrganizationRow | null,
): Promise<TenantSuspensionFlags | null> {
  if (!org) return null;
  const parentId = org.parentOrganizationId;
  if (!parentId || parentId === org.id) return org;
  const parent = await fetchOrganizationFlags(parentId).catch(() => null);
  if (!parent) return org;
  const merged = combineSuspension('', org, parent);
  return {
    websiteSuspended: merged.website,
    dashboardSuspended: merged.dashboard,
    suspensionReason: merged.reason,
  };
}

async function loadTenantSuspension(tenantId: string): Promise<EffectiveTenantSuspension> {
  const params = new URLSearchParams({ 'tenantId.equals': tenantId, size: '1' });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) throw new Error(`tenant settings ${tenantId}: ${response.status}`);
  const data = (await response.json()) as unknown;
  const rows = Array.isArray(data) ? (data as SettingsRow[]) : [];
  const row = rows.find((r) => r.tenantId?.trim() === tenantId) ?? null;
  if (!row) return notSuspended(tenantId);

  let organization: TenantSuspensionFlags | null = null;
  const nested = row.tenantOrganization;
  if (nested?.id) {
    const orgRow = hasSuspensionKeys(nested) ? nested : await fetchOrganizationFlags(nested.id);
    organization = await organizationFlagsWithParent(orgRow);
  }
  return combineSuspension(tenantId, row, organization);
}

export async function getTenantSuspension(tenantId: string | null | undefined): Promise<EffectiveTenantSuspension> {
  const id = tenantId?.trim();
  if (!id) return notSuspended('');
  const now = Date.now();
  const hit = cache.get(id);
  if (hit && hit.expiresAt > now) return hit.value;
  try {
    const value = await loadTenantSuspension(id);
    cache.set(id, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.warn('[tenantSuspension] lookup failed, treating as not suspended:', tenantId, error);
    const value = hit?.value ?? notSuspended(id);
    cache.set(id, { value, expiresAt: now + ERROR_TTL_MS });
    return value;
  }
}

/** Drop cached answers after a super admin changes a suspension on this server. */
export function clearTenantSuspensionCache(tenantIds?: string[]): void {
  if (!tenantIds) {
    cache.clear();
    return;
  }
  for (const id of tenantIds) cache.delete(id.trim());
}
