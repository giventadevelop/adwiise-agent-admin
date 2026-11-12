import AdminBackButton from '@/components/admin/AdminBackButton';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import MoveBetweenOrganizationsClient from './MoveBetweenOrganizationsClient';

interface PageProps {
  searchParams: { left?: string; right?: string } | Promise<{ left?: string; right?: string }>;
}

function parseOrganizationId(value: string | undefined): number | null {
  const id = Number.parseInt(value || '', 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function loadOrganization(id: number | null): Promise<TenantOrganizationDTO | null> {
  if (!id) return null;
  const organization = await fetchTenantOrganization(id).catch(() => null);
  return organization?.id ? organization : null;
}

export default async function MoveBetweenOrganizationsPage({ searchParams }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolved = typeof searchParams.then === 'function' ? await searchParams : searchParams;
  const [initialLeft, initialRight] = await Promise.all([
    loadOrganization(parseOrganizationId(resolved.left)),
    loadOrganization(parseOrganizationId(resolved.right)),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <div className="mb-6">
        <AdminBackButton href="/admin/tenant-management/organizations" label="Back to Organizations" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Move tenant IDs between organizations</h1>
      <p className="text-sm text-gray-600 mb-6">
        Drag a tenant ID onto the other organization, or use Move to the other organization. Dropping a tenant ID onto the organization it already belongs to does nothing.
      </p>
      <MoveBetweenOrganizationsClient initialLeft={initialLeft} initialRight={initialRight} />
    </div>
  );
}
