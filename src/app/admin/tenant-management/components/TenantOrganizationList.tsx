'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBan, FaSearch, FaSort, FaTrashAlt } from 'react-icons/fa';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TenantOrganizationDTO, TenantOrganizationFilters } from '@/app/admin/tenant-management/types';
import TenantOrganizationDetailsTooltip from '@/app/admin/tenant-management/components/TenantOrganizationDetailsTooltip';
import AdminTableActionButtons from '@/components/admin/AdminTableActionButtons';
import { useAdminHoverTooltip } from '@/lib/admin/useAdminHoverTooltip';
import {
  deleteTenantOrganization,
  toggleTenantOrganizationStatus,
} from '@/app/admin/tenant-management/organizations/ApiServerActions';

interface TenantOrganizationListProps {
  initialData?: TenantOrganizationDTO[];
  initialTotalCount?: number;
  onRefresh?: () => void;
}

export default function TenantOrganizationList({
  initialData = [],
  initialTotalCount = 0,
  onRefresh
}: TenantOrganizationListProps) {
  const [organizations, setOrganizations] = useState<TenantOrganizationDTO[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<TenantOrganizationFilters>({
    search: '',
    subscriptionStatus: '',
    isActive: undefined,
    sortBy: 'organizationName',
    sortOrder: 'asc'
  });

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pendingDelete, setPendingDelete] = useState<TenantOrganizationDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    item: tooltipOrg,
    anchorRect: tooltipAnchor,
    handleMouseEnter: handleTooltipEnter,
    handleMouseLeave: handleTooltipLeave,
    cancelClose: cancelTooltipClose,
    scheduleClose: scheduleTooltipClose,
    close: closeTooltip,
  } = useAdminHoverTooltip<TenantOrganizationDTO>();

  // Load data function
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/proxy/tenant-organizations?' + new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString(),
        ...(filters.search && { 'organizationName.contains': filters.search }),
        ...(filters.subscriptionStatus && { 'subscriptionStatus.equals': filters.subscriptionStatus }),
        ...(filters.isActive !== undefined && { 'isActive.equals': filters.isActive.toString() }),
        ...(filters.sortBy && { sort: `${filters.sortBy},${filters.sortOrder}` })
      }));

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      const total = parseInt(response.headers.get('x-total-count') || '0');

      setOrganizations(Array.isArray(data) ? data : []);
      setTotalCount(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters/pagination change
  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, filters]);

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(0); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof TenantOrganizationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  // Handle sorting
  const handleSort = (field: 'organizationName' | 'createdAt' | 'subscriptionStatus') => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? organizations.map(org => org.id!).filter(Boolean) : []);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    );
  };

  // Handle status toggle (SUPER_ADMIN only via server action)
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await toggleTenantOrganizationStatus(id, !currentStatus);
      loadData();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.id || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTenantOrganization(pendingDelete.id);
      setPendingDelete(null);
      loadData();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;
  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = currentPage * pageSize + organizations.length;
  const tooltipRowIndex = tooltipOrg
    ? organizations.findIndex((o) => o.id === tooltipOrg.id)
    : -1;

  if (loading && organizations.length === 0) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white text-center sm:text-left">Tenant Organizations</h2>
        <Link
          href="/admin/tenant-management/organizations/new"
          className="flex-shrink-0 h-12 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 hover:scale-105 px-3 sm:px-6"
          title="Create New Organization"
          aria-label="Create New Organization"
        >
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base whitespace-nowrap">Create New</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by organization name, tenant ID, or domain..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              />
            </div>
          </div>
          <select
            value={filters.subscriptionStatus || ''}
            onChange={(e) => handleFilterChange('subscriptionStatus', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
          >
            <option value="">All Organizations</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="user-table-scroll-container">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600" style={{ minWidth: '680px', width: '100%' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left border-b border-r border-gray-300 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === organizations.length && organizations.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="custom-checkbox"
                  />
                </th>
                <th
                  className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-r border-gray-300 dark:border-gray-600"
                  onClick={() => handleSort('organizationName')}
                >
                  <div className="flex items-center gap-2">
                    Organization Name
                    <FaSort className="text-xs" />
                  </div>
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Tenant ID
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Website / Domain
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">
                  Contact Email
                </th>
                <th
                  className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-r border-gray-300 dark:border-gray-600"
                  onClick={() => handleSort('subscriptionStatus')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <FaSort className="text-xs" />
                  </div>
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600">
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-300 dark:divide-gray-600">
            {organizations.map((org, index) => (
              <tr key={org.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'} hover:bg-yellow-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-300 dark:border-gray-600`}>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(org.id!)}
                    onChange={(e) => handleSelectOne(org.id!, e.target.checked)}
                    className="custom-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td
                  className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 cursor-help"
                  onMouseEnter={(e) => handleTooltipEnter(org, e)}
                  onMouseLeave={handleTooltipLeave}
                  title="Hover for full organization details"
                >
                  {org.organizationName}
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                  <div className="space-y-2">
                    <div className="font-mono max-w-[180px] truncate" title={org.tenantId}>
                      {org.tenantId}
                    </div>
                    <AdminTableActionButtons
                      viewHref={`/admin/tenant-management/organizations/${org.id}`}
                      editHref={`/admin/tenant-management/organizations/${org.id}/edit`}
                      onDelete={() => setPendingDelete(org)}
                      viewTitle="View Organization"
                      editTitle="Edit Organization"
                      deleteTitle="Delete Organization"
                    />
                  </div>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                  {org.domain || '-'}
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                  {org.contactEmail}
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${org.subscriptionStatus === 'ACTIVE'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : org.subscriptionStatus === 'SUSPENDED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {org.subscriptionStatus || 'Unknown'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleStatus(org.id!, org.isActive || false)}
                    className={`flex items-center gap-1 sm:gap-2 ${org.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                      }`}
                  >
                    {org.isActive ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 7H7a5 5 0 000 10h10a5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 7H7a5 5 0 000 10h10a5 5 0 000-10zM7 15a3 3 0 110-6 3 3 0 010 6z" />
                      </svg>
                    )}
                    <span className="text-xs sm:text-sm">{org.isActive ? 'Active' : 'Inactive'}</span>
                  </button>
                </td>
              </tr>
            ))}
            {organizations.length === 0 && !loading && (
              <tr>
                <td className="px-2 sm:px-4 lg:px-6 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center" colSpan={7}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No organizations found</span>
                    <span className="text-sm text-orange-600">[No organizations match your criteria]</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {tooltipOrg && (
        <TenantOrganizationDetailsTooltip
          organization={tooltipOrg}
          anchorRect={tooltipAnchor}
          serialNumber={tooltipRowIndex >= 0 ? startItem + tooltipRowIndex : undefined}
          onClose={closeTooltip}
          onTooltipMouseEnter={cancelTooltipClose}
          onTooltipMouseLeave={scheduleTooltipClose}
        />
      )}

      {/* Pagination Controls - Always visible, matching admin page style */}
      <div className="mt-8">
        <div className="flex justify-between items-center gap-2">
          {/* Previous Button */}
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

          {/* Page Info */}
          <div className="px-2 sm:px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold text-blue-700">
              Page <span className="text-blue-600">{currentPage + 1}</span> of <span className="text-blue-600">{totalPages || 1}</span>
            </span>
          </div>

          {/* Next Button */}
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

        {/* Item Count Text */}
        <div className="text-center mt-3">
          {totalCount > 0 ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-bold text-blue-600 dark:text-blue-400">{startItem}</span> to <span className="font-bold text-blue-600 dark:text-blue-400">{endItem}</span> of <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount}</span> organizations
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

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{' '}
              <span className="font-semibold">{pendingDelete?.organizationName || 'this organization'}</span>
              {pendingDelete?.tenantId ? (
                <>
                  {' '}(<span className="font-mono">{pendingDelete.tenantId}</span>)
                </>
              ) : null}
              . The organization row is deleted and cannot be restored from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              disabled={deleting}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-teal-100 hover:bg-teal-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
                <FaBan className="w-6 h-6 text-teal-800" aria-hidden="true" />
              </div>
              <span className="font-semibold text-teal-800">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                {deleting ? (
                  <svg className="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <FaTrashAlt className="w-6 h-6 text-red-600" aria-hidden="true" />
                )}
              </div>
              <span className="font-semibold text-red-700">{deleting ? 'Deleting...' : 'Delete organization'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
