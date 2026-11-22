'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaGlobe, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import SearchFieldClearButton from '@/components/admin/SearchFieldClearButton';
import { useAuth } from '@clerk/nextjs';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import AdminNavigation from '@/components/AdminNavigation';
import type { SatelliteDomainDTO } from '@/types';
import { useAdminTenantId } from '../AdminTenantContext';
import AdminTenantFilterField from '../AdminTenantFilterField';
import AdminFilterToolbar from '@/components/admin/AdminFilterToolbar';
import {
  fetchSatelliteDomainsServer,
  createSatelliteDomainServer,
  updateSatelliteDomainServer,
  deleteSatelliteDomainServer,
  fetchTenantLogoUrlFromTenantSettingsServer,
} from './ApiServerActions';
import SatelliteDomainsGuidance from '@/components/admin/SatelliteDomainsGuidance';

const emptyFormData: Partial<SatelliteDomainDTO> = {
  satelliteKey: '',
  domain: '',
  hostname: '',
  displayName: '',
  tenantId: '',
  enabled: true,
  orgName: '',
  fullName: '',
  tagline: '',
  logoType: 'text',
  logoUrl: '',
  logoPrimaryColor: '',
  logoSecondaryColor: '',
  themePrimaryColor: '',
  themeHoverColor: '',
  themeActiveColor: '',
  contactAddress: '',
  contactPhone: '',
  contactTollFree: '',
  contactEmail: '',
  socialFacebook: '',
  socialTwitter: '',
  socialLinkedin: '',
  socialYoutube: '',
  showOnAuthHeader: true,
  showOnAuthFooter: true,
};

/** Optional URL fields: strip empty/placeholder values (HTML5 type="url" rejects "#" and blocks submit). */
function optionalUrlField(value: string | undefined | null): string | undefined {
  const t = value?.trim();
  if (!t || t === '#') return undefined;
  return t;
}

/** Show empty instead of legacy placeholder "#" in the form. */
function displayOptionalUrl(value: string | undefined | null): string {
  const t = value?.trim();
  if (!t || t === '#') return '';
  return t;
}

