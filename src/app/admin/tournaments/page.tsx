import { appendAdminTenantFilter, scopedAdminTenantId } from '@/app/admin/adminAccessServer';
import { getAppUrl } from '@/lib/env';
import AdminNavigation from '@/components/AdminNavigation';
import AdminTenantFilterBar from '@/components/admin/AdminTenantFilterBar';
import DeleteTournamentButton from './DeleteTournamentButton';
import TournamentListFilters from './TournamentListFilters';
import { fetchTenantSiteTypeServer } from './ApiServerActions';
import type { TenantTournamentDTO } from '@/types';

function one(value: string | string[] | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toInt(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
}

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams?: { [k: string]: string | string[] | undefined } | Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const resolved = typeof searchParams?.then === 'function' ? await searchParams : searchParams;
  const page = toInt(typeof resolved?.page === 'string' ? resolved.page : undefined, 0);
  const size = toInt(typeof resolved?.size === 'string' ? resolved.size : undefined, 20);
  const requestedTenant = one(resolved?.tenant);
  const title = one(resolved?.title);
  const label = one(resolved?.label);
  const year = one(resolved?.year);
  const header = one(resolved?.header);
  const status = one(resolved?.status);
  const published = one(resolved?.published);
  const tenantId = (await scopedAdminTenantId(requestedTenant)) || requestedTenant;
  const siteType = tenantId ? await fetchTenantSiteTypeServer(tenantId) : null;
  const sports = siteType === 'SPORTS_TEAM';

  let rows: TenantTournamentDTO[] = [];
  if (sports && tenantId) {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('size', String(size));
      params.set('sort', 'id,desc');
      if (title) params.set('title.contains', title);
      if (label) params.set('shortLabel.contains', label);
      if (year && /^\d{4}$/.test(year)) params.set('editionYear.equals', year);
      if (status === 'UPCOMING' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
        params.set('status.equals', status);
      }
      if (header === 'yes' || header === 'no') params.set('showInHeader.equals', header === 'yes' ? 'true' : 'false');
      if (published === 'yes' || published === 'no') params.set('isPublished.equals', published === 'yes' ? 'true' : 'false');
      await appendAdminTenantFilter(params, tenantId);
      const res = await fetch(`${getAppUrl()}/api/proxy/tenant-tournaments?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        rows = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
      }
    } catch (error) {
      console.error('[AdminTournaments] fetch failed', error);
    }
  }

  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tournaments</h1>
          {sports && (
            <a
              href={`/admin/tournaments/new${tenantQuery}`}
              className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 px-6 font-semibold text-blue-700"
            >
              New tournament
            </a>
          )}
        </div>
        <AdminTenantFilterBar />
        {sports && tenantId && (
          <TournamentListFilters
            tenantId={tenantId}
            title={title}
            label={label}
            year={year}
            header={header}
            status={status}
            published={published}
          />
        )}
        {!tenantId && <p className="mt-6 text-sm text-gray-600">Select a tenant to manage tournaments.</p>}
        {tenantId && !sports && (
          <p className="mt-6 text-sm text-gray-700">
            Tournaments are available for sports team sites. This tenant is {siteType || 'not a sports team'}.
          </p>
        )}
        {sports && (
          <div className="mt-6 bg-white shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Menu label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In menu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3 text-sm font-medium">{row.shortLabel}</td>
                    <td className="px-4 py-3 text-sm">{row.title}</td>
                    <td className="px-4 py-3 text-sm">{row.editionYear ?? ''}</td>
                    <td className="px-4 py-3 text-sm">{row.status}</td>
                    <td className="px-4 py-3 text-sm">{row.showInHeader ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/admin/tournaments/${row.id}/edit${tenantQuery}`}
                          className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center"
                          title="Edit tournament"
                          aria-label="Edit tournament"
                        >
                          <svg className="w-6 h-6 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </a>
                        {row.id != null && <DeleteTournamentButton id={row.id} label={row.shortLabel || row.title} tenantId={tenantId} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">
                      No tournaments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
