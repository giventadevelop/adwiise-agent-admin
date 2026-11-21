'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaFilter, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import ImageUpload from '@/components/ui/ImageUpload';
import AdminNavigation from '@/components/AdminNavigation';
import SponsorImageUploadDialog from '@/components/sponsors/SponsorImageUploadDialog';
import SponsorImageUploadArea from '@/components/sponsors/SponsorImageUploadArea';
import SponsorMediaGallery from '@/components/sponsors/SponsorMediaGallery';
import type { EventSponsorsDTO } from '@/types';
import {
  fetchEventSponsorsServer,
  createEventSponsorServer,
  updateEventSponsorServer,
  deleteEventSponsorServer,
  uploadSponsorImageServer,
} from './ApiServerActions';
import { fetchAdminProfileServer } from '../manage-usage/ApiServerActions';
import { useAdminTenantId } from '../AdminTenantContext';
import AdminTenantFilterField from '../AdminTenantFilterField';
export default function EventSponsorsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const tenantId = useAdminTenantId();

  const [sponsors, setSponsors] = useState<EventSponsorsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // User role state
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<EventSponsorsDTO | null>(null);

  // Form state - aligned with DTO schema
  const [formData, setFormData] = useState<Partial<EventSponsorsDTO>>({
    name: '',
    type: '',
    companyName: '',
    tagline: '',
    description: '',
    websiteUrl: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    heroImageUrl: '',
    bannerImageUrl: '',
    isActive: true,
    priorityRanking: 1,
    facebookUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
  });

  // Upload dialog states (edit mode — immediate upload)
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [heroUploadOpen, setHeroUploadOpen] = useState(false);
  const [bannerUploadOpen, setBannerUploadOpen] = useState(false);

  // Pending images for create (defer-upload until sponsor exists)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (userId) {
      checkUserRole();
      loadSponsors();
    }
  }, [userId, page]);

  const checkUserRole = async () => {
    if (!userId) return;
    try {
      const profile = await fetchAdminProfileServer(userId);
      setIsAdmin(profile?.userRole === 'ADMIN');
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadSponsors = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchEventSponsorsServer(page, pageSize, tenantId);
      setSponsors(result.data || []);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load sponsors');
      setToastMessage({ type: 'error', message: err.message || 'Failed to load sponsors' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        setToastMessage({ type: 'error', message: 'Sponsor name is required' });
        return;
      }
      if (!formData.type?.trim()) {
        setToastMessage({ type: 'error', message: 'Sponsor type is required' });
        return;
      }

      setLoading(true);
      const sponsorData: Omit<EventSponsorsDTO, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name!.trim(),
        type: formData.type!.trim(),
        companyName: formData.companyName?.trim() || undefined,
        tagline: formData.tagline?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        websiteUrl: formData.websiteUrl?.trim() || undefined,
        contactEmail: formData.contactEmail?.trim() || undefined,
        contactPhone: formData.contactPhone?.trim() || undefined,
        logoUrl:
          formData.logoUrl?.trim() && !formData.logoUrl.startsWith('blob:')
            ? formData.logoUrl.trim()
            : undefined,
        heroImageUrl:
          formData.heroImageUrl?.trim() && !formData.heroImageUrl.startsWith('blob:')
            ? formData.heroImageUrl.trim()
            : undefined,
        bannerImageUrl:
          formData.bannerImageUrl?.trim() && !formData.bannerImageUrl.startsWith('blob:')
            ? formData.bannerImageUrl.trim()
            : undefined,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        priorityRanking: formData.priorityRanking || 1,
        facebookUrl: formData.facebookUrl?.trim() || undefined,
        twitterUrl: formData.twitterUrl?.trim() || undefined,
        linkedinUrl: formData.linkedinUrl?.trim() || undefined,
        instagramUrl: formData.instagramUrl?.trim() || undefined,
        tiktokUrl: formData.tiktokUrl?.trim() || undefined,
      };

      const newSponsor = await createEventSponsorServer(sponsorData, tenantId);
      const createdId = newSponsor?.id;

      const pendingUploads: Array<{ type: 'logo' | 'hero' | 'banner'; file: File }> = [];
      if (createdId && pendingLogoFile) pendingUploads.push({ type: 'logo', file: pendingLogoFile });
      if (createdId && pendingHeroFile) pendingUploads.push({ type: 'hero', file: pendingHeroFile });
      if (createdId && pendingBannerFile) pendingUploads.push({ type: 'banner', file: pendingBannerFile });

      let uploadedCount = 0;
      let uploadFailed = false;
      for (const item of pendingUploads) {
        try {
          await uploadSponsorImageServer(createdId!, 0, item.type, item.file, tenantId);
          uploadedCount += 1;
        } catch (uploadErr) {
          console.error(`[CreateSponsor] ${item.type} upload failed:`, uploadErr);
          uploadFailed = true;
        }
      }

      setIsCreateModalOpen(false);
      resetForm();
      setPendingLogoFile(null);
      setPendingHeroFile(null);
      setPendingBannerFile(null);

      if (pendingUploads.length === 0) {
        setToastMessage({ type: 'success', message: 'Sponsor created successfully' });
      } else if (!uploadFailed) {
        setToastMessage({
          type: 'success',
          message: `Sponsor created and ${uploadedCount} image${uploadedCount === 1 ? '' : 's'} uploaded`,
        });
      } else {
        setToastMessage({
          type: 'error',
          message:
            uploadedCount > 0
              ? `Sponsor created; ${uploadedCount} image(s) uploaded, some failed — edit the sponsor to retry.`
              : 'Sponsor created, but image upload failed. Edit the sponsor to upload images.',
        });
      }
      await loadSponsors();
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to create sponsor' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSponsor) return;

    try {
      setLoading(true);
      const updatedSponsor = await updateEventSponsorServer(selectedSponsor.id!, formData, tenantId);
      setSponsors(prev => prev.map(s => s.id === selectedSponsor.id ? updatedSponsor : s));
      setIsEditModalOpen(false);
      setSelectedSponsor(null);
      resetForm();
      setToastMessage({ type: 'success', message: 'Sponsor updated successfully' });
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to update sponsor' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSponsor) return;

    try {
      setLoading(true);
      await deleteEventSponsorServer(selectedSponsor.id!);
      setSponsors(prev => prev.filter(s => s.id !== selectedSponsor.id));
      setIsDeleteModalOpen(false);
      setSelectedSponsor(null);
      setToastMessage({ type: 'success', message: 'Sponsor deleted successfully' });
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to delete sponsor' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      companyName: '',
      tagline: '',
      description: '',
      websiteUrl: '',
      contactEmail: '',
      contactPhone: '',
      logoUrl: '',
      heroImageUrl: '',
      bannerImageUrl: '',
      isActive: true,
      priorityRanking: 1,
      facebookUrl: '',
      twitterUrl: '',
      linkedinUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
    });
    setPendingLogoFile(null);
    setPendingHeroFile(null);
    setPendingBannerFile(null);
  };

  const openEditModal = (sponsor: EventSponsorsDTO) => {
    // Navigate to detail/edit page instead of opening modal
    router.push(`/admin/event-sponsors/${sponsor.id}`);
  };

  const openDeleteModal = (sponsor: EventSponsorsDTO) => {
    setSelectedSponsor(sponsor);
    setIsDeleteModalOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  // Filter sponsors based on search and filters
  const filteredSponsors = sponsors.filter(sponsor => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      sponsor.name?.toLowerCase().includes(q) ||
      sponsor.companyName?.toLowerCase().includes(q) ||
      sponsor.type?.toLowerCase().includes(q) ||
      sponsor.description?.toLowerCase().includes(q) ||
      sponsor.tagline?.toLowerCase().includes(q) ||
      sponsor.searchText?.toLowerCase().includes(q) ||
      sponsor.ocrText?.toLowerCase().includes(q) ||
      sponsor.contactEmail?.toLowerCase().includes(q);

    const matchesType = !filterType || sponsor.type === filterType;
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && sponsor.isActive) ||
      (filterActive === 'inactive' && !sponsor.isActive);

    return matchesSearch && matchesType && matchesActive;
  });

  // Sort filtered sponsors
  const sortedSponsors = [...filteredSponsors].sort((a, b) => {
    if (!sortKey) return 0;

    const aVal = a[sortKey as keyof EventSponsorsDTO];
    const bVal = b[sortKey as keyof EventSponsorsDTO];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Get unique sponsor types for filter
  const sponsorTypes = Array.from(new Set(sponsors.map(s => s.type).filter(Boolean))).sort();

  const columns: Column<EventSponsorsDTO>[] = [
    {
      key: 'name',
      label: 'Sponsor Name',
      sortable: true
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'companyName',
      label: 'Company',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'priorityRanking',
      label: 'Priority',
      sortable: true,
      render: (value) => value || 0
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
  ];

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="font-body text-lg text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      {/* Navigation Section - Full Width, Separate Responsive Container */}
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation currentPage="event-sponsors" />
      </div>
      {/* Main Content Section - Constrained Width */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center sm:text-left mb-2">Global Sponsors</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">(You can add or disassociate these items with any events. Please go to the corresponding event page to manage these associated entities.)</p>
        </div>

        {/* Toast Message */}
        {toastMessage && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-xs sm:text-sm ${
            toastMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {toastMessage.message}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center flex-wrap">
            <AdminTenantFilterField />
            <div className="flex-1 min-w-0">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search sponsors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center">
              <FaFilter className="text-gray-400 dark:text-gray-500 hidden sm:block" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="">All Types</option>
                {sponsorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-shrink-0 h-12 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 hover:scale-105 px-3 sm:px-6"
              title="Add Sponsor"
              aria-label="Add Sponsor"
              type="button"
            >
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
                <FaPlus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs sm:text-sm lg:text-base whitespace-nowrap">Add Sponsor</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded text-xs sm:text-sm">
            {error}
          </div>
        )}

        <DataTable
          data={sortedSponsors}
          columns={columns}
          loading={loading}
          onSort={handleSort}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onView={openEditModal} // Use onView for row clicks to navigate
          sortKey={sortKey}
          sortDirection={sortDirection}
          emptyMessage="No sponsors found"
        />

        {/* Pagination Controls - Always visible, matching admin page style */}
        <div className="mt-6 sm:mt-8">
          <div className="flex justify-between items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0 || loading}
              className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 font-semibold rounded-lg shadow-sm border-2 border-blue-400 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
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
            <div className="px-2 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-lg shadow-sm">
              <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300">
                Page <span className="text-blue-600 dark:text-blue-400">{page + 1}</span> of <span className="text-blue-600 dark:text-blue-400">{Math.max(1, Math.ceil(totalCount / pageSize))}</span>
              </span>
            </div>

            {/* Next Button */}
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={page >= Math.ceil(totalCount / pageSize) - 1 || loading}
              className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 font-semibold rounded-lg shadow-sm border-2 border-blue-400 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
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
              <div className="inline-flex items-center px-2 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-lg shadow-sm">
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount > 0 ? page * pageSize + 1 : 0}</span> to <span className="font-bold text-blue-600 dark:text-blue-400">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount}</span> sponsors
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-2 sm:px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-lg shadow-sm">
                <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">No sponsors found</span>
                <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 hidden sm:inline">[No sponsors match your criteria]</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
          setLogoUploadOpen(false);
          setHeroUploadOpen(false);
          setBannerUploadOpen(false);
        }}
        title="Add Event Sponsor"
        size="xl"
      >
        <SponsorForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          loading={loading}
          submitText="Create Sponsor"
          deferImages
          onPendingLogoSelected={(file, preview) => {
            setPendingLogoFile(file);
            setFormData((prev) => ({ ...prev, logoUrl: preview }));
          }}
          onPendingLogoCleared={() => {
            setPendingLogoFile(null);
            setFormData((prev) => ({ ...prev, logoUrl: '' }));
          }}
          onPendingHeroSelected={(file, preview) => {
            setPendingHeroFile(file);
            setFormData((prev) => ({ ...prev, heroImageUrl: preview }));
          }}
          onPendingHeroCleared={() => {
            setPendingHeroFile(null);
            setFormData((prev) => ({ ...prev, heroImageUrl: '' }));
          }}
          onPendingBannerSelected={(file, preview) => {
            setPendingBannerFile(file);
            setFormData((prev) => ({ ...prev, bannerImageUrl: preview }));
          }}
          onPendingBannerCleared={() => {
            setPendingBannerFile(null);
            setFormData((prev) => ({ ...prev, bannerImageUrl: '' }));
          }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSponsor(null);
          resetForm();
          setLogoUploadOpen(false);
          setHeroUploadOpen(false);
          setBannerUploadOpen(false);
        }}
        title="Edit Event Sponsor"
        size="xl"
      >
        <SponsorForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEdit}
          loading={loading}
          submitText="Update Sponsor"
          onLogoUploadClick={() => setLogoUploadOpen(true)}
          onHeroUploadClick={() => setHeroUploadOpen(true)}
          onBannerUploadClick={() => setBannerUploadOpen(true)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSponsor(null);
        }}
        onConfirm={handleDelete}
        title="Delete Sponsor"
        message={`Are you sure you want to delete "${selectedSponsor?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Upload Dialogs */}
      {formData.id && (
        <>
          <SponsorImageUploadDialog
            sponsor={formData as EventSponsorsDTO}
            imageType="logo"
            isOpen={logoUploadOpen}
            onClose={() => setLogoUploadOpen(false)}
            onUploadSuccess={async (imageUrl) => {
              setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
              await loadSponsors(); // Refresh to get updated data
            }}
            eventId={0}
          />
          <SponsorImageUploadDialog
            sponsor={formData as EventSponsorsDTO}
            imageType="hero"
            isOpen={heroUploadOpen}
            onClose={() => setHeroUploadOpen(false)}
            onUploadSuccess={async (imageUrl) => {
              setFormData(prev => ({ ...prev, heroImageUrl: imageUrl }));
              await loadSponsors(); // Refresh to get updated data
            }}
            eventId={0}
          />
          <SponsorImageUploadDialog
            sponsor={formData as EventSponsorsDTO}
            imageType="banner"
            isOpen={bannerUploadOpen}
            onClose={() => setBannerUploadOpen(false)}
            onUploadSuccess={async (imageUrl) => {
              setFormData(prev => ({ ...prev, bannerImageUrl: imageUrl }));
              await loadSponsors(); // Refresh to get updated data
            }}
            eventId={0}
          />
        </>
      )}
    </div>
  );
}

// Sponsor Form Component
interface SponsorFormProps {
  formData: Partial<EventSponsorsDTO>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<EventSponsorsDTO>>>;
  onSubmit: () => void;
  loading: boolean;
  submitText: string;
  onLogoUploadClick?: () => void;
  onHeroUploadClick?: () => void;
  onBannerUploadClick?: () => void;
  deferImages?: boolean;
  onPendingLogoSelected?: (file: File, previewUrl: string) => void;
  onPendingLogoCleared?: () => void;
  onPendingHeroSelected?: (file: File, previewUrl: string) => void;
  onPendingHeroCleared?: () => void;
  onPendingBannerSelected?: (file: File, previewUrl: string) => void;
  onPendingBannerCleared?: () => void;
}

function SponsorForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  submitText,
  onLogoUploadClick,
  onHeroUploadClick,
  onBannerUploadClick,
  deferImages = false,
  onPendingLogoSelected,
  onPendingLogoCleared,
  onPendingHeroSelected,
  onPendingHeroCleared,
  onPendingBannerSelected,
  onPendingBannerCleared,
}: SponsorFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const sponsorTypes = [
    'Diamond',
    'Platinum',
    'Gold',
    'Silver',
    'Bronze',
    'Community Partner',
    'Media Partner',
    'Food & Beverage',
    'Entertainment',
    'Other'
  ];

  const canUploadImages = !!formData.id;
  const showImageSection = canUploadImages || deferImages;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-lg text-blue-800">Sponsor details</h3>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Sponsor Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="Enter sponsor name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Type *
          </label>
          <select
            name="type"
            value={formData.type || ''}
            onChange={handleChange}
            required
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
          >
            <option value="">Select sponsor type</option>
            {sponsorTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Company Name
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Priority Ranking *
          </label>
          <input
            type="number"
            name="priorityRanking"
            value={formData.priorityRanking || 1}
            onChange={handleChange}
            min="1"
            required
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="Enter priority ranking (1 = highest priority)"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Lower numbers indicate higher priority (1 = highest priority)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Contact Email
          </label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="Enter contact email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Contact Phone
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="Enter contact phone"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Website URL
          </label>
          <input
            type="url"
            name="websiteUrl"
            value={formData.websiteUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://example.com"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive || false}
            onChange={handleChange}
            className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
          />
          <label className="ml-2 block text-sm text-foreground">
            Active Sponsor
          </label>
        </div>
      </div>
      </section>

      <section className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-lg text-teal-800">Description</h3>
        </div>
      <div>
        <label className="block text-sm font-medium text-teal-800 mb-1">
          Tagline
        </label>
        <input
          type="text"
          name="tagline"
          value={formData.tagline || ''}
          onChange={handleChange}
          maxLength={500}
          className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
          placeholder="Enter sponsor tagline (max 500 characters)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={4}
          className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
          placeholder="Enter detailed description about the sponsor"
        />
      </div>
      </section>

      <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-lg text-sky-800">Social links</h3>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" /></svg>
            </span>
            Facebook URL
          </label>
          <input
            type="url"
            name="facebookUrl"
            value={formData.facebookUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://facebook.com/sponsor"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-sky-800 mb-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-sky-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7.5c-.6.3-1.2.4-1.9.5.7-.4 1.2-1 1.4-1.8-.6.4-1.3.6-2.1.8A3.3 3.3 0 0012 9.3c0 .3 0 .5.1.8-2.7-.1-5.1-1.4-6.7-3.4-.3.5-.4 1-.4 1.6 0 1.1.6 2.1 1.5 2.7-.5 0-1-.2-1.5-.4 0 1.6 1.1 2.9 2.6 3.2-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.2 3 2.3A6.6 6.6 0 014 17.6 9.3 9.3 0 009.1 19c6.1 0 9.5-5.1 9.5-9.5v-.4c.6-.5 1.2-1 1.4-1.6z" /></svg>
            </span>
            Twitter URL
          </label>
          <input
            type="url"
            name="twitterUrl"
            value={formData.twitterUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://twitter.com/sponsor"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-800" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9H4V20h2.5V9zM5.2 4C4.3 4 3.6 4.7 3.6 5.6S4.3 7.2 5.2 7.2 6.9 6.5 6.9 5.6 6.2 4 5.2 4zM20 20h-2.5v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H11V9h2.4v1.5h.1c.3-.6 1.2-1.3 2.5-1.3 2.6 0 3.1 1.7 3.1 4V20z" /></svg>
            </span>
            LinkedIn URL
          </label>
          <input
            type="url"
            name="linkedinUrl"
            value={formData.linkedinUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://linkedin.com/company/sponsor"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-pink-800 mb-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-pink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" strokeWidth={2} /><circle cx="12" cy="12" r="3.5" strokeWidth={2} /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
            </span>
            Instagram URL
          </label>
          <input
            type="url"
            name="instagramUrl"
            value={formData.instagramUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://instagram.com/sponsor"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-fuchsia-800 mb-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-fuchsia-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-fuchsia-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h2.2c.2 1.4 1 2.6 2.2 3.4 0 .6 1.4 1.2 2.1 1.3v2.3a6.3 6.3 0 01-3.6-1.1v6.4A5.4 5.4 0 1111 10.1v2.5a2.9 2.9 0 102 2.7V3z" /></svg>
            </span>
            TikTok URL
          </label>
          <input
            type="url"
            name="tiktokUrl"
            value={formData.tiktokUrl || ''}
            onChange={handleChange}
            className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
            placeholder="https://www.tiktok.com/@sponsor"
          />
        </div>
      </div>
      </section>

      {showImageSection && (
        <div className="space-y-4">
          {deferImages ? (
            <>
              <SponsorImageUploadArea
                imageType="banner"
                deferUpload
                currentImageUrl={formData.bannerImageUrl}
                disabled={loading}
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, bannerImageUrl: url }))}
                onFileSelected={onPendingBannerSelected}
                onFileCleared={onPendingBannerCleared}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SponsorImageUploadArea
                  imageType="logo"
                  deferUpload
                  currentImageUrl={formData.logoUrl}
                  disabled={loading}
                  onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                  onFileSelected={onPendingLogoSelected}
                  onFileCleared={onPendingLogoCleared}
                />
                <SponsorImageUploadArea
                  imageType="hero"
                  deferUpload
                  currentImageUrl={formData.heroImageUrl}
                  disabled={loading}
                  onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, heroImageUrl: url }))}
                  onFileSelected={onPendingHeroSelected}
                  onFileCleared={onPendingHeroCleared}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Banner poster</p>
                <p className="text-sm text-amber-700 mb-3">This poster is what visitors see on the sponsor page and on event sponsor cards.</p>
                {formData.bannerImageUrl && (
                  <img src={formData.bannerImageUrl} alt="Banner" className="mb-3 h-32 w-auto rounded-xl border-2 border-amber-200 bg-white object-contain" />
                )}
                <button type="button" onClick={onBannerUploadClick} className="h-10 rounded-xl bg-amber-100 hover:bg-amber-200 px-4 font-semibold text-amber-800" disabled={loading || !formData.id}>
                  {formData.bannerImageUrl ? 'Change banner poster' : 'Upload banner poster'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-4">
                  <p className="text-sm font-semibold text-indigo-800 mb-1">Logo</p>
                  <p className="text-sm text-indigo-700 mb-3">Saved with the sponsor. Visitors do not see this image.</p>
                  {formData.logoUrl && (
                    <img src={formData.logoUrl} alt="Logo" className="mb-3 h-24 w-auto rounded-xl border-2 border-indigo-200 bg-white object-contain" />
                  )}
                  <button type="button" onClick={onLogoUploadClick} className="h-10 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-4 font-semibold text-indigo-800" disabled={loading || !formData.id}>
                    {formData.logoUrl ? 'Change logo' : 'Upload logo'}
                  </button>
                </div>
                <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-4">
                  <p className="text-sm font-semibold text-purple-800 mb-1">Hero image</p>
                  <p className="text-sm text-purple-700 mb-3">Saved with the sponsor. Visitors do not see this image.</p>
                  {formData.heroImageUrl && (
                    <img src={formData.heroImageUrl} alt="Hero" className="mb-3 h-24 w-auto rounded-xl border-2 border-purple-200 bg-white object-contain" />
                  )}
                  <button type="button" onClick={onHeroUploadClick} className="h-10 rounded-xl bg-purple-100 hover:bg-purple-200 px-4 font-semibold text-purple-800" disabled={loading || !formData.id}>
                    {formData.heroImageUrl ? 'Change hero image' : 'Upload hero image'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Media Gallery Section */}
      {canUploadImages && formData.id && (
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="text-lg font-heading font-medium text-foreground mb-4">Media Gallery</h3>
          <p className="text-sm font-body text-muted-foreground mb-4">
            Upload and manage multiple media files for this sponsor. Files are sorted by priority ranking (lower = higher priority).
          </p>
          <SponsorMediaGallery
            sponsorId={formData.id}
            showPriorityControls={true}
            allowUpload={false}
            onPriorityChange={async (mediaId, priorityRanking) => {
              // Priority change handled by component
            }}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
          title="Cancel"
          aria-label="Cancel"
        >
          <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <span className="font-semibold text-red-700">Cancel</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
            submitText.toLowerCase().includes('create')
              ? 'bg-green-100 hover:bg-green-200'
              : 'bg-blue-100 hover:bg-blue-200'
          }`}
          title={loading ? 'Saving...' : submitText}
          aria-label={loading ? 'Saving...' : submitText}
        >
          <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            submitText.toLowerCase().includes('create') ? 'bg-green-200' : 'bg-blue-200'
          }`}>
            <svg className={`w-6 h-6 ${submitText.toLowerCase().includes('create') ? 'text-green-700' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className={`font-semibold ${submitText.toLowerCase().includes('create') ? 'text-green-700' : 'text-blue-700'}`}>
            {loading ? 'Saving...' : submitText}
          </span>
        </button>
      </div>
    </form>
  );
}
