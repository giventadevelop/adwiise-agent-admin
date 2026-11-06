'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type {
  EventMediaDTO,
  OfficialDocumentCategoryDTO,
  OfficialDocumentYearBundleDTO,
} from '@/types';
import { getClientTenantId } from '@/lib/env';
import AdminNavigation from '@/components/AdminNavigation';
import AdminTenantFilterField from '../AdminTenantFilterField';
import { useAdminTenantId } from '../AdminTenantContext';
import {
  createOfficialDocumentYearBundleServer,
  deleteOfficialDocumentMediaServer,
  fetchOfficialDocumentCategoriesServer,
  fetchOfficialDocumentYearBundlesServer,
  fetchTenantOfficialDocumentsPagedServer,
  fetchTenantOfficialDocumentsServer,
  patchOfficialDocumentMediaServer,
  patchOfficialDocumentYearBundleServer,
  type OfficialDocumentSearchField,
} from './ApiServerActions';
import Modal from '@/components/ui/Modal';
import {
  getEventMediaDisplayThumbnailUrl,
  getOfficialDocumentPlaceholderKind,
  OFFICIAL_DOCUMENT_CARD_THUMBNAIL_RECOMMENDED,
  placeholderGradient,
  placeholderLabel,
} from '@/lib/officialDocumentThumbnail';
import { triggerOfficialDocumentProxyDownload } from '@/lib/officialDocumentDownload';
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

const DOCUMENT_SEARCH_FIELDS: { label: string; value: OfficialDocumentSearchField }[] = [
  { label: 'Title', value: 'title' },
  { label: 'Description', value: 'description' },
  { label: 'Media ID', value: 'id' },
  { label: 'File type', value: 'eventMediaType' },
];

function isImageMedia(d: EventMediaDTO): boolean {
  const t = (d.eventMediaType || '').toLowerCase();
  const c = (d.contentType || d.fileDataContentType || '').toLowerCase();
  return t === 'gallery' || t === 'image' || c.startsWith('image/');
}

function resolveCoverPreviewUrl(
  bundle: OfficialDocumentYearBundleDTO | undefined,
  docs: EventMediaDTO[]
): string | undefined {
  if (!bundle?.coverEventMediaId) return undefined;
  const nested = bundle.coverEventMedia?.fileUrl || bundle.coverEventMedia?.preSignedUrl;
  if (nested) return nested;
  const doc = docs.find((x) => x.id === bundle.coverEventMediaId);
  return doc?.preSignedUrl || doc?.fileUrl || undefined;
}

function resolveOfficialDocumentFileName(doc: EventMediaDTO): string {
  const fromPath = doc.fileUrl?.split('/').pop()?.split('?')[0]?.trim();
  if (fromPath) {
    try {
      return decodeURIComponent(fromPath);
    } catch {
      return fromPath;
    }
  }
  const title = doc.title?.trim();
  if (title) return title;
  return doc.id != null ? `official-document-${doc.id}` : 'official-document';
}

