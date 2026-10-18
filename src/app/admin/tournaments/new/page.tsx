import { scopedAdminTenantId } from '@/app/admin/adminAccessServer';
import AdminNavigation from '@/components/AdminNavigation';
import TournamentForm from '../TournamentForm';
import { fetchTenantSiteTypeServer } from '../ApiServerActions';

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams?: { tenant?: string } | Promise<{ tenant?: string }>;
}) {
  const resolved = typeof searchParams?.then === 'function' ? await searchParams : searchParams;
  const requestedTenant = resolved?.tenant?.trim() || undefined;
  const tenantId = (await scopedAdminTenantId(requestedTenant)) || requestedTenant;
  const siteType = tenantId ? await fetchTenantSiteTypeServer(tenantId) : null;
  const listHref = tenantId ? `/admin/tournaments?tenant=${encodeURIComponent(tenantId)}` : '/admin/tournaments';

  return (
    <div className="w-full" style={{ paddingTop: '120px' }}>
      <div className="w-full px-4 mb-6">
        <AdminNavigation />
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h1 className="text-2xl font-bold mb-6">New tournament</h1>
        {siteType !== 'SPORTS_TEAM' ? (
          <p className="text-sm text-gray-700">Select a sports team tenant before creating a tournament.</p>
        ) : (
          <TournamentForm tenantId={tenantId} listHref={listHref} />
        )}
      </div>
    </div>
  );
}
