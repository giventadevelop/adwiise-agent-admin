import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser, resolveSessionTenantForAccess } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl, getTenantIdOptional } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { fetchPlatformBillingPlans, fetchTenantProductBillings } from '@/app/admin/platform-billing/ApiServerActions';
import type { RetailLocationDTO } from '@/types/retail';
import BillingDesk from './BillingDesk';

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

export default async function TenantBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }> | { reason?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isAdmin) redirect('/');
  const session = await resolveSessionTenantForAccess(access);
  const tenantId = session.tenantId || getTenantIdOptional() || access.defaultTenantId;
  if (!tenantId) {
    redirect('/admin');
  }
  const resolvedSearch = typeof (searchParams as Promise<{ reason?: string }>).then === 'function'
    ? await (searchParams as Promise<{ reason?: string }>)
    : (searchParams as { reason?: string });
  const [rows, plans, locations] = await Promise.all([
    fetchTenantProductBillings(tenantId).catch(() => []),
    fetchPlatformBillingPlans().catch(() => []),
    loadLocations(tenantId).catch(() => []),
  ]);
  return (
    <BillingDesk
      tenantId={tenantId}
      canEditSwitch={access.isPlatformSuperAdmin}
      initialRows={rows}
      plans={plans}
      locations={locations}
      lockedNotice={resolvedSearch.reason === 'locked' || rows.some((row) => row.status === 'LOCKED')}
    />
  );
}
