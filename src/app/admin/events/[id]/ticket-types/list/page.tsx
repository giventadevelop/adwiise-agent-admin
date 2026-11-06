import EventSectionTiles from '@/components/admin/EventSectionTiles';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TicketTypeListClient from './TicketTypeListClient';
import type { EventDetailsDTO, EventTicketTypeDTO } from '@/types';
import { fetchEventDetailsForTicketListPage, fetchTicketTypesForTicketListPage } from './ApiServerActions';
import { formatInTimeZone } from 'date-fns-tz';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function TicketTypeListPage({ params }: PageProps) {
  // Fix for Next.js 15+: await auth() before using
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Handle params for Next.js 15+ compatibility
  const resolvedParams = await Promise.resolve(params);
  const eventId = resolvedParams.id;

  // Fetch the required data
  let eventDetails: EventDetailsDTO | null = null;
  let ticketTypes: EventTicketTypeDTO[] = [];
  let errorMessage: string | null = null;

  try {
    eventDetails = await fetchEventDetailsForTicketListPage(parseInt(eventId));
    ticketTypes = await fetchTicketTypesForTicketListPage(parseInt(eventId));
  } catch (error: any) {
    console.error('Error fetching data for ticket types list:', error);
    // Check if error is a network/backend error
    const errorMsg = error?.message || String(error) || 'Unknown error';
    if (errorMsg.includes('Network error') || errorMsg.includes('Unable to reach') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('fetch failed')) {
      errorMessage = 'The backend server is not accessible. Please ensure the backend is running and try again.';
    } else {
      errorMessage = `Error loading data: ${errorMsg}`;
    }
  }

  // If there's an error, display error message
  if (errorMessage) {
    return (
      <div className="max-w-6xl mx-auto px-4 pb-8" style={{ paddingTop: '180px' }}>
        <EventSectionTiles eventId={eventId} current="ticket-types" showTickets showDiscounts  />

      {/* Error Message */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to Connect to Backend
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
                <p className="mt-2">Please check that the backend server is running and try again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal render with data
  return (
    <div className="max-w-6xl mx-auto px-4 pb-8" style={{ paddingTop: '180px' }}>
      <AdminTenantIdBanner
        tenantId={eventDetails?.tenantId}
        contextLine="Ticket types for this event — prices, inventory, and availability."
      />
      {/* Concise Event Summary */}
      {eventDetails && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700">
            <div><span className="font-semibold text-gray-600">Event ID:</span> {eventDetails.id}</div>
            <div className="sm:col-span-2"><span className="font-semibold text-gray-600">Title:</span> {eventDetails.title}</div>
            <div><span className="font-semibold text-gray-600">Start Date:</span> {formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'EEEE, MMMM d, yyyy')}</div>
            <div><span className="font-semibold text-gray-600">End Date:</span> {formatInTimeZone(eventDetails.endDate || eventDetails.startDate, eventDetails.timezone, 'EEEE, MMMM d, yyyy')}</div>
            <div><span className="font-semibold text-gray-600">Time:</span> {eventDetails.startTime} {eventDetails.endTime ? `- ${eventDetails.endTime}` : ''} ({formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'zzz')})</div>
          </div>
        </div>
      )}

      <EventSectionTiles eventId={eventId} current="ticket-types" showTickets showDiscounts  />

      <TicketTypeListClient
        eventId={eventId}
        eventDetails={eventDetails}
        ticketTypes={ticketTypes || []}
      />
    </div>
  );
}