'use server';
import { appendAdminTenantFilter, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';

import { stampCreateTimestamps } from '@/lib/api/createTimestamps';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl, getAppUrl, getTenantId } from '@/lib/env';
import { getAdminProxyBaseUrl } from '@/lib/adminProxyBaseUrl';
import { resolveTeamMemberPortraitUrl } from '@/app/admin/team-members/ApiServerActions';
import type { EventSponsorsDTO, EventSponsorsJoinDTO, EventMediaDTO } from '@/types';
import { mergeById, searchQueryVariants, slicePage } from '@/lib/admin/mergeContainsResults';

const API_BASE_URL = getApiBaseUrl();
const baseUrl = getAppUrl();

export type EventSponsorListFilters = {
  search?: string;
  type?: string;
  isActive?: boolean | null;
};

const SPONSOR_SEARCH_FIELDS = [
  'searchText.contains',
  'ocrText.contains',
  'name.contains',
  'companyName.contains',
  'contactEmail.contains',
];
const SPONSOR_SEARCH_PAGE_SIZE = 200;

function readSponsorList(data: unknown): EventSponsorsDTO[] {
  if (data && typeof data === 'object' && '_embedded' in data) {
    const embedded = (data as { _embedded?: { eventSponsors?: EventSponsorsDTO[] } })._embedded;
    if (Array.isArray(embedded?.eventSponsors)) return embedded.eventSponsors;
  }
  if (Array.isArray(data)) return data as EventSponsorsDTO[];
  if (data && typeof data === 'object') return [data as EventSponsorsDTO];
  return [];
}

async function requestSponsors(params: URLSearchParams, tenantId?: string) {
  await appendAdminTenantFilter(params, tenantId);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/event-sponsors?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch event sponsors: ${response.statusText}`);
  }
  const totalCountHeader = response.headers.get('x-total-count');
  const parsedHeaderTotalCount =
    totalCountHeader && !Number.isNaN(Number(totalCountHeader))
      ? Number(totalCountHeader)
      : null;
  const data = await response.json();
  const sponsors = readSponsorList(data);
  const totalCount =
    parsedHeaderTotalCount ??
    Number((data as { page?: { totalElements?: number } })?.page?.totalElements ?? sponsors.length);
  return { data: sponsors, totalCount };
}

function sponsorCriteriaParams(filters?: EventSponsorListFilters) {
  const params = new URLSearchParams();
  params.append('sort', 'priorityRanking,asc');
  if (filters?.type) params.append('type.equals', filters.type);
  if (filters?.isActive === true) params.append('isActive.equals', 'true');
  if (filters?.isActive === false) params.append('isActive.equals', 'false');
  return params;
}

export async function fetchEventSponsorsServer(
  page: number = 0,
  pageSize: number = 10,
  tenantId?: string,
  filters?: EventSponsorListFilters,
) {
  const search = filters?.search?.trim() || '';
  if (!search) {
    const params = sponsorCriteriaParams(filters);
    params.append('page', String(page));
    params.append('size', String(pageSize));
    return requestSponsors(params, tenantId);
  }

  const variants = searchQueryVariants(search);
  const settled = await Promise.allSettled(
    variants.flatMap((variant) =>
      SPONSOR_SEARCH_FIELDS.map((field) => {
        const params = sponsorCriteriaParams(filters);
        params.append('page', '0');
        params.append('size', String(SPONSOR_SEARCH_PAGE_SIZE));
        params.append(field, variant);
        return requestSponsors(params, tenantId);
      }),
    ),
  );
  const groups = settled
    .filter((result): result is PromiseFulfilledResult<{ data: EventSponsorsDTO[]; totalCount: number }> => result.status === 'fulfilled')
    .map((result) => result.value.data);
  if (groups.length === 0) {
    const rejected = settled.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
    throw rejected?.reason ?? new Error('Failed to search event sponsors');
  }
  return slicePage(mergeById(groups), page, pageSize);
}

export async function fetchEventSponsorServer(id: number) {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch event sponsor: ${response.statusText}`);
  }

  return await response.json();
}

