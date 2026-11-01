'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { PlatformBillingPlanDTO, TenantProductBillingDTO } from '@/types/platformBilling';

function apiBase() {
  return getApiBaseUrl();
}

function tenantHeaders(tenantId?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function assertPlatformSuperAdmin(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Sign in required');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isPlatformSuperAdmin) {
    throw new Error('Only a platform super-admin can change platform billing');
  }
}

export async function setLocationIncludedInBilling(
  tenantId: string,
  locationId: number,
  included: boolean
): Promise<void> {
  await assertCanPayTenant(tenantId);
  const response = await fetchWithJwtRetry(`${apiBase()}/api/retail-locations/${locationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'X-Tenant-ID': tenantId,
    },
    body: JSON.stringify({
      id: locationId,
      includedInSubscription: included,
      updatedAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function assertCanPayTenant(tenantId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Sign in required');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isAdmin) throw new Error('Admin access required');
  if (access.isPlatformSuperAdmin) return;
  if (!access.allowedTenantIds.includes(tenantId)) {
    throw new Error('This billing record belongs to another tenant');
  }
}

export async function fetchPlatformBillingPlans(product?: string): Promise<PlatformBillingPlanDTO[]> {
  const params = new URLSearchParams({ size: '200', sort: 'product,asc' });
  if (product) params.set('product.equals', product);
  const response = await fetchWithJwtRetry(`${apiBase()}/api/platform-billing-plans?${params.toString()}`, {
    cache: 'no-store',
    headers: tenantHeaders(),
  });
  const data = await readJson<PlatformBillingPlanDTO[] | { content?: PlatformBillingPlanDTO[] }>(response);
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
}

export async function savePlatformBillingPlan(plan: PlatformBillingPlanDTO): Promise<PlatformBillingPlanDTO> {
  await assertPlatformSuperAdmin();
  const now = new Date().toISOString();
  if (plan.id) {
    const response = await fetchWithJwtRetry(`${apiBase()}/api/platform-billing-plans/${plan.id}`, {
      method: 'PUT',
      headers: tenantHeaders(plan.tenantId),
      body: JSON.stringify({ ...plan, updatedAt: now }),
    });
    return readJson(response);
  }
  const response = await fetchWithJwtRetry(`${apiBase()}/api/platform-billing-plans`, {
    method: 'POST',
    headers: tenantHeaders(),
    body: JSON.stringify({ ...plan, id: null, createdAt: now, updatedAt: now }),
  });
  return readJson(response);
}

export async function fetchTenantProductBillings(tenantId: string): Promise<TenantProductBillingDTO[]> {
  const params = new URLSearchParams({
    'tenantId.equals': tenantId,
    size: '20',
  });
  const response = await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings?${params.toString()}`, {
    cache: 'no-store',
    headers: tenantHeaders(tenantId),
  });
  const data = await readJson<TenantProductBillingDTO[] | { content?: TenantProductBillingDTO[] }>(response);
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
}

export async function tenantHasLockedPlatformBilling(tenantId: string): Promise<boolean> {
  try {
    const rows = await fetchTenantProductBillings(tenantId);
    return rows.some((row) => row.status === 'LOCKED');
  } catch (error) {
    console.error('[platform-billing] lock check skipped:', error);
    return false;
  }
}

export async function saveTenantProductBilling(row: TenantProductBillingDTO): Promise<TenantProductBillingDTO> {
  await assertPlatformSuperAdmin();
  const now = new Date().toISOString();
  const headers = {
    ...tenantHeaders(row.tenantId),
    'Content-Type': row.id ? 'application/merge-patch+json' : 'application/json',
  };
  if (row.id) {
    const response = await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings/${row.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...row, id: row.id, updatedAt: now }),
    });
    return readJson(response);
  }
  const response = await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings`, {
    method: 'POST',
    headers: tenantHeaders(row.tenantId),
    body: JSON.stringify({
      ...row,
      id: null,
      chargeEnabled: row.chargeEnabled ?? false,
      status: row.status ?? 'COMPLIMENTARY',
      graceDays: row.graceDays ?? 14,
      createdAt: now,
      updatedAt: now,
    }),
  });
  return readJson(response);
}

export async function patchTenantProductBillingFromWebhook(
  row: Partial<TenantProductBillingDTO> & { id: number; tenantId: string }
): Promise<void> {
  const response = await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings/${row.id}`, {
    method: 'PATCH',
    headers: {
      ...tenantHeaders(row.tenantId),
      'Content-Type': 'application/merge-patch+json',
    },
    body: JSON.stringify({ ...row, updatedAt: new Date().toISOString() }),
  });
  await readJson(response);
}
