import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { fetchPlatformBillingPlans, prepareTenantBillingDesk } from '@/app/admin/platform-billing/ApiServerActions';
import type { RetailLocationDTO } from '@/types/retail';
import { loadShopPack } from '@/lib/platformBilling/shopPackServer';
import { isTenantIdAllowed } from '@/lib/adminTenantAccess';
import BillingDesk from '../BillingDesk';

async function loadLocations(tenantId: string): Promise<RetailLocationDTO[]> {
  const params = new URLSearchParams({ 'tenantId.equals': tenantId, size: '500' });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/retail-locations?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : data?.content ?? [];
}

export default async function TenantBillingDeskPage({
  params,
  searchParams,
}: {
  params: { tenantId: string } | Promise<{ tenantId: string }>;
  searchParams: Promise<{ reason?: string }> | { reason?: string };
}) {
  const resolvedParams = typeof (params as Promise<{ tenantId: string }>).then === 'function'
    ? await (params as Promise<{ tenantId: string }>)
    : (params as { tenantId: string });
  const tenantId = decodeURIComponent(resolvedParams.tenantId || '').trim();
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isAdmin) redirect('/');
  if (!tenantId) redirect('/admin/billing');
  if (!isTenantIdAllowed(access, tenantId)) redirect('/admin/billing');
  const resolvedSearch = typeof (searchParams as Promise<{ reason?: string }>).then === 'function'
    ? await (searchParams as Promise<{ reason?: string }>)
    : (searchParams as { reason?: string });
  const [desk, plans, locations, shopPack] = await Promise.all([
    prepareTenantBillingDesk(tenantId).catch(() => ({ rows: [], complimentaryPlan: false, charges: [] })),
    fetchPlatformBillingPlans().catch(() => []),
    loadLocations(tenantId).catch(() => []),
    loadShopPack(tenantId).catch(() => ({ code: null, label: null })),
  ]);
  return (
    <BillingDesk
      tenantId={tenantId}
      canEditSwitch={access.isPlatformSuperAdmin}
      initialRows={desk.rows}
      plans={plans}
      locations={locations}
      complimentaryPlan={desk.complimentaryPlan}
      lockedNotice={resolvedSearch.reason === 'locked' || desk.rows.some((row) => row.status === 'LOCKED')}
      shopPackCode={shopPack.code}
      shopPackLabel={shopPack.label}
    />
  );
}
