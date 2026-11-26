import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import AdminRecordMissing from '@/components/admin/AdminRecordMissing';
import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default async function TenantOrganizationSettingsPage({ params }: PageProps) {
  const resolvedParams = typeof (params as Promise<{ id: string }>).then === 'function'
    ? await (params as Promise<{ id: string }>)
    : (params as { id: string });
  const organizationId = parseInt(resolvedParams.id, 10);

  if (Number.isNaN(organizationId)) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message="This settings link does not match an organization. Go back to the organization list."
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }

  let organization = null;
  try {
    organization = await fetchTenantOrganization(organizationId);
  } catch {
    return (
      <AdminRecordMissing
        title="These tenant settings could not be loaded"
        message="Refresh the page, or go back to the organization list."
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }
  if (!organization) {
    return (
      <AdminRecordMissing
        title="This organization is no longer available"
        message={`Organization #${organizationId} was deleted, so its tenant settings are no longer on this page.`}
        backHref="/admin/tenant-management/organizations"
        backLabel="Back to Organizations"
      />
    );
  }

  redirect(`/admin/tenant-management/organizations/${organization.id}#tenant-ids`);
}
