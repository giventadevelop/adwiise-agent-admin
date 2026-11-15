'use server';
import { appendAdminTenantFilter, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { stampCreateTimestamps } from '@/lib/api/createTimestamps';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getAppUrl, effectiveTenantId, appendTenantIfPresent, getDefaultPageSize, getBackendApiUrl } from '@/lib/env';
import type { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';

export async function fetchEventsServer(pageNum = 0, pageSize = 5, tenantId?: string): Promise<EventDetailsDTO[]> {
  const params = new URLSearchParams();
  params.set('page', String(pageNum ?? 0));
  params.set('size', String(pageSize ?? getDefaultPageSize()));
  params.set('sort', 'startDate,asc');
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-details?${params.toString()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

export async function fetchEventTypesServer(tenantId?: string): Promise<EventTypeDetailsDTO[]> {
  const params = new URLSearchParams();
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-type-details?${params.toString()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch event types');
  return await res.json();
}

export async function fetchCalendarEventsServer(tenantId?: string, eventIds?: number[]): Promise<EventCalendarEntryDTO[]> {
  const params = new URLSearchParams();
  if (eventIds) {
    // Scope to the events being enriched via repeated eventId.in instead of loading every entry
    if (eventIds.length === 0) return [];
    eventIds.forEach(id => params.append('eventId.in', String(id)));
    params.set('size', String(eventIds.length));
  } else {
    params.set('size', '1000');
  }
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-calendar-entries?${params.toString()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch calendar events');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createEventServer(event: any, tenantId?: string): Promise<any> {
  const url = `${getBackendApiUrl()}/api/event-details`;
  const tid = await resolveAdminMutationTenantId(tenantId);
  const { buildEventSearchText } = await import('@/lib/search/buildSearchText');
  const withSearch = {
    ...event,
    searchText: buildEventSearchText({
      title: event.title,
      caption: event.caption,
      description: event.description,
      location: event.location,
      ocrText: event.ocrText,
    }),
  };
  const payload = stampCreateTimestamps(
    (tid != null ? { ...withSearch, tenantId: tid } : { ...withSearch }) as Record<string, unknown>
  );
  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return await res.json();
}

export async function updateEventServer(event: any, tenantId?: string): Promise<any> {
  if (!event.id) throw new Error('Event ID required for update');
  const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
  const tid = await resolveAdminMutationTenantId(tenantId);
  const { buildEventSearchText } = await import('@/lib/search/buildSearchText');
  const withSearch = {
    ...event,
    searchText: buildEventSearchText({
      title: event.title,
      caption: event.caption,
      description: event.description,
      location: event.location,
      ocrText: event.ocrText,
    }),
  };
  const payload = tid != null ? { ...withSearch, tenantId: tid, id: event.id } : { ...withSearch, id: event.id };
  const res = await fetchWithJwtRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to update event');
  }
  return await res.json();
}

export async function cancelEventServer(event: EventDetailsDTO, tenantId?: string): Promise<EventDetailsDTO> {
  if (!event.id) throw new Error('Event ID required for cancel');
  const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload = tid != null ? { ...event, isActive: false, tenantId: tid } : { ...event, isActive: false };
  const res = await fetchWithJwtRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to cancel event');
  return await res.json();
}

function toGoogleCalendarDate(date: string, time: string) {
  if (!date || !time) return '';
  const [year, month, day] = date.split('-');
  let [hour, minute] = time.split(':');
  let ampm = '';
  if (minute && minute.includes(' ')) {
    [minute, ampm] = minute.split(' ');
  }
  let h = parseInt(hour, 10);
  if (ampm && ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${year}${month}${day}T${String(h).padStart(2, '0')}${minute}00`;
}

export async function createCalendarEventServer(event: EventDetailsDTO, userProfile: UserProfileDTO) {
  const now = new Date().toISOString();
  const start = toGoogleCalendarDate(event.startDate, event.startTime);
  const end = toGoogleCalendarDate(event.endDate, event.endTime);
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  const calendarEvent: EventCalendarEntryDTO = {
    calendarProvider: 'GOOGLE',
    calendarLink,
    createdAt: now,
    updatedAt: now,
    event,
    createdBy: userProfile,
  };
  const url = `${getBackendApiUrl()}/api/event-calendar-entries`;
  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calendarEvent),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }
  return await res.json();
}

export async function findCalendarEventByEventIdServer(eventId: number, tenantId?: string): Promise<EventCalendarEntryDTO | null> {
  const params = new URLSearchParams();
  params.set('eventId.equals', String(eventId));
  params.set('size', '1');
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-calendar-entries?${params.toString()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data)) return null;
  return (data[0] as EventCalendarEntryDTO) || null;
}

export async function updateCalendarEventForEventServer(event: EventDetailsDTO, userProfile: UserProfileDTO, tenantId?: string) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventIdServer(event.id, tenantId);
  if (!calendarEvent || !calendarEvent.id) return;
  const now = new Date().toISOString();
  const start = toGoogleCalendarDate(event.startDate, event.startTime);
  const end = toGoogleCalendarDate(event.endDate, event.endTime);
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  const updatedCalendarEvent: EventCalendarEntryDTO = {
    ...calendarEvent,
    calendarLink,
    updatedAt: now,
    event,
    createdBy: userProfile,
  };
  const url = `${getBackendApiUrl()}/api/event-calendar-entries/${calendarEvent.id}`;
  const res = await fetchWithJwtRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedCalendarEvent),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update calendar event: ${err}`);
  }
  return await res.json();
}

export async function deleteCalendarEventForEventServer(event: EventDetailsDTO, tenantId?: string) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventIdServer(event.id, tenantId);
  if (!calendarEvent || !calendarEvent.id) return;
  const url = `${getBackendApiUrl()}/api/event-calendar-entries/${calendarEvent.id}`;
  const res = await fetchWithJwtRetry(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${err}`);
  }
}

export async function fetchEventsFilteredServer(params: {
  title?: string,
  id?: string,
  caption?: string,
  startDate?: string,
  endDate?: string,
  admissionType?: string,
  sort?: string,
  pageNum?: number,
  pageSize?: number,
  tenantId?: string
}): Promise<{ events: EventDetailsDTO[], totalCount: number }> {
  const queryParams = new URLSearchParams({
    page: String(params.pageNum ?? 0),
    size: String(params.pageSize ?? getDefaultPageSize()),
    sort: params.sort || 'startDate,asc'
  });
  await appendAdminTenantFilter(queryParams, params.tenantId);

  if (params.title) queryParams.append('title.contains', params.title);
  if (params.id) queryParams.append('id.equals', params.id);
  if (params.caption) queryParams.append('caption.contains', params.caption);
  if (params.startDate) queryParams.append('startDate.greaterThanOrEqual', params.startDate);
  if (params.endDate) queryParams.append('endDate.lessThanOrEqual', params.endDate);
  if (params.admissionType) queryParams.append('admissionType.equals', params.admissionType);

  const url = `${getBackendApiUrl()}/api/event-details?${queryParams.toString()}`;

  const res = await fetchWithJwtRetry(url, {});

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error fetching filtered events:', res.status, errorBody);
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }

  const totalCount = Number(res.headers.get('X-Total-Count')) || 0;
  const events = await res.json();

  return { events, totalCount };
}

export async function fetchEventDetailsServer(eventId: number, tenantId?: string): Promise<EventDetailsDTO | null> {
  const params = new URLSearchParams();
  await appendAdminTenantFilter(params, tenantId);
  const qs = params.toString();
  const url = `${getBackendApiUrl()}/api/event-details/${eventId}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`Failed to fetch event details for eventId ${eventId}:`, res.status, await res.text());
    return null;
  }
  return await res.json();
}

export async function fetchUserProfileServer(userId: string, tenantId?: string): Promise<UserProfileDTO | null> {
    if (!userId) {
        return null;
    }
    const params = new URLSearchParams();
    await appendAdminTenantFilter(params, tenantId);
    const qs = params.toString();
    const url = `${getBackendApiUrl()}/api/user-profiles/by-user/${userId}${qs ? `?${qs}` : ''}`;
    try {
        const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error(`Failed to fetch user profile for userId ${userId}: ${res.status}`);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error(`Error fetching user profile for userId ${userId}:`, error);
        return null;
    }
}

export async function fetchUserProfileByEmailServer(email: string, tenantId?: string): Promise<UserProfileDTO | null> {
    if (!email) {
      return null;
    }
    const params = new URLSearchParams();
    params.set('email.equals', email);
    await appendAdminTenantFilter(params, tenantId);
    const url = `${getBackendApiUrl()}/api/user-profiles?${params.toString()}`;
    try {
        const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error(`Failed to fetch user profile for email ${email}: ${res.status}`);
            return null;
        }
        const users = await res.json();
        return users && users.length > 0 ? users[0] : null;
  } catch (error) {
        console.error(`Error fetching user profile for email ${email}:`, error);
    return null;
  }
}