export default function SatelliteDomainsPage() {
  const { userId } = useAuth();
  const tenantId = useAdminTenantId();

  const [domains, setDomains] = useState<SatelliteDomainDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<SatelliteDomainDTO | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SatelliteDomainDTO>>({ ...emptyFormData });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /** Tenant settings logo URL for the Tenant ID field (satellite form reference / prefill). */
  const [tenantSettingsLogoUrl, setTenantSettingsLogoUrl] = useState<string | null>(null);
  const [tenantSettingsLogoLoading, setTenantSettingsLogoLoading] = useState(false);

  const domainModalOpen = isCreateModalOpen || isEditModalOpen;

  useEffect(() => {
    if (userId) {
      loadDomains();
    }
  }, [userId, page, tenantId]);

  useEffect(() => {
    const tid = formData.tenantId?.trim();
    if (!domainModalOpen || !tid) {
      setTenantSettingsLogoUrl(null);
      setTenantSettingsLogoLoading(false);
      return;
    }
    setTenantSettingsLogoUrl(null);
    let cancelled = false;
    const timer = setTimeout(() => {
      setTenantSettingsLogoLoading(true);
      fetchTenantLogoUrlFromTenantSettingsServer(tid)
        .then((url) => {
          if (!cancelled) {
            setTenantSettingsLogoUrl(url);
            setTenantSettingsLogoLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTenantSettingsLogoUrl(null);
            setTenantSettingsLogoLoading(false);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [domainModalOpen, formData.tenantId]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const result = await fetchSatelliteDomainsServer(page, pageSize, tenantId);
      setDomains(result.data);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err.message || 'Failed to load satellite domains');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.satelliteKey?.trim()) {
        setToastMessage({ type: 'error', message: 'Satellite Key is required' });
        return;
      }
      if (!formData.domain?.trim()) {
        setToastMessage({ type: 'error', message: 'Domain URL is required' });
        return;
      }
      if (!formData.hostname?.trim()) {
        setToastMessage({ type: 'error', message: 'Hostname is required' });
        return;
      }
      if (!formData.displayName?.trim()) {
        setToastMessage({ type: 'error', message: 'Display Name is required' });
        return;
      }

      const payload: Omit<SatelliteDomainDTO, 'id' | 'createdAt' | 'updatedAt'> = {
        satelliteKey: formData.satelliteKey!.trim(),
        domain: formData.domain!.trim(),
        hostname: formData.hostname!.trim(),
        displayName: formData.displayName!.trim(),
        enabled: formData.enabled ?? true,
        orgName: formData.orgName?.trim() || undefined,
        fullName: formData.fullName?.trim() || undefined,
        tagline: formData.tagline?.trim() || undefined,
        logoType: formData.logoType || 'text',
        logoUrl: optionalUrlField(formData.logoUrl),
        logoPrimaryColor: formData.logoPrimaryColor?.trim() || undefined,
        logoSecondaryColor: formData.logoSecondaryColor?.trim() || undefined,
        themePrimaryColor: formData.themePrimaryColor?.trim() || undefined,
        themeHoverColor: formData.themeHoverColor?.trim() || undefined,
        themeActiveColor: formData.themeActiveColor?.trim() || undefined,
        contactAddress: formData.contactAddress?.trim() || undefined,
        contactPhone: formData.contactPhone?.trim() || undefined,
        contactTollFree: formData.contactTollFree?.trim() || undefined,
        contactEmail: formData.contactEmail?.trim() || undefined,
        socialFacebook: optionalUrlField(formData.socialFacebook),
        socialTwitter: optionalUrlField(formData.socialTwitter),
        socialLinkedin: optionalUrlField(formData.socialLinkedin),
        socialYoutube: optionalUrlField(formData.socialYoutube),
        showOnAuthHeader: formData.showOnAuthHeader ?? true,
        showOnAuthFooter: formData.showOnAuthFooter ?? true,
      };

      await createSatelliteDomainServer(payload, tenantId);
      setIsCreateModalOpen(false);
      resetForm();
      setToastMessage({ type: 'success', message: 'Satellite domain created successfully' });
      await loadDomains();
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to create satellite domain' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      await updateSatelliteDomainServer(selectedDomain.id!, {
        ...formData,
        logoUrl: optionalUrlField(formData.logoUrl),
        socialFacebook: optionalUrlField(formData.socialFacebook),
        socialTwitter: optionalUrlField(formData.socialTwitter),
        socialLinkedin: optionalUrlField(formData.socialLinkedin),
        socialYoutube: optionalUrlField(formData.socialYoutube),
      });
      setIsEditModalOpen(false);
      setSelectedDomain(null);
      resetForm();
      setToastMessage({ type: 'success', message: 'Satellite domain updated successfully' });
      await loadDomains();
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to update satellite domain' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      await deleteSatelliteDomainServer(selectedDomain.id!);
      setIsDeleteModalOpen(false);
      setSelectedDomain(null);
      setToastMessage({ type: 'success', message: 'Satellite domain deleted successfully' });
      await loadDomains();
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to delete satellite domain' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (domain: SatelliteDomainDTO) => {
    try {
      await updateSatelliteDomainServer(domain.id!, { enabled: !domain.enabled });
      setToastMessage({
        type: 'success',
        message: `${domain.displayName} ${domain.enabled ? 'disabled' : 'enabled'} successfully`,
      });
      await loadDomains();
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to toggle satellite domain' });
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyFormData });
  };

  const openEditModal = (domain: SatelliteDomainDTO) => {
    setSelectedDomain(domain);
    setFormData({
      ...domain,
      logoUrl: displayOptionalUrl(domain.logoUrl),
      socialFacebook: displayOptionalUrl(domain.socialFacebook),
      socialTwitter: displayOptionalUrl(domain.socialTwitter),
      socialLinkedin: displayOptionalUrl(domain.socialLinkedin),
      socialYoutube: displayOptionalUrl(domain.socialYoutube),
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (domain: SatelliteDomainDTO) => {
    setSelectedDomain(domain);
    setIsDeleteModalOpen(true);
  };

  // Filter and sort
  const filteredDomains = domains.filter(domain =>
    domain.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    domain.satelliteKey?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    domain.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    domain.tenantId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDomains = [...filteredDomains].sort((a, b) => {
    if (!sortKey) return 0;
    const aValue = a[sortKey as keyof SatelliteDomainDTO];
    const bValue = b[sortKey as keyof SatelliteDomainDTO];
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const columns: Column<SatelliteDomainDTO>[] = [
    { key: 'satelliteKey', label: 'Key', sortable: true },
    { key: 'displayName', label: 'Display Name', sortable: true },
    {
      key: 'hostname',
      label: 'Hostname',
      sortable: true,
      render: (value) => (
        <a
          href={`https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      ),
    },
    { key: 'tenantId', label: 'Tenant ID', sortable: true },
    {
      key: 'enabled',
      label: 'Status',
      sortable: true,
      render: (value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleEnabled(row);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            value
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
          title={value ? 'Click to disable' : 'Click to enable'}
        >
          {value ? <FaToggleOn className="w-4 h-4" /> : <FaToggleOff className="w-4 h-4" />}
          {value ? 'Enabled' : 'Disabled'}
        </button>
      ),
    },
  ];

  if (loading && domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminNavigation currentPage="satellite-domains" />
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading satellite domains...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" style={{ paddingTop: '180px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNavigation currentPage="satellite-domains" />

        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  <FaGlobe className="text-blue-600" />
                  Satellite Domains
                  <SatelliteDomainsGuidance showHelp showBanner={false} />
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage satellite domain configurations for multi-tenant authentication and branding.
                </p>
                <div className="mt-4 max-w-3xl">
                  <SatelliteDomainsGuidance showHelp={false} showBanner context="general" />
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                title="Add Satellite Domain"
                aria-label="Add Satellite Domain"
                type="button"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <FaPlus className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-blue-700">Add Domain</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Search and Filter */}
            <AdminFilterToolbar className="mb-6">
              <AdminTenantFilterField className="w-full" />
              <div className="w-full min-w-0">
                <div className="relative">
                  <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, key, hostname, or tenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm ? (
                    <SearchFieldClearButton label="Clear domain search" onClear={() => setSearchTerm('')} />
                  ) : null}
                </div>
              </div>
            </AdminFilterToolbar>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Data Table */}
            <DataTable
              data={sortedDomains}
              columns={columns}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={(key, direction) => {
                setSortKey(key);
                setSortDirection(direction);
              }}
            />

            {/* Pagination Controls */}
            <div className="mt-8">
              <div className="flex justify-between items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  disabled={page === 0 || loading}
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
                    Page <span className="text-blue-600">{page + 1}</span> of <span className="text-blue-600">{Math.max(1, Math.ceil(totalCount / pageSize))}</span>
                  </span>
                </div>

                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={page >= Math.ceil(totalCount / pageSize) - 1 || loading}
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
                    <span className="text-sm text-gray-700">
                      Showing <span className="font-bold text-blue-600">{totalCount > 0 ? page * pageSize + 1 : 0}</span> to <span className="font-bold text-blue-600">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-bold text-blue-600">{totalCount}</span> satellite domains
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-700">No satellite domains found</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toast Message */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toastMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toastMessage.message}
            <button
              onClick={() => setToastMessage(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add Satellite Domain"
        size="xl"
      >
        <SatelliteDomainForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          loading={loading}
          submitText="Create Domain"
          tenantSettingsLogoUrl={tenantSettingsLogoUrl}
          tenantSettingsLogoLoading={tenantSettingsLogoLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDomain(null);
          resetForm();
        }}
        title="Edit Satellite Domain"
        size="xl"
      >
        <SatelliteDomainForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEdit}
          loading={loading}
          submitText="Update Domain"
          tenantSettingsLogoUrl={tenantSettingsLogoUrl}
          tenantSettingsLogoLoading={tenantSettingsLogoLoading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDomain(null);
        }}
        onConfirm={handleDelete}
        title="Delete Satellite Domain"
        message={`Are you sure you want to delete "${selectedDomain?.displayName}" (${selectedDomain?.hostname})? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// ─── Satellite Domain Form Component ────────────────────────────────────────────

interface SatelliteDomainFormProps {
  formData: Partial<SatelliteDomainDTO>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<SatelliteDomainDTO>>>;
  onSubmit: () => void;
  loading: boolean;
  submitText: string;
  /** Resolved from Tenant Management → settings for this Tenant ID */
  tenantSettingsLogoUrl?: string | null;
  tenantSettingsLogoLoading?: boolean;
}

function SatelliteDomainForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  submitText,
  tenantSettingsLogoUrl = null,
  tenantSettingsLogoLoading = false,
}: SatelliteDomainFormProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copyText = async (text: string, successMsg: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(successMsg);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('Could not copy to clipboard');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* ── Core Fields ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Core Configuration</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Satellite Key *</label>
            <input
              type="text"
              name="satelliteKey"
              value={formData.satelliteKey || ''}
              onChange={handleChange}
              required
              placeholder="e.g. mosc-temp"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName || ''}
              onChange={handleChange}
              required
              placeholder="e.g. MOSC Temp"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain URL *</label>
            <input
              type="url"
              name="domain"
              value={formData.domain || ''}
              onChange={handleChange}
              required
              placeholder="e.g. https://www.mosc-temp.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hostname *</label>
            <input
              type="text"
              name="hostname"
              value={formData.hostname || ''}
              onChange={handleChange}
              required
              placeholder="e.g. www.mosc-temp.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input
              type="text"
              name="tenantId"
              value={formData.tenantId || ''}
              onChange={handleChange}
              placeholder="e.g. mosc-temp"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled ?? true}
              onChange={handleChange}
              id="enabled"
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              Enabled
            </label>
          </div>
        </div>
      </fieldset>

      {/* ── Branding ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Branding</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input
              type="text"
              name="orgName"
              value={formData.orgName || ''}
              onChange={handleChange}
              placeholder="e.g. MOSC"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleChange}
              placeholder="e.g. Malayalee Organization of South Carolina"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              name="tagline"
              value={formData.tagline || ''}
              onChange={handleChange}
              placeholder="e.g. Unity in Diversity"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Logo ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Logo</legend>
        <div
          className="mb-3 rounded-lg border border-blue-100 bg-blue-50/90 px-3 py-2.5 text-xs text-gray-700"
          role="note"
        >
          <div className="flex gap-2">
            <svg
              className="h-5 w-5 shrink-0 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Logo URL and tenant settings</p>
              <p>
                You can copy the same logo URL from{' '}
                <span className="font-medium">Admin → Tenant Management → settings → Customization</span> for this
                satellite&apos;s Tenant ID, then paste it here or use <strong>Use for satellite</strong> when Tenant ID
                is filled in below.
              </p>
              <p className="text-gray-600">
                If no URL appears in tenant settings, upload a logo on that Customization tab first; the URL will
                appear after upload.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Type</label>
            <select
              name="logoType"
              value={formData.logoType || 'text'}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              name="logoUrl"
              inputMode="url"
              autoComplete="off"
              value={formData.logoUrl || ''}
              onChange={handleChange}
              placeholder="https://… (optional — see tip above)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {formData.tenantId?.trim() ? (
            <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3 space-y-2">
              <p className="text-sm font-medium text-gray-800">Tenant settings logo (same Tenant ID)</p>
              <p className="text-xs text-gray-600">
                Pulled from Tenant Management → settings for <span className="font-mono">{formData.tenantId.trim()}</span>.
                Copy or apply to the Logo URL field above to persist on this satellite domain.
              </p>
              {tenantSettingsLogoLoading ? (
                <p className="text-sm text-gray-500">Loading tenant settings…</p>
              ) : tenantSettingsLogoUrl ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="text"
                    readOnly
                    value={tenantSettingsLogoUrl}
                    className="flex-1 min-w-0 text-xs font-mono border border-gray-300 rounded-lg px-2 py-2 bg-white"
                    title={tenantSettingsLogoUrl}
                  />
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyText(tenantSettingsLogoUrl, 'Logo URL copied')}
                      className="flex-shrink-0 h-10 px-3 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105"
                      title="Copy logo URL"
                      aria-label="Copy logo URL from tenant settings"
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-blue-700">Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, logoUrl: tenantSettingsLogoUrl, logoType: 'image' }));
                        setCopyFeedback('Logo URL applied — save to persist');
                        setTimeout(() => setCopyFeedback(null), 2500);
                      }}
                      className="flex-shrink-0 h-10 px-3 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105"
                      title="Fill Logo URL field with this URL"
                      aria-label="Use tenant settings logo URL for satellite"
                    >
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-semibold text-green-700">Use for satellite</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  No logo URL in tenant settings for this tenant yet. Upload a logo under Tenant Management →
                  Customization, then return here.
                </p>
              )}
              {copyFeedback && <p className="text-xs text-green-700 font-medium">{copyFeedback}</p>}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Primary Color</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="logoPrimaryColor"
                value={formData.logoPrimaryColor || ''}
                onChange={handleChange}
                placeholder="#9333ea"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.logoPrimaryColor && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.logoPrimaryColor }}
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="logoSecondaryColor"
                value={formData.logoSecondaryColor || ''}
                onChange={handleChange}
                placeholder="#a855f7"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.logoSecondaryColor && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.logoSecondaryColor }}
                />
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {/* ── Theme Colors ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Theme Colors</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="themePrimaryColor"
                value={formData.themePrimaryColor || ''}
                onChange={handleChange}
                placeholder="#9333ea"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.themePrimaryColor && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.themePrimaryColor }}
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hover Color</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="themeHoverColor"
                value={formData.themeHoverColor || ''}
                onChange={handleChange}
                placeholder="#7e22ce"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.themeHoverColor && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.themeHoverColor }}
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Active Color</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="themeActiveColor"
                value={formData.themeActiveColor || ''}
                onChange={handleChange}
                placeholder="#6b21a8"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.themeActiveColor && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: formData.themeActiveColor }}
                />
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {/* ── Contact Information ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Contact Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="contactAddress"
              value={formData.contactAddress || ''}
              onChange={handleChange}
              rows={2}
              placeholder="123 Main St, City, State ZIP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone || ''}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Toll Free</label>
            <input
              type="tel"
              name="contactTollFree"
              value={formData.contactTollFree || ''}
              onChange={handleChange}
              placeholder="1-800-XXX-XXXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail || ''}
              onChange={handleChange}
              placeholder="contact@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Social Media (optional) ── */}
      <fieldset className="border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/70">
        <legend className="text-sm font-semibold text-gray-600 px-2">
          Social media links{' '}
          <span className="font-normal text-gray-400">· optional</span>
        </legend>
        <p className="text-xs text-gray-500 mt-1 mb-4 max-w-2xl">
          Skip this section if you don’t need social icons on the satellite site. You can add or edit these anytime.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Facebook</label>
            <input
              type="text"
              name="socialFacebook"
              inputMode="url"
              autoComplete="off"
              value={formData.socialFacebook || ''}
              onChange={handleChange}
              placeholder="https://facebook.com/… (leave blank if none)"
              className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Twitter / X</label>
            <input
              type="text"
              name="socialTwitter"
              inputMode="url"
              autoComplete="off"
              value={formData.socialTwitter || ''}
              onChange={handleChange}
              placeholder="https://twitter.com/… (leave blank if none)"
              className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">LinkedIn</label>
            <input
              type="text"
              name="socialLinkedin"
              inputMode="url"
              autoComplete="off"
              value={formData.socialLinkedin || ''}
              onChange={handleChange}
              placeholder="https://linkedin.com/company/… (leave blank if none)"
              className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">YouTube</label>
            <input
              type="text"
              name="socialYoutube"
              inputMode="url"
              autoComplete="off"
              value={formData.socialYoutube || ''}
              onChange={handleChange}
              placeholder="https://youtube.com/… (leave blank if none)"
              className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Auth Page Display ── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Auth Page Display</legend>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="showOnAuthHeader"
              checked={formData.showOnAuthHeader ?? true}
              onChange={handleChange}
              id="showOnAuthHeader"
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="showOnAuthHeader" className="text-sm font-medium text-gray-700">
              Show on Auth Header
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="showOnAuthFooter"
              checked={formData.showOnAuthFooter ?? true}
              onChange={handleChange}
              id="showOnAuthFooter"
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="showOnAuthFooter" className="text-sm font-medium text-gray-700">
              Show on Auth Footer
            </label>
          </div>
        </div>
      </fieldset>

      {/* ── Submit Buttons ── */}
      <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {/* Close modal logic handled by parent */}}
          className="flex-shrink-0 h-14 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={loading}
          title="Cancel"
          aria-label="Cancel"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="font-semibold text-gray-700">Cancel</span>
        </button>
        <button
          type="submit"
          className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={loading}
          title={submitText}
          aria-label={submitText}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-semibold text-blue-700">{loading ? 'Processing...' : submitText}</span>
        </button>
      </div>
    </form>
  );
}
