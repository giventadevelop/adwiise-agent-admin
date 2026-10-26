'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNavigation from '@/components/AdminNavigation';
import { ONBOARDING_STATUS_STYLES } from '@/lib/onboarding/onboardingShared';
import { useRetailerTypeOptions } from '@/lib/onboarding/useRetailerTypeOptions';
import type { OnboardingRequestStatus, TenantOnboardingRequestDTO } from '@/types';
import { fetchOnboardingRequestsServer } from './ApiServerActions';

const PAGE_SIZE = 20;
const STATUS_FILTERS: (OnboardingRequestStatus | 'ALL')[] = ['PENDING', 'FAILED', 'APPROVED', 'REJECTED', 'ALL'];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function siteTypeLabel(value: string | null | undefined, options: { value: string; label: string }[]): string {
  return options.find((o) => o.value === value)?.label ?? (value || '—');
}

export default function OnboardingRequestsListClient() {
  const siteTypeOptions = useRetailerTypeOptions('server');
  const [status, setStatus] = useState<OnboardingRequestStatus | 'ALL'>('PENDING');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<TenantOnboardingRequestDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchOnboardingRequestsServer({ page, size: PAGE_SIZE, status, search });
    if (result.ok) {
      setItems(result.data.items);
      setTotalCount(result.data.totalCount);
    } else {
      setItems([]);
      setTotalCount(0);
      setError(result.error);
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const isPrevDisabled = page === 0 || loading;
  const isNextDisabled = page >= totalPages - 1 || loading;
  const startItem = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const endItem = totalCount > 0 ? Math.min((page + 1) * PAGE_SIZE, totalCount) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8" style={{ paddingTop: '180px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNavigation currentPage="onboarding-requests" />

        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Onboarding Requests</h1>
              <p className="text-gray-600 mt-1">
                New customers request a site at <span className="font-mono">/get-started</span>. Review, edit and approve to create the
                tenant, settings, email addresses, satellite domain and admin access in one step.
              </p>
            </div>
            <Link
              href="/admin/onboarding-requests/new"
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Add Request Manually"
              aria-label="Add Request Manually"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Add Request Manually</span>
            </Link>
          </div>

          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setPage(0);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all duration-300 ${
                    status === s ? 'bg-blue-200 border-blue-400 text-blue-800' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2 md:ml-auto"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
                setPage(0);
              }}
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, email, domain or ONB- code"
                className="border border-gray-400 rounded-xl px-4 py-2 text-sm w-64 focus:border-blue-500 focus:ring-blue-500"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm">
                Search
              </button>
            </form>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  {['Request', 'Organization', 'Domain', 'Site type', 'Contact', 'Status', 'Submitted', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No requests match this filter.</td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">
                        {r.requestCode}
                        {r.source === 'ADMIN_MANUAL' && <span className="ml-2 text-xs text-gray-500">(manual)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{r.organizationName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.requestedHostname}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{siteTypeLabel(r.siteType, siteTypeOptions)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.contactEmail}</td>
                      <td className="px-4 py-3">
                        {r.status && (
                          <span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${ONBOARDING_STATUS_STYLES[r.status]}`}>
                            {r.status}
                          </span>
                        )}
                        {r.assignedTenantId && <div className="text-xs text-gray-500 mt-1 font-mono">{r.assignedTenantId}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/onboarding-requests/${r.id}`}
                          className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                          title="Review request"
                          aria-label="Review request"
                        >
                          <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 pb-6">
            <div className="mt-8">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={isPrevDisabled}
                  className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
                  title="Previous Page"
                  aria-label="Previous Page"
                  type="button"
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
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isNextDisabled}
                  className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
                  title="Next Page"
                  aria-label="Next Page"
                  type="button"
                >
                  <span>Next</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="text-center mt-3">
                {totalCount > 0 ? (
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                    <span className="text-sm text-gray-700">
                      Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                      <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                      <span className="font-bold text-blue-600">{totalCount}</span> requests
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No requests found</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
