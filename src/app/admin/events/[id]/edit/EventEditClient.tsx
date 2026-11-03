'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { EventForm } from '@/components/EventForm';
import AgendaFlyerPanel from '@/app/admin/events/[id]/agenda/AgendaFlyerPanel';
import EventEditFocusGroupsPanel from './EventEditFocusGroupsPanel';
import type {
  EventDetailsDTO,
  EventFocusGroupDTO,
  EventMediaDTO,
  EventTypeDetailsDTO,
  FocusGroupDTO,
  TenantEmailAddressDTO,
} from '@/types';
import EventSectionTiles from '@/components/admin/EventSectionTiles';
import SaveStatusDialog, { type SaveStatus } from '@/components/SaveStatusDialog';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';

function parseEventUpdateError(errorText: string): string {
  let errorMessage = 'Failed to update event';
  try {
    const errorJson = JSON.parse(errorText);
    if (errorJson.detail) {
      const detail = errorJson.detail;
      if (detail.includes('Unable to bind parameter')) {
        errorMessage = 'Invalid data format. Please check all fields and try again.';
      } else if (detail.includes('null') && detail.includes('Unknown Types value')) {
        errorMessage =
          'Some required fields are missing or invalid. Please review your event configuration and try again.';
      } else if (detail.includes('recurrence_weekly_days') && detail.includes('integer[]')) {
        errorMessage = 'Recurrence configuration error. Please check your recurrence settings and try again.';
      } else if (detail.includes('could not execute batch')) {
        errorMessage = 'Database error occurred while saving. Please check all fields and try again.';
      } else {
        errorMessage = detail.length > 150 ? detail.substring(0, 150) + '...' : detail;
      }
    } else if (errorJson.message) {
      errorMessage = errorJson.message;
    } else if (errorJson.title) {
      errorMessage = errorJson.title;
    }
  } catch {
    if (errorText.length > 200) {
      errorMessage = errorText.substring(0, 200) + '...';
    } else if (errorText) {
      errorMessage = errorText;
    }
  }
  return errorMessage;
}

export type EventEditClientProps = {
  eventId: number;
  initialEvent: EventDetailsDTO;
  initialEventTypes: EventTypeDetailsDTO[];
  initialEmailAddresses: TenantEmailAddressDTO[];
  initialFlyer: EventMediaDTO | null;
  initialFocusGroups: FocusGroupDTO[];
  initialLinkedFocusGroups: EventFocusGroupDTO[];
  updateEventAction: (event: EventDetailsDTO) => Promise<EventDetailsDTO>;
};

export default function EventEditClient({
  eventId,
  initialEvent,
  initialEventTypes,
  initialEmailAddresses,
  initialFlyer,
  initialFocusGroups,
  initialLinkedFocusGroups,
  updateEventAction,
}: EventEditClientProps) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetailsDTO>(initialEvent);
  const [eventTypes] = useState<EventTypeDetailsDTO[]>(initialEventTypes);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [, startTransition] = useTransition();

  async function handleSubmit(updatedEvent: EventDetailsDTO) {
    setLoading(true);
    setSaveStatus('saving');
    setSaveMessage('Please wait while we save your event details.');

    try {
      const saved = await updateEventAction({ ...updatedEvent, id: eventId });
      setEvent(saved);
      setSaveStatus('success');
      setSaveMessage('Your event has been saved successfully. Redirecting to manage events...');
      startTransition(() => {
        setTimeout(() => {
          router.push('/admin/manage-events');
        }, 1500);
      });
    } catch (e: any) {
      setSaveStatus('error');
      const userMessage =
        parseEventUpdateError(e?.message || '') || 'Failed to update event. Please try again.';
      setSaveMessage(userMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto" style={{ paddingTop: '118px' }}>
      <EventSectionTiles
        eventId={eventId}
        showTickets={event?.admissionType === 'ticketed'}
        showDiscounts={false}
        showCheckIn
        showManual={
          event.paymentFlowMode === 'MANUAL_ONLY' ||
          (event.paymentFlowMode === 'HYBRID' && event.manualPaymentEnabled === true)
        }
        showFeatures
      />


      <div className="max-w-4xl mx-auto mb-8">
        <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-800 shadow-sm">
          <strong className="block font-semibold mb-1 text-blue-900">Tip:</strong>
          Use the management shortcuts above to add or associate performers, sponsors, contacts,
          emails, program directors, and the event-day agenda with this event.
        </div>
      </div>

      <AgendaFlyerPanel eventId={String(eventId)} initialFlyer={initialFlyer} />

      <EventEditFocusGroupsPanel
        eventId={eventId}
        initialFocusGroups={initialFocusGroups}
        initialLinkedFocusGroups={initialLinkedFocusGroups}
      />

      <h1 className="text-2xl font-bold mb-2">Edit Event - ID: {eventId}</h1>
      <AdminTenantIdBanner tenantId={event?.tenantId} entityLabel="event" className="mb-4" />
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        <EventForm
          event={event}
          eventTypes={eventTypes}
          onSubmit={handleSubmit}
          loading={loading}
          initialEmailAddresses={initialEmailAddresses}
        />
      </div>

      <SaveStatusDialog
        isOpen={saveStatus !== 'idle'}
        status={saveStatus}
        message={saveMessage}
        onClose={() => {
          if (saveStatus === 'error') {
            setSaveStatus('idle');
            setSaveMessage('');
          }
        }}
      />
    </div>
  );
}
