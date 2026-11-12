'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ONBOARDING_SITE_TYPE_OPTIONS } from '@/lib/onboarding/onboardingShared';
import TenantOrganizationDetailsTooltip from '@/app/admin/tenant-management/components/TenantOrganizationDetailsTooltip';
import AdminTableActionButtons from '@/components/admin/AdminTableActionButtons';
import { useAdminHoverTooltip } from '@/lib/admin/useAdminHoverTooltip';
import {
  emptyOrganizationSearchFilters,
  ORGANIZATION_SEARCH_PAGE_SIZE,
  type OrganizationSearchFilters,
} from '@/app/admin/tenant-management/organizations/organizationSearch';
import {
  listOrganizationsForExport,
  searchOrganizations,
} from '@/app/admin/tenant-management/organizations/organizationSearchActions';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

const inputClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base';

const EXPORT_HEADERS = [
  'ID',
  'Organization name',
  'Domain',
  'Website tenant IDs',
  'Contact person',
  'Contact email',
  'Contact phone',
  'Address line 1',
  'Address line 2',
  'City',
  'State',
  'ZIP',
  'Country',
  'Website URL',
  'Site type',
  'Subscription plan',
  'Subscription status',
  'Monthly fee',
  'Billing scope',
  'Active',
  'Created',
  'Updated',
] as const;

