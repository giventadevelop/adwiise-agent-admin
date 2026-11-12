'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { isComplimentarySubscriptionPlan, isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
import { appendAssignmentEvent, fetchPlatformCharges, lockBillingIfGraceEnded } from '@/lib/platformBilling/chargeLedger';
import { cancelPlatformSubscription, loadOrganization } from '@/lib/platformBilling/stripeCheckout';
import type { PlatformBillingChargeDTO, PlatformBillingPlanDTO, PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';

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

const SITE_PRODUCTS: PlatformProduct[] = ['EVENT_SITE', 'GAS_STATION'];

async function refuseSeparateCharge(row: TenantProductBillingDTO): Promise<void> {
  if (!row.chargeEnabled) return;
  if (row.product !== 'EVENT_SITE' && row.product !== 'GAS_STATION') return;
  if (isCoveredByPortfolio(row.notes)) {
    throw new Error(
      'This tenant is covered by an organization portfolio charge. Clear that portfolio fee before charging this tenant on its own.'
    );
  }
  const org = await loadOrganization(row.tenantId);
  if (isComplimentarySubscriptionPlan(org?.subscriptionPlan)) {
    throw new Error('This tenant plan is free or demo. The platform charge switch stays off, so Stripe is not called.');
  }
}

export async function applyComplimentaryPlatformBilling(tenantId: string): Promise<TenantProductBillingDTO[]> {
  await assertPlatformSuperAdmin();
  const org = await loadOrganization(tenantId);
  const existing = await fetchTenantProductBillings(tenantId);
  if (!isComplimentarySubscriptionPlan(org?.subscriptionPlan)) return existing;

  const saved: TenantProductBillingDTO[] = [];
  for (const product of SITE_PRODUCTS) {
    const row = existing.find((entry) => entry.product === product);
    if (row?.id && !row.chargeEnabled && (row.status === 'COMPLIMENTARY' || row.status === 'LOCKED')) {
      saved.push(row);
      continue;
    }
    if (row?.stripeSubscriptionId && row.chargeEnabled) {
      try {
        await cancelPlatformSubscription(row, false);
      } catch (error) {
        console.error('[platform-billing] complimentary cancel skipped', error);
      }
    }
    saved.push(
      await saveTenantProductBilling({
        ...(row || { tenantId, product, graceDays: 14, billingMode: 'RECURRING' }),
        tenantId,
        product,
        chargeEnabled: false,
        status: row?.status === 'LOCKED' ? 'LOCKED' : 'COMPLIMENTARY',
      })
    );
  }
  return [...saved, ...existing.filter((entry) => entry.product === 'RETAIL')];
}

export async function prepareTenantBillingDesk(tenantId: string): Promise<{
  rows: TenantProductBillingDTO[];
  complimentaryPlan: boolean;
  charges: PlatformBillingChargeDTO[];
}> {
  const org = await loadOrganization(tenantId);
  const complimentaryPlan = isComplimentarySubscriptionPlan(org?.subscriptionPlan);
  const charges = await fetchPlatformCharges({ tenantId, size: 50 }).catch(() => []);
  const settle = async (rows: TenantProductBillingDTO[]) => {
    const next: TenantProductBillingDTO[] = [];
    for (const row of rows) next.push(await lockBillingIfGraceEnded(row));
    return next;
  };
  if (!complimentaryPlan) {
    return { rows: await settle(await fetchTenantProductBillings(tenantId)), complimentaryPlan: false, charges };
  }
  try {
    return { rows: await settle(await applyComplimentaryPlatformBilling(tenantId)), complimentaryPlan: true, charges };
  } catch (error) {
    console.error('[platform-billing] complimentary apply skipped', error);
    return { rows: await settle(await fetchTenantProductBillings(tenantId).catch(() => [])), complimentaryPlan: true, charges };
  }
}

export async function saveTenantProductBilling(row: TenantProductBillingDTO): Promise<TenantProductBillingDTO> {
  await assertPlatformSuperAdmin();
  await refuseSeparateCharge(row);
  const now = new Date().toISOString();
  const previous = row.id
    ? (await fetchTenantProductBillings(row.tenantId).catch(() => [])).find((entry) => entry.id === row.id) || null
    : null;
  const headers = {
    ...tenantHeaders(row.tenantId),
    'Content-Type': row.id ? 'application/merge-patch+json' : 'application/json',
  };
  const saved = row.id
    ? await readJson<TenantProductBillingDTO>(
        await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings/${row.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ ...row, id: row.id, updatedAt: now }),
        })
      )
    : await readJson<TenantProductBillingDTO>(
        await fetchWithJwtRetry(`${apiBase()}/api/tenant-product-billings`, {
          method: 'POST',
          headers: tenantHeaders(row.tenantId),
          body: JSON.stringify({
            ...row,
            id: null,
            chargeEnabled: row.chargeEnabled ?? false,
            status: row.status ?? 'COMPLIMENTARY',
            graceDays: row.graceDays ?? 14,
            intervalCount: row.intervalCount ?? 1,
            createdAt: now,
            updatedAt: now,
          }),
        })
      );
  const changed =
    !previous ||
    previous.platformPlanId !== saved.platformPlanId ||
    Number(previous.customFeeUsd || 0) !== Number(saved.customFeeUsd || 0) ||
    Boolean(previous.chargeEnabled) !== Boolean(saved.chargeEnabled) ||
    Number(previous.graceDays || 0) !== Number(saved.graceDays || 0);
  if (changed) {
    const { userId } = await auth();
    const org = saved.organizationId ? { id: saved.organizationId } : await loadOrganization(saved.tenantId);
    await appendAssignmentEvent({
      organizationId: org?.id ?? null,
      tenantId: saved.tenantId,
      product: saved.product,
      previousPlanCode: previous?.platformPlanId != null ? String(previous.platformPlanId) : null,
      newPlanCode: saved.platformPlanId != null ? String(saved.platformPlanId) : null,
      previousAmountUsd: previous?.customFeeUsd ?? null,
      newAmountUsd: saved.customFeeUsd ?? null,
      actorUserId: userId,
      reason: !previous
        ? 'Created the billing row'
        : Boolean(previous.chargeEnabled) !== Boolean(saved.chargeEnabled)
          ? saved.chargeEnabled
            ? 'Turned the charge switch on'
            : 'Turned the charge switch off'
          : 'Changed the plan, custom fee, or grace days',
    }).catch((error) => console.error('[platform-billing] assignment event skipped', error));
  }
  return saved;
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
