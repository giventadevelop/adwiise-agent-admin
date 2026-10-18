import { getAppUrl } from '@/lib/env';
import AdminNavigation from '@/components/AdminNavigation';
import TournamentForm from '../../TournamentForm';
import type { TenantTournamentDTO } from '@/types';

export default async function EditTournamentPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { tenant?: string } | Promise<{ tenant?: string }>;
}) {
  const resolvedParams = typeof (params as Promise<{ id: string }>).then === 'function' ? await params : params;
  const resolvedSearch = typeof searchParams?.then === 'function' ? await searchParams : searchParams;
  const tenantId = resolvedSearch?.tenant?.trim() || undefined;
  const listHref = tenantId ? `/admin/tournaments?tenant=${encodeURIComponent(tenantId)}` : '/admin/tournaments';

  let tournament: TenantTournamentDTO | null = null;
  try {
    const res = await fetch(`${getAppUrl()}/api/proxy/tenant-tournaments/${resolvedParams.id}`, { cache: 'no-store' });
    if (res.ok) tournament = await res.json();
  } catch (error) {
    console.error('[EditTournament] fetch failed', error);
  }

  return (
    <div className="w-full" style={{ paddingTop: '120px' }}>
      <div className="w-full px-4 mb-6">
        <AdminNavigation />
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h1 className="text-2xl font-bold mb-6">Edit tournament</h1>
        {tournament ? (
          <TournamentForm initial={tournament} tenantId={tenantId || tournament.tenantId} listHref={listHref} />
        ) : (
          <p className="text-sm text-gray-700">Tournament not found.</p>
        )}
      </div>
    </div>
  );
}
