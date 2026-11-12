import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
import type { PlatformBillingChargeDTO, TenantProductBillingDTO } from '@/types/platformBilling';

function headers(tenantId?: string | null): Record<string, string> {
  const next: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId) next['X-Tenant-ID'] = tenantId;
  return next;
}

function readList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}

export async function appendPlatformCharge(charge: PlatformBillingChargeDTO): Promise<void> {
  if (!charge.organizationId) return;
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/platform-billing-charges`, {
    method: 'POST',
    cache: 'no-store',
    headers: headers(charge.tenantId),
    body: JSON.stringify({ ...charge, id: null, currency: charge.currency || 'USD', intervalCount: charge.intervalCount || 1 }),
  });
  if (!response.ok && response.status !== 409) {
    const text = await response.text().catch(() => '');
    console.error('[platform-billing] charge ledger insert failed', response.status, text);
  }
}

export async function appendAssignmentEvent(event: {
  organizationId?: number | null;
  tenantId?: string | null;
  product?: string | null;
  previousPlanCode?: string | null;
  newPlanCode?: string | null;
  previousAmountUsd?: number | null;
  newAmountUsd?: number | null;
  actorUserId?: string | null;
  reason: string;
}): Promise<void> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/platform-billing-assignment-events`, {
    method: 'POST',
    cache: 'no-store',
    headers: headers(event.tenantId),
    body: JSON.stringify({ ...event, id: null, occurredAt: new Date().toISOString() }),
  });
  if (!response.ok) {
    console.error('[platform-billing] assignment event failed', response.status, await response.text().catch(() => ''));
  }
}

export async function fetchPlatformCharges(query: {
  tenantId?: string;
  organizationId?: number;
  status?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  size?: number;
}): Promise<PlatformBillingChargeDTO[]> {
  const params = new URLSearchParams({ size: String(query.size ?? 100), sort: 'occurredAt,desc' });
  if (query.tenantId) params.set('tenantId.equals', query.tenantId);
  if (query.organizationId != null) params.set('organizationId.equals', String(query.organizationId));
  if (query.status) params.set('status.equals', query.status);
  if (query.stripeSubscriptionId) params.set('stripeSubscriptionId.equals', query.stripeSubscriptionId);
  if (query.stripeInvoiceId) params.set('stripeInvoiceId.equals', query.stripeInvoiceId);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/platform-billing-charges?${params.toString()}`, {
    cache: 'no-store',
    headers: headers(query.tenantId),
  });
  if (!response.ok) return [];
  return readList<PlatformBillingChargeDTO>(await response.json());
}

export async function lockBillingIfGraceEnded(row: TenantProductBillingDTO): Promise<TenantProductBillingDTO> {
  if (!row.id || !row.chargeEnabled) return row;
  if (row.status !== 'PAYMENT_DUE' && row.status !== 'PAST_DUE') return row;
  if (isCoveredByPortfolio(row.notes)) return row;
  if (!row.graceEndsAt || new Date(row.graceEndsAt).getTime() > Date.now()) return row;
  const paid = await fetchPlatformCharges({ tenantId: row.tenantId, status: 'PAID', size: 20 });
  const covered = paid.some((charge) => charge.periodEnd && new Date(charge.periodEnd).getTime() > Date.now());
  if (covered) return row;
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-product-billings/${row.id}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { ...headers(row.tenantId), 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ id: row.id, tenantId: row.tenantId, status: 'LOCKED', updatedAt: new Date().toISOString() }),
  });
  if (!response.ok) return row;
  return { ...row, status: 'LOCKED' };
}
