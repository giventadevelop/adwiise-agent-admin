import { redirect } from 'next/navigation';
import AdminBackButton from '@/components/admin/AdminBackButton';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import MoveTenantOrganizationPicker from './MoveTenantOrganizationPicker';

interface PageProps {
  searchParams: { organizationId?: string } | Promise<{ organizationId?: string }>;
}

/**
 * Admin Home entry point for "Move a tenant ID to this organization".
 * The super admin picks the receiving organization here, then continues on
 * /admin/tenant-management/organizations/[id]/move-tenant.
 */
export default async function MoveTenantPickOrganizationPage({ searchParams }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolved =
    typeof (searchParams as Promise<{ organizationId?: string }>).then === 'function'
      ? await (searchParams as Promise<{ organizationId?: string }>)
      : (searchParams as { organizationId?: string });
  const organizationId = Number.parseInt(resolved.organizationId || '', 10);
  if (Number.isFinite(organizationId) && organizationId > 0) {
    redirect(`/admin/tenant-management/organizations/${organizationId}/move-tenant`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <div className="mb-6">
        <AdminBackButton href="/admin" label="Back to Admin Home" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Move a tenant ID to an organization</h1>
      <p className="text-sm text-gray-600 mb-6">
        Pick the organization that should receive the tenant ID. On the next page, type the tenant ID, look it up, and move it to that organization.
      </p>
      <MoveTenantOrganizationPicker />
    </div>
  );
}
