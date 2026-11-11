'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchOrganizationTenantIdsPage,
  type OrganizationTenantIdRow,
} from './tenantIdListActions';

const PAGE_SIZE = 10;

export default function OrganizationTenantIdList({ organizationId }: { organizationId: number }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<OrganizationTenantIdRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchOrganizationTenantIdsPage(organizationId, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setTotalCount(result.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load tenant IDs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItem = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const endItem = totalCount > 0 ? page * PAGE_SIZE + rows.length : 0;

  return (
    <section id="tenant-ids" className="mt-6 bg-white shadow rounded-lg scroll-mt-24">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Tenant IDs</h3>
        <p className="text-sm text-gray-600 mt-1">
          Each tenant ID is a tenant settings row for this organization.
        </p>
      </div>
      <div className="px-6 py-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-600">Loading tenant IDs...</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-gray-600">This organization has no tenant IDs yet.</p>
        ) : null}
        {!loading && rows.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.settingsId}>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 break-all">{row.tenantId}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenant-management/settings/${row.settingsId}`}
                        className="inline-flex flex-shrink-0 h-14 rounded-xl bg-teal-100 hover:bg-teal-200 items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4"
                        title="Open settings"
                        aria-label={`Open settings for ${row.tenantId}`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-teal-700">Open settings</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-8">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || loading}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>
            <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm font-bold text-blue-700">
                Page <span className="text-blue-600">{page + 1}</span> of <span className="text-blue-600">{totalPages}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
              title="Next Page"
              aria-label="Next Page"
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-3">
            {loading ? null : totalCount > 0 ? (
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                <span className="text-sm text-gray-700">
                  Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                  <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                  <span className="font-bold text-blue-600">{totalCount}</span> tenant IDs
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                <span className="text-sm font-medium text-orange-700">No tenant IDs found</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
