'use server';

import { assertPlatformSuperAdmin, getCurrentAdminAccess } from '@/app/admin/adminAccessServer';
import { fetchTenantProductBillings, saveTenantProductBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { getBackendApiUrl } from '@/lib/env';
import {
  coveredByPortfolioNote,
  portfolioChargeNote,
  withNoteLine,
  withoutNoteLine,
} from '@/lib/platformBilling/complimentaryPlan';
import { cancelPlatformSubscription } from '@/lib/platformBilling/stripeCheckout';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { OrganizationPortfolioDTO, OrganizationPortfolioMemberDTO } from '@/types';
import type { PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';

const unscoped = {
  cache: 'no-store' as const,
  headers: { 'Content-Type': 'application/json' },
};

function apiUrl(path: string): string {
  return `${getBackendApiUrl()}/api/organization-portfolios${path}`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { detail?: string; title?: string; message?: string };
    return parsed.detail || parsed.message || parsed.title || fallback;
  } catch {
    return text.trim() || fallback;
  }
}

function parseList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as { content?: unknown[] };
    if (Array.isArray(obj.content)) return obj.content as T[];
  }
  return [];
}

export type ListOrganizationPortfoliosParams = {
  page?: number;
  size?: number;
  search?: string;
};

export type ListOrganizationPortfoliosResult = {
  items: OrganizationPortfolioDTO[];
  totalCount: number;
};

export async function listOrganizationPortfolios(
  params: ListOrganizationPortfoliosParams = {}
): Promise<ListOrganizationPortfoliosResult> {
  await assertPlatformSuperAdmin();
  const page = Math.max(0, params.page ?? 0);
  const size = Math.max(1, Math.min(params.size ?? 10, 200));
  const search = params.search?.trim().toLowerCase() ?? '';

  // When searching, load a wider window and filter client-side by name or primary tenant ID
  // (JHipster criteria ANDs multiple filters; OR across fields is not available).
  const fetchPage = search ? 0 : page;
  const fetchSize = search ? 200 : size;
  const query = new URLSearchParams();
  query.set('page', String(fetchPage));
  query.set('size', String(fetchSize));
  query.set('sort', 'portfolioName,asc');

  const response = await fetchWithJwtRetry(`${apiUrl('')}?${query.toString()}`, unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load portfolios'));
  }
  let items = parseList<OrganizationPortfolioDTO>(await response.json());
  const totalHeader = response.headers.get('x-total-count') || response.headers.get('X-Total-Count');
  let totalCount = totalHeader ? parseInt(totalHeader, 10) : items.length;
  if (!Number.isFinite(totalCount)) totalCount = items.length;

  if (search) {
    const filtered = items.filter((row) => {
      const name = row.portfolioName?.toLowerCase() ?? '';
      const primary = row.primaryTenantId?.toLowerCase() ?? '';
      const description = row.description?.toLowerCase() ?? '';
      return name.includes(search) || primary.includes(search) || description.includes(search);
    });
    const start = page * size;
    return {
      items: filtered.slice(start, start + size),
      totalCount: filtered.length,
    };
  }

  return { items, totalCount };
}

