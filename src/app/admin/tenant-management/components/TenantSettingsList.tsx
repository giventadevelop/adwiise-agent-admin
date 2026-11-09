'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAdminAccess, useAdminTenantId } from '../../AdminTenantContext';
import AdminTenantFilterField from '../../AdminTenantFilterField';
import { deleteTenantSetting, fetchTenantSettings, type OrganizationWithoutSettings } from '../settings/ApiServerActions';
import AdminTableActionButtons from '@/components/admin/AdminTableActionButtons';
import { useAdminHoverTooltip } from '@/lib/admin/useAdminHoverTooltip';
import TenantSettingsDetailsTooltip from './TenantSettingsDetailsTooltip';

type SearchField =
  | 'tenantId'
  | 'id'
  | 'organization'
  | 'email'
  | 'phoneNumber'
  | 'country'
  | 'stateProvince'
  | 'addressLine1';

type Tri = 'all' | 'yes' | 'no';

function triToBool(v: Tri): boolean | undefined {
  if (v === 'all') return undefined;
  return v === 'yes';
}

function buildTenantSettingsListFilters(
  tenantId: string | undefined,
  searchField: SearchField,
  searchQuery: string,
  allowUserRegistration: Tri,
  requireAdminApproval: Tri,
  enableWhatsappIntegration: Tri,
  enableEmailMarketing: Tri,
  enableGuestRegistration: Tri,
  isMembershipSubscriptionEnabled: Tri,
  sortBy: NonNullable<TenantSettingsFilters['sortBy']>,
  sortOrder: 'asc' | 'desc'
): TenantSettingsFilters {
  const out: TenantSettingsFilters = {
    tenantId: tenantId?.trim() || undefined,
    sortBy,
    sortOrder,
  };

  const q = searchQuery.trim();
  if (q) {
    if (searchField === 'tenantId') {
      out.tenantIdContains = q;
    } else if (searchField === 'id') {
      const n = parseInt(q, 10);
      if (!Number.isNaN(n)) out.idEquals = n;
    } else if (searchField === 'organization') {
      out.organizationNameContains = q;
    } else if (searchField === 'email') {
      out.emailContains = q;
    } else if (searchField === 'phoneNumber') {
      out.phoneNumberContains = q;
    } else if (searchField === 'country') {
      out.countryContains = q;
    } else if (searchField === 'stateProvince') {
      out.stateProvinceContains = q;
    } else if (searchField === 'addressLine1') {
      out.addressLine1Contains = q;
    }
  }

  const a = triToBool(allowUserRegistration);
  if (a !== undefined) out.allowUserRegistration = a;
  const r = triToBool(requireAdminApproval);
  if (r !== undefined) out.requireAdminApproval = r;
  const w = triToBool(enableWhatsappIntegration);
  if (w !== undefined) out.enableWhatsappIntegration = w;
  const e = triToBool(enableEmailMarketing);
  if (e !== undefined) out.enableEmailMarketing = e;
  const g = triToBool(enableGuestRegistration);
  if (g !== undefined) out.enableGuestRegistration = g;
  const m = triToBool(isMembershipSubscriptionEnabled);
  if (m !== undefined) out.isMembershipSubscriptionEnabled = m;

  return out;
}

interface TenantSettingsListProps {
  initialData?: TenantSettingsDTO[];
  initialTotalCount?: number;
  onRefresh?: () => void;
}

