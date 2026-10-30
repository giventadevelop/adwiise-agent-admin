import { useState, useEffect, useCallback } from 'react';
import type { EventDetailsDTO, EventMediaDTO } from '@/types';
import { getAppUrl } from '@/lib/env';
import { useSilentListingRefresh } from '@/hooks/useSilentListingRefresh';

export interface EventWithMedia {
  event: EventDetailsDTO;
  media: EventMediaDTO[];
}

export interface EventsData {
  events: EventDetailsDTO[];
  eventsWithMedia: EventWithMedia[];
  upcomingEvents: EventDetailsDTO[];
  isLoading: boolean;
  error: string | null;
}

export const useEventsData = () => {
  const [data, setData] = useState<EventsData>({
    events: [],
    eventsWithMedia: [],
    upcomingEvents: [],
    isLoading: true,
    error: null,
  });

  // Check if event is in next 1 year
  const isEventInNextYear = (eventDate: string, today: Date): boolean => {
    // Use the same today date as the filtering logic to ensure consistency
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    oneYearFromNow.setHours(23, 59, 59, 999); // End of day

    // Parse the event date as local date (not UTC) to avoid timezone issues
    // The eventDate is in YYYY-MM-DD format, so we need to parse it as local time
    const [year, month, day] = eventDate.split('-').map(Number);
    const eventStartDate = new Date(year, month - 1, day); // month is 0-indexed
    eventStartDate.setHours(0, 0, 0, 0); // Reset time to start of day

    console.log(`Date comparison for ${eventDate}: eventStartDate=${eventStartDate.toISOString()}, today=${today.toISOString()}, oneYearFromNow=${oneYearFromNow.toISOString()}`);
    console.log(`Event date >= today: ${eventStartDate >= today}, Event date <= oneYearFromNow: ${eventStartDate <= oneYearFromNow}`);

    return eventStartDate >= today && eventStartDate <= oneYearFromNow;
  };

  const fetchEventsData = useCallback(async (silent: boolean, signal?: AbortSignal) => {
    try {
      if (!silent) {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
      }

        const baseUrl = getAppUrl();

        // Fetch events
        let eventsResponse = await fetch(
          `${baseUrl}/api/proxy/event-details?sort=startDate,asc`,
          { cache: 'no-store', signal }
        );

        if (!eventsResponse.ok) {
          console.log('Events fetch failed with status:', eventsResponse.status);
          // Try fallback
          try {
            eventsResponse = await fetch(
              `${baseUrl}/api/proxy/event-details?sort=startDate,desc`,
              { cache: 'no-store', signal }
            );
            if (!eventsResponse.ok) {
              console.log('Backend unavailable - events not loaded, status:', eventsResponse.status);
              if (silent) return;
              setData({
                events: [],
                eventsWithMedia: [],
                upcomingEvents: [],
                isLoading: false,
                error: null,
              });
              return;
            }
          } catch (fallbackErr) {
            if (signal?.aborted) return;
            console.log('Backend unavailable - events not loaded:', fallbackErr);
            if (silent) return;
            setData({
              events: [],
              eventsWithMedia: [],
              upcomingEvents: [],
              isLoading: false,
              error: null,
            });
            return;
          }
        }

        const events: EventDetailsDTO[] = await eventsResponse.json();
        console.log('Successfully fetched events:', events.length);

        // Use the same today date as the filtering logic to ensure consistency
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for consistency
        console.log(`Events Data - Today's date: ${today.toDateString()} (${today.toISOString()})`);

        // Filter upcoming events (next 1 year and active)
        const upcomingEvents = events.filter(event =>
          event.startDate &&
          isEventInNextYear(event.startDate, today) &&
          event.isActive
        );

        console.log('Upcoming events in next 1 year:', upcomingEvents.length);

        // Fetch media for all upcoming events
        const eventsWithMedia: EventWithMedia[] = [];

        console.log('=== FETCHING MEDIA FOR UPCOMING EVENTS ===');
        for (const event of upcomingEvents) {
          console.log(`Fetching media for event ${event.id}: ${event.title}`);
          try {
            const mediaResponse = await fetch(
              `${baseUrl}/api/proxy/event-medias?eventId.equals=${event.id}`,
              { cache: 'no-store', signal }
            );

            if (mediaResponse.ok) {
              const mediaData = await mediaResponse.json();
              const mediaArray = Array.isArray(mediaData) ? mediaData : (mediaData ? [mediaData] : []);

              eventsWithMedia.push({
                event,
                media: mediaArray
              });
            } else {
              console.log(`Event ${event.id}: Media fetch failed with status ${mediaResponse.status}`);
              eventsWithMedia.push({
                event,
                media: []
              });
            }
          } catch (mediaError) {
            console.log(`Backend unavailable - media not loaded for event ${event.id}:`, mediaError);
            eventsWithMedia.push({
              event,
              media: []
            });
          }
        }

        console.log('Successfully processed events with media:', eventsWithMedia.length);

        if (signal?.aborted) return;

        setData({
          events,
          eventsWithMedia,
          upcomingEvents,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        if (signal?.aborted) return;
        console.log('Backend connection error - events data not loaded:', error);
        if (silent) return;
        setData({
          events: [],
          eventsWithMedia: [],
          upcomingEvents: [],
          isLoading: false,
          error: null, // Don't set error state, just log it
        });
      }
  }, []);

  useEffect(() => {
    // Admin hub root must not load tenant event/media catalogs (no public home content).
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path === '/' || path === '/home') {
        setData({
          events: [],
          eventsWithMedia: [],
          upcomingEvents: [],
          isLoading: false,
          error: null,
        });
        return;
      }
    }
    void fetchEventsData(false);
  }, [fetchEventsData]);

  useSilentListingRefresh((signal) => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path === '/' || path === '/home') return Promise.resolve();
    }
    return fetchEventsData(true, signal);
  });

  return data;
};