function Field({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof OrganizationSearchFilters;
  value: string;
  onChange: (name: keyof OrganizationSearchFilters, value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function monthlyFee(amount: number | null | undefined): number {
  const value = amount == null ? 0 : Number(amount);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function exportRow(organization: TenantOrganizationDTO): Array<string | number> {
  return [
    organization.id ?? '',
    organization.organizationName || '',
    organization.domain || '',
    (organization.websiteTenantIds || []).filter(Boolean).join(', '),
    organization.contactPersonName || '',
    organization.contactEmail || '',
    organization.contactPhone || '',
    organization.addressLine1 || '',
    organization.addressLine2 || '',
    organization.city || '',
    organization.stateProvince || '',
    organization.zipCode || '',
    organization.country || '',
    organization.websiteUrl || '',
    organization.siteType || '',
    organization.subscriptionPlan || '',
    organization.subscriptionStatus || '',
    monthlyFee(organization.monthlyFeeUsd),
    organization.billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website',
    organization.isActive === false ? 'No' : 'Yes',
    organization.createdAt || '',
    organization.updatedAt || '',
  ];
}

async function downloadOrganizations(rows: TenantOrganizationDTO[], fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([
    [...EXPORT_HEADERS],
    ...rows.map(exportRow),
  ]);
  const feeColumn = EXPORT_HEADERS.indexOf('Monthly fee');
  for (let rowIndex = 1; rowIndex <= rows.length; rowIndex += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: feeColumn })];
    if (cell && typeof cell.v === 'number') cell.z = '0.00';
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Organizations');
  XLSX.writeFile(workbook, fileName);
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OrganizationSearchClient() {
  const [draft, setDraft] = useState<OrganizationSearchFilters>(emptyOrganizationSearchFilters);
  const [applied, setApplied] = useState<OrganizationSearchFilters>(emptyOrganizationSearchFilters);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<TenantOrganizationDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'results' | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    item: tooltipOrg,
    anchorRect: tooltipAnchor,
    handleMouseEnter: handleTooltipEnter,
    handleMouseLeave: handleTooltipLeave,
    cancelClose: cancelTooltipClose,
    scheduleClose: scheduleTooltipClose,
    close: closeTooltip,
  } = useAdminHoverTooltip<TenantOrganizationDTO>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await searchOrganizations(applied, page, ORGANIZATION_SEARCH_PAGE_SIZE);
        if (cancelled) return;
        setRows(result.data);
        setTotalCount(result.totalCount);
      } catch (loadError) {
        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
          setError(loadError instanceof Error ? loadError.message : 'Could not search organizations.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applied, page]);

  const totalPages = Math.ceil(totalCount / ORGANIZATION_SEARCH_PAGE_SIZE) || 1;
  const startItem = totalCount > 0 ? page * ORGANIZATION_SEARCH_PAGE_SIZE + 1 : 0;
  const endItem = totalCount > 0 ? page * ORGANIZATION_SEARCH_PAGE_SIZE + rows.length : 0;
  const tooltipRowIndex = tooltipOrg ? rows.findIndex((row) => row.id === tooltipOrg.id) : -1;

  const updateDraft = (name: keyof OrganizationSearchFilters, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setApplied({ ...draft });
    setNotice(null);
  };

  const handleClear = () => {
    const cleared = emptyOrganizationSearchFilters();
    setDraft(cleared);
    setApplied(cleared);
    setPage(0);
    setNotice(null);
  };

  const handleExport = async (scope: 'results' | 'all') => {
    setExporting(scope);
    setError(null);
    setNotice(null);
    try {
      const filters = scope === 'all' ? emptyOrganizationSearchFilters() : applied;
      const exported = await listOrganizationsForExport(filters);
      const name = scope === 'all'
        ? `organizations-all-${fileStamp()}.xlsx`
        : `organizations-search-${fileStamp()}.xlsx`;
      await downloadOrganizations(exported, name);
      setNotice(
        exported.length === 0
          ? 'The sheet has the column headers. No organizations matched.'
          : `Downloaded ${exported.length} organization${exported.length === 1 ? '' : 's'}.`,
      );
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export organizations.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Organization name" name="organizationName" value={draft.organizationName} onChange={updateDraft} />
          <Field label="Domain" name="domain" value={draft.domain} onChange={updateDraft} />
          <Field label="Contact email" name="contactEmail" value={draft.contactEmail} onChange={updateDraft} />
          <Field label="Contact person" name="contactPersonName" value={draft.contactPersonName} onChange={updateDraft} />
          <Field label="Phone" name="contactPhone" value={draft.contactPhone} onChange={updateDraft} />
          <Field label="City" name="city" value={draft.city} onChange={updateDraft} />
          <Field label="State" name="stateProvince" value={draft.stateProvince} onChange={updateDraft} />
          <Field label="ZIP" name="zipCode" value={draft.zipCode} onChange={updateDraft} />
          <Field label="Country" name="country" value={draft.country} onChange={updateDraft} />
          <Field label="Website URL" name="websiteUrl" value={draft.websiteUrl} onChange={updateDraft} />
          <Field label="Website tenant ID" name="websiteTenantId" value={draft.websiteTenantId} onChange={updateDraft} />
          <label className="block text-sm font-medium text-gray-700">
            Site type
            <select
              name="siteType"
              value={draft.siteType}
              onChange={(event) => updateDraft('siteType', event.target.value)}
              className={inputClass}
            >
              <option value="">Any site type</option>
              {ONBOARDING_SITE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Subscription status
            <select
              name="subscriptionStatus"
              value={draft.subscriptionStatus}
              onChange={(event) => updateDraft('subscriptionStatus', event.target.value)}
              className={inputClass}
            >
              <option value="">Any subscription status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Active
            <select
              name="isActive"
              value={draft.isActive}
              onChange={(event) => updateDraft('isActive', event.target.value as OrganizationSearchFilters['isActive'])}
              className={inputClass}
            >
              <option value="">Active and inactive</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Search organizations"
            aria-label="Search organizations"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700">Search</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 flex-shrink-0 h-14 rounded-xl bg-amber-100 hover:bg-amber-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Clear filters"
            aria-label="Clear filters"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="font-semibold text-amber-700">Clear</span>
          </button>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => void handleExport('results')}
          disabled={exporting != null}
          className="flex-1 flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Export results"
          aria-label="Export results"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-green-700">{exporting === 'results' ? 'Exporting...' : 'Export results'}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleExport('all')}
          disabled={exporting != null}
          className="flex-1 flex-shrink-0 h-14 rounded-xl bg-purple-100 hover:bg-purple-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Export all organizations"
          aria-label="Export all organizations"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="font-semibold text-purple-700">{exporting === 'all' ? 'Exporting...' : 'Export all organizations'}</span>
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">{notice}</div>
      ) : null}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {['Organization', 'View', 'Domain', 'Contact email', 'Contact person', 'City', 'Site type', 'Billing scope', 'Status', 'Active'].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-300"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-600">
                  Searching organizations...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-600">
                  No organizations match these filters.
                </td>
              </tr>
            ) : (
              rows.map((organization) => (
                <tr key={organization.id} className="hover:bg-yellow-100">
                  <td
                    className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 cursor-help"
                    onMouseEnter={(event) => handleTooltipEnter(organization, event)}
                    onMouseLeave={handleTooltipLeave}
                    title="Hover for full organization details"
                  >
                    {organization.organizationName}
                  </td>
                  <td className="px-4 py-3 text-sm border-r border-gray-200">
                    <AdminTableActionButtons
                      viewHref={`/admin/tenant-management/organizations/${organization.id}`}
                      viewTitle="View organization"
                      compact
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.domain || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.contactEmail}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.contactPersonName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.city || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.siteType || '—'}</td>
                  <td className="px-4 py-3 text-sm border-r border-gray-200">
                    <Link href={`/admin/platform-billing?organizationId=${organization.id}`} className="font-semibold text-indigo-700">
                      {organization.billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{organization.subscriptionStatus || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{organization.isActive === false ? 'Inactive' : 'Active'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tooltipOrg ? (
        <TenantOrganizationDetailsTooltip
          organization={tooltipOrg}
          anchorRect={tooltipAnchor}
          serialNumber={tooltipRowIndex >= 0 ? startItem + tooltipRowIndex : undefined}
          onClose={closeTooltip}
          onTooltipMouseEnter={cancelTooltipClose}
          onTooltipMouseLeave={scheduleTooltipClose}
        />
      ) : null}

      <div className="mt-8">
        <div className="flex justify-between items-center gap-2">
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
          {totalCount > 0 ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700">
                Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                <span className="font-bold text-blue-600">{totalCount}</span> organizations
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No organizations found</span>
              <span className="text-sm text-orange-600">[No organizations match your criteria]</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