/**
 * Fetch all events in a recurrence series (parent + children).
 *
 * IMPORTANT: Backend criteria on nullable fields (e.g. recurrenceSeriesId.equals=N)
 * can return the entire tenant event list when values are null. Always filter
 * client-side to the exact series id before using the result for delete/activate.
 *
 * Uses getBackendApiUrl() + fetchWithJwtRetry (Authorization + X-Tenant-ID) per
 * event-site-manager nextjs_api_routes.mdc — not the Next.js proxy.
 */
export async function fetchChildEventsBySeriesIdServer(recurrenceSeriesId: number, tenantId?: string): Promise<EventDetailsDTO[]> {
  if (recurrenceSeriesId == null || Number.isNaN(Number(recurrenceSeriesId))) return [];
  const seriesIdNum = Number(recurrenceSeriesId);
  const params = new URLSearchParams();
  params.set('recurrenceSeriesId.equals', String(seriesIdNum));
  params.set('size', '1000');
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-details?${params.toString()}`;
  try {
    const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`Failed to fetch child events for series ${seriesIdNum}: ${res.status}`);
      return [];
    }
    const events = await res.json();
    const eventArray = Array.isArray(events) ? events : [];
    // Guard against backend returning unfiltered tenant-wide lists for null criteria fields
    const filtered = eventArray.filter(
      (e) => e.recurrenceSeriesId != null && Number(e.recurrenceSeriesId) === seriesIdNum
    );
    console.log(
      `[fetchChildEventsBySeriesIdServer] series=${seriesIdNum} raw=${eventArray.length} filtered=${filtered.length}`,
      filtered.map((e) => ({ id: e.id, parentEventId: e.parentEventId, isActive: e.isActive, title: e.title }))
    );
    return filtered;
  } catch (error) {
    console.error(`Error fetching child events for series ${seriesIdNum}:`, error);
    return [];
  }
}

/**
 * Fetch child events whose parentEventId matches the given parent id.
 * Client-side filter required — parentEventId.equals criteria can return all events.
 */
export async function fetchChildEventsByParentIdServer(parentEventId: number, tenantId?: string): Promise<EventDetailsDTO[]> {
  if (parentEventId == null) return [];
  const parentIdNum = Number(parentEventId);
  const params = new URLSearchParams();
  params.set('parentEventId.equals', String(parentIdNum));
  params.set('size', '1000');
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/event-details?${params.toString()}`;
  try {
    const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`Failed to fetch children for parent ${parentIdNum}: ${res.status}`);
      return [];
    }
    const events = await res.json();
    const eventArray = Array.isArray(events) ? events : [];
    return eventArray.filter(
      (e) => e.parentEventId != null && Number(e.parentEventId) === parentIdNum
    );
  } catch (error) {
    console.error(`Error fetching children for parent ${parentIdNum}:`, error);
    return [];
  }
}