export default function TenantSettingsList({
  initialData = [],
  initialTotalCount = 0,
  onRefresh
}: TenantSettingsListProps) {
  const urlTenantId = useAdminTenantId();
  const { isPlatformSuperAdmin } = useAdminAccess();
  const [settings, setSettings] = useState<TenantSettingsDTO[]>(initialData);
  const [organizationsWithoutSettings, setOrganizationsWithoutSettings] = useState<OrganizationWithoutSettings[]>([]);
  const [organizationNamesByTenant, setOrganizationNamesByTenant] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!initialData.length);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  const [searchField, setSearchField] = useState<SearchField>('tenantId');
  const [searchQuery, setSearchQuery] = useState('');
  const [allowUserRegistration, setAllowUserRegistration] = useState<Tri>('all');
  const [requireAdminApproval, setRequireAdminApproval] = useState<Tri>('all');
  const [enableWhatsappIntegration, setEnableWhatsappIntegration] = useState<Tri>('all');
  const [enableEmailMarketing, setEnableEmailMarketing] = useState<Tri>('all');
  const [enableGuestRegistration, setEnableGuestRegistration] = useState<Tri>('all');
  const [isMembershipSubscriptionEnabled, setIsMembershipSubscriptionEnabled] = useState<Tri>('all');
  const [sortBy, setSortBy] = useState<NonNullable<TenantSettingsFilters['sortBy']>>('tenantId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filterSignatureRef = useRef('');
  const filterSignature = [
    urlTenantId ?? '',
    searchField,
    searchQuery,
    allowUserRegistration,
    requireAdminApproval,
    enableWhatsappIntegration,
    enableEmailMarketing,
    enableGuestRegistration,
    isMembershipSubscriptionEnabled,
    sortBy,
    sortOrder,
  ].join('|');

  useEffect(() => {
    if (filterSignatureRef.current === filterSignature) return;
    filterSignatureRef.current = filterSignature;
    setCurrentPage(0);
  }, [filterSignature]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const {
    item: tooltipSetting,
    anchorRect: tooltipAnchor,
    handleMouseEnter: handleTooltipEnter,
    handleMouseLeave: handleTooltipLeave,
    cancelClose: cancelTooltipClose,
    scheduleClose: scheduleTooltipClose,
    close: closeTooltip,
  } = useAdminHoverTooltip<TenantSettingsDTO>();

  const loadListAt = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);

      try {
        const listFilters = buildTenantSettingsListFilters(
          urlTenantId ?? undefined,
          searchField,
          searchQuery,
          allowUserRegistration,
          requireAdminApproval,
          enableWhatsappIntegration,
          enableEmailMarketing,
          enableGuestRegistration,
          isMembershipSubscriptionEnabled,
          sortBy,
          sortOrder
        );

        const response = await fetchTenantSettings(
          { page: targetPage, pageSize },
          listFilters
        );

        const settingsData = response.data;
        setSettings(settingsData);
        setTotalCount(response.totalCount);
        setOrganizationsWithoutSettings(response.organizationsWithoutSettings ?? []);

        const tenantIds = Array.from(
          new Set(settingsData.map((setting: TenantSettingsDTO) => setting.tenantId).filter(Boolean))
        );

        if (tenantIds.length > 0) {
          const orgMap: Record<string, string> = {};

          await Promise.all(
            tenantIds.map(async (tenantId) => {
              try {
                const orgResponse = await fetch('/api/proxy/tenant-organizations?' + new URLSearchParams({
                  'tenantId.equals': tenantId,
                  page: '0',
                  size: '1',
                }));

                if (!orgResponse.ok) return;

                const orgData: TenantOrganizationDTO[] = await orgResponse.json();
                if (Array.isArray(orgData) && orgData.length > 0 && orgData[0]?.organizationName) {
                  orgMap[tenantId] = orgData[0].organizationName;
                }
              } catch (orgError) {
                console.error(`Failed to load organization for tenant ${tenantId}:`, orgError);
              }
            })
          );

          setOrganizationNamesByTenant(orgMap);
        } else {
          setOrganizationNamesByTenant({});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [
      urlTenantId,
      searchField,
      searchQuery,
      allowUserRegistration,
      requireAdminApproval,
      enableWhatsappIntegration,
      enableEmailMarketing,
      enableGuestRegistration,
      isMembershipSubscriptionEnabled,
      sortBy,
      sortOrder,
      pageSize,
    ]
  );

  useEffect(() => {
    void loadListAt(currentPage);
  }, [currentPage, loadListAt]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? settings.map(setting => setting.id!).filter(Boolean) : []);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete these settings?')) {
      return;
    }

    try {
      await deleteTenantSetting(id);
      const nextPage = settings.length <= 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      if (nextPage !== currentPage) setCurrentPage(nextPage);
      else void loadListAt(currentPage);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete settings:', err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;
  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = currentPage * pageSize + settings.length;

  const triSelect = (label: string, value: Tri, onChange: (v: Tri) => void) => (
    <div>
      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      <select
        className="border border-gray-300 dark:border-gray-600 px-2 py-2 rounded w-full min-w-[7rem] text-xs sm:text-sm dark:bg-gray-700 dark:text-white"
        value={value}
        onChange={(e) => onChange(e.target.value as Tri)}
      >
        <option value="all">All</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );

  if (loading && settings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white text-center sm:text-left">Tenant Settings</h2>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6">
          <div className="text-base font-semibold text-blue-800 dark:text-blue-300 mb-4">Search &amp; filters</div>
          <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <AdminTenantFilterField />
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Search by</label>
              <select
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded w-52 min-w-[13rem] text-sm dark:bg-gray-700 dark:text-white"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
              >
                <option value="tenantId">Tenant ID (contains)</option>
                <option value="id">Settings ID</option>
                <option value="organization">Organization name</option>
                <option value="email">Email</option>
                <option value="phoneNumber">Phone</option>
                <option value="country">Country</option>
                <option value="stateProvince">State / province</option>
                <option value="addressLine1">Address line 1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                {searchField === 'id' ? 'Numeric ID' : 'Contains'}
              </label>
              <input
                type={searchField === 'id' ? 'number' : 'text'}
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded w-48 min-w-[12rem] text-sm dark:bg-gray-700 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchField === 'id'
                    ? 'e.g. 42'
                    : searchField === 'organization'
                      ? 'e.g. Cultural Center'
                      : `Search ${searchField}`
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Sort</label>
              <select
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded w-44 text-sm dark:bg-gray-700 dark:text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as NonNullable<TenantSettingsFilters['sortBy']>)}
              >
                <option value="tenantId">Tenant ID</option>
                <option value="createdAt">Created</option>
                <option value="updatedAt">Updated</option>
                <option value="id">ID</option>
                <option value="maxEventsPerMonth">Max events / month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Order</label>
              <select
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded w-28 text-sm dark:bg-gray-700 dark:text-white"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {triSelect('User registration', allowUserRegistration, setAllowUserRegistration)}
            {triSelect('Require admin approval', requireAdminApproval, setRequireAdminApproval)}
            {triSelect('WhatsApp integration', enableWhatsappIntegration, setEnableWhatsappIntegration)}
            {triSelect('Email marketing', enableEmailMarketing, setEnableEmailMarketing)}
            {triSelect('Guest registration', enableGuestRegistration, setEnableGuestRegistration)}
            {triSelect('Membership subscriptions', isMembershipSubscriptionEnabled, setIsMembershipSubscriptionEnabled)}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {organizationsWithoutSettings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            {organizationsWithoutSettings.length === 1
              ? '1 matching tenant has an organization but no settings row, so it is not in this table.'
              : `${organizationsWithoutSettings.length} matching tenants have an organization but no settings row, so they are not in this table.`}
          </p>
          <ul className="mt-2 space-y-1">
            {organizationsWithoutSettings.map((org) => (
              <li key={org.tenantId}>
                <span className="font-mono">{org.tenantId}</span>
                {' — '}
                {org.organizationName}
                {' · '}
                <Link
                  href={
                    isPlatformSuperAdmin
                      ? `/admin/tenant-management/organizations/${org.id}`
                      : `/admin/tenant-management/settings/new?tenantId=${encodeURIComponent(org.tenantId)}`
                  }
                  className="font-semibold text-amber-900 underline"
                >
                  {isPlatformSuperAdmin ? 'View organization' : 'Create settings'}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="user-table-scroll-container">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600" style={{ minWidth: '820px', width: '100%' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left border-b border-r border-gray-300 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === settings.length && settings.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="custom-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th className="w-[160px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Tenant ID
                </th>
                <th className="w-[200px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Organization
                </th>
                <th className="w-[140px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  User Registration
                </th>
                <th className="w-[150px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  WhatsApp Integration
                </th>
                <th className="w-[140px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Email Marketing
                </th>
                <th className="w-[130px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  AdSense
                </th>
                <th className="w-[140px] px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600">
                  Max Events/Month
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-300 dark:divide-gray-600">
            {settings.map((setting, index) => (
              <tr key={setting.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'} hover:bg-yellow-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-300 dark:border-gray-600`}>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(setting.id!)}
                    onChange={(e) => handleSelectOne(setting.id!, e.target.checked)}
                    className="custom-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td
                  className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 cursor-help"
                  onMouseEnter={(e) => handleTooltipEnter(setting, e)}
                  onMouseLeave={handleTooltipLeave}
                  title="Hover for full settings details"
                >
                  {setting.tenantId}
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                  <div className="space-y-2">
                    <div className="max-w-[200px] truncate" title={organizationNamesByTenant[setting.tenantId] || setting.tenantOrganization?.organizationName || 'Not linked'}>
                      {organizationNamesByTenant[setting.tenantId] || setting.tenantOrganization?.organizationName || 'Not linked'}
                    </div>
                    <AdminTableActionButtons
                      viewHref={`/admin/tenant-management/settings/${setting.id}`}
                      editHref={`/admin/tenant-management/settings/${setting.id}/edit`}
                      onDelete={() => handleDelete(setting.id!)}
                      viewTitle="View settings"
                      editTitle="Edit settings"
                      deleteTitle="Delete settings"
                    />
                  </div>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${setting.allowUserRegistration
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                    {setting.allowUserRegistration ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${setting.enableWhatsappIntegration
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {setting.enableWhatsappIntegration ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${setting.enableEmailMarketing
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {setting.enableEmailMarketing ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${setting.enableGoogleAdsense
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {setting.enableGoogleAdsense ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                  {setting.maxEventsPerMonth ?? 'Unlimited'}
                </td>
              </tr>
            ))}
            {settings.length === 0 && !loading && (
              <tr>
                <td className="px-2 sm:px-4 lg:px-6 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center" colSpan={8}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No settings found</span>
                    <span className="text-sm text-orange-600">[No settings match your criteria]</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {tooltipSetting && (
        <TenantSettingsDetailsTooltip
          setting={tooltipSetting}
          organizationName={organizationNamesByTenant[tooltipSetting.tenantId]}
          anchorRect={tooltipAnchor}
          onClose={closeTooltip}
          onTooltipMouseEnter={cancelTooltipClose}
          onTooltipMouseLeave={scheduleTooltipClose}
        />
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={!hasPrevPage || loading}
            className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Previous Page"
            aria-label="Previous Page"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="px-2 sm:px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold text-blue-700">
              Page <span className="text-blue-600">{currentPage + 1}</span> of <span className="text-blue-600">{totalPages}</span>
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!hasNextPage || loading}
            className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Next Page"
            aria-label="Next Page"
            type="button"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="text-center mt-3">
          {totalCount > 0 ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-bold text-blue-600 dark:text-blue-400">{startItem}</span> to <span className="font-bold text-blue-600 dark:text-blue-400">{endItem}</span> of <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount}</span> settings
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No settings found</span>
              <span className="text-sm text-orange-600">[No settings match your criteria]</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
