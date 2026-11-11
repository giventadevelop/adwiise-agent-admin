import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import NewOnboardingRequestClient from './NewOnboardingRequestClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { organizationId?: string };
}

export default async function NewOnboardingRequestPage({ searchParams }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolved = typeof searchParams.then === 'function' ? await searchParams : searchParams;
  const organizationId = parseInt(resolved.organizationId || '', 10);
  const initialOrganization = Number.isFinite(organizationId)
    ? await fetchTenantOrganization(organizationId).catch(() => null)
    : null;
  return <NewOnboardingRequestClient initialOrganization={initialOrganization} />;
}