async function deleteSingleEventByIdServer(event: EventDetailsDTO, tenantId?: string): Promise<void> {
  if (!event.id) return;
  try {
    await deleteCalendarEventForEventServer(event, tenantId);
  } catch (calendarErr) {
    console.warn(`Failed to delete calendar event for event ${event.id}:`, calendarErr);
  }
  const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
  const res = await fetchWithJwtRetry(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete event ${event.id}: ${err}`);
  }
}

/**
 * Soft delete (deactivate) an event
 * - If it's a parent event: deactivates parent + all child events
 * - If it's a child event: deactivates only that child event
 */
export async function softDeleteEventWithChildrenServer(event: EventDetailsDTO, tenantId?: string): Promise<void> {
  if (!event.id) throw new Error('Event ID required for soft delete');

  // Check if this is a parent event (parentEventId is null/undefined)
  const isParentEvent = event.parentEventId == null || event.parentEventId === undefined;

  if (isParentEvent) {
    // Parent event: Only update the parent - backend will automatically sync children via syncChildEventsActiveStatus
    console.log(`[softDeleteEventWithChildrenServer] Deactivating parent event ${event.id} - backend will sync children automatically`);

    try {
      // Fetch full event details to ensure we have all required fields
      const fullEvent = await fetchEventDetailsServer(event.id, tenantId);
      if (!fullEvent) {
        throw new Error(`Event ${event.id} not found`);
      }

      const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
      console.log(`[softDeleteEventWithChildrenServer] Calling PUT ${url} to deactivate parent event ${event.id}`);

      // Explicitly set isRecurring to false to prevent backend from trying to generate recurring events
      // This is a workaround for backend bug where it calls generateRecurringEvents() even when isRecurring=false
      const updatePayload = {
        ...fullEvent,
        isActive: false,
        isRecurring: false, // Explicitly set to false to prevent recurrence generation
      };

      const res = await fetchWithJwtRetry(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[softDeleteEventWithChildrenServer] Failed to deactivate parent event ${event.id}: ${res.status} ${errorText}`);
        throw new Error(`Failed to deactivate parent event: ${res.status} ${errorText}`);
      }

      console.log(`[softDeleteEventWithChildrenServer] Successfully deactivated parent event ${event.id} - backend should sync children automatically`);

      // Delete calendar events for parent + real children only (non-blocking)
      const calendarTargets: EventDetailsDTO[] = [fullEvent];
      if (event.recurrenceSeriesId != null) {
        const seriesEvents = await fetchChildEventsBySeriesIdServer(event.recurrenceSeriesId, tenantId);
        for (const e of seriesEvents) {
          if (e.id != null && e.id !== event.id) calendarTargets.push(e);
        }
      } else {
        const children = await fetchChildEventsByParentIdServer(event.id, tenantId);
        calendarTargets.push(...children);
      }

      const calendarDeletionPromises = calendarTargets.map(async (e) => {
        if (!e.id) return;
        try {
          await deleteCalendarEventForEventServer(e, tenantId);
        } catch (calendarErr) {
          console.warn(`[softDeleteEventWithChildrenServer] Failed to delete calendar event for event ${e.id}:`, calendarErr);
        }
      });

      // Don't await calendar deletions - they're non-blocking
      Promise.all(calendarDeletionPromises).catch(err => {
        console.warn(`[softDeleteEventWithChildrenServer] Some calendar event deletions failed:`, err);
      });
    } catch (err) {
      console.error(`[softDeleteEventWithChildrenServer] Failed to deactivate parent event ${event.id}:`, err);
      throw err;
    }
  } else {
    // Child event: deactivate only this child
    console.log(`[softDeleteEventWithChildrenServer] Deactivating child event ${event.id}, parentEventId: ${event.parentEventId}`);
    try {
      // First, fetch the full event details to ensure we have all required fields
      const fullEvent = await fetchEventDetailsServer(event.id, tenantId);
      if (!fullEvent) {
        throw new Error(`Event ${event.id} not found`);
      }

      const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
      console.log(`[softDeleteEventWithChildrenServer] Calling PUT ${url} with isActive=false`);

      // Explicitly set isRecurring to false to prevent backend from trying to generate recurring events
      // This is a workaround for backend bug where it calls generateRecurringEvents() even when isRecurring=false
      const updatePayload = {
        ...fullEvent,
        isActive: false,
        isRecurring: false, // Explicitly set to false to prevent recurrence generation
      };

      const res = await fetchWithJwtRetry(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[softDeleteEventWithChildrenServer] Failed to deactivate child event ${event.id}: ${res.status} ${errorText}`);
        throw new Error(`Failed to deactivate event: ${res.status} ${errorText}`);
      }

      const updatedEvent = await res.json();
      console.log(`[softDeleteEventWithChildrenServer] Successfully deactivated child event ${event.id}`, updatedEvent);

      // Also delete calendar event if it exists (non-blocking)
      try {
        await deleteCalendarEventForEventServer(fullEvent, tenantId);
      } catch (calendarErr) {
        console.warn(`[softDeleteEventWithChildrenServer] Failed to delete calendar event for event ${event.id}:`, calendarErr);
        // Don't throw - calendar deletion is optional
      }
    } catch (err) {
      console.error(`[softDeleteEventWithChildrenServer] Error deactivating child event ${event.id}:`, err);
      throw err;
    }
  }
}

/**
 * Activate an event
 * - If it's a parent event: activates parent + all child events
 * - If it's a child event: activates only that child event
 */
export async function activateEventWithChildrenServer(event: EventDetailsDTO, tenantId?: string): Promise<void> {
  if (!event.id) throw new Error('Event ID required for activation');

  // Check if this is a parent event (parentEventId is null/undefined)
  const isParentEvent = event.parentEventId == null || event.parentEventId === undefined;

  if (isParentEvent) {
    // Parent event: Only update the parent - backend will automatically sync children via syncChildEventsActiveStatus
    console.log(`[activateEventWithChildrenServer] Activating parent event ${event.id} - backend will sync children automatically`);

    try {
      // Fetch full event details to ensure we have all required fields
      const fullEvent = await fetchEventDetailsServer(event.id, tenantId);
      if (!fullEvent) {
        throw new Error(`Event ${event.id} not found`);
      }

      const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
      console.log(`[activateEventWithChildrenServer] Calling PUT ${url} to activate parent event ${event.id}`);

      const updatePayload = {
        ...fullEvent,
        isActive: true,
      };

      const res = await fetchWithJwtRetry(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[activateEventWithChildrenServer] Failed to activate parent event ${event.id}: ${res.status} ${errorText}`);
        throw new Error(`Failed to activate parent event: ${res.status} ${errorText}`);
      }

      console.log(`[activateEventWithChildrenServer] Successfully activated parent event ${event.id} - backend should sync children automatically`);
    } catch (err) {
      console.error(`[activateEventWithChildrenServer] Failed to activate parent event ${event.id}:`, err);
      throw err;
    }
  } else {
    // Child event: activate only this child
    try {
      const url = `${getBackendApiUrl()}/api/event-details/${event.id}`;
      await fetchWithJwtRetry(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, isActive: true }),
      });
    } catch (err) {
      console.error(`Failed to activate child event ${event.id}:`, err);
      throw err;
    }
  }
}

