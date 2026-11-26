'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchOrganizationTenantIdsPage,
  type OrganizationTenantIdRow,
} from '@/app/admin/tenant-management/organizations/tenantIdListActions';

const PAGE_SIZE = 10;

export default function BillingTenantList({ organizationId }: { organizationId: number }) {
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

  return (
    <section className="mt-6 bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Tenant IDs</h2>
        <p className="text-sm text-gray-600 mt-1">Choose a tenant to open its billing page.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.settingsId}>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 break-all">{row.tenantId}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/billing/${encodeURIComponent(row.tenantId)}`}
                        className="inline-flex h-14 rounded-xl bg-amber-100 hover:bg-amber-200 items-center justify-center gap-3 px-4 transition-all duration-300 hover:scale-105"
                        title={`Open billing for ${row.tenantId}`}
                        aria-label={`Open billing for ${row.tenantId}`}
                      >
                        <span className="font-semibold text-amber-800">Open billing</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-8 flex justify-between items-center">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || loading}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm font-bold text-blue-700">
            Page {page + 1} of {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
