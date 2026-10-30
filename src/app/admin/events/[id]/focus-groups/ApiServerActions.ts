'use server';

import {
  associateEventWithFocusGroup,
  unlinkEventFromFocusGroup,
} from '@/app/admin/focus-groups/[id]/edit/ApiServerActions';
import { appendAdminTenantFilter } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getBackendApiUrl } from '@/lib/env';
import type { EventFocusGroupDTO, FocusGroupDTO } from '@/types';

function normalizeList<T>(data: unknown, embeddedKey?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as { content?: unknown; _embedded?: Record<string, unknown> };
    if (Array.isArray(o.content)) return o.content as T[];
    if (embeddedKey && Array.isArray(o._embedded?.[embeddedKey])) {
      return o._embedded![embeddedKey] as T[];
    }
  }
  return [];
}

/**
 * Fetch event-focus-groups associations for this event (admin listing).
 * Direct backend + JWT; tenant filter via appendAdminTenantFilter.
 */
export async function fetchLinkedEventFocusGroupsServer(
  eventId: number,
  tenantId?: string
): Promise<EventFocusGroupDTO[]> {
  const params = new URLSearchParams();
  params.set('eventId.equals', String(eventId));
  params.set('size', '100');
  await appendAdminTenantFilter(params, tenantId);
  const res = await fetchWithJwtRetry(
    `${getBackendApiUrl()}/api/event-focus-groups?${params.toString()}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return [];
  return normalizeList<EventFocusGroupDTO>(await res.json(), 'eventFocusGroups');
}

/**
 * Fetch focus groups for the "Link focus group" dropdown.
 * Direct backend + JWT; respects selected tenant / all-tenants admin cache.
 */
export async function fetchAllFocusGroupsServer(tenantId?: string): Promise<FocusGroupDTO[]> {
  const params = new URLSearchParams();
  params.set('size', '500');
  params.set('sort', 'name,asc');
  await appendAdminTenantFilter(params, tenantId);
  const res = await fetchWithJwtRetry(
    `${getBackendApiUrl()}/api/focus-groups?${params.toString()}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return [];
  return normalizeList<FocusGroupDTO>(await res.json(), 'focusGroups');
}

/**
 * Link this event to a focus group (creates event_focus_groups row).
 */
export async function linkEventToFocusGroupServer(
  eventId: number,
  focusGroupId: number
): Promise<EventFocusGroupDTO> {
  return associateEventWithFocusGroup(eventId, focusGroupId);
}

/**
 * Unlink this event from a focus group (deletes event_focus_groups association).
 */
export async function unlinkEventFromFocusGroupServer(
  eventId: number,
  focusGroupId: number
): Promise<void> {
  return unlinkEventFromFocusGroup(eventId, focusGroupId);
}