export async function listOrganizationPortfolioMembers(portfolioId: number): Promise<OrganizationPortfolioMemberDTO[]> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members`), unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load portfolio members'));
  }
  return parseList<OrganizationPortfolioMemberDTO>(await response.json());
}

export async function createOrganizationPortfolio(input: {
  portfolioName: string;
  description?: string;
  primaryTenantId: string;
  isActive?: boolean;
}): Promise<OrganizationPortfolioDTO> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(''), {
    ...unscoped,
    method: 'POST',
    body: JSON.stringify({
      portfolioName: input.portfolioName.trim(),
      description: input.description?.trim() || null,
      primaryTenantId: input.primaryTenantId.trim(),
      isActive: input.isActive !== false,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create portfolio'));
  }
  return (await response.json()) as OrganizationPortfolioDTO;
}

export async function setOrganizationPortfolioPrimary(portfolio: OrganizationPortfolioDTO, primaryTenantId: string): Promise<OrganizationPortfolioDTO> {
  await assertPlatformSuperAdmin();
  if (!portfolio.id) throw new Error('Portfolio id is required');
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolio.id}`), {
    ...unscoped,
    method: 'PUT',
    body: JSON.stringify({
      id: portfolio.id,
      portfolioName: portfolio.portfolioName,
      description: portfolio.description ?? null,
      primaryTenantId: primaryTenantId.trim(),
      isActive: portfolio.isActive !== false,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to update the primary tenant'));
  }
  return (await response.json()) as OrganizationPortfolioDTO;
}

export async function deleteOrganizationPortfolio(id: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${id}`), { ...unscoped, method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error(await readError(response, 'Failed to delete portfolio'));
  }
}

async function listPortfoliosForMatch(): Promise<OrganizationPortfolioDTO[]> {
  const query = new URLSearchParams();
  query.set('page', '0');
  query.set('size', '500');
  query.set('sort', 'portfolioName,asc');
  const response = await fetchWithJwtRetry(`${apiUrl('')}?${query.toString()}`, unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load portfolios'));
  }
  return parseList<OrganizationPortfolioDTO>(await response.json());
}

function portfolioNameMatches(portfolio: OrganizationPortfolioDTO, organizationName: string): boolean {
  const name = organizationName.trim().toLowerCase();
  return !!name && portfolio.portfolioName?.trim().toLowerCase() === name;
}

/**
 * Portfolio that already represents this organization: primary tenant, same name,
 * or any membership of the source tenant.
 */
async function findPortfolioForOrganizationUnchecked(
  sourceTenantId: string,
  organizationName: string
): Promise<OrganizationPortfolioDTO | null> {
  const tid = sourceTenantId.trim();
  if (!tid) return null;
  const portfolios = await listPortfoliosForMatch();
  const byPrimary = portfolios.find((portfolio) => portfolio.primaryTenantId === tid && portfolio.id != null);
  if (byPrimary) return byPrimary;
  const byName = portfolios.find((portfolio) => portfolio.id != null && portfolioNameMatches(portfolio, organizationName));
  if (byName) return byName;
  for (const portfolio of portfolios) {
    if (!portfolio.id) continue;
    const members = await listOrganizationPortfolioMembers(portfolio.id);
    if (members.some((member) => member.tenantId === tid)) return portfolio;
  }
  return null;
}

export async function findPortfolioForOrganization(
  sourceTenantId: string,
  organizationName: string
): Promise<OrganizationPortfolioDTO | null> {
  await assertPlatformSuperAdmin();
  return findPortfolioForOrganizationUnchecked(sourceTenantId, organizationName);
}

export type PortfolioSiteRow = {
  tenantId: string;
  isPrimary: boolean;
  settingsId: number | null;
  organizationName: string | null;
};

/** Sites grouped with this tenant via its portfolio, for the organization detail page. */
export async function listPortfolioSitesForTenant(tenantId: string): Promise<{
  portfolio: OrganizationPortfolioDTO | null;
  sites: PortfolioSiteRow[];
  available: boolean;
}> {
  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin) return { portfolio: null, sites: [], available: false };
  const tid = tenantId.trim();
  if (!tid) return { portfolio: null, sites: [], available: true };
  const portfolio = await findPortfolioForOrganizationUnchecked(tid, '');
  if (!portfolio?.id) return { portfolio: null, sites: [], available: true };
  const members = await listOrganizationPortfolioMembers(portfolio.id);
  const { fetchTenantSettingsByTenantId } = await import(
    '@/app/admin/tenant-management/settings/ApiServerActions'
  );
  const sites: PortfolioSiteRow[] = [];
  for (const member of members) {
    const memberTenantId = member.tenantId?.trim();
    if (!memberTenantId) continue;
    const settings = await fetchTenantSettingsByTenantId(memberTenantId).catch(() => null);
    let organizationName = settings?.tenantOrganization?.organizationName?.trim() || null;
    if (!organizationName) {
      const { fetchTenantOrganizations } = await import(
        '@/app/admin/tenant-management/organizations/ApiServerActions'
      );
      const orgs = await fetchTenantOrganizations(
        { page: 0, pageSize: 5 },
        { tenantId: memberTenantId }
      ).catch(() => null);
      organizationName =
        orgs?.data.find((org) => org.tenantId === memberTenantId)?.organizationName?.trim() || null;
    }
    sites.push({
      tenantId: memberTenantId,
      isPrimary: member.isPrimary === true || memberTenantId === portfolio.primaryTenantId,
      settingsId: settings?.id ?? null,
      organizationName,
    });
  }
  sites.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.tenantId.localeCompare(b.tenantId));
  return { portfolio, sites, available: true };
}

/**
 * After onboarding approval: reuse the source org's portfolio or create one named
 * after the organization (primary = source tenant), then attach the new tenant.
 */
export async function ensurePortfolioMembershipForApprovedTenant(input: {
  sourceTenantId: string;
  organizationName: string;
  newTenantId: string;
  overridePortfolioId?: number;
}): Promise<{ portfolioId: number | null; created: boolean; warning?: string }> {
  await assertPlatformSuperAdmin();
  const newTenantId = input.newTenantId.trim();
  const sourceTenantId = input.sourceTenantId.trim();
  const organizationName = input.organizationName.trim();
  if (!newTenantId) return { portfolioId: null, created: false, warning: 'No new tenant id to attach.' };

  let portfolio: OrganizationPortfolioDTO | null = null;
  let created = false;

  if (input.overridePortfolioId) {
    const listed = await listPortfoliosForMatch();
    portfolio = listed.find((row) => row.id === input.overridePortfolioId) ?? null;
    if (!portfolio) {
      return {
        portfolioId: null,
        created: false,
        warning: 'The selected portfolio was not found. Attach the tenant from Organization portfolios.',
      };
    }
  } else if (sourceTenantId) {
    portfolio = await findPortfolioForOrganization(sourceTenantId, organizationName);
    if (!portfolio) {
      portfolio = await createOrganizationPortfolio({
        portfolioName: organizationName || sourceTenantId,
        description: `Sites for ${organizationName || sourceTenantId}`,
        primaryTenantId: sourceTenantId,
        isActive: true,
      });
      created = true;
    }
  } else {
    return {
      portfolioId: null,
      created: false,
      warning: 'No source organization was selected, so a portfolio was not created.',
    };
  }

  if (!portfolio?.id) {
    return { portfolioId: null, created, warning: 'Portfolio could not be resolved.' };
  }

  if (newTenantId !== portfolio.primaryTenantId) {
    const members = await listOrganizationPortfolioMembers(portfolio.id);
    const already = members.some((member) => member.tenantId === newTenantId);
    if (!already) {
      try {
        await addOrganizationPortfolioMember(portfolio.id, newTenantId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!/already|unique|duplicate|constraint/i.test(message)) {
          return {
            portfolioId: portfolio.id,
            created,
            warning: message || 'The site was created, but it was not added to the portfolio.',
          };
        }
      }
    }
  }

  return { portfolioId: portfolio.id, created };
}

export async function addOrganizationPortfolioMember(portfolioId: number, tenantId: string): Promise<OrganizationPortfolioMemberDTO> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members`), {
    ...unscoped,
    method: 'POST',
    body: JSON.stringify({ tenantId: tenantId.trim(), isPrimary: false }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to add tenant'));
  }
  const member = (await response.json()) as OrganizationPortfolioMemberDTO;
  try {
    await coverTenantWhenPortfolioIsCharged(portfolioId, tenantId.trim());
  } catch (error) {
    console.error('[portfolio-billing] new member was not marked covered', error);
  }
  return member;
}

const SITE_PRODUCTS: PlatformProduct[] = ['EVENT_SITE', 'GAS_STATION'];

function findPortfolioCharge(rows: TenantProductBillingDTO[], portfolioId: number): TenantProductBillingDTO | null {
  const note = portfolioChargeNote(portfolioId);
  return rows.find((row) => row.product === 'RETAIL' && (row.notes || '').includes(note)) ?? null;
}

async function portfolioTenantIds(portfolioId: number, primaryTenantId: string): Promise<string[]> {
  const members = await listOrganizationPortfolioMembers(portfolioId);
  const ids = new Set<string>();
  if (primaryTenantId.trim()) ids.add(primaryTenantId.trim());
  for (const member of members) {
    if (member.tenantId) ids.add(member.tenantId);
  }
  return [...ids];
}

async function markTenantCovered(tenantId: string, portfolioId: number): Promise<void> {
  const note = coveredByPortfolioNote(portfolioId);
  const rows = await fetchTenantProductBillings(tenantId);
  for (const product of SITE_PRODUCTS) {
    const row = rows.find((entry) => entry.product === product);
    if (row?.stripeSubscriptionId && row.chargeEnabled) {
      try {
        await cancelPlatformSubscription(row, false);
      } catch (error) {
        console.error('[portfolio-billing] member subscription cancel skipped', error);
      }
    }
    await saveTenantProductBilling({
      ...(row || { tenantId, product, graceDays: 14, billingMode: 'RECURRING' }),
      tenantId,
      product,
      chargeEnabled: false,
      status: row?.status === 'LOCKED' ? 'LOCKED' : 'COMPLIMENTARY',
      notes: withNoteLine(row?.notes, note),
    });
  }
}

async function uncoverTenant(tenantId: string, portfolioId: number): Promise<void> {
  const note = coveredByPortfolioNote(portfolioId);
  const rows = await fetchTenantProductBillings(tenantId);
  for (const product of SITE_PRODUCTS) {
    const row = rows.find((entry) => entry.product === product);
    if (!row?.id || !(row.notes || '').includes(note)) continue;
    await saveTenantProductBilling({
      ...row,
      notes: withoutNoteLine(row.notes, note),
    });
  }
}

export type PortfolioFlatFee = {
  billingId: number | null;
  monthlyUsd: number | null;
  chargeEnabled: boolean;
  status: string | null;
};

export async function loadPortfolioFlatFee(portfolioId: number, primaryTenantId: string): Promise<PortfolioFlatFee> {
  await assertPlatformSuperAdmin();
  const rows = await fetchTenantProductBillings(primaryTenantId);
  const row = findPortfolioCharge(rows, portfolioId);
  return {
    billingId: row?.id ?? null,
    monthlyUsd: row?.customFeeUsd != null ? Number(row.customFeeUsd) : null,
    chargeEnabled: !!row?.chargeEnabled,
    status: row?.status ?? null,
  };
}

async function coverTenantWhenPortfolioIsCharged(portfolioId: number, tenantId: string): Promise<void> {
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}`), unscoped);
  if (!response.ok) return;
  const portfolio = (await response.json()) as OrganizationPortfolioDTO;
  if (!portfolio.primaryTenantId) return;
  const fee = await loadPortfolioFlatFee(portfolioId, portfolio.primaryTenantId);
  if (!fee.chargeEnabled || fee.monthlyUsd == null || fee.monthlyUsd <= 0) return;
  await markTenantCovered(tenantId, portfolioId);
}

export async function savePortfolioFlatFee(input: {
  portfolioId: number;
  primaryTenantId: string;
  monthlyUsd: number;
}): Promise<PortfolioFlatFee> {
  await assertPlatformSuperAdmin();
  const amount = Math.round(Number(input.monthlyUsd) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a monthly amount of zero or more.');
  }
  const primaryTenantId = input.primaryTenantId.trim();
  const note = portfolioChargeNote(input.portfolioId);
  const tenantIds = await portfolioTenantIds(input.portfolioId, primaryTenantId);
  const primaryRows = await fetchTenantProductBillings(primaryTenantId);
  const existing = findPortfolioCharge(primaryRows, input.portfolioId);

  if (amount <= 0) {
    if (existing?.id) {
      await saveTenantProductBilling({
        ...existing,
        chargeEnabled: false,
        status: 'COMPLIMENTARY',
        customFeeUsd: null,
        clearCustomFee: true,
      });
    }
    for (const tenantId of tenantIds) {
      await uncoverTenant(tenantId, input.portfolioId);
    }
    return { billingId: existing?.id ?? null, monthlyUsd: null, chargeEnabled: false, status: 'COMPLIMENTARY' };
  }

  for (const tenantId of tenantIds) {
    if (tenantId === primaryTenantId) continue;
    const otherRows = await fetchTenantProductBillings(tenantId);
    const stale = findPortfolioCharge(otherRows, input.portfolioId);
    if (!stale?.id) continue;
    if (stale.stripeSubscriptionId) {
      try {
        await cancelPlatformSubscription(stale, false);
      } catch (error) {
        console.error('[portfolio-billing] previous primary subscription cancel skipped', error);
      }
    }
    await saveTenantProductBilling({
      ...stale,
      chargeEnabled: false,
      status: 'COMPLIMENTARY',
    });
  }

  const saved = await saveTenantProductBilling({
    ...(existing || { tenantId: primaryTenantId, product: 'RETAIL', graceDays: 14 }),
    tenantId: primaryTenantId,
    product: 'RETAIL',
    customFeeUsd: amount,
    chargeEnabled: true,
    billingMode: 'RECURRING',
    status: existing?.status === 'ACTIVE' || existing?.status === 'PAST_DUE' ? existing.status : 'PAYMENT_DUE',
    notes: withNoteLine(existing?.notes, note),
    clearCustomFee: false,
  });

  for (const tenantId of tenantIds) {
    await markTenantCovered(tenantId, input.portfolioId);
  }

  return {
    billingId: saved.id ?? null,
    monthlyUsd: amount,
    chargeEnabled: true,
    status: saved.status ?? 'PAYMENT_DUE',
  };
}

export async function removeOrganizationPortfolioMember(portfolioId: number, memberId: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members/${memberId}`), {
    ...unscoped,
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(await readError(response, 'Failed to remove tenant'));
  }
}
