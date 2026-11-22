"use client";
import React, { useRef, useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventMediaDTO } from "@/types";
import { FaUsers, FaPhotoVideo, FaCalendarAlt, FaTimes, FaChevronLeft, FaChevronRight, FaTicketAlt, FaUpload, FaTags, FaHome } from 'react-icons/fa';
import AdminNavigation from '@/components/AdminNavigation';
import SearchFieldClearButton from '@/components/admin/SearchFieldClearButton';
import { createPortal } from "react-dom";
import { Modal } from "@/components/Modal";
import { formatInTimeZone } from 'date-fns-tz';

// Helper function for timezone-aware date formatting
function formatDateInTimezone(dateString: string, timezone: string = 'America/New_York'): string {
  if (!dateString) return 'N/A';
  try {
    return formatInTimeZone(dateString, timezone, 'EEEE, MMMM d, yyyy');
  } catch {
    // Fallback to simple date formatting if timezone parsing fails
    return new Date(dateString).toLocaleDateString();
  }
}

// Tooltip component with improved functionality
function MediaDetailsTooltip({ media, anchorRect, onClose, onTooltipMouseEnter, onTooltipMouseLeave, tooltipType, serialNumber }: {
  media: EventMediaDTO | null,
  anchorRect: DOMRect | null,
  onClose: () => void,
  onTooltipMouseEnter: () => void,
  onTooltipMouseLeave: () => void,
  tooltipType: 'uploadedMedia' | null,
  serialNumber?: number
}) {
  if (!media || !anchorRect) return null;
  const entries = Object.entries(media).filter(([key]) => key !== 'fileUrl' && key !== 'preSignedUrl');
  const tooltipWidth = 600; // Increased width
  const thWidth = 200; // Increased column width
  const spacing = 16; // Increased spacing

  // Mobile responsive positioning
  const isMobile = window.innerWidth <= 768;
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;

  // Mobile positioning - center the tooltip
  if (isMobile) {
    left = Math.max(spacing, (window.innerWidth - tooltipWidth) / 2);
    top = Math.max(spacing, anchorRect.top - 50);
  } else {
    // Desktop positioning - to the right of the anchor
    if (left + tooltipWidth > window.innerWidth) {
      left = anchorRect.left - tooltipWidth - spacing;
    }
  }

  // Clamp position to stay within the viewport
  const estimatedHeight = 400; // Increased height
  if (top + estimatedHeight > window.innerHeight) {
    top = window.innerHeight - estimatedHeight - spacing;
  }
  if (top < spacing) {
    top = spacing;
  }
  if (left < spacing) {
    left = spacing;
  }
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - spacing;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    zIndex: 9999,
    width: isMobile ? Math.min(tooltipWidth, window.innerWidth - 32) : tooltipWidth,
    maxWidth: isMobile ? '90vw' : 600,
    maxHeight: isMobile ? '70vh' : 500, // Increased height
    overflowY: 'auto',
    pointerEvents: 'auto',
    background: '#fff',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#3b82f6', // Blue border for better visibility
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)', // Enhanced shadow
    fontSize: 16, // Increased font size
    padding: 20, // Increased padding
    paddingBottom: 20,
  };

  return createPortal(
    <div
      className="admin-tooltip"
      style={style}
      tabIndex={-1}
      onMouseEnter={onTooltipMouseEnter}
      onMouseLeave={onTooltipMouseLeave}
    >
      {/* Header with close button and hint */}
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {serialNumber && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
              #{serialNumber}
            </div>
          )}
          <span className="text-sm text-gray-600 font-medium">
            Click the × button to close this dialog
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Close tooltip"
        >
          <FaTimes />
        </button>
      </div>

      <table className="admin-tooltip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-gray-100">
              <th style={{
                textAlign: 'left',
                width: thWidth,
                minWidth: thWidth,
                maxWidth: thWidth,
                fontWeight: 600,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                boxSizing: 'border-box',
                padding: '12px 16px 12px 0',
                fontSize: '14px',
                color: '#374151'
              }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </th>
              <td style={{
                textAlign: 'left',
                width: 'auto',
                padding: '12px 0',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {typeof value === 'boolean' ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {value ? 'Yes' : 'No'}
                  </span>
                ) : value instanceof Date ? value.toLocaleString() :
                  (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) && value ? formatDateInTimezone(value, 'America/New_York') :
                    value === null || value === undefined || value === '' ? <span className="text-gray-400 italic">(empty)</span> : String(value)
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}

interface EditMediaModalProps {
  media: EventMediaDTO;
  onClose: () => void;
  onSave: (updated: Partial<EventMediaDTO>) => void;
  loading: boolean;
}

type MediaCheckboxName = 'isPublic' | 'eventFlyer' | 'isEventManagementOfficialDocument' | 'isHeroImage' | 'isActiveHeroImage' | 'isFeaturedVideo' | 'isHomePageHeroImage' | 'isFeaturedEventImage' | 'isLiveEventImage';

function EditMediaModal({ media, onClose, onSave, loading }: EditMediaModalProps) {
  console.log('EditMediaModal - media object:', media);
  
  // Helper to convert total seconds to minutes and seconds
  const secondsToMinutesAndSeconds = (totalSeconds: number | null | undefined): { minutes: number | ''; seconds: number | '' } => {
    if (!totalSeconds || totalSeconds <= 0) return { minutes: '', seconds: '' };
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  };

  const initialDuration = secondsToMinutesAndSeconds(media.homePageHeroDisplayDurationSeconds);
  const [heroDisplayDurationMinutes, setHeroDisplayDurationMinutes] = useState<number | ''>(initialDuration.minutes);
  const [heroDisplayDurationSeconds, setHeroDisplayDurationSeconds] = useState<number | ''>(initialDuration.seconds);

  const [form, setForm] = useState<Partial<EventMediaDTO>>(() => ({
    id: media.id,
    tenantId: media.tenantId,
    title: media.title || '',
    description: media.description || '',
    eventMediaType: media.eventMediaType || '',
    storageType: media.storageType || '',
    fileUrl: media.fileUrl || '',
    contentType: media.contentType,
    fileSize: media.fileSize,
    isPublic: Boolean(media.isPublic),
    eventFlyer: Boolean(media.eventFlyer),
    isEventManagementOfficialDocument: Boolean(media.isEventManagementOfficialDocument),
    preSignedUrl: media.preSignedUrl || '',
    preSignedUrlExpiresAt: media.preSignedUrlExpiresAt,
    altText: media.altText || '',
    displayOrder: media.displayOrder,
    downloadCount: media.downloadCount,
    isFeaturedVideo: Boolean(media.isFeaturedVideo),
    featuredVideoUrl: media.featuredVideoUrl || '',
    isHeroImage: Boolean(media.isHeroImage),
    isActiveHeroImage: Boolean(media.isActiveHeroImage),
    isHomePageHeroImage: Boolean(media.isHomePageHeroImage),
    isFeaturedEventImage: Boolean(media.isFeaturedEventImage),
    isLiveEventImage: Boolean(media.isLiveEventImage),
    eventId: media.eventId,
    uploadedById: media.uploadedById,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    startDisplayingFromDate: media.startDisplayingFromDate ?
      (typeof media.startDisplayingFromDate === 'string' ?
        media.startDisplayingFromDate :
        new Date(media.startDisplayingFromDate).toISOString().split('T')[0]) : '',
    homePageHeroDisplayDurationSeconds: media.homePageHeroDisplayDurationSeconds || undefined,
  }));

  // Sync duration fields when media changes
  useEffect(() => {
    const duration = secondsToMinutesAndSeconds(media.homePageHeroDisplayDurationSeconds);
    setHeroDisplayDurationMinutes(duration.minutes);
    setHeroDisplayDurationSeconds(duration.seconds);
  }, [media]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    try {
      // Convert minutes + seconds to total seconds for homePageHeroDisplayDurationSeconds
      const minutes = typeof heroDisplayDurationMinutes === 'number' ? heroDisplayDurationMinutes : 0;
      const seconds = typeof heroDisplayDurationSeconds === 'number' ? heroDisplayDurationSeconds : 0;
      const totalSeconds = minutes * 60 + seconds;
      
      const payload = {
        ...form,
        updatedAt: new Date().toISOString(),
        homePageHeroDisplayDurationSeconds: totalSeconds > 0 && totalSeconds <= 600 ? totalSeconds : (form.isHomePageHeroImage ? null : undefined),
        ...Object.fromEntries(
          Object.entries(form)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [
              k,
              k === 'startDisplayingFromDate' && (v === '' || v === 'null') ? null :
                k === 'startDisplayingFromDate' && v ? new Date(v as string).toISOString().split('T')[0] :
                  typeof v === 'boolean' ? Boolean(v) : v
            ])
        ),
      };
      console.log('EditMediaModal - payload being sent:', payload);
      await onSave(payload);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }, [form, onSave, loading]);

  const handleCheckboxChange = useCallback((name: MediaCheckboxName) => {
    setForm(prev => {
      const newValue = !prev[name];
      let updates: Partial<EventMediaDTO> = { [name]: newValue };

      if (name === 'isHeroImage' && !newValue) {
        updates.isActiveHeroImage = false;
      }
      if (name === 'isActiveHeroImage' && newValue) {
        updates.isHeroImage = true;
      }
      if (name === 'isEventManagementOfficialDocument' && newValue) {
        updates.eventFlyer = false;
      }
      if (name === 'eventFlyer' && newValue) {
        updates.isEventManagementOfficialDocument = false;
      }
      if (name === 'isFeaturedVideo' && !newValue) {
        updates.featuredVideoUrl = '';
      }
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <Modal open={true} onClose={onClose} title="Edit Media">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={form.description || ''}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="altText">
              Alt Text
            </label>
            <input
              id="altText"
              type="text"
              value={form.altText || ''}
              onChange={(e) => setForm(prev => ({ ...prev, altText: e.target.value }))}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="startDisplayingFromDate">
              Start Displaying From Date
            </label>
            <input
              id="startDisplayingFromDate"
              type="date"
              value={form.startDisplayingFromDate || ''}
              onChange={(e) => setForm(prev => ({ ...prev, startDisplayingFromDate: e.target.value }))}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to display immediately, or set a future date to schedule when this media should start being displayed.
            </p>
          </div>

          {form.isFeaturedVideo && (
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="featuredVideoUrl">
                Featured Video URL
              </label>
              <input
                id="featuredVideoUrl"
                type="text"
                value={form.featuredVideoUrl || ''}
                onChange={(e) => setForm(prev => ({ ...prev, featuredVideoUrl: e.target.value }))}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {/* Home Page Hero Display Duration (shown only when isHomePageHeroImage is checked) */}
          {form.isHomePageHeroImage && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Page Hero Display Duration
              </label>
              <p className="text-xs text-gray-600 mb-3">
                How long should this image be displayed in the homepage hero slider? Leave empty to use default (8 seconds).
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label htmlFor="editHeroDisplayDurationMinutes" className="block text-xs font-medium text-gray-600 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    id="editHeroDisplayDurationMinutes"
                    name="editHeroDisplayDurationMinutes"
                    min="0"
                    max="10"
                    value={heroDisplayDurationMinutes}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                      setHeroDisplayDurationMinutes(val);
                    }}
                    className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="editHeroDisplayDurationSeconds" className="block text-xs font-medium text-gray-600 mb-1">
                    Seconds
                  </label>
                  <input
                    type="number"
                    id="editHeroDisplayDurationSeconds"
                    name="editHeroDisplayDurationSeconds"
                    min="0"
                    max="59"
                    value={heroDisplayDurationSeconds}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                      setHeroDisplayDurationSeconds(val);
                    }}
                    className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Valid range: 1 second to 10 minutes (600 seconds). Example: 1 min 20 secs = 80 seconds total.
              </p>
              {(typeof heroDisplayDurationMinutes === 'number' && heroDisplayDurationMinutes > 0) || (typeof heroDisplayDurationSeconds === 'number' && heroDisplayDurationSeconds > 0) ? (
                <div className="mt-2 text-sm text-blue-700 font-medium">
                  Total: {(() => {
                    const min = typeof heroDisplayDurationMinutes === 'number' ? heroDisplayDurationMinutes : 0;
                    const sec = typeof heroDisplayDurationSeconds === 'number' ? heroDisplayDurationSeconds : 0;
                    const total = min * 60 + sec;
                    if (total === 0) return '0 seconds (will use default)';
                    if (total < 60) return `${total} secs`;
                    const m = Math.floor(total / 60);
                    const s = total % 60;
                    return s === 0 ? `${m} min` : `${m} min ${s} secs`;
                  })()}
                </div>
              ) : null}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700">
              Media Properties
            </label>
            <div className="custom-grid-table mt-4 p-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { name: 'isPublic' as const, label: 'Public' },
                { name: 'eventFlyer' as const, label: 'Event Flyer' },
                { name: 'isEventManagementOfficialDocument' as const, label: 'Official Doc' },
                { name: 'isHeroImage' as const, label: 'Hero Image' },
                { name: 'isActiveHeroImage' as const, label: 'Active Hero' },
                { name: 'isFeaturedVideo' as const, label: 'Featured Video' },
                { name: 'isHomePageHeroImage' as const, label: 'Home Page Hero' },
                { name: 'isFeaturedEventImage' as const, label: 'Featured Event Image' },
                { name: 'isLiveEventImage' as const, label: 'Live Event Image' },
              ].map(({ name, label }) => (
                <label key={name} className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={Boolean(form[name])}
                      onChange={() => handleCheckboxChange(name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="custom-checkbox-tick">
                      {Boolean(form[name]) && (
                        <svg className="text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4 sm:gap-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex-shrink-0 h-24 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-4 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-12"
            disabled={loading}
            title="Cancel"
            aria-label="Cancel"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700 text-xl">Cancel</span>
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            className="flex-1 flex-shrink-0 h-24 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-4 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-12"
            disabled={loading}
            title={loading ? 'Saving...' : 'Save Changes'}
            aria-label={loading ? 'Saving...' : 'Save Changes'}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-green-200 flex items-center justify-center">
              {loading ? (
                <svg className="animate-spin w-20 h-20 text-green-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-semibold text-green-700 text-xl">{loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminMediaPage() {
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMedia, setEditMedia] = useState<EventMediaDTO | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<EventMediaDTO | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFlyerOnly, setEventFlyerOnly] = useState(false);
  const [serialNumberInput, setSerialNumberInput] = useState('');
  const totalPages = Math.ceil(totalCount / pageSize);
  const router = useRouter();

  const [activeTooltip, setActiveTooltip] = useState<{ media: EventMediaDTO, type: 'uploadedMedia', serialNumber: number } | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [isCellHovered, setIsCellHovered] = useState(false);
  const [isTooltipClosed, setIsTooltipClosed] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaGridRef = useRef<HTMLDivElement>(null);
  const pageTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      async function fetchMedia() {
        setLoading(true);
        setError(null);
        try {
          let url = `/api/proxy/event-medias?page=${page}&size=${pageSize}&sort=updatedAt,desc`;

          if (searchTerm) {
            url += `&title.contains=${encodeURIComponent(searchTerm)}`;
          }

          if (eventFlyerOnly) {
            url += `&eventFlyer.equals=true`;
          }

          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to fetch media files");

          const data = await res.json();
          setMediaList(Array.isArray(data) ? data : [data]);

          // Get total count from header
          const totalCountHeader = res.headers.get('x-total-count');
          if (totalCountHeader) {
            setTotalCount(parseInt(totalCountHeader, 10));
          } else {
            setTotalCount(data.length);
          }
        } catch (e: any) {
          setError(e.message || "Failed to load media files");
        } finally {
          setLoading(false);
        }
      }
      fetchMedia();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [page, pageSize, searchTerm, eventFlyerOnly]);

  function handleCellMouseEnter(media: EventMediaDTO, e: React.MouseEvent<HTMLDivElement>, type: 'uploadedMedia', serialNumber: number) {
    // Don't show tooltip if it was recently closed
    if (isTooltipClosed) return;

    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setIsCellHovered(true);
    setTooltipAnchorRect(e.currentTarget.getBoundingClientRect());
    setActiveTooltip({ media, type, serialNumber });
  }

  function handleCellMouseLeave() {
    setIsCellHovered(false);
    // Don't auto-close tooltip - only close on button click
  }

  function handleTooltipMouseEnter() {
    setIsTooltipHovered(true);
  }

  function handleTooltipMouseLeave() {
    setIsTooltipHovered(false);
    // Don't auto-close tooltip - only close on button click
  }

  function handleCloseTooltip() {
    setActiveTooltip(null);
    setTooltipAnchorRect(null);
    setIsTooltipHovered(false);
    setIsCellHovered(false);
    setIsTooltipClosed(true);

    // Scroll to the top of the page to move away from the tooltip area
    if (pageTopRef.current) {
      pageTopRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    } else {
      // Fallback: scroll to top of window
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    // Reset the closed state after a delay to allow tooltips again
    setTimeout(() => {
      setIsTooltipClosed(false);
    }, 1500); // 1.5 second delay before allowing tooltips again
  }

  const handleScrollToSerialNumber = () => {
    const serialNumber = parseInt(serialNumberInput, 10);
    if (isNaN(serialNumber) || serialNumber < 1) {
      alert('Please enter a valid serial number (1 or greater)');
      return;
    }

    // Calculate which page the serial number is on
    const targetPage = Math.floor((serialNumber - 1) / pageSize);

    if (targetPage !== page) {
      // If the serial number is on a different page, navigate to that page first
      setPage(targetPage);
      // Wait for the page to load, then scroll to the specific item
      setTimeout(() => {
        scrollToSerialNumberOnPage(serialNumber);
      }, 500);
    } else {
      // If on the same page, scroll directly to the item
      scrollToSerialNumberOnPage(serialNumber);
    }
  }

  const scrollToSerialNumberOnPage = (serialNumber: number) => {
    // Find the element with the specific serial number
    const targetElement = document.querySelector(`[data-serial-number="${serialNumber}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      // Highlight the element briefly
      targetElement.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        targetElement.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
      }, 3000);
    } else {
      alert(`Serial number #${serialNumber} not found on the current page. Please check the number and try again.`);
    }
  }

  const handleEditClick = (media: EventMediaDTO) => {
    setEditMedia(media);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditMedia(null);
  };

  const handleSave = async (updated: Partial<EventMediaDTO>) => {
    if (!editMedia || !editMedia.id) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/proxy/event-medias/${editMedia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update media');
      const result = await res.json();
      setMediaList(prev => prev.map(m => m.id === editMedia.id ? { ...m, ...result } : m));
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save media:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (media: EventMediaDTO) => {
    setDeletingMedia(media);
  };

  const confirmDelete = async () => {
    if (!deletingMedia) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proxy/event-medias/${deletingMedia.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete media');
        setMediaList(prev => prev.filter(m => m.id !== deletingMedia.id));
        setDeletingMedia(null);
      } catch (error: any) {
        alert(`Failed to delete media: ${error.message}`);
        setDeletingMedia(null);
      }
    });
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalCount);

  const sortedMedia = mediaList.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <div ref={pageTopRef} className="w-[80%] mx-auto py-8" style={{ paddingTop: '118px' }}>
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-items-center mx-auto max-w-6xl">
            <Link href="/admin" className="w-full max-w-xs flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-sm hover:shadow-md p-2 sm:p-3 text-xs sm:text-sm transition-all duration-200">
              <FaHome className="text-base sm:text-lg mb-1.5 text-blue-600" />
              <span className="font-semibold text-center leading-tight">Admin Home</span>
            </Link>
            <Link href="/admin/manage-usage" className="w-full max-w-xs flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg shadow-sm hover:shadow-md p-2 sm:p-3 text-xs sm:text-sm transition-all duration-200">
              <FaUsers className="text-base sm:text-lg mb-1.5 text-indigo-600" />
              <span className="font-semibold text-center leading-tight">Manage Users [Usage]</span>
            </Link>
            <Link href="/admin/manage-events" className="w-full max-w-xs flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-sm hover:shadow-md p-2 sm:p-3 text-xs sm:text-sm transition-all duration-200">
              <FaCalendarAlt className="text-base sm:text-lg mb-1.5 text-green-600" />
              <span className="font-semibold text-center leading-tight">Manage Events</span>
            </Link>
            <Link href="/admin/media" className="w-full max-w-xs flex flex-col items-center justify-center bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg shadow-sm hover:shadow-md p-2 sm:p-3 text-xs sm:text-sm transition-all duration-200">
              <FaPhotoVideo className="text-base sm:text-lg mb-1.5 text-cyan-600" />
              <span className="font-semibold text-center leading-tight">Manage Media</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex-1 min-w-0">Manage Media Files</h1>
        <div className="flex space-x-2">
          <Link
            href="/admin/media"
            className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-3 sm:px-6"
            title="Upload New Media"
            aria-label="Upload New Media"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <FaUpload className="w-10 h-10 text-blue-600 p-2" />
            </div>
            <span className="font-semibold text-blue-700 hidden sm:inline">Upload New Media</span>
          </Link>
        </div>
      </div>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Media</h2>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search by title */}
          <div className="flex-grow">
            <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
              Search by Title
            </label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Enter media title to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm ? (
                <SearchFieldClearButton label="Clear media search" onClear={() => setSearchTerm('')} />
              ) : null}
            </div>
          </div>

          {/* Scroll to serial number */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <label htmlFor="serial-input" className="block text-sm font-medium text-gray-700 mb-1">
                Go to Serial #
              </label>
              <input
                id="serial-input"
                type="number"
                placeholder="e.g., 5"
                value={serialNumberInput}
                onChange={(e) => setSerialNumberInput(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <button
              onClick={handleScrollToSerialNumber}
              className="mt-6 sm:mt-0 flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110 mx-auto"
              title="Go to Image"
              aria-label="Go to Image"
              type="button"
            >
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Event flyers filter */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={eventFlyerOnly}
                  onChange={(e) => setEventFlyerOnly(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="custom-checkbox-tick">
                  {eventFlyerOnly && (
                    <svg className="text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="text-sm font-medium text-gray-700 select-none">Event Flyers Only</span>
            </label>
          </div>
        </div>
      </div>

      <div className={`mb-4 text-sm border rounded-lg px-4 py-3 ${isTooltipClosed ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{isTooltipClosed ? '⏳' : '💡'} Tip:</span>
          <span>
            {isTooltipClosed
              ? 'Tooltips temporarily disabled. Please wait a moment before hovering over images again.'
              : 'Mouse over an image to see full details. Click the × button to close the tooltip dialog.'
            }
          </span>
        </div>
      </div>

      {loading && <div className="text-center p-8">Loading media...</div>}
      {!loading && sortedMedia.length === 0 && <div className="text-center p-8">No media found.</div>}
      {!loading && sortedMedia.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700 border border-gray-600/30 shadow-2xl mb-8">
          {/* Medium Dark Radial Gradient Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 55%)' }} />

          {/* Grid Content */}
          <div className="relative px-6 py-10 sm:px-10 lg:px-14">
            <div ref={mediaGridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedMedia.map((item, index) => {
            const serialNumber = page * pageSize + index + 1;
            return (
              <div
                key={item.id}
                data-serial-number={serialNumber}
                className="bg-white rounded-lg shadow-md overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="relative h-48 bg-gray-200 cursor-pointer"
                    onMouseEnter={(e) => handleCellMouseEnter(item, e as any, 'uploadedMedia', serialNumber)}
                    onMouseLeave={handleCellMouseLeave}
                  >
                    {/* Serial number overlay */}
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold z-10 shadow-lg">
                      #{serialNumber}
                    </div>
                    {item.fileUrl && (
                      <img
                        src={item.fileUrl.startsWith('http') ? item.fileUrl : `https://placehold.co/600x400?text=${item.title}`}
                        alt={item.altText || item.title || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://placehold.co/600x400?text=No+Image`;
                        }}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg truncate" title={item.title || ''}>{item.title}</h3>
                    <p className="text-gray-600 text-sm h-10 overflow-hidden" title={item.description || ''}>{item.description}</p>
                  </div>
                </div>
                {/* Action Buttons - Medium Action Icons Pattern (Media Gallery Grid) */}
                <div className="p-4 pt-0 flex justify-end gap-2">
                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditClick(item)}
                    className="flex-shrink-0 w-14 h-14 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                    title="Edit Media"
                    aria-label="Edit Media"
                    type="button"
                  >
                    <svg className="text-blue-600 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                    title="Delete Media"
                    aria-label="Delete Media"
                    type="button"
                  >
                    <svg className="text-red-600 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls - Always visible, matching admin page style */}
      <div className="mt-8">
        <div className="flex justify-between items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={handlePrevPage}
            disabled={page === 0 || loading}
            className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Previous Page"
            aria-label="Previous Page"
            type="button"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Info */}
          <div className="px-2 sm:px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold text-blue-700">
              Page <span className="text-blue-600">{page + 1}</span> of <span className="text-blue-600">{totalPages}</span>
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 sm:px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
            title="Next Page"
            aria-label="Next Page"
            type="button"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Item Count Text */}
        <div className="text-center mt-3">
          {totalCount > 0 ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700">
                Showing <span className="font-bold text-blue-600">{startItem}</span> to <span className="font-bold text-blue-600">{endItem}</span> of <span className="font-bold text-blue-600">{totalCount}</span> results
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No media found</span>
              <span className="text-sm text-orange-600">[No media match your criteria]</span>
            </div>
          )}
        </div>
      </div>

      {deletingMedia && (
        <Modal open={!!deletingMedia} onClose={() => setDeletingMedia(null)} title="Confirm Deletion">
          <div className="text-center">
            <p className="text-lg">
              Are you sure you want to delete this media item: <strong>{deletingMedia.title}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setDeletingMedia(null)}
                className="flex-shrink-0 h-14 rounded-xl bg-teal-100 hover:bg-teal-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-teal-100 disabled:border-teal-300 disabled:text-teal-500 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={isPending}
                title="Cancel"
                aria-label="Cancel"
                type="button"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
                  <svg className="text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="font-semibold text-teal-700">Cancel</span>
              </button>
              <button
                onClick={confirmDelete}
                className="flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-red-100 disabled:border-red-300 disabled:text-red-500 disabled:cursor-not-allowed"
                disabled={isPending}
                title="Confirm Delete"
                aria-label="Confirm Delete"
                type="button"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                  <svg className="text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <span className="font-semibold text-red-700">{isPending ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isEditModalOpen && editMedia && (
        <EditMediaModal
          media={editMedia}
          onClose={handleCloseModal}
          onSave={handleSave}
          loading={editLoading}
        />
      )}
      <MediaDetailsTooltip
        media={activeTooltip?.media || null}
        anchorRect={tooltipAnchorRect}
        onClose={handleCloseTooltip}
        onTooltipMouseEnter={handleTooltipMouseEnter}
        onTooltipMouseLeave={handleTooltipMouseLeave}
        tooltipType={activeTooltip?.type || null}
        serialNumber={activeTooltip?.serialNumber}
      />
    </div>
  );
}