'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import { fetchTenantOrganizationsBySiteTypes } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { PageFooter } from '@/components/retail/RetailUi';

const PAGE_SIZE = 8;

interface TenantSiteTypePickerProps {
  /** Site type archetypes to list, e.g. ['GAS_STATION'] or ['PERSONAL_PROFILE', 'HYBRID'] */
  siteTypes: string[];
  /** Heading shown above the list, e.g. 'Gas station tenants' */
  title: string;
}

/**
 * Narrow listing of all tenant organizations belonging to the given site-type
 * category. Selecting a row sets the admin `?tenant=` query param, which the
 * AdminTenantContext top bar picks up, scoping the module page to that tenant.
 */
export default function TenantSiteTypePicker({ siteTypes, title }: TenantSiteTypePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<TenantOrganizationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    fetchTenantOrganizationsBySiteTypes(siteTypes).then((orgs) => {
      if (!cancelled) {
        setOrganizations(orgs);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteTypes.join(',')]);

  const totalCount = organizations.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => organizations.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [organizations, currentPage]
  );
  const showPagination = totalCount > PAGE_SIZE;

  const selectTenant = (tenantId: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('tenant', tenantId);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Select a tenant to manage — or type a Tenant ID in the blue bar at the top
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Tenant ID', 'Organization', 'Site Type', 'Contact', 'Status', ''].map((h) => (
                <th
                  key={h || 'action'}
                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">
                  Loading tenants…
                </td>
              </tr>
            )}
            {!loading && organizations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">
                  No tenants with site type {siteTypes.join(' / ')} yet. Set an organization&apos;s
                  Site Type under Tenant Organizations → Edit.
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((org) => (
                <tr key={org.tenantId} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50">
                  <td className="px-3 sm:px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {org.tenantId}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {org.organizationName}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                      {org.siteType ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-300 break-all">
                    {org.contactEmail}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        org.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => selectTenant(org.tenantId)}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-semibold"
                    >
                      Select →
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <PageFooter
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          countLabel="tenants"
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}
    </div>
  );
}
