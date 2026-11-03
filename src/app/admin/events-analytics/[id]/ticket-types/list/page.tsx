import EventSectionTiles from '@/components/admin/EventSectionTiles';
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
  try {
    const eventDetails = await fetchEventDetailsForTicketListPage(parseInt(eventId));
    const ticketTypes = await fetchTicketTypesForTicketListPage(parseInt(eventId));

    return (
      <div className="max-w-6xl mx-auto px-4 pb-8" style={{ paddingTop: '180px' }}>
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
  } catch (error) {
    console.error('Error fetching data for ticket types list:', error);
    return (
      <div className="max-w-6xl mx-auto px-4 pb-8" style={{ paddingTop: '180px' }}>
        <EventSectionTiles eventId={eventId} current="ticket-types" showTickets showDiscounts  />

      <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading ticket types
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error loading the ticket types for this event. Please try refreshing the page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}