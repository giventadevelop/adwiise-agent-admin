'use server';
import { appendAdminTenantFilter, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl, getAppUrl } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import type { EventProgramDirectorsDTO, EventMediaDTO } from '@/types';
import { mergeById, slicePage } from '@/lib/admin/mergeContainsResults';

const API_BASE_URL = getApiBaseUrl();
const baseUrl = getAppUrl();

export type DirectorListFilters = {
  search?: string;
};

const DIRECTOR_SEARCH_FIELDS = ['name.contains', 'bio.contains'];
const DIRECTOR_SEARCH_PAGE_SIZE = 200;

function readDirectorList(data: unknown): EventProgramDirectorsDTO[] {
  if (data && typeof data === 'object' && '_embedded' in data) {
    const embedded = (data as { _embedded?: { eventProgramDirectors?: EventProgramDirectorsDTO[] } })._embedded;
    if (Array.isArray(embedded?.eventProgramDirectors)) return embedded.eventProgramDirectors;
  }
  if (Array.isArray(data)) return data as EventProgramDirectorsDTO[];
  if (data && typeof data === 'object') return [data as EventProgramDirectorsDTO];
  return [];
}

async function requestDirectors(params: URLSearchParams, tenantId?: string) {
  await appendAdminTenantFilter(params, tenantId);
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-program-directors?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch event program directors: ${response.statusText}`);
  }
  const data = await response.json();
  const directors = readDirectorList(data);
  const totalCount = parseInt(response.headers.get('x-total-count') || String(directors.length), 10);
  return { data: directors, totalCount };
}

export async function fetchEventProgramDirectorsServer(
  eventId?: number,
  page: number = 0,
  size: number = 10,
  tenantId?: string,
  filters?: DirectorListFilters,
) {
  const search = filters?.search?.trim() || '';
  const base = () => {
    const params = new URLSearchParams();
    if (eventId) params.append('eventId.equals', eventId.toString());
    return params;
  };

  if (!search) {
    const params = base();
    params.append('page', page.toString());
    params.append('size', size.toString());
    return requestDirectors(params, tenantId);
  }

  const settled = await Promise.allSettled(
    DIRECTOR_SEARCH_FIELDS.map((field) => {
      const params = base();
      params.append('page', '0');
      params.append('size', String(DIRECTOR_SEARCH_PAGE_SIZE));
      params.append(field, search);
      return requestDirectors(params, tenantId);
    }),
  );
  const groups = settled
    .filter((result): result is PromiseFulfilledResult<{ data: EventProgramDirectorsDTO[]; totalCount: number }> => result.status === 'fulfilled')
    .map((result) => result.value.data);
  if (groups.length === 0) {
    const rejected = settled.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
    throw rejected?.reason ?? new Error('Failed to search program directors');
  }
  return slicePage(mergeById(groups), page, size);
}

export async function fetchEventProgramDirectorServer(id: number) {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-program-directors/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch event program director: ${response.statusText}`);
  }

  return await response.json();
}

export async function createEventProgramDirectorServer(
  director: Omit<EventProgramDirectorsDTO, 'id' | 'createdAt' | 'updatedAt'>,
  tenantId?: string
) {
  const cleanUrlField = (value: string | undefined | null): string | null => {
    return (value && value.trim() !== '') ? value : null;
  };

  const currentTime = new Date().toISOString();
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload = {
    ...director,
    createdAt: currentTime,
    updatedAt: currentTime,
    photoUrl: cleanUrlField(director.photoUrl),
    ...(tid != null ? { tenantId: tid } : {}),
  };

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-program-directors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create event program director: ${errorText}`);
  }

  return await response.json();
}

export async function updateEventProgramDirectorServer(
  id: number,
  director: Partial<EventProgramDirectorsDTO>,
  tenantId?: string,
) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload = withTenantId({ ...director, id, ...(tid ? { tenantId: tid } : {}) });

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-program-directors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update event program director: ${errorText}`);
  }

  return await response.json();
}

export async function deleteEventProgramDirectorServer(id: number) {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-program-directors/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete event program director: ${errorText}`);
  }

  return true;
}

/**
 * Fetch all media files for a director, sorted by priority ranking
 * Uses the criteria-based query endpoint: /api/event-medias?directorId.equals={directorId}
 */
export async function fetchDirectorMediaServer(
  directorId: number,
  tenantId?: string
): Promise<EventMediaDTO[]> {
  const baseUrl = getAppUrl();
  const params = new URLSearchParams();
  params.append('directorId.equals', directorId.toString());

  await appendAdminTenantFilter(params, tenantId);

  // Sort by priority ranking (ascending)
  params.append('sort', 'priorityRanking,asc');

  const url = `${baseUrl}/api/proxy/event-medias?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn(`Failed to fetch director media: ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  // Handle Spring Data REST paginated response format
  if (data._embedded && data._embedded.eventMedias) {
    return data._embedded.eventMedias;
  }

  // Handle direct array response
  return Array.isArray(data) ? data : [data];
}

/**
 * Upload director photo
 */
export async function uploadDirectorImageServer(
  directorId: number,
  file: File,
  title?: string,
  description?: string,
  tenantId?: string
): Promise<EventMediaDTO> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    params.append('eventId', '0'); // No event association
    params.append('entityId', directorId.toString());
    params.append('entityType', 'DIRECTOR');
    params.append('imageType', 'photo');
    params.append('isProgramDirectorPhoto', 'true');

    params.append('title', title || `photo - ${directorId}`);
    params.append('description', description || `Director photo image`);
    params.append('isPublic', 'true');
    const tid = await resolveAdminMutationTenantId(tenantId);
    if (tid != null) params.append('tenantId', tid);

    // Set startDisplayingFromDate to today's date (YYYY-MM-DD format) to satisfy NOT NULL constraint
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    params.append('startDisplayingFromDate', today);

    const baseUrl = getAppUrl();
    // Use the generic upload endpoint (same as sponsors)
    const url = `${baseUrl}/api/proxy/event-medias/upload?${params.toString()}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    // 🎯 CRITICAL: Only rely on HTTP status codes for success/failure determination
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Upload successful - HTTP status:', response.status);

      try {
        const result = await response.json();
        return result;
      } catch (parseError) {
        console.error('❌ Failed to parse successful upload response:', parseError);
        throw new Error('Upload succeeded but response parsing failed');
      }
    } else {
      console.error('❌ Upload failed - HTTP status:', response.status);
      const errorText = await response.text();
      throw new Error(`Upload failed with HTTP status ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('Error uploading director image:', error);
    throw error;
  }
}

/**
 * Update event media attributes
 */
export async function updateEventMediaServer(
  mediaId: number,
  updates: Partial<EventMediaDTO>,
  tenantId?: string
): Promise<EventMediaDTO> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) {
    throw new Error('API base URL not configured');
  }

  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload = {
    ...updates,
    id: mediaId,
    ...(tid != null ? { tenantId: tid } : {}),
  };

  const baseUrl = getAppUrl();
  const url = `${baseUrl}/api/proxy/event-medias/${mediaId}`; // Proxy to backend's PATCH endpoint

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update media: ${errorText}`);
  }

  return await response.json();
}

/**
 * Update media priority ranking
 */
export async function updateMediaPriorityRankingServer(
  mediaId: number,
  priorityRanking: number
): Promise<EventMediaDTO> {
  return updateEventMediaServer(mediaId, { priorityRanking });
}
