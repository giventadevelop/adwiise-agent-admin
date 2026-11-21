'use server';

import { assertCanPayTenant, assertPlatformSuperAdmin } from '@/app/admin/platform-billing/ApiServerActions';
import { auth, currentUser } from '@clerk/nextjs/server';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import {
  actorNames,
  chargeTotals,
  organizationNames,
  resolveFindText,
  searchCharges,
  searchHistory,
} from '@/lib/platformBilling/chargeSearch';
import type {
  BillingHistoryResult,
  BillingHistoryRow,
  ChargeDetail,
  ChargeSearchFilters,
  ChargeSearchResult,
  ChargeSearchRow,
  PlatformBillingChargeDTO,
} from '@/types/platformBilling';

const PAGE_SIZE = 20;
const TENANT_PAGE_SIZE = 10;
const EXPORT_LIMIT = 5000;

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The billing search is unavailable.';
}

async function withNames(rows: ChargeSearchRow[]): Promise<ChargeSearchRow[]> {
  const names = await organizationNames(rows.map((row) => row.organizationId));
  return rows.map((row) => ({ ...row, organizationName: names.get(row.organizationId) || `Organization ${row.organizationId}` }));
}

async function historyWithNames(rows: BillingHistoryRow[]): Promise<BillingHistoryRow[]> {
  const [names, actors] = await Promise.all([
    organizationNames(rows.map((row) => row.organizationId)),
    actorNames(rows.map((row) => row.actorUserId)),
  ]);
  return rows.map((row) => ({
    ...row,
    organizationName: row.organizationId != null ? names.get(row.organizationId) || `Organization ${row.organizationId}` : '',
    actorName: row.actorUserId ? actors.get(row.actorUserId) || row.actorUserId : '',
  }));
}

/** Charge search across every organization. Platform super admin only. */
export async function searchPlatformCharges(filters: ChargeSearchFilters, page: number): Promise<ChargeSearchResult> {
  await assertPlatformSuperAdmin();
  try {
    const scope = await resolveFindText(filters.find || '');
    const [found, totals] = await Promise.all([
      searchCharges(filters, scope, page, PAGE_SIZE),
      chargeTotals(filters, scope),
    ]);
    return { rows: await withNames(found.rows), totalCount: found.totalCount, totals, notice: '' };
  } catch (error) {
    return { rows: [], totalCount: 0, totals: [], notice: message(error) };
  }
}

/** Every charge that matches the filters, for the export. Stops at 5,000 rows. */
export async function exportPlatformCharges(
  filters: ChargeSearchFilters
): Promise<{ rows: ChargeSearchRow[]; totalCount: number; truncated: boolean; notice: string }> {
  await assertPlatformSuperAdmin();
  try {
    const scope = await resolveFindText(filters.find || '');
    const rows: ChargeSearchRow[] = [];
    let totalCount = 0;
    for (let page = 0; rows.length < EXPORT_LIMIT; page += 1) {
      const found = await searchCharges(filters, scope, page, 500);
      totalCount = found.totalCount;
      rows.push(...found.rows);
      if (found.rows.length < 500) break;
    }
    const kept = rows.slice(0, EXPORT_LIMIT);
    return { rows: await withNames(kept), totalCount, truncated: totalCount > kept.length, notice: '' };
  } catch (error) {
    return { rows: [], totalCount: 0, truncated: false, notice: message(error) };
  }
}

/** Who changed a plan, fee, switch, grace days or billing scope. Platform super admin only. */
export async function searchPlatformBillingHistory(filters: ChargeSearchFilters, page: number): Promise<BillingHistoryResult> {
  await assertPlatformSuperAdmin();
  try {
    const scope = await resolveFindText(filters.find || '');
    if (scope.stripeInvoiceId || scope.stripeSubscriptionId || scope.stripePaymentIntentId) {
      return { rows: [], totalCount: 0, notice: 'Change history cannot be searched by a Stripe id. Search by organization or website.' };
    }
    const found = await searchHistory(filters, scope, page, PAGE_SIZE);
    return { rows: await historyWithNames(found.rows), totalCount: found.totalCount, notice: '' };
  } catch (error) {
    return { rows: [], totalCount: 0, notice: message(error) };
  }
}

export async function loadChargeDetail(chargeId: number): Promise<ChargeDetail | null> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/platform-billing-charges/${chargeId}`, { cache: 'no-store' });
  if (!response.ok) return null;
  const charge = (await response.json()) as PlatformBillingChargeDTO;
  const [named] = await withNames([charge]);
  const sameInvoice = charge.stripeInvoiceId
    ? (await searchCharges({ sort: 'occurredAt,asc' }, { stripeInvoiceId: charge.stripeInvoiceId }, 0, 50)).rows
    : [];
  const history = charge.tenantId
    ? await searchHistory(
        { fee: charge.product === 'RETAIL' ? 'ORGANIZATION' : charge.product },
        { tenantId: charge.tenantId },
        0,
        5
      )
    : await searchHistory({ fee: 'ORGANIZATION' }, { organizationIds: [charge.organizationId] }, 0, 5);
  const key = process.env.STRIPE_SECRET_KEY || process.env.AMPLIFY_STRIPE_SECRET_KEY || '';
  return {
    charge: named,
    sameInvoice,
    history: await historyWithNames(history.rows),
    stripeTestMode: key.startsWith('sk_test_'),
  };
}

/**
 * Charges of one website, for the Charges table on the billing page.
 * A tenant admin may read their own website only, and does not get subscription, payment or event ids.
 */
export async function searchTenantCharges(
  tenantId: string,
  filters: Pick<ChargeSearchFilters, 'fee' | 'statuses' | 'fromIso' | 'toIso'>,
  page: number
): Promise<ChargeSearchResult> {
  await assertCanPayTenant(tenantId);
  try {
    const { userId } = await auth();
    const user = await currentUser();
    const access = userId
      ? await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress)
      : null;
    const found = await searchCharges(
      { fee: filters.fee, statuses: filters.statuses, fromIso: filters.fromIso, toIso: filters.toIso },
      { tenantId },
      page,
      TENANT_PAGE_SIZE
    );
    const rows = access?.isPlatformSuperAdmin
      ? found.rows
      : found.rows.map((row) => ({
          ...row,
          stripeSubscriptionId: null,
          stripePaymentIntentId: null,
          stripeEventId: null,
          notes: null,
        }));
    return { rows, totalCount: found.totalCount, totals: [], notice: '' };
  } catch (error) {
    return { rows: [], totalCount: 0, totals: [], notice: message(error) };
  }
}
