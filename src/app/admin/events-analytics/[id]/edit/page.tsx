'use client';
import EventSectionTiles from '@/components/admin/EventSectionTiles';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventForm } from '@/components/EventForm';
import type { EventDetailsDTO, EventTypeDetailsDTO } from '@/types';
import { fetchEventDetailsServer, fetchEventTypesServer, updateEventServer } from '@/app/admin/ApiServerActions';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState<EventDetailsDTO | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const id = Number(eventId);
    if (!Number.isFinite(id)) return;
    void fetchEventDetailsServer(id).then(data => setEvent(data));
    void fetchEventTypesServer()
      .then(data => setEventTypes(Array.isArray(data) ? data : []))
      .catch(() => setEventTypes([]));
  }, [eventId]);

  async function handleSubmit(updatedEvent: EventDetailsDTO) {
    setLoading(true);
    setError(null);
    try {
      const id = Number(eventId);
      if (!Number.isFinite(id)) throw new Error('Invalid event ID');
      await updateEventServer({ ...updatedEvent, id });
      router.push('/admin');
    } catch (e: any) {
      setError(e.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  }

  if (!event) return <div className="p-8">Loading event details...</div>;

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto" style={{ paddingTop: '118px' }}>
      <EventSectionTiles
        eventId={eventId}
        eventsHref="/admin"
        showTickets={event?.admissionType === 'ticketed'}
        showDiscounts={false}
        showFeatures
        showAgenda={false}
      />


      <h1 className="text-2xl font-bold mb-4">Edit Event - ID: {eventId}</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        <EventForm event={event} eventTypes={eventTypes} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}