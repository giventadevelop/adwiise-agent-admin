import { notFound } from 'next/navigation';
import type { EventDetailsDTO } from '@/types';
import {
  fetchEventDetailsServer,
  fetchEventTypesServer,
  updateEventServer,
} from '@/app/admin/ApiServerActions';
import { fetchTenantEmailAddressesServer } from '@/app/admin/tenant-email-addresses/ApiServerActions';
import { fetchAgendaFlyerServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import {
  fetchAllFocusGroupsServer,
  fetchLinkedEventFocusGroupsServer,
} from '@/app/admin/events/[id]/focus-groups/ApiServerActions';
import EventEditClient from './EventEditClient';

/**
 * Page-bound update so the action worker is this edit route (avoids Next 16
 * action-forward HeadersTimeout / POST 404 ~5.2min).
 */
async function updateEventAction(event: EventDetailsDTO): Promise<EventDetailsDTO> {
  'use server';
  return updateEventServer(event);
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = typeof (params as any)?.then === 'function' ? await params : params;
  const eventId = Number((resolved as { id: string }).id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    notFound();
  }

  const [event, eventTypesRaw, emailAddresses, flyer, allFocusGroups, linkedFocusGroups] =
    await Promise.all([
      fetchEventDetailsServer(eventId).catch((err) => {
        console.error('[EditEventPage] fetchEventDetailsServer failed:', err);
        return null;
      }),
      fetchEventTypesServer().catch((err) => {
        console.error('[EditEventPage] fetchEventTypesServer failed:', err);
        return [];
      }),
      fetchTenantEmailAddressesServer(0, 1000).catch((err) => {
        console.error('[EditEventPage] fetchTenantEmailAddressesServer failed:', err);
        return [];
      }),
      fetchAgendaFlyerServer(eventId).catch((err) => {
        console.error('[EditEventPage] fetchAgendaFlyerServer failed:', err);
        return null;
      }),
      fetchAllFocusGroupsServer().catch((err) => {
        console.error('[EditEventPage] fetchAllFocusGroupsServer failed:', err);
        return [];
      }),
      fetchLinkedEventFocusGroupsServer(eventId).catch((err) => {
        console.error('[EditEventPage] fetchLinkedEventFocusGroupsServer failed:', err);
        return [];
      }),
    ]);

  if (!event) {
    notFound();
  }

  const eventTypes = Array.isArray(eventTypesRaw) ? eventTypesRaw : [];
  const emails = Array.isArray(emailAddresses) ? emailAddresses : [];
  const groups = Array.isArray(allFocusGroups) ? allFocusGroups : [];
  const linked = Array.isArray(linkedFocusGroups) ? linkedFocusGroups : [];

  return (
    <EventEditClient
      eventId={eventId}
      initialEvent={event}
      initialEventTypes={eventTypes}
      initialEmailAddresses={emails}
      initialFlyer={flyer}
      initialFocusGroups={groups}
      initialLinkedFocusGroups={linked}
      updateEventAction={updateEventAction}
    />
  );
}
