'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaChevronLeft, FaChevronRight, FaSpinner, FaImage, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Image from 'next/image';
import type { EventMediaDTO } from '@/types';
import { fetchPerformerMediaServer, updateMediaPriorityRankingServer, updateEventMediaServer } from '../ApiServerActions';
import { deleteEventMediaServer } from '@/app/admin/events/[id]/performers/ApiServerActions';
import PriorityRankingEditor from '@/components/sponsors/PriorityRankingEditor';
import Modal, { ConfirmModal } from '@/components/ui/Modal';

interface PaginatedMediaListProps {
  performerId: number;
  initialMediaList: EventMediaDTO[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  refreshKey?: number;
}

export default function PaginatedMediaList({
  performerId,
  initialMediaList,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  refreshKey = 0,
}: PaginatedMediaListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>(initialMediaList);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<EventMediaDTO | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);
  const [editingMedia, setEditingMedia] = useState<EventMediaDTO | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventMediaDTO>>({});
  const [saving, setSaving] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<EventMediaDTO | null>(null);

  // Load media when page changes or refreshKey changes
  const loadMedia = useCallback(async () => {
    if (!performerId) return;

    setLoading(true);
    try {
      const allMedia = await fetchPerformerMediaServer(performerId);
      const startIndex = currentPage * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedMedia = allMedia.slice(startIndex, endIndex);
      setMediaList(paginatedMedia);
    } catch (error) {
      console.error('Failed to fetch performer media:', error);
      setMediaList(initialMediaList);
    } finally {
      setLoading(false);
    }
  }, [performerId, currentPage, pageSize, initialMediaList]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia, refreshKey]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages || loading) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePriorityUpdate = async (mediaId: number, priorityRanking: number) => {
    try {
      await updateMediaPriorityRankingServer(mediaId, priorityRanking);
      setMediaList(prev =>
        prev.map(m =>
          m.id === mediaId
            ? { ...m, priorityRanking }
            : m
        ).sort((a, b) => (a.priorityRanking || 0) - (b.priorityRanking || 0))
      );
      setEditingPriority(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert(`Failed to update priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleMediaClick = (media: EventMediaDTO, e?: React.MouseEvent) => {
    if (e?.target && (e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedMedia(media);
    setLightboxOpen(true);
  };

  const handleEditClick = (media: EventMediaDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    setEditingMedia(media);
    setEditForm({
      id: media.id,
      tenantId: media.tenantId,
      title: media.title || '',
      description: media.description || '',
      eventMediaType: media.eventMediaType || '',
      altText: media.altText || '',
      priorityRanking: media.priorityRanking ?? 0,
      startDisplayingFromDate: media.startDisplayingFromDate
        ? (typeof media.startDisplayingFromDate === 'string'
            ? media.startDisplayingFromDate
            : new Date(media.startDisplayingFromDate).toISOString().split('T')[0])
        : '',
      isPublic: Boolean(media.isPublic),
      eventFlyer: Boolean(media.eventFlyer),
      isEventManagementOfficialDocument: Boolean(media.isEventManagementOfficialDocument),
      isHeroImage: Boolean(media.isHeroImage),
      isActiveHeroImage: Boolean(media.isActiveHeroImage),
      isHomePageHeroImage: Boolean(media.isHomePageHeroImage),
      isFeaturedEventImage: Boolean(media.isFeaturedEventImage),
      isLiveEventImage: Boolean(media.isLiveEventImage),
      isFeaturedVideo: Boolean(media.isFeaturedVideo),
      featuredVideoUrl: media.featuredVideoUrl || '',
    });
  };

  const handleDeleteClick = async (media: EventMediaDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!media.id) return;
    (e.currentTarget as HTMLButtonElement).blur();
    setMediaToDelete(media);
  };

  const handleConfirmDelete = async () => {
    if (!mediaToDelete?.id) return;

    setDeletingMediaId(mediaToDelete.id);
    try {
      await deleteEventMediaServer(mediaToDelete.id);
      await loadMedia();
      router.refresh();
      setMediaToDelete(null);
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMedia?.id) return;

    setSaving(true);
    try {
      const merged: Partial<EventMediaDTO> = {
        ...editingMedia,
        ...editForm,
        updatedAt: new Date().toISOString(),
      };

      merged.createdAt = merged.createdAt || editingMedia.createdAt || new Date().toISOString();
      merged.storageType = merged.storageType || editingMedia.storageType || 'S3';
      merged.eventMediaType = merged.eventMediaType || editingMedia.eventMediaType || 'gallery';
      merged.title = (merged.title ?? editingMedia.title ?? 'Untitled Media').trim() || 'Untitled Media';
      merged.priorityRanking =
        typeof merged.priorityRanking === 'number'
          ? merged.priorityRanking
          : editingMedia.priorityRanking ?? 0;
      merged.tenantId = merged.tenantId || editingMedia.tenantId;

      const booleanFields: (keyof EventMediaDTO)[] = [
        'isHomePageHeroImage',
        'isFeaturedEventImage',
        'isLiveEventImage',
        'isPublic',
        'eventFlyer',
        'isEventManagementOfficialDocument',
        'isHeroImage',
        'isActiveHeroImage',
        'isFeaturedVideo',
      ];

      booleanFields.forEach((field) => {
        (merged as any)[field] = (merged as any)[field] ?? (editingMedia as any)?.[field] ?? false;
      });

      if (merged.startDisplayingFromDate === '') {
        delete merged.startDisplayingFromDate;
      }

      await updateEventMediaServer(editingMedia.id, merged);
      await loadMedia();
      setEditingMedia(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update media:', error);
      alert(`Failed to update media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const startItem = totalCount > 0 ? currentPage * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min((currentPage + 1) * pageSize, totalCount) : 0;
  const isPrevDisabled = currentPage === 0 || loading;
  const isNextDisabled = currentPage >= totalPages - 1 || loading;

  if (loading && mediaList.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div>
      {mediaList.length === 0 ? (
        <div className="text-center py-12">
          <FaImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No media files found for this performer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {mediaList.map((media) => (
            <div
              key={media.id}
              className="bg-muted/50 rounded-lg overflow-hidden border border-border reverent-hover"
            >
              {media.fileUrl && (
                <div
                  className="relative aspect-video cursor-pointer"
                  onClick={(e) => handleMediaClick(media, e)}
                >
                  <Image
                    src={media.fileUrl}
                    alt={media.altText || media.title || 'Media'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-foreground truncate flex-1" title={media.title || 'Untitled'}>
                    {media.title || 'Untitled'}
                  </h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleEditClick(media, e)}
                      className="icon-btn icon-btn-edit bg-blue-700 hover:bg-blue-800 text-white p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Edit media details"
                    >
                      <FaEdit className="text-lg text-white" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(media, e)}
                      disabled={deletingMediaId === media.id}
                      className="icon-btn icon-btn-delete bg-red-700 hover:bg-red-800 text-white p-3 shadow-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Delete media file"
                    >
                      {deletingMediaId === media.id ? (
                        <FaSpinner className="text-lg text-white animate-spin" />
                      ) : (
                        <FaTrashAlt className="text-lg text-white" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Type: {media.eventMediaType || 'N/A'}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Priority: {media.priorityRanking ?? 0}
                  </span>
                  {editingPriority === media.id ? (
                    <PriorityRankingEditor
                      currentPriority={media.priorityRanking ?? 0}
                      onSave={(priority) => handlePriorityUpdate(media.id!, priority)}
                      onCancel={() => setEditingPriority(null)}
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPriority(media.id!);
                      }}
                      className="text-xs text-primary hover:text-primary/80 reverent-transition"
                    >
                      Edit Priority
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="mt-8">
        <div className="flex justify-between items-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={isPrevDisabled}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Previous Page"
            aria-label="Previous Page"
            type="button"
          >
            <FaChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
            <span className="text-sm font-bold text-blue-700">
              Page <span className="text-blue-600">{currentPage + 1}</span> of <span className="text-blue-600">{totalPages}</span>
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isNextDisabled}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Next Page"
            aria-label="Next Page"
            type="button"
          >
            <span>Next</span>
            <FaChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mt-3">
          {totalCount > 0 ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700">
                Showing <span className="font-bold text-blue-600">{startItem}</span> to <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                <span className="font-bold text-blue-600">{totalCount}</span> {totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No items found</span>
              <span className="text-sm text-orange-600">[No items match your criteria]</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => {
            setLightboxOpen(false);
            setSelectedMedia(null);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] p-4">
            {selectedMedia.fileUrl && (
              <Image
                src={selectedMedia.fileUrl}
                alt={selectedMedia.altText || selectedMedia.title || 'Media'}
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            )}
            {selectedMedia.title && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/75 text-white p-3 rounded-lg">
                <h3 className="font-semibold">{selectedMedia.title}</h3>
                {selectedMedia.description && (
                  <p className="text-sm mt-1">{selectedMedia.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Media Modal */}
      {editingMedia && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingMedia(null);
            setEditForm({});
          }}
          title="Edit Media Details"
          size="xl"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={editForm.altText || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, altText: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Priority Ranking
                </label>
                <input
                  type="number"
                  value={editForm.priorityRanking ?? 0}
                  onChange={(e) => setEditForm(prev => ({ ...prev, priorityRanking: parseInt(e.target.value) || 0 }))}
                  min={0}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers indicate higher priority (0 = highest priority)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Start Displaying From Date
                </label>
                <input
                  type="date"
                  value={editForm.startDisplayingFromDate || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, startDisplayingFromDate: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div className="border border-border rounded-lg p-4">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Media Properties
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'isPublic' as const, label: 'Public' },
                    { name: 'eventFlyer' as const, label: 'Event Flyer' },
                    { name: 'isEventManagementOfficialDocument' as const, label: 'Official Doc' },
                    { name: 'isHeroImage' as const, label: 'Hero Image' },
                    { name: 'isActiveHeroImage' as const, label: 'Active Hero' },
                    { name: 'isFeaturedVideo' as const, label: 'Featured Video' },
                    { name: 'isHomePageHeroImage' as const, label: 'Home Page Hero' },
                    { name: 'isFeaturedEventImage' as const, label: 'Featured Event' },
                    { name: 'isLiveEventImage' as const, label: 'Live Event' },
                  ].map(({ name, label }) => (
                    <label key={name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm[name])}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [name]: e.target.checked }))}
                        className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
                      />
                      <span className="text-sm text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editForm.isFeaturedVideo && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Featured Video URL
                  </label>
                  <input
                    type="url"
                    value={editForm.featuredVideoUrl || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, featuredVideoUrl: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setEditingMedia(null);
                  setEditForm({});
                }}
                className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
                disabled={saving}
                title="Cancel"
                aria-label="Cancel"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="font-semibold text-blue-700">Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={saving ? 'Saving...' : 'Save Changes'}
                aria-label={saving ? 'Saving...' : 'Save Changes'}
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                  {saving ? (
                    <svg className="animate-spin w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="font-semibold text-green-700">{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Media File"
        message={`Are you sure you want to delete "${mediaToDelete?.title || 'this media file'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

