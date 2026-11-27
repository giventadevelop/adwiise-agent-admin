'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuspensionDialogButton, { SuspensionBadges } from './SuspensionDialogButton';
import { lookupTenantSuspension } from './ApiServerActions';
import type {
  SuspendedOrganizationRow,
  SuspendedTenantRow,
  TenantSuspensionLookup,
} from '@/types/tenantSuspension';

interface SuspensionsClientProps {
  initialTenantId: string;
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
  initialTenantId,
  suspendedTenants,
  suspendedOrganizations,
  listError,
}: SuspensionsClientProps) {
  const [tenantInput, setTenantInput] = useState(initialTenantId);
  const [lookup, setLookup] = useState<TenantSuspensionLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [searching, setSearching] = useState(false);

  const runLookup = useCallback(async (value: string) => {
    const tenantId = value.trim();
    if (!tenantId) return;
    setSearching(true);
    setLookupError('');
    try {
      const result = await lookupTenantSuspension(tenantId);
      setLookup(result);
      if (!result) setLookupError(`No tenant settings were found for tenant ID ${tenantId}.`);
    } catch (err) {
      setLookup(null);
      setLookupError(err instanceof Error ? err.message : 'That tenant ID could not be looked up.');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (initialTenantId) void runLookup(initialTenantId);
  }, [initialTenantId, runLookup]);

  const nothingSuspended = suspendedTenants.length === 0 && suspendedOrganizations.length === 0;

  return (
    <div className="space-y-8">
      <section className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Suspend one tenant ID</h2>
          <p className="text-sm text-gray-600 mt-1">Enter the tenant ID of the website or retail dashboard.</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void runLookup(tenantInput);
            }}
          >
            <input
              type="text"
              value={tenantInput}
              onChange={(event) => setTenantInput(event.target.value)}
              placeholder="Tenant ID, for example tenant_demo_001"
              aria-label="Tenant ID"
              className="flex-1 h-14 rounded-xl border border-gray-300 px-4 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={searching || !tenantInput.trim()}
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              title="Look up tenant ID"
              aria-label="Look up tenant ID"
            >
              {searching ? 'Looking up...' : 'Look up'}
            </button>
          </form>
          {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
          {lookup && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold text-gray-900 break-all">{lookup.tenantId}</span>
                <SuspensionBadges
                  website={lookup.effective.website}
                  dashboard={lookup.effective.dashboard}
                  source={lookup.effective.websiteSource === 'organization' || lookup.effective.dashboardSource === 'organization' ? 'organization' : 'tenant'}
                />
              </div>
              <p className="text-sm text-gray-600">
                Organization:{' '}
                {lookup.organizationId ? (
                  <Link href={`/admin/tenant-management/organizations/${lookup.organizationId}`} className="text-blue-600 hover:underline">
                    {lookup.organizationName || `#${lookup.organizationId}`}
                  </Link>
                ) : (
                  'none'
                )}
              </p>
              {(lookup.organization?.websiteSuspended || lookup.organization?.dashboardSuspended) && (
                <p className="text-sm text-amber-700">
                  The whole organization is suspended too. Lift that on the organization page, or this tenant ID stays off.
                </p>
              )}
              <SuspensionDialogButton
                key={`${lookup.settingsId}-${String(lookup.tenant.websiteSuspended)}-${String(lookup.tenant.dashboardSuspended)}`}
                target={{ kind: 'tenant', settingsId: lookup.settingsId, tenantId: lookup.tenantId }}
                current={lookup.tenant}
                onSaved={() => void runLookup(lookup.tenantId)}
              />
            </div>
          )}
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