function OfficialDocumentThumbnailUploadGuidance({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-gray-700 space-y-2 ${className}`}
      role="note"
      aria-label="Recommended thumbnail size"
    >
      <p className="font-semibold text-blue-800">Recommended thumbnail size</p>
      <p className="text-gray-600">
        Download cards use a <span className="font-medium text-gray-800">16:10</span> preview frame (
        <code className="text-[11px]">aspect-[16/10]</code>).
      </p>
      <table className="w-full border-collapse text-left">
        <tbody>
          <tr className="border-b border-blue-100">
            <th scope="row" className="py-1 pr-3 font-semibold text-gray-800 align-top whitespace-nowrap">
              Aspect ratio
            </th>
            <td className="py-1">16:10 (landscape)</td>
          </tr>
          <tr className="border-b border-blue-100">
            <th scope="row" className="py-1 pr-3 font-semibold text-gray-800 align-top whitespace-nowrap">
              Recommended upload
            </th>
            <td className="py-1">
              {OFFICIAL_DOCUMENT_CARD_THUMBNAIL_RECOMMENDED.label} (good for retina; minimum 640×400 px)
            </td>
          </tr>
          <tr className="border-b border-blue-100">
            <th scope="row" className="py-1 pr-3 font-semibold text-gray-800 align-top whitespace-nowrap">
              Format
            </th>
            <td className="py-1">JPG or PNG</td>
          </tr>
          <tr>
            <th scope="row" className="py-1 pr-3 font-semibold text-gray-800 align-top whitespace-nowrap">
              Display fit
            </th>
            <td className="py-1">
              <code className="text-[11px]">object-cover</code> — center important content; edges may crop slightly
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-gray-600">
        On desktop (~3 columns in <code className="text-[11px]">max-w-7xl</code>), each thumbnail is roughly{' '}
        <span className="font-medium text-gray-800">360 px wide × 225 px tall</span>. Upload at{' '}
        <span className="font-medium text-gray-800">{OFFICIAL_DOCUMENT_CARD_THUMBNAIL_RECOMMENDED.label}</span> so it
        stays sharp on high-DPI screens.
      </p>
    </div>
  );
}

type Props = {
  initialCategories: OfficialDocumentCategoryDTO[];
  initialDocuments: EventMediaDTO[];
  initialTotalElements: number;
  initialTotalPages: number;
  initialPage: number;
  listPageSize: number;
  initialBundles: OfficialDocumentYearBundleDTO[];
  categorySource: 'api' | 'fallback';
  categoryMessage?: string;
};

export default function OfficialDocumentsClient({
  initialCategories,
  initialDocuments,
  initialTotalElements,
  initialTotalPages,
  initialPage,
  listPageSize,
  initialBundles,
  categorySource: initialCategorySource,
  categoryMessage: initialCategoryMessage,
}: Props) {
  const router = useRouter();
  /** Selected `?tenant=` from AdminTenantFilterField; env fallback for single-tenant uploads. */
  const adminTenantId = useAdminTenantId();
  const envTenantId = getClientTenantId();
  const tenantId = adminTenantId || envTenantId || undefined;
  const [editTenantId, setEditTenantId] = useState('');
  const [categories, setCategories] = useState<OfficialDocumentCategoryDTO[]>(initialCategories);
  const [categorySource, setCategorySource] = useState<'api' | 'fallback'>(initialCategorySource);
  const [categoryMessage, setCategoryMessage] = useState<string | undefined>(initialCategoryMessage);
  const [documents, setDocuments] = useState<EventMediaDTO[]>(initialDocuments);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pageSize = listPageSize;
  const [listLoading, setListLoading] = useState(false);
  const [coverSourceDocs, setCoverSourceDocs] = useState<EventMediaDTO[]>([]);
  const [bundles, setBundles] = useState<OfficialDocumentYearBundleDTO[]>(initialBundles);
  const [categorySlug, setCategorySlug] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [titlePrefix, setTitlePrefix] = useState('Official Document');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [bulkThumbnailFile, setBulkThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const bulkThumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');
  const [searchField, setSearchField] = useState<OfficialDocumentSearchField>('title');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIsPublic, setFilterIsPublic] = useState<'' | 'true' | 'false'>('');
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [coverSelectId, setCoverSelectId] = useState<number | '' | 'none'>('none');

  const [editing, setEditing] = useState<EventMediaDTO | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editYear, setEditYear] = useState(new Date().getFullYear());
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailBusy, setEditThumbnailBusy] = useState(false);

  const [deleting, setDeleting] = useState<EventMediaDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [qaCategorySlug, setQaCategorySlug] = useState('');
  const [qaYear, setQaYear] = useState(new Date().getFullYear());
  const [qaTitlePrefix, setQaTitlePrefix] = useState('Official Document');
  const [qaDescription, setQaDescription] = useState('');
  const [qaIsPublic, setQaIsPublic] = useState(false);
  const [qaFile, setQaFile] = useState<File | null>(null);
  const [qaThumbnailFile, setQaThumbnailFile] = useState<File | null>(null);
  const [qaBusy, setQaBusy] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  useEffect(() => {
    setBundles(initialBundles);
  }, [initialBundles]);

  useEffect(() => {
    setDocuments(initialDocuments);
    setTotalElements(initialTotalElements);
    setTotalPages(initialTotalPages);
    setCurrentPage(initialPage);
  }, [initialDocuments, initialTotalElements, initialTotalPages, initialPage]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug]
  );
  const selectedCategoryId = selectedCategory?.id;

  const currentBundle = useMemo(() => {
    if (selectedCategoryId == null) return undefined;
    return bundles.find(
      (b) => b.officialDocumentCategoryId === selectedCategoryId && b.documentYear === year
    );
  }, [bundles, selectedCategoryId, year]);

  const coverCandidateDocs = useMemo(() => {
    if (selectedCategoryId == null) return [];
    return coverSourceDocs.filter(
      (d) =>
        d.officialDocumentCategoryId === selectedCategoryId &&
        d.officialDocumentYear === year &&
        isImageMedia(d) &&
        d.id != null
    );
  }, [coverSourceDocs, selectedCategoryId, year]);

  useEffect(() => {
    if (selectedCategoryId == null) {
      setCoverSourceDocs([]);
      return;
    }
    let cancelled = false;
    void fetchTenantOfficialDocumentsServer({
      year,
      officialDocumentCategoryId: selectedCategoryId,
      tenantId: adminTenantId,
    }).then((list) => {
      if (!cancelled) setCoverSourceDocs(list);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, year, adminTenantId]);

  /** Include current cover media if it is not in the filtered list (e.g. different filter). */
  const coverSelectOptions = useMemo(() => {
    const curId = currentBundle?.coverEventMediaId;
    const base = coverCandidateDocs;
    if (curId != null && !base.some((d) => d.id === curId)) {
      const pool = [...coverSourceDocs, ...documents];
      const extra = pool.find((d) => d.id === curId && isImageMedia(d));
      if (extra?.id != null) return [...base, extra];
    }
    return base;
  }, [coverCandidateDocs, currentBundle?.coverEventMediaId, coverSourceDocs, documents]);

  useEffect(() => {
    const cur = currentBundle?.coverEventMediaId;
    if (cur == null) setCoverSelectId('none');
    else setCoverSelectId(cur);
  }, [currentBundle?.coverEventMediaId, currentBundle?.id]);

  const reloadBundles = useCallback(async () => {
    const next = await fetchOfficialDocumentYearBundlesServer(adminTenantId);
    setBundles(next);
  }, [adminTenantId]);

  const reloadCategories = useCallback(async () => {
    const next = await fetchOfficialDocumentCategoriesServer(adminTenantId);
    setCategories(next.categories);
    setCategorySource(next.source);
    setCategoryMessage(next.message);
  }, [adminTenantId]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        Array.from(e.target.files).forEach((f) => dt.items.add(f));
        fileInputRef.current.files = dt.files;
      }
    }
  };

  const buildListFilters = useCallback(() => {
    const trimmed = searchTerm.trim();
    return {
      tenantId: adminTenantId,
      ...(filterYear !== '' ? { year: filterYear } : {}),
      ...(filterCategoryId !== '' ? { officialDocumentCategoryId: filterCategoryId } : {}),
      ...(trimmed ? { searchField, searchTerm: trimmed } : {}),
      ...(filterIsPublic === 'true' ? { isPublic: true as const } : {}),
      ...(filterIsPublic === 'false' ? { isPublic: false as const } : {}),
    };
  }, [adminTenantId, filterYear, filterCategoryId, searchField, searchTerm, filterIsPublic]);

  const reloadDocuments = useCallback(
    async (page: number) => {
      setListLoading(true);
      try {
        const filters = buildListFilters();
        let result = await fetchTenantOfficialDocumentsPagedServer({
          page,
          size: pageSize,
          ...filters,
        });
        if (result.content.length === 0 && page > 0) {
          result = await fetchTenantOfficialDocumentsPagedServer({
            page: page - 1,
            size: pageSize,
            ...filters,
          });
        }
        setDocuments(result.content);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
        setCurrentPage(result.page);
      } finally {
        setListLoading(false);
      }
    },
    [buildListFilters, pageSize]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void reloadDocuments(0);
      void reloadCategories();
      void reloadBundles();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, searchField, filterIsPublic, adminTenantId, reloadDocuments, reloadCategories, reloadBundles]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchField('title');
    setFilterIsPublic('');
  };

  const handleOpenOrDownload = (doc: EventMediaDTO) => {
    if (doc.id == null) return;
    triggerOfficialDocumentProxyDownload(
      doc.id,
      resolveOfficialDocumentFileName(doc),
      doc.tenantId || adminTenantId || tenantId,
    );
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => {
      if (c.id != null) map.set(c.id, c.displayName || c.slug);
    });
    return map;
  }, [categories]);

  const openEdit = (row: EventMediaDTO) => {
    setEditError(null);
    setEditThumbnailFile(null);
    setEditing(row);
    setEditTitle(row.title || '');
    setEditDescription(row.description || '');
    setEditIsPublic(!!row.isPublic);
    setEditYear(row.officialDocumentYear ?? new Date().getFullYear());
    setEditCategoryId(
      row.officialDocumentCategoryId != null ? row.officialDocumentCategoryId : ''
    );
    setEditTenantId(row.tenantId || adminTenantId || envTenantId || '');
  };

  const handleSaveEdit = async () => {
    if (!editing?.id) return;
    if (!editTitle.trim()) {
      setEditError('Title is required.');
      return;
    }
    if (editCategoryId === '') {
      setEditError('Category is required.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const scopeTenant = editTenantId.trim() || adminTenantId || editing.tenantId;
      const r = await patchOfficialDocumentMediaServer(
        editing.id,
        editing,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          isPublic: editIsPublic,
          officialDocumentYear: editYear,
          officialDocumentCategoryId: typeof editCategoryId === 'number' ? editCategoryId : null,
          ...(scopeTenant ? { tenantId: scopeTenant } : {}),
        },
        scopeTenant,
      );
      if (!r.ok) {
        setEditError(r.message);
        return;
      }
      setEditing(null);
      await reloadDocuments(currentPage);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setEditSaving(false);
    }
  };

  const handleUploadEditThumbnail = async () => {
    const scopeTenant = editTenantId.trim() || tenantId;
    if (!editing?.id || !editThumbnailFile || !scopeTenant) return;
    setEditThumbnailBusy(true);
    setEditError(null);
    try {
      const form = new FormData();
      form.append('thumbnailFile', editThumbnailFile);
      form.append('tenantId', scopeTenant);
      const res = await fetch(
        `/api/proxy/event-medias/upload-official-document-thumbnail/${editing.id}`,
        {
          method: 'POST',
          headers: { 'X-Tenant-ID': scopeTenant },
          body: form,
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        setEditError(t || `Thumbnail upload failed (${res.status})`);
        return;
      }
      const updated = (await res.json()) as EventMediaDTO;
      setEditing(updated);
      setEditThumbnailFile(null);
      await reloadDocuments(currentPage);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setEditThumbnailBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting?.id) return;
    setDeleteBusy(true);
    try {
      const r = await deleteOfficialDocumentMediaServer(
        deleting.id,
        deleting.tenantId || adminTenantId,
      );
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setDeleting(null);
      await reloadDocuments(currentPage);
      await reloadBundles();
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQaError(null);
    if (!tenantId) {
      setQaError('Select a Tenant ID in the search filters (or set NEXT_PUBLIC_TENANT_ID).');
      return;
    }
    if (!qaCategorySlug.trim()) {
      setQaError('Select a category.');
      return;
    }
    if (!qaFile) {
      setQaError('Choose a file.');
      return;
    }
    setQaBusy(true);
    try {
      const form = new FormData();
      form.append('tenantId', tenantId);
      form.append('categorySlug', qaCategorySlug.trim().toLowerCase());
      form.append('officialDocumentYear', String(qaYear));
      if (qaTitlePrefix.trim()) form.append('titlePrefix', qaTitlePrefix.trim());
      if (qaDescription.trim()) form.append('description', qaDescription.trim());
      form.append('isPublic', qaIsPublic ? 'true' : 'false');
      form.append('files', qaFile);
      if (qaThumbnailFile) form.append('thumbnailFile', qaThumbnailFile);

      const res = await fetch('/api/proxy/event-medias/upload/bulk-tenant-official', {
        method: 'POST',
        headers: { 'X-Tenant-ID': tenantId },
        body: form,
      });

      if (!res.ok) {
        let detail = `Upload failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.message) detail = j.message;
          else if (j?.error) detail = String(j.error);
        } catch {
          /* ignore */
        }
        setQaError(detail);
        return;
      }

      setQuickAddOpen(false);
      setQaFile(null);
      setQaThumbnailFile(null);
      await reloadDocuments(0);
      await reloadBundles();
      if (selectedCategoryId != null) {
        const list = await fetchTenantOfficialDocumentsServer({
          year,
          officialDocumentCategoryId: selectedCategoryId,
          tenantId: adminTenantId,
        });
        setCoverSourceDocs(list);
      }
      router.refresh();
    } catch (err) {
      setQaError(err instanceof Error ? err.message : String(err));
    } finally {
      setQaBusy(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!tenantId) {
      setError('Select a Tenant ID in the search filters (or set NEXT_PUBLIC_TENANT_ID).');
      return;
    }
    if (!categorySlug.trim()) {
      setError('Select or enter a category slug.');
      return;
    }
    if (!year || year < 1900 || year > 2100) {
      setError('Enter a valid year.');
      return;
    }
    if (!files || files.length < 1) {
      setError('Select at least one file.');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('tenantId', tenantId);
      form.append('categorySlug', categorySlug.trim().toLowerCase());
      form.append('officialDocumentYear', String(year));
      if (titlePrefix.trim()) form.append('titlePrefix', titlePrefix.trim());
      if (description.trim()) form.append('description', description.trim());
      form.append('isPublic', isPublic ? 'true' : 'false');
      for (let i = 0; i < files.length; i++) {
        form.append('files', files[i]);
      }
      if (bulkThumbnailFile) form.append('thumbnailFile', bulkThumbnailFile);

      const res = await fetch('/api/proxy/event-medias/upload/bulk-tenant-official', {
        method: 'POST',
        headers: {
          'X-Tenant-ID': tenantId,
        },
        body: form,
      });

      if (!res.ok) {
        let detail = `Upload failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.message) detail = j.message;
          else if (j?.error) detail = String(j.error);
        } catch {
          /* ignore */
        }
        setError(detail);
        return;
      }

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 1;
      setMessage(`Uploaded ${count} file(s) successfully.`);
      setFiles(null);
      setBulkThumbnailFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (bulkThumbnailInputRef.current) bulkThumbnailInputRef.current.value = '';
      await reloadDocuments(0);
      await reloadBundles();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYearBundle = async () => {
    setBundleError(null);
    if (selectedCategoryId == null) {
      setBundleError('Category must have a numeric id from the API. Use categories loaded from the backend or seed categories with ids.');
      return;
    }
    setBundleBusy(true);
    try {
      const r = await createOfficialDocumentYearBundleServer(
        selectedCategoryId,
        year,
        adminTenantId || tenantId,
      );
      if (!r.ok) {
        setBundleError(r.message);
        return;
      }
      setBundles((prev) => {
        const rest = prev.filter(
          (b) =>
            !(
              b.officialDocumentCategoryId === r.bundle.officialDocumentCategoryId &&
              b.documentYear === r.bundle.documentYear
            )
        );
        return [...rest, r.bundle];
      });
      router.refresh();
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : String(e));
    } finally {
      setBundleBusy(false);
    }
  };

  const handleSaveCover = async () => {
    setBundleError(null);
    if (!currentBundle?.id) {
      setBundleError('Create a year bundle first.');
      return;
    }
    setBundleBusy(true);
    try {
      const coverEventMediaId =
        coverSelectId === 'none' || coverSelectId === '' ? null : Number(coverSelectId);
      const r = await patchOfficialDocumentYearBundleServer(
        currentBundle.id,
        { coverEventMediaId },
        currentBundle.tenantId || adminTenantId || tenantId,
      );
      if (!r.ok) {
        setBundleError(r.message);
        return;
      }
      setBundles((prev) =>
        prev.map((b) => (b.id === r.bundle.id ? r.bundle : b))
      );
      router.refresh();
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : String(e));
    } finally {
      setBundleBusy(false);
    }
  };

  const mediaPoolForCover = useMemo(() => {
    const m = new Map<number, EventMediaDTO>();
    [...coverSourceDocs, ...documents].forEach((d) => {
      if (d.id != null) m.set(d.id, d);
    });
    return Array.from(m.values());
  }, [coverSourceDocs, documents]);

  const coverPreview = resolveCoverPreviewUrl(currentBundle, mediaPoolForCover);

  const displayPage = currentPage + 1;
  const totalPagesForNav = totalPages > 0 ? totalPages : 1;
  const startItem = totalElements > 0 ? currentPage * pageSize + 1 : 0;
  const endItem =
    totalElements > 0
      ? Math.min(currentPage * pageSize + documents.length, totalElements)
      : 0;
  const isPrevDisabled = currentPage <= 0 || listLoading;
  const isNextDisabled =
    listLoading || totalElements === 0 || currentPage >= totalPagesForNav - 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminNavigation contextLine="Official documents library for this tenant — upload, categorize, and publish." />
      <nav className="mb-8 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={
            adminTenantId
              ? `/admin/official-document-categories?tenant=${encodeURIComponent(adminTenantId)}`
              : '/admin/official-document-categories'
          }
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          Browse categories (list)
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Official documents</h1>
      {categoryMessage && (
        <div
          className={`mb-4 rounded-lg border p-4 text-sm ${
            categorySource === 'fallback'
              ? 'border-amber-300 bg-amber-50 text-amber-950'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {categorySource === 'fallback' && (
            <strong className="block mb-1">Category list (fallback)</strong>
          )}
          {categoryMessage}
        </div>
      )}
      <p className="text-gray-600 mb-2">
        Bulk upload tenant library files under{' '}
        <code className="text-sm bg-gray-100 px-1 rounded">official_document/&#123;slug&#125;/&#123;year&#125;</code>.
        Category must exist in{' '}
        <code className="text-sm bg-gray-100 px-1">official_document_category</code> for your tenant (
        <Link
          href={
            adminTenantId
              ? `/admin/official-document-categories?tenant=${encodeURIComponent(adminTenantId)}`
              : '/admin/official-document-categories'
          }
          className="text-blue-600 hover:underline"
        >
          view slugs
        </Link>
        ).
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Active tenant for uploads:{' '}
        <code className="bg-gray-100 px-1 rounded">{tenantId || 'not set — select Tenant ID above the document listing'}</code>
        {adminTenantId ? (
          <span className="ml-2 text-green-700">(from search filter)</span>
        ) : envTenantId ? (
          <span className="ml-2 text-amber-700">(env default)</span>
        ) : null}
        . Must match <code>tenant_id</code> in the database.
      </p>

      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50/80 p-5 text-sm text-gray-800 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Workflow &amp; capabilities</h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong>Category</strong> — Pick a slug that already exists in{' '}
            <code className="text-xs bg-white/80 px-1 rounded">official_document_category</code> for this tenant (or
            create rows in the DB / API first).
          </li>
          <li>
            <strong>Year &amp; metadata</strong> — Set the calendar year segment for S3 paths and optional title prefix /
            description / public flag.
          </li>
          <li>
            <strong>Cover image (year bundle)</strong> — One row per tenant + category + year in{' '}
            <code className="text-xs bg-white/80 px-1">official_document_year_bundle</code> with optional{' '}
            <code className="text-xs bg-white/80 px-1">cover_event_media_id</code> pointing at an uploaded{' '}
            <code className="text-xs bg-white/80 px-1">event_media</code> image. Use the panel below (same category slug
            and year as bulk upload). See{' '}
            <code className="text-xs bg-white/80 px-1">documentation/mosc_document_downloads_page/cover_image/</code>.
          </li>
          <li>
            <strong>Files</strong> — Use <strong>Choose files</strong> or <strong>Upload folder</strong> (same as event
            media / gallery album pages: all files in the folder are sent in one request). Multiple files are supported;
            there is no separate folder entity—only the file list is posted.
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk upload</h2>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
              <input
                type="text"
                value={tenantId || ''}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
                aria-label="Tenant ID for upload"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set via Tenant ID search filter above{envTenantId && !adminTenantId ? ' (currently env default)' : ''}.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (slug)</label>
              {categories.length > 0 ? (
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id ?? c.slug} value={c.slug}>
                      {c.displayName} ({c.slug})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder="e.g. photos, financial-statements"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                No categories loaded? Enter slug manually or seed{' '}
                <code className="bg-gray-100 px-0.5">official_document_category</code> rows.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title prefix (optional)</label>
              <input
                type="text"
                value={titlePrefix}
                onChange={(e) => setTitlePrefix(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Public (visible on downloads when data-driven mode is on)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card thumbnail (optional, image only)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Applied to every file in this batch (PDF/Office previews on the public downloads page).
              </p>
              <OfficialDocumentThumbnailUploadGuidance className="mb-3" />
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100">
                <input
                  ref={bulkThumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBulkThumbnailFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                Choose thumbnail
              </label>
              {bulkThumbnailFile && (
                <p className="text-sm text-gray-700 mt-2">{bulkThumbnailFile.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Files</label>
              <p className="text-xs text-gray-500 mb-2">
                Same pattern as <span className="font-medium">Admin → Event → Media</span> and{' '}
                <span className="font-medium">Gallery album media</span>: multi-select or an entire folder (flat file
                list).
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="sr-only"
                  />
                  Choose files
                </label>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100">
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={handleFolderInputChange}
                    className="sr-only"
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                  />
                  Upload folder
                </label>
              </div>
              {files && files.length > 0 && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-semibold text-blue-700">{files.length}</span> file
                  {files.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
            )}
            {message && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-semibold text-blue-700">{loading ? 'Uploading…' : 'Upload batch'}</span>
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                placeholder="Any"
                value={filterYear}
                onChange={(e) =>
                  setFilterYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                className="w-32 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filterCategoryId === '' ? '' : String(filterCategoryId)}
                onChange={(e) =>
                  setFilterCategoryId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
              >
                <option value="">All</option>
                {categories.map((c) =>
                  c.id != null ? (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ) : null
                )}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void reloadDocuments(0)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => void reloadCategories()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              Refresh categories
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-900 text-sm font-semibold transition-all"
            >
              Add one file…
            </button>
            <p className="text-sm text-gray-500">
              Page {currentPage + 1} — {totalElements} total. Year/category filters apply when you click Apply;
              text search above the table updates automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-12 rounded-lg border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Year bundle cover</h2>
        <p className="text-sm text-gray-600 mb-4">
          Matches the <strong>category slug</strong> and <strong>year</strong> from bulk upload above. Create a bundle
          row, then pick an image already uploaded for that category and year.
        </p>
        <div className="flex flex-wrap gap-6 items-start">
          <div className="min-w-[200px] space-y-1 text-sm">
            <div>
              <span className="text-gray-500">Category id:</span>{' '}
              <span className="font-mono">{selectedCategoryId ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Year:</span> <span className="font-mono">{year}</span>
            </div>
            <div>
              <span className="text-gray-500">Bundle:</span>{' '}
              {currentBundle?.id != null ? (
                <span className="text-green-700 font-medium">#{currentBundle.id}</span>
              ) : (
                <span className="text-amber-800">none — create below</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end flex-wrap">
            <button
              type="button"
              disabled={
                bundleBusy ||
                selectedCategoryId == null ||
                currentBundle != null
              }
              onClick={() => void handleCreateYearBundle()}
              className="px-4 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-900 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {bundleBusy ? 'Working…' : 'Create year bundle'}
            </button>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cover image (from uploads)</label>
              <select
                value={coverSelectId === 'none' ? 'none' : String(coverSelectId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCoverSelectId(v === 'none' ? 'none' : parseInt(v, 10));
                }}
                disabled={!currentBundle?.id}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[220px] text-sm disabled:bg-gray-100"
              >
                <option value="none">No cover</option>
                {coverSelectOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || `Media #${d.id}`} (id {d.id})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={bundleBusy || !currentBundle?.id}
              onClick={() => void handleSaveCover()}
              className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-medium text-sm disabled:opacity-50"
            >
              Save cover
            </button>
          </div>
          {coverPreview && (
            <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <Image
                src={coverPreview}
                alt="Cover preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </div>
        {selectedCategoryId == null && categorySlug && (
          <p className="mt-3 text-sm text-amber-800">
            Categories from fallback slugs have no database id — load categories from the API or pick a category that has
            an id to use year bundles.
          </p>
        )}
        {coverSelectOptions.length === 0 && currentBundle?.id != null && (
          <p className="mt-3 text-sm text-gray-600">
            No image files found for this category and year in the table below. Upload images (same slug/year), refresh the
            list, then choose one here.
          </p>
        )}
        {bundleError && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{bundleError}</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tenant official documents</h2>
          {listLoading && (
            <span className="text-sm text-gray-500">Loading…</span>
          )}
        </div>

        <div className="px-6 py-4 border-b border-blue-200 bg-blue-50/70">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-end">
            <AdminTenantFilterField
              inputId="official-documents-list-tenant-filter"
              className="lg:col-span-2"
            />
            <div className="rounded-xl border border-blue-200 bg-white/80 px-4 py-3 text-sm text-gray-700 lg:col-span-2">
              Select a Tenant ID here to list, open or download, edit, and delete documents for that tenant. When none is
              selected, uploads use the env default tenant.
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search documents</label>
              <div className="flex items-stretch">
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value as OfficialDocumentSearchField)}
                  className="border border-gray-400 rounded-l-xl focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 text-sm min-h-[44px] bg-white shrink-0"
                  aria-label="Search field"
                >
                  {DOCUMENT_SEARCH_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  type={searchField === 'id' ? 'number' : 'text'}
                  placeholder={`Search by ${DOCUMENT_SEARCH_FIELDS.find((f) => f.value === searchField)?.label ?? 'field'}…`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void reloadDocuments(0);
                  }}
                  className="block w-full border border-gray-400 border-l-0 rounded-r-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 text-sm min-h-[44px]"
                  aria-label="Search term"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Public visibility</label>
              <select
                value={filterIsPublic}
                onChange={(e) => setFilterIsPublic(e.target.value as '' | 'true' | 'false')}
                className="block w-full border border-gray-400 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 text-sm min-h-[44px] bg-white"
                aria-label="Filter by public visibility"
              >
                <option value="">All</option>
                <option value="true">Public only</option>
                <option value="false">Private only</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void reloadDocuments(0)}
                className="px-4 py-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-semibold transition-all min-h-[44px]"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                disabled={!searchTerm && filterIsPublic === '' && searchField === 'title'}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Public</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No documents found. Upload above or adjust filters.
                  </td>
                </tr>
              ) : (
                documents.map((d) => (
                  <tr key={d.id != null ? `doc-${d.id}` : `doc-${d.title}-${d.createdAt}`}>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={d.title}>
                      {d.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.officialDocumentYear ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.officialDocumentCategoryId != null
                        ? categoryNameById.get(d.officialDocumentCategoryId) ?? `#${d.officialDocumentCategoryId}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">{d.isPublic ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm">
                      {d.id != null ? (
                        <button
                          type="button"
                          onClick={() => handleOpenOrDownload(d)}
                          className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 transition-all duration-300 hover:scale-105 hover:bg-green-100 hover:text-green-800"
                          title="Open or download document"
                          aria-label={`Open or download ${d.title || `document ${d.id}`}`}
                        >
                          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Open / Download</span>
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          disabled={d.id == null}
                          className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40"
                          title="Edit"
                          aria-label="Edit document"
                        >
                          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(d)}
                          disabled={d.id == null}
                          className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-40"
                          title="Delete"
                          aria-label="Delete document"
                        >
                          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 px-6 pb-6">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => void reloadDocuments(Math.max(0, currentPage - 1))}
              disabled={isPrevDisabled}
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
                Page <span className="text-blue-600">{displayPage}</span> of{' '}
                <span className="text-blue-600">{totalPagesForNav}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => void reloadDocuments(Math.min(totalPagesForNav - 1, currentPage + 1))}
              disabled={isNextDisabled}
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
            {totalElements > 0 ? (
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                <span className="text-sm text-gray-700">
                  Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                  <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                  <span className="font-bold text-blue-600">{totalElements}</span> documents
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                <span className="text-sm font-medium text-orange-700">No documents match the current filters</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit official document"
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input
              type="text"
              value={editTenantId}
              onChange={(e) => setEditTenantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="tenant_…"
              aria-label="Tenant ID"
            />
            <p className="text-xs text-gray-500 mt-1">
              Updates and thumbnail uploads use this tenant (defaults from the document or search filter).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              min={1900}
              max={2100}
              value={editYear}
              onChange={(e) => setEditYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={editCategoryId === '' ? '' : String(editCategoryId)}
              onChange={(e) =>
                setEditCategoryId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select category</option>
              {categories.map((c) =>
                c.id != null ? (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.slug})
                  </option>
                ) : null
              )}
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editIsPublic}
              onChange={(e) => setEditIsPublic(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Public</span>
          </label>
          {editing && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Card thumbnail</p>
              <OfficialDocumentThumbnailUploadGuidance />
              {(() => {
                const previewUrl = getEventMediaDisplayThumbnailUrl({
                  fileUrl: editing.fileUrl,
                  thumbnailUrl: editing.thumbnailUrl,
                  thumbnailPreSignedUrl: editing.thumbnailPreSignedUrl,
                  fileDataContentType: editing.fileDataContentType || editing.contentType,
                  title: editing.title,
                }, {
                  thumbnailExpiresAtIso: editing.thumbnailPreSignedUrlExpiresAt,
                  fileExpiresAtIso: editing.preSignedUrlExpiresAt,
                });
                const kind = getOfficialDocumentPlaceholderKind({
                  fileUrl: editing.fileUrl,
                  fileDataContentType: editing.fileDataContentType || editing.contentType,
                  title: editing.title,
                });
                return previewUrl ? (
                  <div className="relative h-28 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
                    <Image src={previewUrl} alt="" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div
                    className={`h-28 max-w-xs rounded-lg border border-gray-200 flex items-center justify-center bg-gradient-to-br ${placeholderGradient(kind)}`}
                  >
                    <span className="text-lg font-bold text-gray-600">{placeholderLabel(kind)}</span>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 items-center">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditThumbnailFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  Replace thumbnail
                </label>
                {editThumbnailFile && (
                  <button
                    type="button"
                    disabled={editThumbnailBusy}
                    onClick={() => void handleUploadEditThumbnail()}
                    className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {editThumbnailBusy ? 'Uploading…' : 'Upload thumbnail'}
                  </button>
                )}
              </div>
            </div>
          )}
          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{editError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editSaving}
              onClick={() => void handleSaveEdit()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          setQaError(null);
        }}
        title="Add one file"
        size="lg"
      >
        <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Uploads a single file to the tenant library (same API as bulk upload). Use bulk upload for many files or
            folders.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input
              type="text"
              value={tenantId || ''}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
              aria-label="Tenant ID for quick add"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (slug)</label>
            {categories.length > 0 ? (
              <select
                value={qaCategorySlug}
                onChange={(e) => setQaCategorySlug(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id ?? c.slug} value={c.slug}>
                    {c.displayName} ({c.slug})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={qaCategorySlug}
                onChange={(e) => setQaCategorySlug(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              min={1900}
              max={2100}
              value={qaYear}
              onChange={(e) => setQaYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title prefix</label>
            <input
              type="text"
              value={qaTitlePrefix}
              onChange={(e) => setQaTitlePrefix(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={qaDescription}
              onChange={(e) => setQaDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={qaIsPublic}
              onChange={(e) => setQaIsPublic(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Public</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card thumbnail (optional)</label>
            <OfficialDocumentThumbnailUploadGuidance className="mb-3" />
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setQaThumbnailFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              Choose thumbnail
            </label>
            {qaThumbnailFile && (
              <p className="text-sm text-gray-700 mt-2">{qaThumbnailFile.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              onChange={(e) => setQaFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          {qaError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{qaError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddOpen(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={qaBusy}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50"
            >
              {qaBusy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the library entry for <strong>{deleting?.title}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
              disabled={deleteBusy}
            >
              <span className="font-semibold text-blue-700">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteBusy}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              <span className="font-semibold text-red-700">{deleteBusy ? 'Deleting…' : 'Delete'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
