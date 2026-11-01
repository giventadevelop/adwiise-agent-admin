import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { fetchPlatformBillingPlans, fetchTenantProductBillings } from '@/app/admin/platform-billing/ApiServerActions';
import type { RetailLocationDTO } from '@/types/retail';
import BillingDesk from '@/app/admin/billing/BillingDesk';

export default async function TenantPlatformBillingPage({
  params,
}: {
  params: Promise<{ tenantId: string }> | { tenantId: string };
}) {
  const resolved = typeof (params as Promise<{ tenantId: string }>).then === 'function'
    ? await (params as Promise<{ tenantId: string }>)
    : (params as { tenantId: string });
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isPlatformSuperAdmin) redirect('/admin/billing');
  const tenantId = decodeURIComponent(resolved.tenantId);
  const paramsQuery = new URLSearchParams({ 'tenantId.equals': tenantId, size: '500' });
  const locationResponse = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/retail-locations?${paramsQuery.toString()}`,
    { cache: 'no-store', headers: { 'X-Tenant-ID': tenantId } }
  );
  const locationData = locationResponse.ok ? await locationResponse.json() : [];
  const locations: RetailLocationDTO[] = Array.isArray(locationData) ? locationData : locationData?.content ?? [];
  const [rows, plans] = await Promise.all([
    fetchTenantProductBillings(tenantId).catch(() => []),
    fetchPlatformBillingPlans().catch(() => []),
  ]);
  return (
    <BillingDesk
      tenantId={tenantId}
      canEditSwitch
      initialRows={rows}
      plans={plans}
      locations={locations}
      lockedNotice={rows.some((row) => row.status === 'LOCKED')}
    />
  );
}
