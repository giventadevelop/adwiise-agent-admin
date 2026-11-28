import AdminBackButton from '@/components/admin/AdminBackButton';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { listSuspensionOrganizations, listSuspensions } from './ApiServerActions';
import type { SuspensionOrganizationOption } from '@/types/tenantSuspension';
import SuspensionsClient from './SuspensionsClient';

type SearchParams = { tenant?: string; organization?: string };

interface PageProps {
  searchParams: SearchParams | Promise<SearchParams>;
}

export default async function SuspensionsPage({ searchParams }: PageProps) {
  await assertPlatformSuperAdmin();
  const resolved = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<SearchParams>)
    : (searchParams as SearchParams);

  let listError: string | null = null;
  let suspensions: Awaited<ReturnType<typeof listSuspensions>> = { tenants: [], organizations: [] };
  let organizations: SuspensionOrganizationOption[] = [];
  try {
    organizations = await listSuspensionOrganizations();
  } catch (error) {
    console.warn('[Suspensions] organization list failed:', error);
  }
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
        payments. Every tenant ID is listed until you pick an organization; then you can suspend its tenant IDs one at a time or all at once. Nothing is deleted, and
        platform super admins are never locked out. Changes reach the live sites within about a minute.
      </p>
      <SuspensionsClient
        initialTenantSearch={resolved?.tenant?.trim() || ''}
        initialOrganizationId={Number.parseInt(resolved?.organization || '', 10) || null}
        organizations={organizations}
        suspendedTenants={suspensions.tenants}
        suspendedOrganizations={suspensions.organizations}
        listError={listError}
      />
    </div>
  );
}
