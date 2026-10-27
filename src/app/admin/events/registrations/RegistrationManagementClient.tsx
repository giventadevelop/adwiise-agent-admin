'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RegistrationManagementData } from './ApiServerActions';
import { searchEvents } from './ApiServerActions';
import type { EventDetailsDTO } from '@/types';
import {
  FaSearch,
  FaFilter,
  FaDownload,
  FaEdit,
  FaTrash,
  FaTrashAlt,
  FaEye,
  FaUserFriends,
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaTimes,
  FaUser,
  FaUsers,
  FaExclamationTriangle,
  FaStickyNote,
  FaInfoCircle,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';
import Link from 'next/link';
import AdminNavigation from '@/components/AdminNavigation';
import AdminBackButton from '@/components/admin/AdminBackButton';

interface RegistrationManagementClientProps {
  data: RegistrationManagementData;
}

export default function RegistrationManagementClient({ data }: RegistrationManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [viewingAttendee, setViewingAttendee] = useState<any>(null);
  const [editingAttendee, setEditingAttendee] = useState<any>(null);
  const [deletingAttendee, setDeletingAttendee] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const {
    attendees,
    totalCount,
    currentPage,
    totalPages,
    events,
    selectedEvent,
    searchTerm,
    searchType: dataSearchType,
    statusFilter
  } = data;

  // Event search state
  const [eventSearchType, setEventSearchType] = useState<'id' | 'name' | 'dateRange'>('id');
  const [eventSearchId, setEventSearchId] = useState('');
  const [eventSearchName, setEventSearchName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<EventDetailsDTO[]>([]);
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);

  const [searchType, setSearchType] = useState<'name' | 'email' | 'eventId'>(dataSearchType as 'name' | 'email' | 'eventId' || 'name');
  const [searchValue, setSearchValue] = useState(searchTerm);

  // Only show registrants if an event is selected
  const hasSelectedEvent = !!selectedEvent;

  // Event search handler
  const handleEventSearch = async () => {
    setIsSearchingEvents(true);
    try {
      const results = await searchEvents(
        eventSearchType === 'name' ? eventSearchName : undefined,
        eventSearchType === 'id' ? eventSearchId : undefined,
        eventSearchType === 'dateRange' ? eventStartDate : undefined,
        eventSearchType === 'dateRange' ? eventEndDate : undefined
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching events:', error);
      setSearchResults([]);
    } finally {
      setIsSearchingEvents(false);
    }
  };

  const handleSelectEventFromSearch = (eventId: number) => {
    const params = new URLSearchParams(searchParams || undefined);
    params.set('eventId', eventId.toString());
    params.delete('page'); // Reset to first page
    params.delete('search'); // Clear search when changing event
    params.delete('searchType'); // Clear search type when changing event
    params.delete('status'); // Clear status filter when changing event
    startTransition(() => {
      router.push(`/admin/events/registrations?${params.toString()}`);
    });
  };

  const handleSearch = (search: string, type: 'name' | 'email' | 'eventId' = searchType) => {
    if (!hasSelectedEvent) return; // Don't search if no event selected
    const params = new URLSearchParams(searchParams || undefined);
    if (search) {
      params.set('search', search);
      params.set('searchType', type);
    } else {
      params.delete('search');
      params.delete('searchType');
    }
    params.delete('page'); // Reset to first page
    startTransition(() => {
    router.push(`/admin/events/registrations?${params.toString()}`);
    });
  };

  const handleSearchTypeChange = (type: 'name' | 'email' | 'eventId') => {
    setSearchType(type);
    if (searchValue && hasSelectedEvent) {
      handleSearch(searchValue, type);
    }
  };

  const handleEventFilter = (eventId: string) => {
    if (!eventId || eventId === '') {
      // Clear event selection
      const params = new URLSearchParams(searchParams || undefined);
      params.delete('eventId');
      params.delete('page');
      params.delete('search');
      params.delete('searchType');
      params.delete('status');
      startTransition(() => {
        router.push(`/admin/events/registrations?${params.toString()}`);
      });
      return;
    }

    // Set event ID and clear other filters
    const params = new URLSearchParams();
    params.set('eventId', eventId);
    params.delete('page'); // Reset to first page
    params.delete('search'); // Clear search when changing event
    params.delete('searchType'); // Clear search type when changing event
    params.delete('status'); // Clear status filter when changing event

    // Use startTransition for better UX
    startTransition(() => {
    router.push(`/admin/events/registrations?${params.toString()}`);
    });
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams || undefined);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.delete('page'); // Reset to first page
    startTransition(() => {
    router.push(`/admin/events/registrations?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams || undefined);
    params.set('page', page.toString());
    startTransition(() => {
    router.push(`/admin/events/registrations?${params.toString()}`);
    });
  };

  const handleExportCSV = async () => {
    try {
      const eventId = searchParams?.get('eventId') || null;
      const search = searchParams?.get('search') || '';
      const searchType = searchParams?.get('searchType') || 'name';
      const status = searchParams?.get('status') || '';

      const { exportRegistrationsToCSV } = await import('./ApiServerActions');
      const csvContent = await exportRegistrationsToCSV(
        eventId ? parseInt(eventId) : null,
        search,
        searchType,
        status
      );

      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleSelectAll = () => {
    if (selectedAttendees.length === attendees.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees(attendees.map(a => a.id).filter(id => id !== null) as number[]);
    }
  };

  const handleSelectAttendee = (attendeeId: number) => {
    setSelectedAttendees((prev: number[]) =>
      prev.includes(attendeeId)
        ? prev.filter(id => id !== attendeeId)
        : [...prev, attendeeId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'WAITLISTED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewAttendee = (attendee: any) => {
    setViewingAttendee(attendee);
  };

  const handleEditAttendee = (attendee: any) => {
    setEditingAttendee(attendee);
    setEditForm({
      firstName: attendee.firstName || '',
      lastName: attendee.lastName || '',
      email: attendee.email || '',
      phone: attendee.phone || '',
      registrationStatus: attendee.registrationStatus || 'REGISTERED',
      specialRequirements: attendee.specialRequirements || '',
      dietaryRestrictions: attendee.dietaryRestrictions || '',
      accessibilityNeeds: attendee.accessibilityNeeds || '',
      emergencyContactName: attendee.emergencyContactName || '',
      emergencyContactPhone: attendee.emergencyContactPhone || '',
      emergencyContactRelationship: attendee.emergencyContactRelationship || '',
      totalNumberOfGuests: attendee.totalNumberOfGuests || 0,
      numberOfGuestsCheckedIn: attendee.numberOfGuestsCheckedIn || 0,
      notes: attendee.notes || ''
    });
  };

  const handleDeleteAttendee = (attendee: any) => {
    setDeletingAttendee(attendee);
  };

  const confirmDeleteAttendee = async () => {
    if (!deletingAttendee) return;

    setIsDeleting(true);
    try {
      const { deleteAttendeeRegistration } = await import('./ApiServerActions');
      const success = await deleteAttendeeRegistration(deletingAttendee.id);

      if (success) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert('Failed to delete attendee registration. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting attendee:', error);
      alert('An error occurred while deleting the attendee registration.');
    } finally {
      setIsDeleting(false);
      setDeletingAttendee(null);
    }
  };

  const closeViewModal = () => {
    setViewingAttendee(null);
  };

  const closeDeleteModal = () => {
    setDeletingAttendee(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAttendee = async () => {
    if (!editingAttendee) return;

    setIsSaving(true);
    try {
      const { updateAttendeeRegistration } = await import('./ApiServerActions');
      const success = await updateAttendeeRegistration(editingAttendee.id, editForm);

      if (success) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert('Failed to update attendee registration. Please try again.');
      }
    } catch (error) {
      console.error('Error updating attendee:', error);
      alert('An error occurred while updating the attendee registration.');
    } finally {
      setIsSaving(false);
      setEditingAttendee(null);
      setEditForm({});
    }
  };

  const closeEditModal = () => {
    setEditingAttendee(null);
    setEditForm({});
  };

  // Calculate pagination display values
  const pageSize = 20;
  const startItem = hasSelectedEvent && totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = hasSelectedEvent && totalCount > 0 ? Math.min(currentPage * pageSize, totalCount) : 0;

  // Calculate registration statistics
  const totalPeopleRegistered = totalCount; // Total number of primary registrants (all pages matching filter)
  const totalGuests = attendees.reduce((sum, attendee) => sum + (attendee.totalNumberOfGuests || 0), 0);
  // Estimate total guests based on average from current page
  const avgGuestsPerRegistrant = attendees.length > 0 && totalCount > 0
    ? totalGuests / attendees.length
    : 0;
  const estimatedTotalGuests = Math.round(totalCount * avgGuestsPerRegistrant);
  const totalAttendees = totalPeopleRegistered + estimatedTotalGuests; // Total people (registrants + estimated guests)

  // Status counts - estimate based on current page distribution
  const registeredRatio = attendees.length > 0
    ? attendees.filter(a => a.registrationStatus === 'REGISTERED').length / attendees.length
    : 0;
  const pendingRatio = attendees.length > 0
    ? attendees.filter(a => a.registrationStatus === 'PENDING').length / attendees.length
    : 0;
  const cancelledRatio = attendees.length > 0
    ? attendees.filter(a => a.registrationStatus === 'CANCELLED').length / attendees.length
    : 0;

  const registeredCount = Math.round(totalCount * registeredRatio);
  const pendingCount = Math.round(totalCount * pendingRatio);
  const cancelledCount = Math.round(totalCount * cancelledRatio);

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      {/* Navigation Section - Full Width, Separate Responsive Container */}
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation currentPage="event-registrations" />
      </div>
      {/* Main Content Section - Constrained Width */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header with back button - Moved to top, single line on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <AdminBackButton href="/admin" label="Back to Admin" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white truncate">Registration Management</h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate hidden sm:block">
              {selectedEvent ? (
                <>
                  Manage registrations for{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedEvent.title}</span>
                </>
              ) : (
                'Search by event to view registrations'
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="w-full mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
            <Link
              href="/admin/manage-events"
              className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-4 text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base transition-all group overflow-hidden"
              title="Manage Events"
              aria-label="Manage Events"
            >
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl bg-green-100 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-center leading-tight px-1 break-words hyphens-auto">Manage Events</span>
            </Link>
            <Link
              href="/admin/manage-usage"
              className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-4 text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base transition-all group overflow-hidden"
              title="Manage Usage"
              aria-label="Manage Usage"
            >
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl bg-blue-100 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="font-semibold text-center leading-tight px-1 break-words hyphens-auto">Manage Usage<br />[Users]</span>
            </Link>
            <Link
              href="/admin/event-analytics"
              className="flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg shadow-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-4 text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base transition-all group overflow-hidden"
              title="Event Analytics Dashboard"
              aria-label="Event Analytics Dashboard"
            >
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl bg-teal-100 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-semibold text-center leading-tight px-1 break-words hyphens-auto">Event Analytics<br />Dashboard</span>
            </Link>
            <Link
              href="/admin/communication"
              className="flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg shadow-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-4 text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base transition-all group overflow-hidden"
              title="Communication Center"
              aria-label="Communication Center"
            >
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl bg-indigo-100 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-center leading-tight px-1 break-words hyphens-auto">Communication<br />Center</span>
            </Link>
        </div>
      </div>

      {/* Event Search Section - Show when no event selected */}
      {!hasSelectedEvent && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="text-lg font-semibold text-blue-800 mb-4">Search for an Event</div>
            <p className="text-gray-600 mb-6">
              Please search for an event by Event ID, Event Name, or Date Range to view its registrations.
            </p>

          {/* Event Search Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <select
              value={eventSearchType}
              onChange={(e) => setEventSearchType(e.target.value as 'id' | 'name' | 'dateRange')}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="id">Event ID</option>
              <option value="name">Event Name</option>
              <option value="dateRange">Date Range</option>
            </select>
          </div>

          {/* Event Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {eventSearchType === 'id' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event ID
                </label>
                <input
                  type="number"
                  value={eventSearchId}
                  onChange={(e) => setEventSearchId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eventSearchId && eventSearchId.trim() !== '') {
                      handleEventSearch();
                    }
                  }}
                  placeholder="Enter Event ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {eventSearchType === 'name' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  value={eventSearchName}
                  onChange={(e) => setEventSearchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eventSearchName && eventSearchName.trim() !== '') {
                      handleEventSearch();
                    }
                  }}
                  placeholder="Enter Event Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {eventSearchType === 'dateRange' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleEventSearch}
            disabled={
              isSearchingEvents ||
              (eventSearchType === 'id' && (!eventSearchId || eventSearchId.trim() === '')) ||
              (eventSearchType === 'name' && (!eventSearchName || eventSearchName.trim() === '')) ||
              (eventSearchType === 'dateRange' && (!eventStartDate || !eventEndDate))
            }
            className="flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Search Events"
            aria-label="Search Events"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <FaSearch className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-semibold text-blue-700">{isSearchingEvents ? 'Searching...' : 'Search Events'}</span>
          </button>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Search Results ({searchResults.length} events found)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    onClick={() => handleSelectEventFromSearch(event.id!)}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        Event ID: {event.id} | {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEventFromSearch(event.id!);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Registrations
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Event Selection from Dropdown (limited to 50) */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or select from recent events (max 50)
            </label>
            <select
              value={data.selectedEvent && data.selectedEvent.id ? data.selectedEvent.id.toString() : ''}
              onChange={(e) => handleEventFilter(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an event...</option>
              {events.slice(0, 50).map(event => (
                <option key={event.id} value={event.id?.toString() || ''}>
                  {event.title} (ID: {event.id})
                </option>
              ))}
            </select>
          </div>
        </div>
        </div>
      )}

      {/* Filters and Actions - Only show when event is selected */}
      {hasSelectedEvent && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 min-w-fit">
          {/* Search Type Dropdown */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={searchType}
              onChange={(e) => handleSearchTypeChange(e.target.value as 'name' | 'email' | 'eventId')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="name">Search by Name</option>
              <option value="email">Search by Email</option>
              <option value="eventId">Search by Event ID</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={searchType === 'eventId' ? 'number' : 'text'}
              placeholder={
                searchType === 'name'
                  ? 'Enter name to search...'
                  : searchType === 'email'
                    ? 'Enter email to search...'
                    : 'Enter Event ID...'
              }
              value={searchValue}
              onChange={(e) => {
                const value = e.target.value;
                setSearchValue(value);
                const timeoutId = setTimeout(() => handleSearch(value), 500);
                return () => clearTimeout(timeoutId);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

            {/* Event Filter - Change Event */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={selectedEvent?.id || ''}
              onChange={(e) => handleEventFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
                <option value="">Change Event...</option>
                {events.slice(0, 50).map(event => (
                <option key={event.id} value={event.id}>
                    {event.title} (ID: {event.id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="WAITLISTED">Waitlisted</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-green-100 hover:bg-green-200 transition-all duration-300 hover:scale-105 touch-manipulation"
            title="Export CSV"
            aria-label="Export CSV"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
              <FaDownload className="w-6 h-6 text-green-600" />
            </div>
            <span className="font-semibold text-green-700 text-sm sm:text-base">Export CSV</span>
          </button>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
          <span>
            Showing {attendees.length} of {totalCount} registrations
          </span>
          {selectedAttendees.length > 0 && (
            <span className="text-blue-600 font-semibold">
              {selectedAttendees.length} selected
            </span>
          )}
        </div>
          </div>
        </div>
      )}

      {/* Event Analytics - Only show when event is selected */}
      {hasSelectedEvent && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">Event Registration Analytics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-2 lg:gap-4 w-full">
            {/* Total People Registered */}
            <div className="bg-blue-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaUsers className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-blue-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">People Registered</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{totalPeopleRegistered.toLocaleString()}</p>
            </div>

            {/* Total Guests */}
            <div className="bg-green-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaUserFriends className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">Total Guests</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{totalGuests.toLocaleString()}</p>
            </div>

            {/* Total Attendees */}
            <div className="bg-purple-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaUsers className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-purple-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">Total Attendees</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{totalAttendees.toLocaleString()}</p>
            </div>

            {/* Registered Status */}
            <div className="bg-emerald-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaCheckCircle className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-emerald-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">Registered</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{registeredCount.toLocaleString()}</p>
            </div>

            {/* Pending Status */}
            <div className="bg-yellow-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaClock className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-yellow-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">Pending</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{pendingCount.toLocaleString()}</p>
            </div>

            {/* Cancelled Status */}
            <div className="bg-red-50 rounded-md sm:rounded-lg p-1 sm:p-2 lg:p-4 min-w-0 flex flex-col">
              <div className="flex items-center mb-0.5 sm:mb-1 lg:mb-2">
                <FaTimes className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-red-600 flex-shrink-0" />
              </div>
              <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 leading-tight truncate">Cancelled</p>
              <p className="text-xs sm:text-base lg:text-2xl font-bold text-gray-900 truncate">{cancelledCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        </div>
      )}

        {/* Registrations Table - Only show when event is selected */}
        {hasSelectedEvent && (
          <>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="user-table-scroll-container">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600" style={{ minWidth: '800px', width: '100%' }}>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left border border-gray-300 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedAttendees.length === attendees.length && attendees.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:text-blue-400 touch-manipulation"
                        />
                      </th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300 dark:border-gray-600">
                        Attendee
                      </th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300 dark:border-gray-600">
                        Contact
                      </th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300 dark:border-gray-600">
                        Status
                      </th>
                      <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-300 dark:border-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {attendees.length > 0 ? (
                      attendees.map((attendee, index) => (
                        <tr key={attendee.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'}`}>
                          <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border border-gray-300 dark:border-gray-600">
                            <input
                              type="checkbox"
                              checked={selectedAttendees.includes(attendee.id!)}
                              onChange={() => handleSelectAttendee(attendee.id!)}
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:text-blue-400 touch-manipulation"
                            />
                          </td>
                          <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border border-gray-300 dark:border-gray-600">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <FaUserFriends className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
                                </div>
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {attendee.firstName} {attendee.lastName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {attendee.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border border-gray-300 dark:border-gray-600">
                            <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center">
                              <FaEnvelope className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                              <span className="break-all">{attendee.email}</span>
                            </div>
                            {attendee.phone && (
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <FaPhone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                                <span>{attendee.phone}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap border border-gray-300 dark:border-gray-600">
                            <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendee.registrationStatus || '')}`}>
                              {attendee.registrationStatus || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600">
                            <div className="flex space-x-1 sm:space-x-2">
                              <button
                                onClick={() => handleViewAttendee(attendee)}
                                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 flex items-center justify-center transition-all duration-300 hover:scale-110"
                                title="View Details"
                                aria-label="View Details"
                                type="button"
                              >
                                <FaEye className="w-6 h-6 sm:w-10 sm:h-10 text-green-600 dark:text-green-300" />
                              </button>
                              <button
                                onClick={() => handleEditAttendee(attendee)}
                                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 flex items-center justify-center transition-all duration-300 hover:scale-110"
                                title="Edit"
                                aria-label="Edit"
                                type="button"
                              >
                                <FaEdit className="w-6 h-6 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-300" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendee(attendee)}
                                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 flex items-center justify-center transition-all duration-300 hover:scale-110"
                                title="Delete Registration"
                                aria-label="Delete"
                                type="button"
                              >
                                <FaTrashAlt className="w-6 h-6 sm:w-10 sm:h-10 text-red-600 dark:text-red-300" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center border border-gray-300 dark:border-gray-600">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-lg shadow-sm">
                            <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">No registrations found</span>
                            <span className="text-sm text-orange-600 dark:text-orange-400 hidden sm:inline">[No registrations match your criteria]</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls - Always visible, matching admin page style */}
            <div className="mt-6 sm:mt-8">
              <div className="flex justify-between items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
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
                    Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of <span className="text-blue-600 dark:text-blue-400">{totalPages}</span>
                  </span>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
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
                      Showing <span className="font-bold text-blue-600 dark:text-blue-400">{startItem}</span> to <span className="font-bold text-blue-600 dark:text-blue-400">{endItem}</span> of <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount}</span> registrations
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2 sm:px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-lg shadow-sm">
                    <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">No registrations found</span>
                    <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 hidden sm:inline">[No registrations match your criteria]</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
          <AdminBackButton href="/admin/manage-events" label="Back to Manage Events" />
          <Link
            href="/admin/event-analytics"
            className="flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-900 dark:hover:bg-teal-800 transition-all duration-300 hover:scale-105"
            title="Event Analytics"
            aria-label="Event Analytics"
          >
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-semibold text-teal-700 dark:text-teal-300 text-xs sm:text-sm lg:text-base whitespace-nowrap">Event Analytics</span>
          </Link>
        </div>
      </div>

      {/* View Attendee Modal */}
      {viewingAttendee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendee Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <FaUser className="mr-2" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">First Name</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Name</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Event Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  Event Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Event ID</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.eventId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Registration Date</label>
                    <p className="text-sm text-gray-900">
                      {viewingAttendee.registrationDate
                        ? new Date(viewingAttendee.registrationDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingAttendee.registrationStatus || '')}`}>
                      {viewingAttendee.registrationStatus || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Total Guests</label>
                    <p className="text-sm text-gray-900">{viewingAttendee.totalNumberOfGuests || 0}</p>
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              {(viewingAttendee.specialRequirements || viewingAttendee.dietaryRestrictions || viewingAttendee.accessibilityNeeds) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    Special Requirements
                  </h4>
                  <div className="space-y-3">
                    {viewingAttendee.specialRequirements && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Special Requirements</label>
                        <p className="text-sm text-gray-900">{viewingAttendee.specialRequirements}</p>
                      </div>
                    )}
                    {viewingAttendee.dietaryRestrictions && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Dietary Restrictions</label>
                        <p className="text-sm text-gray-900">{viewingAttendee.dietaryRestrictions}</p>
                      </div>
                    )}
                    {viewingAttendee.accessibilityNeeds && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Accessibility Needs</label>
                        <p className="text-sm text-gray-900">{viewingAttendee.accessibilityNeeds}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(viewingAttendee.emergencyContactName || viewingAttendee.emergencyContactPhone) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="text-sm text-gray-900">{viewingAttendee.emergencyContactName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact Phone</label>
                      <p className="text-sm text-gray-900">{viewingAttendee.emergencyContactPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Relationship</label>
                      <p className="text-sm text-gray-900">{viewingAttendee.emergencyContactRelationship || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendee Modal */}
      {editingAttendee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Attendee Registration
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaUser className="mr-2 text-blue-600" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => handleFormChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => handleFormChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Registration Status */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2 text-green-600" />
                  Registration Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.registrationStatus || 'REGISTERED'}
                      onChange={(e) => handleFormChange('registrationStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="REGISTERED">Registered</option>
                      <option value="PENDING">Pending</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="WAITLISTED">Waitlisted</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guest Management */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaUsers className="mr-2 text-purple-600" />
                  Guest Management
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Number of Guests</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.totalNumberOfGuests || 0}
                      onChange={(e) => handleFormChange('totalNumberOfGuests', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guests Checked In</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.numberOfGuestsCheckedIn || 0}
                      onChange={(e) => handleFormChange('numberOfGuestsCheckedIn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaExclamationTriangle className="mr-2 text-orange-600" />
                  Special Requirements
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                    <textarea
                      value={editForm.specialRequirements || ''}
                      onChange={(e) => handleFormChange('specialRequirements', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any special requirements or requests..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                    <textarea
                      value={editForm.dietaryRestrictions || ''}
                      onChange={(e) => handleFormChange('dietaryRestrictions', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any dietary restrictions or allergies..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Needs</label>
                    <textarea
                      value={editForm.accessibilityNeeds || ''}
                      onChange={(e) => handleFormChange('accessibilityNeeds', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any accessibility needs or accommodations..."
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaStickyNote className="mr-2 text-yellow-600" />
                  Additional Notes
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional notes or comments about this attendee..."
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <FaPhone className="mr-2 text-red-600" />
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactName || ''}
                      onChange={(e) => handleFormChange('emergencyContactName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={editForm.emergencyContactPhone || ''}
                      onChange={(e) => handleFormChange('emergencyContactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactRelationship || ''}
                      onChange={(e) => handleFormChange('emergencyContactRelationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Spouse, Parent, Friend"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="px-4 py-2 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaTimes />
                Cancel
              </button>
              <button
                onClick={handleSaveAttendee}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaEdit />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAttendee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Registration
                  </h3>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the registration for{' '}
                  <span className="font-semibold text-gray-900">
                    {deletingAttendee.firstName} {deletingAttendee.lastName}
                  </span>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone and will permanently remove the registration data.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAttendee}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Registration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
