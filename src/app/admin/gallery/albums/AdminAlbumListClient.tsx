'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import type { GalleryAlbumDTO } from '@/types';
import {
  fetchAlbumsServer,
  deleteAlbumServer,
  createAlbumServer,
  fetchGalleryCategoriesServer,
  type GalleryAlbumListFilters,
} from './ApiServerActions';
import Image from 'next/image';
import { Modal } from '@/components/Modal';
import AdminTenantFilterField from '../../AdminTenantFilterField';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { GalleryCategoryDTO } from '@/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ErrorDialog from '@/components/ErrorDialog';
import { FormApiErrorBanner } from '@/components/FormApiErrorBanner';
import { formatUnknownError, type FormattedBackendError } from '@/lib/api/formatBackendError';

type SearchField = 'title' | 'description' | 'id' | 'ocrText' | 'searchText';
type VisibilityFilter = 'all' | 'public' | 'private';

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'ocrText', label: 'Image text' },
  { value: 'searchText', label: 'Search text' },
  { value: 'id', label: 'Album ID' },
];

const SORT_OPTIONS = [
  { value: 'displayOrder,asc', label: 'Display order (asc)' },
  { value: 'displayOrder,desc', label: 'Display order (desc)' },
  { value: 'title,asc', label: 'Title (A–Z)' },
  { value: 'title,desc', label: 'Title (Z–A)' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
];

function buildAlbumListFilters(
  tenantId: string | undefined,
  searchField: SearchField,
  searchQuery: string,
  visibility: VisibilityFilter,
  sort: string
): GalleryAlbumListFilters {
  const filters: GalleryAlbumListFilters = {
    tenantId,
    sort: sort.trim() || 'displayOrder,asc',
  };
  if (visibility === 'public') filters.isPublic = true;
  else if (visibility === 'private') filters.isPublic = false;

  const q = searchQuery.trim();
  if (!q) return filters;

  if (searchField === 'id') filters.id = q;
  else if (searchField === 'title') filters.title = q;
  else if (searchField === 'description') filters.description = q;
  else if (searchField === 'ocrText') filters.ocrText = q;
  else if (searchField === 'searchText') filters.searchText = q;

  return filters;
}

interface AdminAlbumListClientProps {
  initialAlbums: GalleryAlbumDTO[];
  initialTotalCount: number;
  initialPage: number;
  initialSearchTerm: string;
}

function AdminAlbumListClientInner({
  initialAlbums,
  initialTotalCount,
  initialPage,
  initialSearchTerm,
}: AdminAlbumListClientProps) {
  const tenantId = useAdminTenantId();
  const [albums, setAlbums] = useState<GalleryAlbumDTO[]>(initialAlbums);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchField, setSearchField] = useState<SearchField>('title');
  const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [sort, setSort] = useState('displayOrder,asc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<FormattedBackendError | null>(null);
  const [showCreateErrorDialog, setShowCreateErrorDialog] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<GalleryAlbumDTO | null>(null);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImageUrl: '',
    isPublic: true,
    displayOrder: 0,
    galleryCategoryId: '' as string,
  });
  const [categories, setCategories] = useState<GalleryCategoryDTO[]>([]);
  const pageSize = 12;

  const filterSignatureRef = useRef('');
  const filterSignature = [tenantId ?? '', searchField, searchQuery, visibility, sort].join('|');

  useEffect(() => {
    if (filterSignatureRef.current === filterSignature) return;
    filterSignatureRef.current = filterSignature;
    setCurrentPage(0);
  }, [filterSignature]);

  const loadAlbumsAt = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const filters = buildAlbumListFilters(
          tenantId ?? undefined,
          searchField,
          searchQuery,
          visibility,
          sort
        );
        const result = await fetchAlbumsServer(page, pageSize, filters);
        setAlbums(result.albums);
        setTotalCount(result.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load albums');
      } finally {
        setLoading(false);
      }
    },
    [tenantId, searchField, searchQuery, visibility, sort, pageSize]
  );

  useEffect(() => {
    void loadAlbumsAt(currentPage);
  }, [currentPage, loadAlbumsAt]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const list = await fetchGalleryCategoriesServer(tenantId);
        if (!cancelled) setCategories(list);
      } catch {
        if (!cancelled) setCategories([]);
      }
    }
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const closeDeleteDialog = () => {
    if (isDeletingAlbum) return;
    setAlbumToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteClick = (album: GalleryAlbumDTO) => {
    if (!album.id) return;
    setDeleteError(null);
    setAlbumToDelete(album);
  };

  const handleConfirmDelete = async () => {
    if (!albumToDelete?.id || isDeletingAlbum) return;

    setIsDeletingAlbum(true);
    setDeleteError(null);
    try {
      await deleteAlbumServer(albumToDelete.id, tenantId);
      setAlbumToDelete(null);
      const nextPage = albums.length <= 1 && currentPage > 0 ? currentPage - 1 : currentPage;
      if (nextPage !== currentPage) setCurrentPage(nextPage);
      else void loadAlbumsAt(currentPage);
    } catch (err) {
      setDeleteError(formatUnknownError(err, 'Failed to delete album').message);
    } finally {
      setIsDeletingAlbum(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setShowCreateErrorDialog(false);

    try {
      await createAlbumServer(
        {
          title: formData.title,
          description: formData.description || undefined,
          coverImageUrl: formData.coverImageUrl || undefined,
          isPublic: formData.isPublic,
          displayOrder: formData.displayOrder,
          galleryCategoryId: formData.galleryCategoryId
            ? Number(formData.galleryCategoryId)
            : null,
          ...(tenantId ? { tenantId } : {}),
        },
        tenantId,
      );

      setFormData({
        title: '',
        description: '',
        coverImageUrl: '',
        isPublic: true,
        displayOrder: 0,
        galleryCategoryId: '',
      });
      setIsCreateModalOpen(false);

      if (currentPage === 0) void loadAlbumsAt(0);
      else setCurrentPage(0);
    } catch (err) {
      const formatted = formatUnknownError(err, 'Failed to create album');
      setCreateError(formatted);
      setShowCreateErrorDialog(true);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setFormData({
      title: '',
      description: '',
      coverImageUrl: '',
      isPublic: true,
      displayOrder: 0,
      galleryCategoryId: '',
    });
    setCreateError(null);
    setShowCreateErrorDialog(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;
  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize + albums.length, totalCount);
  const searchFieldLabel = SEARCH_FIELDS.find((f) => f.value === searchField)?.label ?? 'Title';

  return (
    <div className="space-y-6">
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/admin"
              className="flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Admin Dashboard"
              aria-label="Admin Dashboard"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="font-semibold text-indigo-700">Admin Dashboard</span>
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Gallery</span>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Albums</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gallery Albums</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage gallery albums and their associated media files
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Create New Album"
            aria-label="Create New Album"
            type="button"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700">Create New Album</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mb-6">
        <div className="text-base font-semibold text-blue-800 mb-4">Search &amp; filters</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-end">
          <AdminTenantFilterField />

          <div className="flex flex-col min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap leading-5">
              Search
            </label>
            <div className="flex h-12 min-w-0">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
                className="box-border h-12 shrink-0 border border-gray-400 border-r-0 rounded-l-xl focus:ring-blue-500 focus:border-blue-500 px-3 text-base bg-white"
                aria-label="Search by field"
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <input
                type={searchField === 'id' ? 'number' : 'text'}
                placeholder={
                  searchField === 'id'
                    ? 'Numeric album ID...'
                    : `Search by ${searchFieldLabel}...`
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="box-border block h-12 w-full min-w-0 border border-gray-400 rounded-r-xl focus:ring-blue-500 focus:border-blue-500 px-4 text-base bg-white"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <label htmlFor="album-visibility" className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap leading-5">
              Visibility
            </label>
            <select
              id="album-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as VisibilityFilter)}
              className="box-border block w-full h-12 border border-gray-400 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 text-base bg-white"
              aria-label="Visibility filter"
            >
              <option value="all">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex flex-col min-w-0">
            <label htmlFor="album-sort" className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap leading-5">
              Sort
            </label>
            <select
              id="album-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="box-border block w-full h-12 border border-gray-400 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 text-base bg-white"
              aria-label="Sort albums"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading albums</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && albums.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No albums found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || visibility !== 'all' || tenantId
              ? 'Try adjusting your search filters.'
              : 'Get started by creating a new album.'}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700 border border-gray-600/30 shadow-2xl mb-8">
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 55%)' }} />

          <div className="relative px-6 py-10 sm:px-10 lg:px-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albums.map((album) => (
                <div key={album.id} className="bg-white rounded-lg shadow-md overflow-hidden group flex flex-col">
                  <div className="relative h-48 bg-gray-200">
                    {album.coverImageUrl ? (
                      <Image
                        src={album.coverImageUrl}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">{album.title}</h3>
                    {album.description && (
                      <p className="text-gray-600 text-sm h-10 overflow-hidden mb-3">{album.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${
                          album.isPublic
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title={
                          album.isPublic
                            ? 'Visible on the public gallery'
                            : 'Hidden from the public gallery'
                        }
                      >
                        {album.isPublic ? 'Public' : 'Private'}
                      </span>
                      {album.galleryCategory?.displayName ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-800"
                          title="Gallery category"
                        >
                          {album.galleryCategory.displayName}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500"
                          title="No gallery category assigned"
                        >
                          Uncategorized
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-3 flex justify-end gap-2">
                      <Link
                        href={`/admin/gallery/albums/${album.id}/media${
                          (album.tenantId || tenantId)
                            ? `?tenant=${encodeURIComponent(album.tenantId || tenantId || '')}`
                            : ''
                        }`}
                        className="flex-shrink-0 w-14 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                        title="Manage Media"
                        aria-label="Manage Media"
                      >
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </Link>
                      <Link
                        href={`/admin/gallery/albums/${album.id}/edit${
                          (album.tenantId || tenantId)
                            ? `?tenant=${encodeURIComponent(album.tenantId || tenantId || '')}`
                            : ''
                        }`}
                        className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                        title="Edit Album"
                        aria-label="Edit Album"
                      >
                        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(album)}
                        className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                        title="Delete Album"
                        aria-label="Delete Album"
                        type="button"
                      >
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrevPage || loading}
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
              Page <span className="text-blue-600">{currentPage + 1}</span> of <span className="text-blue-600">{totalPages}</span>
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage || loading}
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
                Showing <span className="font-bold text-blue-600">{startItem}</span> to <span className="font-bold text-blue-600">{endItem}</span> of <span className="font-bold text-blue-600">{totalCount}</span> albums
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No albums found</span>
              <span className="text-sm text-orange-600">[No albums match your criteria]</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={handleCloseModal}
        title="Create New Album"
      >
        <form onSubmit={handleCreateAlbum} className="space-y-6">
          {createError && (
            <FormApiErrorBanner error={createError} heading="Error creating album" />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter album title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter album description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="coverImageUrl">
              Cover Image URL
            </label>
            <input
              id="coverImageUrl"
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg (optional)"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL to the cover image for this album. Can be set later when adding media.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="displayOrder">
              Display Order
            </label>
            <input
              id="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lower values appear first in the gallery. Default: 0.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="create-visibility">
              Visibility
            </label>
            <select
              id="create-visibility"
              value={formData.isPublic ? 'public' : 'private'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPublic: e.target.value === 'public' }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="public">Public — visible in gallery</option>
              <option value="private">Private — hidden from public gallery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="create-category">
              Category
            </label>
            <select
              id="create-category"
              value={formData.galleryCategoryId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, galleryCategoryId: e.target.value }))
              }
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                createError?.field === 'galleryCategoryId'
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            >
              <option value="">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.displayName || cat.slug || `Category ${cat.id}`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Optional grouping for the public gallery (e.g. Ecumenical Visits, Major Events).
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="w-full flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={createLoading}
              title="Cancel"
              aria-label="Cancel"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Cancel</span>
            </button>
            <button
              type="submit"
              className="w-full flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={createLoading}
              title={createLoading ? 'Creating...' : 'Create Album'}
              aria-label={createLoading ? 'Creating...' : 'Create Album'}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                {createLoading ? (
                  <svg className="animate-spin w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-green-700">{createLoading ? 'Creating...' : 'Create Album'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ErrorDialog
        isOpen={showCreateErrorDialog && !!createError}
        onClose={() => setShowCreateErrorDialog(false)}
        title={createError?.title || 'Error creating album'}
        message={createError?.message || 'Failed to create album'}
        detail={createError?.detail}
      />

      <AlertDialog
        open={!!albumToDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete album</AlertDialogTitle>
            <AlertDialogDescription>
              {albumToDelete ? (
                <>
                  Are you sure you want to delete album <strong>&quot;{albumToDelete.title}&quot;</strong>? This action cannot be undone.
                  Media files associated with this album will not be deleted, but they will be removed from the album.
                </>
              ) : (
                'Confirm delete'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              onClick={closeDeleteDialog}
              disabled={isDeletingAlbum}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Cancel"
              aria-label="Cancel"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Cancel</span>
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeletingAlbum}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Delete Album"
              aria-label="Delete Album"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                {isDeletingAlbum ? (
                  <svg className="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-red-700">{isDeletingAlbum ? 'Deleting...' : 'Delete Album'}</span>
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminAlbumListClient(props: AdminAlbumListClientProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AdminAlbumListClientInner {...props} />
    </Suspense>
  );
}
