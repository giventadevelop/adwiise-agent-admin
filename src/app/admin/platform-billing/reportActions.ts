'use server';

import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchTenantOrganization, fetchTenantOrganizations } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { getApiBaseUrl } from '@/lib/env';
import { fetchPlatformCharges } from '@/lib/platformBilling/chargeLedger';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import type { PlatformBillingChargeDTO } from '@/types/platformBilling';

export interface PlatformBillingPortfolioRow {
  id: number;
  name: string;
  billingScope: string;
  amountUsd: number | null;
  status: string;
  stripeCustomerId: string;
  contactEmail: string;
  lastPayment: string;
  nextPeriod: string;
  coveredCount: number;
  websites: string[];
}

export interface PlatformBillingReport {
  rows: PlatformBillingPortfolioRow[];
  charges: PlatformBillingChargeDTO[];
  page: number;
  totalPages: number;
  totalCount: number;
  statusCounts: Record<string, number>;
  scopeCounts: Record<string, number>;
  notice: string;
}

const PAGE_SIZE = 20;

function scopeOf(organization: TenantOrganizationDTO): string {
  if (organization.billingScope === 'ORGANIZATION' || organization.billingScope === 'PER_TENANT') {
    return organization.billingScope;
  }
  return organization.monthlyFeeUsd != null && Number(organization.monthlyFeeUsd) > 0 ? 'ORGANIZATION' : 'PER_TENANT';
}

async function countBy(path: string, params: Record<string, string>): Promise<number> {
  const search = new URLSearchParams({ page: '0', size: '1', ...params });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${path}?${search.toString()}`, { cache: 'no-store' });
  if (!response.ok) return 0;
  return Number(response.headers.get('x-total-count') || response.headers.get('X-Total-Count') || 0);
}

async function organizationsForQuery(query: string, page: number): Promise<{ data: TenantOrganizationDTO[]; totalCount: number }> {
  if (/^\d+$/.test(query)) {
    const organization = await fetchTenantOrganization(Number(query));
    return { data: organization ? [organization] : [], totalCount: organization ? 1 : 0 };
  }
  if (query.startsWith('in_') || query.startsWith('sub_')) {
    const charges = await fetchPlatformCharges({
      stripeInvoiceId: query.startsWith('in_') ? query : undefined,
      stripeSubscriptionId: query.startsWith('sub_') ? query : undefined,
      size: 50,
    });
    const ids = [...new Set(charges.map((charge) => charge.organizationId).filter((id): id is number => id != null))];
    const data = (await Promise.all(ids.map((id) => fetchTenantOrganization(id)))).filter(
      (organization): organization is TenantOrganizationDTO => organization != null
    );
    return { data, totalCount: data.length };
  }
  if (query.startsWith('cus_')) {
    const result = await fetchTenantOrganizations({ page: 0, pageSize: 200 }, {});
    const data = result.data.filter((organization) => organization.stripeCustomerId === query);
    return { data, totalCount: data.length };
  }
  if (query.includes('@')) {
    const params = new URLSearchParams({ 'email.contains': query, size: '50' });
    const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`, { cache: 'no-store' });
    const settings = response.ok ? ((await response.json()) as Array<{ tenantOrganization?: { id?: number } }>) : [];
    const ids = [...new Set(settings.map((row) => row.tenantOrganization?.id).filter((id): id is number => id != null))];
    const data = (await Promise.all(ids.map((id) => fetchTenantOrganization(id)))).filter(
      (organization): organization is TenantOrganizationDTO => organization != null
    );
    return { data, totalCount: data.length };
  }
  if (query) {
    const [byName, byTenant] = await Promise.all([
      fetchTenantOrganizations({ page: 0, pageSize: 50 }, { search: query }).catch(() => ({ data: [] as TenantOrganizationDTO[], totalCount: 0 })),
      fetchTenantOrganizations({ page: 0, pageSize: 50 }, { tenantIdContains: query }).catch(() => ({ data: [] as TenantOrganizationDTO[], totalCount: 0 })),
    ]);
    const merged = new Map<number, TenantOrganizationDTO>();
    for (const organization of [...byName.data, ...byTenant.data]) {
      if (organization.id != null) merged.set(organization.id, organization);
    }
    return { data: [...merged.values()], totalCount: merged.size };
  }
  return fetchTenantOrganizations({ page, pageSize: PAGE_SIZE }, { sortBy: 'organizationName', sortOrder: 'asc' });
}

export async function loadPlatformBillingReport(query: string, page: number): Promise<PlatformBillingReport> {
  await assertPlatformSuperAdmin();
  const trimmed = query.trim();
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0;
  try {
    const found = await organizationsForQuery(trimmed, safePage);
    const start = trimmed ? safePage * PAGE_SIZE : 0;
    const pageRows = trimmed ? found.data.slice(start, start + PAGE_SIZE) : found.data;
    const chargeLists = await Promise.all(
      pageRows.map((organization) =>
        organization.id == null
          ? Promise.resolve([] as PlatformBillingChargeDTO[])
          : fetchPlatformCharges({ organizationId: organization.id, size: 20 }).catch(
              () => [] as PlatformBillingChargeDTO[]
            )
      )
    );
    const rows = pageRows.map((organization, index) => {
      const charges = chargeLists[index] || [];
      const paid = charges.find((charge) => charge.status === 'PAID');
      const websites = organization.websiteTenantIds || [];
      return {
        id: organization.id || 0,
        name: organization.organizationName || `Organization ${organization.id}`,
        billingScope: scopeOf(organization),
        amountUsd: organization.monthlyFeeUsd != null ? Number(organization.monthlyFeeUsd) : null,
        status: paid?.status || organization.subscriptionStatus || (scopeOf(organization) === 'ORGANIZATION' ? 'PAYMENT_DUE' : 'COMPLIMENTARY'),
        stripeCustomerId: organization.stripeCustomerId || '',
        contactEmail: organization.contactEmail || '',
        lastPayment: paid?.occurredAt || '',
        nextPeriod: charges[0]?.periodEnd || '',
        coveredCount: Math.max(websites.length - (scopeOf(organization) === 'ORGANIZATION' ? 1 : 0), 0),
        websites,
      };
    });
    const statusCounts: Record<string, number> = {};
    for (const status of ['OPEN', 'PAID', 'FAILED', 'VOID', 'REFUNDED']) {
      statusCounts[status] = await countBy('/api/platform-billing-charges', { 'status.equals': status });
    }
    const scopeCounts = {
      ORGANIZATION: await countBy('/api/tenant-organizations', { 'billingScope.equals': 'ORGANIZATION' }),
      PER_TENANT: await countBy('/api/tenant-organizations', { 'billingScope.equals': 'PER_TENANT' }),
    };
    return {
      rows,
      charges: chargeLists.flat(),
      page: safePage,
      totalPages: Math.max(1, Math.ceil((trimmed ? found.data.length : found.totalCount) / PAGE_SIZE)),
      totalCount: trimmed ? found.data.length : found.totalCount,
      statusCounts,
      scopeCounts,
      notice: '',
    };
  } catch (error) {
    return {
      rows: [],
      charges: [],
      page: 0,
      totalPages: 1,
      totalCount: 0,
      statusCounts: {},
      scopeCounts: {},
      notice: error instanceof Error ? error.message : 'Billing report is unavailable',
    };
  }
}