export async function createEventSponsorServer(sponsor: Omit<EventSponsorsDTO, 'id' | 'createdAt' | 'updatedAt'>, tenantId?: string) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const tiktokUrl = typeof sponsor.tiktokUrl === 'string' ? sponsor.tiktokUrl.trim() : sponsor.tiktokUrl;
  const { buildSponsorSearchText } = await import('@/lib/search/buildSearchText');
  const searchText =
    sponsor.searchText ??
    buildSponsorSearchText({
      name: sponsor.name,
      companyName: sponsor.companyName,
      tagline: sponsor.tagline,
      description: sponsor.description,
      type: sponsor.type,
      ocrText: sponsor.ocrText,
    });
  const payload: Record<string, unknown> = stampCreateTimestamps({
    ...sponsor,
    searchText,
    tiktokUrl: tiktokUrl ? tiktokUrl : null,
  });
  if (tid != null) (payload as Record<string, unknown>).tenantId = tid;

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create event sponsor: ${errorText}`);
  }

  return await response.json();
}

export async function updateEventSponsorServer(id: number, sponsor: Partial<EventSponsorsDTO>, tenantId?: string) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const tiktokUrl = typeof sponsor.tiktokUrl === 'string' ? sponsor.tiktokUrl.trim() : sponsor.tiktokUrl;

  const touchesSearchFields =
    sponsor.name !== undefined ||
    sponsor.companyName !== undefined ||
    sponsor.tagline !== undefined ||
    sponsor.description !== undefined ||
    sponsor.type !== undefined ||
    sponsor.ocrText !== undefined ||
    sponsor.searchText !== undefined;

  const incomingOcr =
    typeof sponsor.ocrText === 'string' && sponsor.ocrText.trim()
      ? sponsor.ocrText.trim()
      : undefined;

  let searchText = sponsor.searchText;
  if (touchesSearchFields && searchText === undefined) {
    const { buildSponsorSearchText } = await import('@/lib/search/buildSearchText');
    const existing = (await fetchEventSponsorServer(id)) as EventSponsorsDTO;
    searchText = buildSponsorSearchText({
      name: sponsor.name ?? existing?.name,
      companyName: sponsor.companyName ?? existing?.companyName,
      tagline: sponsor.tagline ?? existing?.tagline,
      description: sponsor.description ?? existing?.description,
      type: sponsor.type ?? existing?.type,
      ocrText: incomingOcr ?? existing?.ocrText,
    });
  }

  const payload: Record<string, unknown> = {
    ...sponsor,
    id,
    ...(searchText !== undefined ? { searchText } : {}),
    ...(sponsor.tiktokUrl !== undefined ? { tiktokUrl: tiktokUrl ? tiktokUrl : null } : {}),
  };
  if (incomingOcr) {
    payload.ocrText = incomingOcr;
  } else {
    delete payload.ocrText;
  }
  if (tid != null) (payload as Record<string, unknown>).tenantId = tid;

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update event sponsor: ${errorText}`);
  }

  return await response.json();
}

export async function deleteEventSponsorServer(id: number) {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete event sponsor: ${errorText}`);
  }

  return true;
}

// Event Sponsors Join (Many-to-Many Relationship) functions
export async function fetchEventSponsorsJoinServer(eventId?: number, tenantId?: string) {
  const params = new URLSearchParams();
  if (eventId) {
    params.append('eventId.equals', eventId.toString());
  }
  await appendAdminTenantFilter(params, tenantId);

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors-join${params.toString() ? `?${params.toString()}` : ''}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch event sponsors join: ${response.statusText}`);
  }

  return await response.json();
}

export async function createEventSponsorJoinServer(sponsorJoin: Omit<EventSponsorsJoinDTO, 'id' | 'createdAt' | 'updatedAt'>, tenantId?: string) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload: Record<string, unknown> = stampCreateTimestamps({ ...sponsorJoin });
  if (tid != null) (payload as Record<string, unknown>).tenantId = tid;

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors-join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create event sponsor join: ${errorText}`);
  }

  return await response.json();
}

export async function updateEventSponsorJoinServer(id: number, sponsorJoin: Partial<EventSponsorsJoinDTO>, tenantId?: string) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload: Record<string, unknown> = { ...sponsorJoin, id };
  if (tid != null) (payload as Record<string, unknown>).tenantId = tid;

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors-join/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update event sponsor join: ${errorText}`);
  }

  return await response.json();
}

