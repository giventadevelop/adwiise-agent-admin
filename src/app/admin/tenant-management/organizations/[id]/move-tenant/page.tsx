import Link from 'next/link';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import AdminRecordMissing from '@/components/admin/AdminRecordMissing';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import MoveTenantClient from './MoveTenantClient';

interface PageProps {
  params: { id: string };
}

export default async function MoveTenantPage({ params }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolvedParams = typeof params.then === 'function' ? await params : params;
  const organizationId = parseInt(resolvedParams.id);
  if (isNaN(organizationId)) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message="The link does not match an organization."
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }
  const organization = await fetchTenantOrganization(organizationId);
  if (!organization?.id) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message={`Organization #${organizationId} was not found.`}
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <Link
        href={`/admin/tenant-management/organizations/${organization.id}`}
        className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 mb-6"
      >
        Back to {organization.organizationName}
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Move a tenant ID</h1>
      <p className="text-sm text-gray-600 mb-6">
        This sets the tenant settings row&apos;s organization to {organization.organizationName}. It does not change a parent organization link.
      </p>
      <MoveTenantClient organizationId={organization.id} organizationName={organization.organizationName} />
    </div>
  );
}
