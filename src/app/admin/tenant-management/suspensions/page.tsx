import AdminBackButton from '@/components/admin/AdminBackButton';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { listSuspensions } from './ApiServerActions';
import SuspensionsClient from './SuspensionsClient';

interface PageProps {
  searchParams: { tenant?: string } | Promise<{ tenant?: string }>;
}

export default async function SuspensionsPage({ searchParams }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolved = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<{ tenant?: string }>)
    : (searchParams as { tenant?: string });

  let listError: string | null = null;
  let suspensions: Awaited<ReturnType<typeof listSuspensions>> = { tenants: [], organizations: [] };
  try {
    suspensions = await listSuspensions();
  } catch (error) {
    console.error('[Suspensions] list failed:', error);
    listError = 'The list of suspended sites could not be loaded. Refresh the page to try again.';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <div className="mb-6">
        <AdminBackButton href="/admin" label="Back to Admin Dashboard" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Suspend sites and dashboards</h1>
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        Turn off a tenant&apos;s public website, its admin and retail dashboards, or both, for example after missed
        payments. Suspend one tenant ID here, or a whole organization from its organization page. Nothing is deleted, and
        platform super admins are never locked out. Changes reach the live sites within about a minute.
      </p>
      <SuspensionsClient
        initialTenantId={resolved?.tenant?.trim() || ''}
        suspendedTenants={suspensions.tenants}
        suspendedOrganizations={suspensions.organizations}
        listError={listError}
      />
    </div>
  );
}
