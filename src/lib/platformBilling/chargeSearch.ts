import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type {
  BillingHistoryRow,
  ChargeSearchFilters,
  ChargeSearchRow,
  ChargeStatusTotal,
  PlatformBillingChargeDTO,
} from '@/types/platformBilling';

interface OrganizationLite {
  id?: number;
  organizationName?: string;
}

/** What the Find box and the fixed filters resolve to. `empty` means the text matched no organization. */
export interface ChargeScope {
  organizationIds?: number[];
  tenantId?: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  empty?: boolean;
}

function list<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const content = (data as { content?: T[] } | null)?.content;
  return Array.isArray(content) ? content : [];
}

async function getJson<T>(path: string, params: URLSearchParams): Promise<{ data: T[]; total: number }> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${path}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`The billing search failed (${response.status}).`);
  }
  const data = list<T>(await response.json());
  const total = Number(response.headers.get('x-total-count') || data.length);
  return { data, total };
}

async function organizationIdsWhere(params: Record<string, string>): Promise<number[]> {
  const found = await getJson<OrganizationLite>('/api/tenant-organizations', new URLSearchParams({ size: '50', ...params }));
  return found.data.map((organization) => organization.id).filter((id): id is number => id != null);
}

/** Website ids and emails are stored on tenant settings, which point at the organization. */
async function organizationIdsFromSettings(params: Record<string, string>): Promise<number[]> {
  const found = await getJson<{ tenantOrganization?: { id?: number }; tenantOrganizationId?: number }>(
    '/api/tenant-settings',
    new URLSearchParams({ size: '50', ...params })
  );
  return found.data
    .map((row) => row.tenantOrganization?.id ?? row.tenantOrganizationId)
    .filter((id): id is number => typeof id === 'number');
}

/** Turns the Find text into the one field it names. */
export async function resolveFindText(find: string): Promise<ChargeScope> {
  const text = find.trim();
  if (!text) return {};
  if (text.startsWith('in_')) return { stripeInvoiceId: text };
  if (text.startsWith('sub_')) return { stripeSubscriptionId: text };
  if (text.startsWith('pi_')) return { stripePaymentIntentId: text };
  let ids: number[];
  if (/^\d+$/.test(text)) {
    ids = [Number(text)];
  } else if (text.startsWith('cus_')) {
    ids = await organizationIdsWhere({ 'stripeCustomerId.equals': text });
  } else if (text.includes('@')) {
    const [byContact, bySettings] = await Promise.all([
      organizationIdsWhere({ 'contactEmail.contains': text }).catch(() => [] as number[]),
      organizationIdsFromSettings({ 'email.contains': text }).catch(() => [] as number[]),
    ]);
    ids = [...byContact, ...bySettings];
  } else {
    const [byName, byTenant] = await Promise.all([
      organizationIdsWhere({ 'organizationName.contains': text }).catch(() => [] as number[]),
      organizationIdsFromSettings({ 'tenantId.contains': text }).catch(() => [] as number[]),
    ]);
    ids = [...byName, ...byTenant];
  }
  const unique = [...new Set(ids)];
  return unique.length > 0 ? { organizationIds: unique } : { empty: true };
}

function chargeParams(filters: ChargeSearchFilters, scope: ChargeScope): URLSearchParams {
  const params = new URLSearchParams();
  const tenantId = scope.tenantId || filters.tenantId?.trim();
  if (tenantId) params.set('tenantId.equals', tenantId);
  if (scope.organizationIds?.length) params.set('organizationId.in', scope.organizationIds.join(','));
  if (scope.stripeInvoiceId) params.set('stripeInvoiceId.equals', scope.stripeInvoiceId);
  if (scope.stripeSubscriptionId) params.set('stripeSubscriptionId.equals', scope.stripeSubscriptionId);
  if (scope.stripePaymentIntentId) params.set('stripePaymentIntentId.equals', scope.stripePaymentIntentId);
  // A billing row with product RETAIL is the organization charge. The Retail card is GAS_STATION.
  if (filters.fee === 'ORGANIZATION') params.set('product.equals', 'RETAIL');
  else if (filters.fee) params.set('product.equals', filters.fee);
  if (filters.statuses?.length) params.set('status.in', filters.statuses.join(','));
  if (filters.fromIso) params.set('occurredAt.greaterThanOrEqual', filters.fromIso);
  if (filters.toIso) params.set('occurredAt.lessThanOrEqual', filters.toIso);
  if (filters.amountMin && Number.isFinite(Number(filters.amountMin))) {
    params.set('amountUsd.greaterThanOrEqual', String(Number(filters.amountMin)));
  }
  if (filters.amountMax && Number.isFinite(Number(filters.amountMax))) {
    params.set('amountUsd.lessThanOrEqual', String(Number(filters.amountMax)));
  }
  if (filters.planId && /^\d+$/.test(filters.planId)) params.set('platformPlanId.equals', filters.planId);
  return params;
}

