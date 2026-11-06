import { appendAdminTenantFilter } from '@/app/admin/adminAccessServer';
import { getAppUrl, appendTenantIfPresent, effectiveTenantId } from '@/lib/env';
import AdminNavigation from '@/components/AdminNavigation';
import AdminTenantFilterBar from '@/components/admin/AdminTenantFilterBar';
import DeleteFocusGroupButton from './DeleteFocusGroupButton';
// Icons removed - using inline SVGs instead

function toInt(v: string | undefined, d: number) {
  const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d;
}

export default async function AdminFocusGroupsPage({ searchParams }: { searchParams?: { [k: string]: string | string[] | undefined } | Promise<{ [k: string]: string | string[] | undefined }> }) {
  // Await searchParams if it's a promise (Next.js 15+ requirement)
  const resolvedSearchParams = typeof searchParams?.then === 'function' ? await searchParams : searchParams;

  const baseUrl = getAppUrl();
  const page = toInt(typeof resolvedSearchParams?.page === 'string' ? resolvedSearchParams?.page : undefined, 0);
  const size = toInt(typeof resolvedSearchParams?.size === 'string' ? resolvedSearchParams?.size : undefined, 10);
  const sort = typeof resolvedSearchParams?.sort === 'string' ? resolvedSearchParams?.sort : 'createdAt,desc';
  const tenantId =
    typeof resolvedSearchParams?.tenant === 'string' && resolvedSearchParams.tenant.trim()
      ? resolvedSearchParams.tenant.trim()
      : undefined;

  let groups: any[] = [];
  let total = 0;
  try {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    params.set('sort', sort);
    await appendAdminTenantFilter(params, tenantId);
    const url = `${baseUrl}/api/proxy/focus-groups?${params.toString()}`;
    console.log('[FocusGroups] Fetching from:', url);

    const res = await fetch(url, { cache: 'no-store' });
    console.log('[FocusGroups] Response status:', res.status, res.statusText);

    if (res.ok) {
      const data = await res.json();
      console.log('[FocusGroups] Response data type:', typeof data, 'Is array:', Array.isArray(data), 'Has content:', data?.content);

      // Handle different response formats:
      // 1. Direct array
      // 2. Paginated response with content array (Spring Data REST)
      // 3. Single object (wrap in array)
      if (Array.isArray(data)) {
        groups = data;
        console.log('[FocusGroups] Using direct array format, count:', groups.length);
      } else if (data && typeof data === 'object' && Array.isArray(data.content)) {
        // Spring Data REST paginated response
        groups = data.content;
        console.log('[FocusGroups] Using paginated content array format, count:', groups.length);
      } else if (data && typeof data === 'object' && data.id) {
        // Single object - wrap in array
        groups = [data];
        console.log('[FocusGroups] Using single object format, wrapped in array');
      } else {
        groups = [];
        console.log('[FocusGroups] Unknown format, defaulting to empty array');
      }

      // Get total count from header (preferred) or from response
      const totalCountHeader = res.headers.get('x-total-count') || res.headers.get('X-Total-Count');
      if (totalCountHeader) {
        total = Number(totalCountHeader);
        console.log('[FocusGroups] Total from header:', total);
      } else if (data && typeof data === 'object' && typeof data.totalElements === 'number') {
        // Spring Data REST paginated response total
        total = data.totalElements;
        console.log('[FocusGroups] Total from totalElements:', total);
      } else {
        total = groups.length;
        console.log('[FocusGroups] Total from groups length:', total);
      }

      console.log('[FocusGroups] Final result - groups:', groups.length, 'total:', total);
    } else {
      const errorText = await res.text();
      console.error('[FocusGroups] API error:', res.status, errorText);
    }
  } catch (err) {
    console.error('[FocusGroups] Error fetching focus groups:', err);
  }

  const tenantQuery = tenantId ? `&tenant=${encodeURIComponent(tenantId)}` : '';
  const newGroupHref = tenantId
    ? `/admin/focus-groups/new?tenant=${encodeURIComponent(tenantId)}`
    : '/admin/focus-groups/new';

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      {/* Navigation Section - Full Width, Separate Responsive Container */}
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation contextLine="Focus groups for this tenant." />
      </div>
      {/* Main Content Section - Constrained Width */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white text-center sm:text-left">Manage Focus Groups</h1>
          <a href={newGroupHref} className="flex-shrink-0 h-12 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 hover:scale-105 px-3 sm:px-6">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700 text-xs sm:text-sm lg:text-base whitespace-nowrap">New Group</span>
          </a>
        </div>

        <AdminTenantFilterBar />

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <div className="user-table-scroll-container">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600" style={{ minWidth: '800px', width: '100%' }}>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Name</th>
              <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Slug</th>
              <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Active</th>
              <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-300 dark:divide-gray-600">
            {groups.map((g, index) => (
              <tr key={g.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'} hover:bg-yellow-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-300 dark:border-gray-600`}>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">{g.name}</td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">{g.slug}</td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm border-r border-gray-200 dark:border-gray-600">
                  {g.isActive ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">YES</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">NO</span>
                  )}
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    <a className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110" href={`/admin/focus-groups/${g.id}/edit${tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : ''}`} title="Edit Focus Group" aria-label="Edit Focus Group">
                      <svg className="w-6 h-6 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </a>
                    <a className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all duration-300 hover:scale-110" href={`/admin/focus-groups/${g.id}/events${tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : ''}`} title="Manage Events" aria-label="Manage Events">
                      <svg className="w-6 h-6 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </a>
                    <a className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-all duration-300 hover:scale-110" href={`/admin/focus-groups/${g.id}/members${tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : ''}`} title="Manage Members" aria-label="Manage Members">
                      <svg className="w-6 h-6 sm:w-10 sm:h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </a>
                    <DeleteFocusGroupButton
                      id={g.id}
                      name={g.name}
                      slug={g.slug}
                      tenantId={tenantId}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td className="px-2 sm:px-4 lg:px-6 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center" colSpan={4}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No focus groups found</span>
                    <span className="text-sm text-orange-600">[No groups match your criteria]</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>

        {/* Pagination Controls - Always visible, matching admin page style */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil((total || 0) / size));
          const isPrevDisabled = page <= 0;
          const isNextDisabled = page + 1 >= totalPages;
          const displayPage = page + 1;
          const startItem = total > 0 ? page * size + 1 : 0;
          const endItem = total > 0 ? page * size + Math.min(size, total - page * size) : 0;
          const qs = (p: number) => `?page=${p}&size=${size}&sort=${encodeURIComponent(sort)}${tenantQuery}`;
          
          return (
            <div className="mt-8">
              <div className="flex justify-between items-center">
                {/* Previous Button */}
                <a
                  href={isPrevDisabled ? '#' : `/admin/focus-groups${qs(page - 1)}`}
                  aria-disabled={isPrevDisabled}
                  className={`px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${isPrevDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none hover:scale-100' : ''}`}
                  title="Previous Page"
                  aria-label="Previous Page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </a>

                {/* Page Info */}
                <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                  <span className="text-sm font-bold text-blue-700">
                    Page <span className="text-blue-600">{displayPage}</span> of <span className="text-blue-600">{totalPages}</span>
                  </span>
                </div>

                {/* Next Button */}
                <a
                  href={isNextDisabled ? '#' : `/admin/focus-groups${qs(page + 1)}`}
                  aria-disabled={isNextDisabled}
                  className={`px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${isNextDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none hover:scale-100' : ''}`}
                  title="Next Page"
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              {/* Item Count Text */}
              <div className="text-center mt-3">
                {total > 0 ? (
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                    <span className="text-sm text-gray-700">
                      Showing <span className="font-bold text-blue-600">{startItem}</span> to <span className="font-bold text-blue-600">{endItem}</span> of <span className="font-bold text-blue-600">{total}</span> focus groups
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No focus groups found</span>
                    <span className="text-sm text-orange-600">[No groups match your criteria]</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
