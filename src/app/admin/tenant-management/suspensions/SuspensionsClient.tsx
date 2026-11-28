'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SuspensionDialogButton, { SuspensionBadges } from './SuspensionDialogButton';
import { listTenantSuspensionPage } from './ApiServerActions';
import type {
  SuspendedOrganizationRow,
  SuspendedTenantRow,
  SuspensionOrganizationOption,
  TenantSuspensionListPage,
} from '@/types/tenantSuspension';

const PAGE_SIZE = 20;

interface SuspensionsClientProps {
  initialTenantSearch: string;
  initialOrganizationId: number | null;
  organizations: SuspensionOrganizationOption[];
  suspendedTenants: SuspendedTenantRow[];
  suspendedOrganizations: SuspendedOrganizationRow[];
  listError: string | null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export default function SuspensionsClient({
  initialTenantSearch,
  initialOrganizationId,
  organizations,
  suspendedTenants,
  suspendedOrganizations,
  listError,
}: SuspensionsClientProps) {
  const [organizationId, setOrganizationId] = useState<number | null>(initialOrganizationId);
  const [searchInput, setSearchInput] = useState(initialTenantSearch);
  const [search, setSearch] = useState(initialTenantSearch);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<TenantSuspensionListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await listTenantSuspensionPage({ organizationId, search, page, pageSize: PAGE_SIZE }));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'The tenant IDs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, search, page]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.organizationId === organizationId) ?? null,
    [organizations, organizationId],
  );
  const totalCount = result?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const nothingSuspended = suspendedTenants.length === 0 && suspendedOrganizations.length === 0;

  return (
    <div className="space-y-8">
      <section className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Tenant IDs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Shows every tenant ID until you pick an organization. Pick one to work on that organization and its tenant
            IDs only. Use Suspend on a row to turn off just that tenant ID.
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <select
              value={organizationId ?? ''}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                setOrganizationId(Number.isFinite(next) ? next : null);
                setPage(0);
              }}
              aria-label="Organization"
              className="h-14 rounded-xl border border-gray-300 px-4 text-sm lg:w-80"
            >
              <option value="">All organizations</option>
              {organizations.map((org) => (
                <option key={org.organizationId} value={org.organizationId}>
                  {org.organizationName}
                  {org.flags.websiteSuspended || org.flags.dashboardSuspended ? ' (suspended)' : ''}
                </option>
              ))}
            </select>
            <form
              className="flex flex-1 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setPage(0);
              }}
            >
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by tenant ID"
                aria-label="Search by tenant ID"
                className="flex-1 h-14 rounded-xl border border-gray-300 px-4 font-mono text-sm"
              />
              <button
                type="submit"
                className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 transition-all duration-300 hover:scale-105"
                title="Search"
                aria-label="Search"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setPage(0);
                  }}
                  className="flex-shrink-0 h-14 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 font-semibold text-gray-700"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {selectedOrganization && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex-1 text-sm text-gray-700">
                <Link
                  href={`/admin/tenant-management/organizations/${selectedOrganization.organizationId}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {selectedOrganization.organizationName}
                </Link>{' '}
                <SuspensionBadges
                  website={selectedOrganization.flags.websiteSuspended === true}
                  dashboard={selectedOrganization.flags.dashboardSuspended === true}
                />
                <p className="mt-1">To turn off every tenant ID in this organization at once, use Suspend all.</p>
              </div>
              <SuspensionDialogButton
                compact
                key={`org-${selectedOrganization.organizationId}-${String(selectedOrganization.flags.websiteSuspended)}-${String(selectedOrganization.flags.dashboardSuspended)}`}
                target={{
                  kind: 'organization',
                  organizationId: selectedOrganization.organizationId,
                  organizationName: selectedOrganization.organizationName,
                }}
                current={selectedOrganization.flags}
                onSaved={() => setReloadKey((value) => value + 1)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-gray-600">Loading tenant IDs...</p>}
          {!loading && !error && result && result.rows.length === 0 && (
            <p className="text-sm text-gray-600">No tenant IDs match.</p>
          )}
          {!loading && result && result.rows.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.rows.map((row) => (
                    <tr key={row.settingsId}>
                      <td className="px-4 py-3 font-mono text-sm text-gray-900 break-all">{row.tenantId}</td>
                      <td className="px-4 py-3 text-sm">
                        {row.organizationId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOrganizationId(row.organizationId);
                              setPage(0);
                            }}
                            className="text-blue-600 hover:underline text-left"
                            title="Show only this organization"
                          >
                            {row.organizationName || `#${row.organizationId}`}
                          </button>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <SuspensionBadges
                          website={row.effective.website}
                          dashboard={row.effective.dashboard}
                          source={
                            row.effective.websiteSource === 'tenant' || row.effective.dashboardSource === 'tenant'
                              ? 'tenant'
                              : row.effective.websiteSource ?? row.effective.dashboardSource
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <SuspensionDialogButton
                          compact
                          key={`${row.settingsId}-${String(row.tenant.websiteSuspended)}-${String(row.tenant.dashboardSuspended)}`}
                          target={{ kind: 'tenant', settingsId: row.settingsId, tenantId: row.tenantId }}
                          current={row.tenant}
                          onSaved={() => setReloadKey((value) => value + 1)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || loading}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page"
              aria-label="Previous Page"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-blue-700">
              Page {page + 1} of {totalPages} ({totalCount} tenant IDs)
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page"
              aria-label="Next Page"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Currently suspended</h2>
        </div>
        <div className="px-6 py-4 space-y-6">
          {listError && <p className="text-sm text-red-600">{listError}</p>}
          {!listError && nothingSuspended && <p className="text-sm text-gray-600">Nothing is suspended right now.</p>}

          {suspendedOrganizations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Organizations (every tenant ID they own)</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suspendedOrganizations.map((row) => (
                      <tr key={row.organizationId}>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/admin/tenant-management/organizations/${row.organizationId}`} className="text-blue-600 hover:underline">
                            {row.organizationName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <SuspensionBadges website={row.flags.websiteSuspended === true} dashboard={row.flags.dashboardSuspended === true} />
                          <div className="text-xs text-gray-500 mt-1">{formatDate(row.flags.suspendedAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.flags.suspensionReason || ''}</td>
                        <td className="px-4 py-3">
                          <SuspensionDialogButton
                            compact
                            target={{ kind: 'organization', organizationId: row.organizationId, organizationName: row.organizationName }}
                            current={row.flags}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {suspendedTenants.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tenant IDs</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suspendedTenants.map((row) => (
                      <tr key={row.settingsId}>
                        <td className="px-4 py-3 font-mono text-sm text-gray-900 break-all">{row.tenantId}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.organizationId ? (
                            <Link href={`/admin/tenant-management/organizations/${row.organizationId}`} className="text-blue-600 hover:underline">
                              {row.organizationName || `#${row.organizationId}`}
                            </Link>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <SuspensionBadges website={row.flags.websiteSuspended === true} dashboard={row.flags.dashboardSuspended === true} />
                          <div className="text-xs text-gray-500 mt-1">{formatDate(row.flags.suspendedAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.flags.suspensionReason || ''}</td>
                        <td className="px-4 py-3">
                          <SuspensionDialogButton
                            compact
                            target={{ kind: 'tenant', settingsId: row.settingsId, tenantId: row.tenantId }}
                            current={row.flags}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