export async function organizationNames(ids: Array<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id): id is number => id != null))];
  const names = new Map<number, string>();
  for (let start = 0; start < unique.length; start += 100) {
    const chunk = unique.slice(start, start + 100);
    const found = await getJson<OrganizationLite>(
      '/api/tenant-organizations',
      new URLSearchParams({ 'id.in': chunk.join(','), size: String(chunk.length) })
    ).catch(() => ({ data: [] as OrganizationLite[], total: 0 }));
    for (const organization of found.data) {
      if (organization.id != null) names.set(organization.id, organization.organizationName || `Organization ${organization.id}`);
    }
  }
  return names;
}

/** Marks an Open or Failed row when a later row of the same invoice is Paid. */
async function markPaidLater(rows: ChargeSearchRow[]): Promise<void> {
  const invoices = [
    ...new Set(
      rows
        .filter((row) => (row.status === 'OPEN' || row.status === 'FAILED') && row.stripeInvoiceId)
        .map((row) => row.stripeInvoiceId as string)
    ),
  ];
  if (invoices.length === 0) return;
  const paid = await getJson<PlatformBillingChargeDTO>(
    '/api/platform-billing-charges',
    new URLSearchParams({ 'stripeInvoiceId.in': invoices.join(','), 'status.equals': 'PAID', size: '200' })
  ).catch(() => ({ data: [] as PlatformBillingChargeDTO[], total: 0 }));
  const paidInvoices = new Set(paid.data.map((charge) => charge.stripeInvoiceId));
  for (const row of rows) {
    if ((row.status === 'OPEN' || row.status === 'FAILED') && paidInvoices.has(row.stripeInvoiceId)) row.paidLater = true;
  }
}

export async function searchCharges(
  filters: ChargeSearchFilters,
  scope: ChargeScope,
  page: number,
  size: number
): Promise<{ rows: ChargeSearchRow[]; totalCount: number }> {
  if (scope.empty) return { rows: [], totalCount: 0 };
  const params = chargeParams(filters, scope);
  params.set('page', String(Math.max(0, page)));
  params.set('size', String(size));
  params.append('sort', filters.sort || 'occurredAt,desc');
  params.append('sort', 'id,desc');
  const found = await getJson<ChargeSearchRow>('/api/platform-billing-charges', params);
  await markPaidLater(found.data);
  return { rows: found.data, totalCount: found.total };
}

export async function chargeTotals(filters: ChargeSearchFilters, scope: ChargeScope): Promise<ChargeStatusTotal[]> {
  if (scope.empty) return [];
  const found = await getJson<ChargeStatusTotal>('/api/platform-billing-charges/totals', chargeParams(filters, scope));
  return found.data.map((total) => ({
    status: String(total.status),
    count: Number(total.count || 0),
    amountUsd: Number(total.amountUsd || 0),
  }));
}

export async function searchHistory(
  filters: ChargeSearchFilters,
  scope: ChargeScope,
  page: number,
  size: number
): Promise<{ rows: BillingHistoryRow[]; totalCount: number }> {
  if (scope.empty) return { rows: [], totalCount: 0 };
  const params = new URLSearchParams({ page: String(Math.max(0, page)), size: String(size), sort: 'occurredAt,desc' });
  const tenantId = scope.tenantId || filters.tenantId?.trim();
  if (tenantId) params.set('tenantId.equals', tenantId);
  if (scope.organizationIds?.length) params.set('organizationId.in', scope.organizationIds.join(','));
  if (filters.fee === 'ORGANIZATION') params.set('product.equals', 'RETAIL');
  else if (filters.fee) params.set('product.equals', filters.fee);
  if (filters.fromIso) params.set('occurredAt.greaterThanOrEqual', filters.fromIso);
  if (filters.toIso) params.set('occurredAt.lessThanOrEqual', filters.toIso);
  const found = await getJson<BillingHistoryRow>('/api/platform-billing-assignment-events', params);
  return { rows: found.data, totalCount: found.total };
}

/** Name and email of the users who made the changes, looked up from the stored user id. */
export async function actorNames(userIds: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  await Promise.all(
    unique.map(async (userId) => {
      const found = await getJson<{ firstName?: string; lastName?: string; email?: string }>(
        '/api/user-profiles',
        new URLSearchParams({ 'userId.equals': userId, size: '1' })
      ).catch(() => ({ data: [], total: 0 }));
      const profile = found.data[0];
      if (!profile) return;
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
      names.set(userId, [name, profile.email].filter(Boolean).join(', '));
    })
  );
  return names;
}
