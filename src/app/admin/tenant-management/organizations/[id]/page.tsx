import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import AdminRecordMissing, { isMissingRecordError } from '@/components/admin/AdminRecordMissing';
import Link from 'next/link';
import { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import { formatOrganizationAddress } from '@/lib/formatOrganizationAddress';
import { resolveTenantOrganizationIdentity } from '@/lib/resolveTenantOrganizationIdentity';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import AdminBackButton from '@/components/admin/AdminBackButton';
import CascadeDeleteOrganizationButton from '@/app/admin/tenant-management/organizations/CascadeDeleteOrganizationButton';
import OrganizationActiveStatusButton from '@/app/admin/tenant-management/organizations/OrganizationActiveStatusButton';
import { getCurrentAdminAccess } from '@/app/admin/adminAccessServer';
import OrganizationTenantIdList from '@/app/admin/tenant-management/organizations/OrganizationTenantIdList';

interface PageProps {
  params: { id: string };
}

export default async function TenantOrganizationViewPage({ params }: PageProps) {
  const resolvedParams = typeof params.then === 'function' ? await params : params;
  const { id } = resolvedParams;
  const organizationId = parseInt(id);

  if (isNaN(organizationId)) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message="The link does not match an organization. It may have been deleted. Go back to the organization list and open one that is still there."
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }

  const adminAccess = await getCurrentAdminAccess();

  let organization: TenantOrganizationDTO | null = null;
  let error = null;

  try {
    organization = await fetchTenantOrganization(organizationId);
    if (!organization) {
      return (
        <AdminRecordMissing
          title="This organization is no longer available"
          message={`Organization #${organizationId} was deleted, or this page was left open after it was removed. Its tenant ids are no longer on this page.`}
          backHref="/admin/tenant-management/organizations"
          backLabel="Back to Organizations"
        />
      );
    }
  } catch (err) {
    if (isMissingRecordError(err)) {
      return (
        <AdminRecordMissing
          title="This organization is no longer available"
          message={`Organization #${organizationId} was deleted, or this page was left open after it was removed. Its tenant ids are no longer on this page.`}
          backHref="/admin/tenant-management/organizations"
          backLabel="Back to Organizations"
        />
      );
    }
    console.error('Error fetching organization:', err);
    error = 'The organization could not be loaded. Refresh the page, or go back to the list.';
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
        <div className="mb-8">
          <AdminBackButton href="/admin/tenant-management/organizations" label="Back to Organizations" />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading organization</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message={`Organization #${organizationId} was deleted, or this page was left open after it was removed.`}
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }

  const tenantIds = organization.websiteTenantIds || [];
  const tenantSummary = tenantIds.length === 0
    ? 'No tenant IDs yet'
    : `${tenantIds.length} tenant ${tenantIds.length === 1 ? 'ID' : 'IDs'}`;
  const identity = resolveTenantOrganizationIdentity(organization, null);
  const monthlyChargeAmount = organization.monthlyFeeUsd != null ? Number(organization.monthlyFeeUsd) : 0;
  const monthlyChargeEnabled = Number.isFinite(monthlyChargeAmount) && monthlyChargeAmount > 0;
  const monthlyChargeLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monthlyChargeEnabled ? monthlyChargeAmount : 0);
  const formattedAddress = formatOrganizationAddress(identity);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link href="/admin" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Admin Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href="/admin/tenant-management/organizations" className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2">
                Organizations
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {organization.organizationName || 'Organization'}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="mb-8">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{organization.organizationName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${organization.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {organization.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <a href="#tenant-ids" className="inline-flex items-center h-10 px-4 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold">
              {tenantSummary}. View tenant IDs
            </a>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
              {identity?.description || 'No description provided'}
            </p>
          </div>
          <Link
            href={`/admin/tenant-management/organizations/${id}/edit`}
            className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Edit Organization"
            aria-label="Edit Organization"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700">Edit Organization</span>
          </Link>
        </div>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Database ID</div>
        <div className="font-mono font-bold text-indigo-800 text-lg">
          {organization.id != null ? `#${organization.id}` : '—'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-2">
                    <span
                      className={`inline-flex items-center px-5 py-2 rounded-full text-xl font-bold border-2 ${
                        organization.isActive
                          ? 'bg-green-100 text-green-800 border-green-500'
                          : 'bg-red-100 text-red-800 border-red-500'
                      }`}
                    >
                      {organization.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Database ID (PK)</dt>
                  <dd className="mt-1">
                    <span className="inline-block font-mono font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-sm">
                      {organization.id != null ? organization.id : 'Not available'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Organization Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.organizationName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.contactEmail || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.contactPhone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact person name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.contactPersonName || 'Pending'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website URL</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {identity?.websiteUrl ? (
                      <a href={identity.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                        {identity.websiteUrl}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{formattedAddress ?? 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {organization.updatedAt ? new Date(organization.updatedAt).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <h4 className="text-base font-medium text-gray-900">Organization monthly charge</h4>
              <p className="mt-1 text-sm text-gray-600">
                This is one charge for the organization. Tenant IDs under it are complimentary and are not billed on their own.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${monthlyChargeEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {monthlyChargeEnabled ? 'Enabled' : 'Not enabled'}
                </span>
                <span className="text-sm font-semibold text-gray-900">{monthlyChargeLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/admin/onboarding-requests/new?organizationId=${organization.id}`}
              className="w-full flex-shrink-0 h-14 rounded-xl bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Onboard a tenant ID"
              aria-label="Onboard a tenant ID"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-semibold text-emerald-700">Onboard a tenant ID</span>
            </Link>
            <Link
              href={`/admin/tenant-management/organizations/${organization.id}/move-tenant`}
              className="w-full flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Move a tenant ID to this organization"
              aria-label="Move a tenant ID to this organization"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="font-semibold text-indigo-700">Move a tenant ID to this organization</span>
            </Link>
          </div>

          <OrganizationTenantIdList organizationId={organizationId} />
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Actions</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Link
                href={`/admin/tenant-management/organizations/${id}/edit`}
                className="w-full flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
                title="Edit Organization"
                aria-label="Edit Organization"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="font-semibold text-blue-700">Edit Organization</span>
              </Link>
              {organization.id != null && adminAccess.isPlatformSuperAdmin && (
                <>
                  <OrganizationActiveStatusButton
                    organizationId={organization.id}
                    organizationName={organization.organizationName}
                    isActive={organization.isActive !== false}
                  />
                  <CascadeDeleteOrganizationButton
                    organizationId={organization.id}
                    tenantId={tenantIds[0] || organization.organizationName}
                    organizationName={organization.organizationName}
                    isActive={organization.isActive !== false}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