/**
 * Hard delete (permanently delete) an event
 * - Standalone event (no series / no children): deletes only that event id
 * - Parent of a recurrence series: deletes parent + events that truly belong to that series
 * - Child event: deletes only that child event
 *
 * Never use event.id as a fake recurrenceSeriesId — backend criteria on null
 * recurrenceSeriesId can return every tenant event and wipe the list.
 *
 * Direct backend DELETE via getBackendApiUrl() + fetchWithJwtRetry (not proxy).
 */
export async function hardDeleteEventWithChildrenServer(event: EventDetailsDTO, tenantId?: string): Promise<void> {
  if (!event.id) throw new Error('Event ID required for hard delete');

  const isParentEvent = event.parentEventId == null || event.parentEventId === undefined;
  const eventsToDeleteById = new Map<number, EventDetailsDTO>();
  eventsToDeleteById.set(event.id, event);

  if (isParentEvent) {
    if (event.recurrenceSeriesId != null) {
      const seriesEvents = await fetchChildEventsBySeriesIdServer(event.recurrenceSeriesId, tenantId);
      for (const e of seriesEvents) {
        if (e.id != null) eventsToDeleteById.set(e.id, e);
      }
    } else {
      const children = await fetchChildEventsByParentIdServer(event.id, tenantId);
      for (const e of children) {
        if (e.id != null) eventsToDeleteById.set(e.id, e);
      }
    }
  }

  const sortedEvents = Array.from(eventsToDeleteById.values()).sort((a, b) => {
    const aIsChild = a.parentEventId != null;
    const bIsChild = b.parentEventId != null;
    if (aIsChild && !bIsChild) return -1;
    if (!aIsChild && bIsChild) return 1;
    return 0;
  });

  console.log(
    `[hardDeleteEventWithChildrenServer] Deleting ${sortedEvents.length} event(s) for target id=${event.id}:`,
    sortedEvents.map((e) => e.id)
  );

  // Delete sequentially (children first) so a failure does not leave orphans mid-parallel fan-out
  for (const e of sortedEvents) {
    await deleteSingleEventByIdServer(e, tenantId);
  }
}