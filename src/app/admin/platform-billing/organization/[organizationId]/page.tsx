import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminRecordMissing from '@/components/admin/AdminRecordMissing';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { attachWebsiteTenantIds } from '@/app/admin/tenant-management/organizations/websiteTenantIdsServer';
import OrganizationBillingClient from '../OrganizationBillingClient';

export const dynamic = 'force-dynamic';

export default async function OrganizationBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }> | { organizationId: string };
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  await assertPlatformSuperAdmin();
  const resolved = typeof (params as Promise<{ organizationId: string }>).then === 'function'
    ? await (params as Promise<{ organizationId: string }>)
    : (params as { organizationId: string });
  const query = searchParams
    ? typeof (searchParams as Promise<{ page?: string }>).then === 'function'
      ? await (searchParams as Promise<{ page?: string }>)
      : (searchParams as { page?: string })
    : {};
  const organizationId = Number(resolved.organizationId);
  const organization = Number.isFinite(organizationId) ? await fetchTenantOrganization(organizationId).catch(() => null) : null;
  if (!organization || organization.id == null) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message="The billing link is out of date, or this organization was removed."
        backHref="/admin/platform-billing"
        backLabel="Back to Platform Billing"
      />
    );
  }
  const [withWebsites] = await attachWebsiteTenantIds([organization]);
  const monthlyFee = withWebsites.monthlyFeeUsd != null ? Number(withWebsites.monthlyFeeUsd) : 0;
  const monthlyEnabled = Number.isFinite(monthlyFee) && monthlyFee > 0;
  const scope = withWebsites.billingScope === 'ORGANIZATION' || monthlyEnabled ? 'ORGANIZATION' : 'PER_TENANT';
  const page = Number(query.page || 0);

  return (
    <div className="w-full min-w-0 px-2 sm:px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4" style={adminPageTopStyle}>
        <AdminBackButton href="/admin/platform-billing" label="Back to Platform Billing" />
        <h1 className="text-3xl font-bold">Organization billing</h1>
      </div>
      <OrganizationBillingClient
        organizationId={organization.id}
        name={withWebsites.organizationName || `Organization ${organization.id}`}
        contactEmail={withWebsites.contactEmail || ''}
        stripeCustomerId={withWebsites.stripeCustomerId || ''}
        subscriptionStatus={withWebsites.subscriptionStatus || ''}
        billingScope={scope}
        monthlyFeeUsd={monthlyEnabled ? monthlyFee : 0}
        websites={withWebsites.websiteTenantIds || []}
        page={Number.isFinite(page) && page >= 0 ? page : 0}
      />
    </div>
  );
}
