import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser, readAdminSessionTenantCookie, resolveSessionTenantForAccess } from '@/app/admin/adminAccessServer';
import { isAdminSessionAllTenants } from '@/lib/adminSessionTenant';
import { loadOrganizationForTenantId } from '@/app/admin/tenant-management/organizations/websiteTenantIdsServer';
import AdminNavigation from '@/components/AdminNavigation';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import BillingTenantList from './BillingTenantList';

export default async function TenantBillingIndexPage({
  searchParams,
}: {
  searchParams?: { tenant?: string; reason?: string } | Promise<{ tenant?: string; reason?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isAdmin) redirect('/');

  const resolved =
    searchParams && typeof (searchParams as Promise<{ tenant?: string; reason?: string }>).then === 'function'
      ? await (searchParams as Promise<{ tenant?: string; reason?: string }>)
      : searchParams;
  const session = await resolveSessionTenantForAccess(access);
  const cookieTenant = (await readAdminSessionTenantCookie()) || '';
  const workspaceTenant =
    resolved?.tenant?.trim() ||
    session.tenantId ||
    (cookieTenant && !isAdminSessionAllTenants(cookieTenant) ? cookieTenant : '') ||
    access.defaultTenantId ||
    '';
  const organization = workspaceTenant ? await loadOrganizationForTenantId(workspaceTenant).catch(() => null) : null;
  const locked = resolved?.reason === 'locked';

  return (
    <div className="w-full overflow-x-hidden box-border px-2 sm:px-3" style={adminPageTopStyle}>
      <AdminNavigation showTenantBanner={false} />
      <div className="max-w-7xl mx-auto py-4">
        <h1 className="text-3xl font-bold text-gray-900">Platform billing</h1>
        <div className="mt-4 inline-flex flex-col gap-1 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Organization</span>
          <span className="text-lg font-bold text-indigo-950">{organization?.organizationName || 'Organization'}</span>
          <span className="text-sm font-semibold text-indigo-800">
            Database ID {organization?.id != null ? `#${organization.id}` : '—'}
          </span>
        </div>
        {locked ? (
          <p className="mt-4 text-sm text-red-700">Paid admin tools are locked until a platform fee is paid. Open a tenant to see its bill.</p>
        ) : null}
        {organization?.id != null ? (
          <BillingTenantList organizationId={organization.id} />
        ) : (
          <p className="mt-6 text-sm text-gray-600">Select an organization on Admin Home to list its tenant IDs.</p>
        )}
      </div>
    </div>
  );
}