export async function deleteEventSponsorJoinServer(id: number) {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-sponsors-join/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete event sponsor join: ${errorText}`);
  }

  return true;
}

// ============================================
// Event Media Upload Functions
// ============================================

/**
 * Upload sponsor image (logo, hero, or banner)
 *
 * 🎯 IMPORTANT: This function uses the generic /api/event-medias/upload endpoint
 * (same pattern as executive team members) to support sponsor images without event ID.
 * When eventId is 0 or not provided, the image is associated only with the sponsor.
 */
export type SponsorImageUploadResult = EventMediaDTO & { ocrChars?: number; ocrError?: string };

function readableImageScanError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  try {
    const parsed = JSON.parse(raw) as { detail?: string; title?: string };
    const detail = parsed.detail || parsed.title || '';
    const quoted = detail.match(/"([^"]+)"/);
    if (quoted?.[1]) return quoted[1];
    if (detail) return detail;
  } catch {
    // The backend body is not JSON.
  }
  return raw || 'Image text scan failed';
}

export async function uploadSponsorImageServer(
  sponsorId: number,
  eventId: number,
  imageType: 'logo' | 'hero' | 'banner',
  file: File,
  tenantId?: string
): Promise<SponsorImageUploadResult> {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(bytes)], { type: file.type || 'application/octet-stream' }),
      file.name || `sponsor-${imageType}`,
    );

    // Convert frontend imageType to backend format: logo -> LOGO_IMAGE, hero -> HERO_IMAGE, banner -> BANNER_IMAGE
    const backendImageType = imageType.toUpperCase() + '_IMAGE';

    const params = new URLSearchParams();
    // Use eventId = 0 for sponsor images without event association (same pattern as executive team members)
    params.append('eventId', String(eventId || 0));

    // Use entityId to identify the sponsor (same pattern as executiveTeamMemberID)
    params.append('entityId', String(sponsorId));

    // Send imageType in backend format (LOGO_IMAGE, HERO_IMAGE, BANNER_IMAGE) to match uploadSponsorImage() switch statement
    params.append('imageType', backendImageType);

    // Set entityType to indicate this is a sponsor entity
    params.append('entityType', 'SPONSOR');

    // Set the appropriate sponsor image flag based on imageType (for backward compatibility)
    if (imageType === 'logo') {
      params.append('isSponsorLogo', 'true');
    } else if (imageType === 'hero') {
      params.append('isSponsorHero', 'true');
    } else if (imageType === 'banner') {
      params.append('isSponsorBanner', 'true');
    }

    // Set other required flags (similar to executive team member pattern)
    params.append('eventFlyer', 'false');
    params.append('isEventManagementOfficialDocument', 'false');
    params.append('isHeroImage', 'false');
    params.append('isActiveHeroImage', 'false');
    params.append('isFeaturedImage', 'false');
    params.append('isPublic', 'true');

    // Backend requires "title" parameter
    const title = `Sponsor ${imageType} - ${sponsorId}`;
    params.append('title', title);

    // Backend accepts optional "description" parameter
    const description = `Sponsor ${imageType} image`;
    params.append('description', description);

    params.append('tenantId', await resolveAdminMutationTenantId(tenantId));

    // Set startDisplayingFromDate to today's date (YYYY-MM-DD format) to satisfy NOT NULL constraint
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    params.append('startDisplayingFromDate', today);

    const baseUrl = getAppUrl();
    // Use the dedicated sponsor-image upload endpoint
    const url = `${baseUrl}/api/proxy/event-medias/upload/sponsor?${params.toString()}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    // 🎯 CRITICAL: Only rely on HTTP status codes for success/failure determination
    // This prevents issues with null responses or malformed JSON from backend errors
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Upload successful - HTTP status:', response.status);

      try {
        const result = await response.json();
        let ocrChars = 0;
        let ocrError: string | undefined;

        try {
          const { refreshImageSearchText } = await import('@/lib/search/refreshImageSearchText');
          ocrChars = await refreshImageSearchText('event_sponsors', sponsorId);
        } catch (scanError) {
          ocrError = readableImageScanError(scanError);
          console.error('[SponsorOCR] post-upload failed:', ocrError);
        }

        return { ...result, ocrChars, ocrError };
      } catch (parseError) {
        console.error('❌ Failed to parse successful upload response:', parseError);
        throw new Error('Upload succeeded but response parsing failed');
      }
    } else {
      // 🚫 Any non-2xx status code indicates failure
      console.error('❌ Upload failed - HTTP status:', response.status);
      const errorText = await response.text();
      throw new Error(`Upload failed with HTTP status ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('Error uploading sponsor image:', error);
    throw error;
  }
}

/**
 * Upload custom poster for event-sponsor combination
 * Uses the generic /api/event-medias/upload endpoint with eventSponsorsJoinId
 */
export async function uploadEventSponsorPosterServer(
  eventId: number,
  sponsorId: number,
  eventSponsorsJoinId: number,
  file: File,
  title?: string,
  description?: string,
  tenantId?: string
): Promise<EventMediaDTO> {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams();
  params.append('eventId', String(eventId));
  params.append('sponsorId', String(sponsorId));
  params.append('eventSponsorsJoinId', String(eventSponsorsJoinId));
  params.append('tenantId', await resolveAdminMutationTenantId(tenantId));
  params.append('isPublic', 'true');

  // Set eventMediaType to indicate this is a custom poster
  params.append('eventMediaType', 'EVENT_SPONSOR_POSTER');

  // Set storage type
  params.append('storageType', 'S3');

  // Set required flags
  params.append('eventFlyer', 'false');
  params.append('isEventManagementOfficialDocument', 'false');
  params.append('isHeroImage', 'false');
  params.append('isActiveHeroImage', 'false');
  params.append('isFeaturedImage', 'false');

  // Title and description
  if (title) {
    params.append('title', title);
  } else {
    params.append('title', `Custom Poster - Event ${eventId} - Sponsor ${sponsorId}`);
  }

  if (description) {
    params.append('description', description);
  } else {
    params.append('description', 'Custom poster for event-sponsor combination');
  }

  // Set startDisplayingFromDate to today's date (YYYY-MM-DD format) to satisfy NOT NULL constraint
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  params.append('startDisplayingFromDate', today);

  const baseUrl = getAppUrl();
  // Use the generic upload endpoint (same pattern as sponsor images)
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
    // 🚫 Any non-2xx status code indicates failure
    console.error('❌ Upload failed - HTTP status:', response.status);
    const errorText = await response.text();
    throw new Error(`Failed to upload event-sponsor poster: ${errorText}`);
  }
}

/**
 * Upload multiple media files for a sponsor
 */
export async function uploadSponsorMediaServer(
  sponsorId: number,
  file: File,
  title?: string,
  description?: string,
  priorityRanking?: number,
  tenantId?: string
): Promise<EventMediaDTO> {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams();
  params.append('sponsorId', String(sponsorId));
  params.append('tenantId', await resolveAdminMutationTenantId(tenantId));
  params.append('isPublic', 'true');
  if (title) params.append('title', title);
  if (description) params.append('description', description);
  if (priorityRanking !== undefined) params.append('priorityRanking', String(priorityRanking));

  // Set startDisplayingFromDate to today's date (YYYY-MM-DD format) to satisfy NOT NULL constraint
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  params.append('startDisplayingFromDate', today);

  const baseUrl = getAppUrl();
  const url = `${baseUrl}/api/proxy/event-medias/upload/sponsor-media?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload sponsor media: ${errorText}`);
  }

  return await response.json();
}

/**
 * Upload multiple media files for an event-sponsor combination
 */
export async function uploadEventSponsorMediaServer(
  eventId: number,
  sponsorId: number,
  file: File,
  title?: string,
  description?: string,
  priorityRanking?: number,
  tenantId?: string
): Promise<EventMediaDTO> {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams();
  params.append('eventId', String(eventId));
  params.append('sponsorId', String(sponsorId));
  params.append('tenantId', await resolveAdminMutationTenantId(tenantId));
  params.append('isPublic', 'true');
  if (title) params.append('title', title);
  if (description) params.append('description', description);
  if (priorityRanking !== undefined) params.append('priorityRanking', String(priorityRanking));

  // Set startDisplayingFromDate to today's date (YYYY-MM-DD format) to satisfy NOT NULL constraint
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  params.append('startDisplayingFromDate', today);

  const baseUrl = getAppUrl();
  const url = `${baseUrl}/api/proxy/event-medias/upload/event-sponsor-media?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload event-sponsor media: ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetch all media files for a sponsor, sorted by priority ranking
 * Uses the criteria-based query endpoint: /api/event-medias?sponsorId.equals={sponsorId}
 */
export async function fetchSponsorMediaServer(
  sponsorId: number,
  tenantId?: string
): Promise<EventMediaDTO[]> {
  const baseUrl = await getAdminProxyBaseUrl();
  const params = new URLSearchParams();

  // Use sponsorId.equals query parameter (JHipster criteria syntax)
  params.append('sponsorId.equals', String(sponsorId));
  const tenant = tenantId?.trim();
  if (tenant) params.append('tenantId.equals', tenant);

  // Sort by priority ranking (ascending - lower = higher priority)
  params.append('sort', 'priorityRanking,asc');

  const url = `${baseUrl}/api/proxy/event-medias?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn(`Failed to fetch sponsor media: ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  let items: EventMediaDTO[];
  if (data && typeof data === 'object' && '_embedded' in data && 'eventMedias' in data._embedded) {
    items = Array.isArray(data._embedded.eventMedias) ? data._embedded.eventMedias : [];
  } else {
    items = Array.isArray(data) ? data : data ? [data] : [];
  }

  return Promise.all(items.map((item) => withSponsorMediaPreview(item, tenant)));
}

/** Root-relative files live on the tenant site. fileUrl stays unchanged so a save does not persist the public origin. */
async function withSponsorMediaPreview(item: EventMediaDTO, tenantId?: string): Promise<EventMediaDTO> {
  const preview = await resolveTeamMemberPortraitUrl(item.fileUrl, tenantId);
  if (!preview || preview === item.fileUrl) return item;
  return { ...item, previewFileUrl: preview };
}

/**
 * Fetch all media files for an event-sponsor combination, sorted by priority ranking
 * Uses the endpoint: /api/event-medias/event-sponsor/{eventId}/{sponsorId}
 */
export async function fetchEventSponsorMediaServer(
  eventId: number,
  sponsorId: number,
  _tenantId?: string
): Promise<EventMediaDTO[]> {
  const baseUrl = await getAdminProxyBaseUrl();
  const params = new URLSearchParams();

  // Sort by priority ranking (ascending - lower = higher priority)
  params.append('sort', 'priorityRanking,asc');

  const url = `${baseUrl}/api/proxy/event-medias/event-sponsor/${eventId}/${sponsorId}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn(`Failed to fetch event-sponsor media: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  // Handle paginated response (Spring Data REST format)
  if (data && typeof data === 'object' && '_embedded' in data && 'eventMedias' in data._embedded) {
    return Array.isArray(data._embedded.eventMedias) ? data._embedded.eventMedias : [];
  }

  // Handle direct array response
  return Array.isArray(data) ? data : [data];
}

/**
 * Update priority ranking of a media file
 */
/**
 * Update event media attributes (full update)
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

  const payload = {
    ...updates,
    id: mediaId,
    tenantId: await resolveAdminMutationTenantId(tenantId),
  };

  const baseUrl = getAppUrl();
  const url = `${baseUrl}/api/proxy/event-medias/${mediaId}`;

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

export async function updateMediaPriorityRankingServer(
  mediaId: number,
  priorityRanking: number,
  tenantId?: string
): Promise<EventMediaDTO> {
  // Validate priority ranking
  if (priorityRanking < 0) {
    throw new Error('Priority ranking must be >= 0');
  }

  // Fetch existing media first to get ALL required fields
  const existingMedia = await fetchEventMediaServer(mediaId, tenantId);

  // Use fetchWithJwtRetry for authenticated backend call
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) {
    throw new Error('API base URL not configured');
  }

  // Include ALL required fields from existing media + updated priority ranking
  // This ensures backend validation passes for all NotNull fields
  const tid = await resolveAdminMutationTenantId(tenantId);
  const payload: Record<string, unknown> = {
    id: mediaId,
    priorityRanking,
    // Required string fields
    storageType: existingMedia.storageType || 'S3',
    eventMediaType: existingMedia.eventMediaType || 'gallery',
    title: existingMedia.title || '',
    createdAt: existingMedia.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Required boolean fields (must not be null)
    isHomePageHeroImage: existingMedia.isHomePageHeroImage ?? false,
    isFeaturedEventImage: existingMedia.isFeaturedEventImage ?? false,
    isLiveEventImage: existingMedia.isLiveEventImage ?? false,
  };
  if (tid != null) payload.tenantId = tid;

  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-medias/${mediaId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update priority ranking: ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetch a single media file by ID
 */
export async function fetchEventMediaServer(
  mediaId: number,
  tenantId?: string
): Promise<EventMediaDTO> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) {
    throw new Error('API base URL not configured');
  }

  const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
  const response = await fetchWithJwtRetry(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch media: ${errorText}`);
  }

  return await response.json();
}

/**
 * Delete a media file
 */
export async function deleteEventMediaServer(
  mediaId: number,
  tenantId?: string
): Promise<boolean> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) {
    throw new Error('API base URL not configured');
  }

  const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
  const response = await fetchWithJwtRetry(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete media: ${errorText}`);
  }

  return true;
}
