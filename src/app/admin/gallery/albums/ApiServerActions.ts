'use server';
import { appendAdminTenantFilter, headersForAdminTenantScope, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import { youtubeThumbnailUrl, YOUTUBE_GALLERY_MEDIA_TYPE } from '@/lib/gallery/youtubeMedia';
import type { GalleryAlbumDTO, EventMediaDTO, GalleryCategoryDTO } from '@/types';
import { throwFormattedBackendError } from '@/lib/api/formatBackendError';

const API_BASE_URL = getApiBaseUrl();

/**
 * When admin UI selects `?tenant=`, override X-Tenant-ID so the backend scopes to that tenant
 * (same pattern as manage-usage). Without this, fetchWithJwtRetry keeps the platform env tenant.
 */
async function headersForTenantScope(
  tenantId: string | undefined,
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  return headersForAdminTenantScope(tenantId, extra);
}

/** Optional filters for admin album list; tenant only when ?tenant= is passed. */
export type GalleryAlbumListFilters = {
  tenantId?: string;
  title?: string;
  description?: string;
  id?: string;
  isPublic?: boolean;
  sort?: string;
};

/** Active gallery categories for album create/edit dropdowns. */
export async function fetchGalleryCategoriesServer(
  tenantId?: string,
): Promise<GalleryCategoryDTO[]> {
  try {
    const params = new URLSearchParams();
    params.append('page', '0');
    params.append('size', '100');
    params.append('sort', 'sortOrder,asc');
    params.append('sort', 'displayName,asc');
    params.append('isActive.equals', 'true');
    await appendAdminTenantFilter(params, tenantId);

    const url = `${API_BASE_URL}/api/gallery-categories?${params.toString()}`;
    const res = await fetchWithJwtRetry(url, {
      cache: 'no-store',
      headers: await headersForTenantScope(tenantId),
    });
    if (!res.ok) {
      console.error('[fetchGalleryCategoriesServer] Failed:', res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[fetchGalleryCategoriesServer]', error);
    return [];
  }
}

/**
 * Create new album (pass tenantId from ?tenant= when creating under a selected tenant).
 */
export async function createAlbumServer(
  album: Omit<GalleryAlbumDTO, 'id' | 'createdAt' | 'updatedAt'>,
  tenantId?: string,
): Promise<GalleryAlbumDTO> {
  try {
    const tid = await resolveAdminMutationTenantId(tenantId ?? album.tenantId);
    const { buildGalleryAlbumSearchText } = await import('@/lib/search/buildSearchText');
    const payload = withTenantId({
      ...album,
      searchText: buildGalleryAlbumSearchText({
        title: album.title,
        description: album.description,
        eventLocation: album.eventLocation,
        ocrText: album.ocrText,
      }),
      ...(tid ? { tenantId: tid } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const url = `${API_BASE_URL}/api/gallery-albums`;
    const res = await fetchWithJwtRetry(url, {
      method: 'POST',
      headers: await headersForTenantScope(tid, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to create album:', res.status, errorText);
      throwFormattedBackendError(errorText, 'Failed to create album');
    }

    return await res.json();
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
}

/**
 * Fetch albums with pagination and filtering.
 * Accepts either a legacy searchTerm string or a GalleryAlbumListFilters object.
 */
export async function fetchAlbumsServer(
  page: number = 0,
  size: number = 12,
  searchTermOrFilters?: string | GalleryAlbumListFilters,
  isPublic?: boolean
): Promise<{ albums: GalleryAlbumDTO[]; totalCount: number }> {
  try {
    const filters: GalleryAlbumListFilters =
      typeof searchTermOrFilters === 'string'
        ? {
            title: searchTermOrFilters || undefined,
            isPublic,
          }
        : searchTermOrFilters ?? { isPublic };

    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());

    await appendAdminTenantFilter(params, filters.tenantId);

    const titleQ = filters.title?.trim();
    if (titleQ) params.append('title.contains', titleQ);

    const descQ = filters.description?.trim();
    if (descQ) params.append('description.contains', descQ);

    const idQ = filters.id?.trim();
    if (idQ && !Number.isNaN(Number(idQ))) {
      params.append('id.equals', String(Number(idQ)));
    }

    if (typeof filters.isPublic === 'boolean') {
      params.append('isPublic.equals', filters.isPublic.toString());
    }

    const sort = filters.sort?.trim() || 'displayOrder,asc';
    params.append('sort', sort);
    if (!sort.startsWith('createdAt')) {
      params.append('sort', 'createdAt,desc');
    }

    const url = `${API_BASE_URL}/api/gallery-albums?${params.toString()}`;
    const res = await fetchWithJwtRetry(url, {
      cache: 'no-store',
      headers: await headersForTenantScope(filters.tenantId),
    });

    if (!res.ok) {
      console.error('Failed to fetch albums:', res.status, res.statusText);
      return { albums: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    const albums: GalleryAlbumDTO[] = await res.json();
    const albumsArray = Array.isArray(albums) ? albums : [];

    return { albums: albumsArray, totalCount };
  } catch (error) {
    console.error('Error fetching albums:', error);
    return { albums: [], totalCount: 0 };
  }
}

/**
 * Fetch album by ID
 */
/**
 * Fetch a single album by ID.
 * Pass tenantId when loading under platform all-tenants admin so X-Tenant-ID matches the album.
 */
export async function fetchAlbumServer(
  albumId: number,
  tenantId?: string,
): Promise<GalleryAlbumDTO | null> {
  try {
    const tid = await resolveAdminMutationTenantId(tenantId);
    const url = `${API_BASE_URL}/api/gallery-albums/${albumId}`;
    const res = await fetchWithJwtRetry(url, {
      cache: 'no-store',
      headers: await headersForTenantScope(tid),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      console.error('Failed to fetch album:', res.status, res.statusText);
      throw new Error(`Failed to fetch album: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching album:', error);
    throw error;
  }
}

/**
 * Update album
 */
export async function updateAlbumServer(
  albumId: number,
  updates: Partial<GalleryAlbumDTO>,
  tenantId?: string,
): Promise<GalleryAlbumDTO> {
  try {
    const tid = await resolveAdminMutationTenantId(tenantId ?? updates.tenantId);
    const incomingOcr =
      typeof updates.ocrText === 'string' && updates.ocrText.trim()
        ? updates.ocrText.trim()
        : undefined;
    const touchesSearch =
      updates.title !== undefined ||
      updates.description !== undefined ||
      updates.eventLocation !== undefined ||
      incomingOcr !== undefined ||
      updates.searchText !== undefined;
    let searchText = updates.searchText;
    if (touchesSearch && searchText === undefined) {
      const { buildGalleryAlbumSearchText } = await import('@/lib/search/buildSearchText');
      const existing = await fetchAlbumServer(albumId, tid);
      searchText = buildGalleryAlbumSearchText({
        title: updates.title ?? existing?.title,
        description: updates.description ?? existing?.description,
        eventLocation: updates.eventLocation ?? existing?.eventLocation,
        ocrText: incomingOcr ?? existing?.ocrText,
      });
    }
    const payload = withTenantId({
      ...updates,
      ...(searchText !== undefined ? { searchText } : {}),
      id: albumId,
      ...(tid ? { tenantId: tid } : {}),
      updatedAt: new Date().toISOString(),
    });
    if (incomingOcr) {
      payload.ocrText = incomingOcr;
    } else {
      delete payload.ocrText;
    }

    const url = `${API_BASE_URL}/api/gallery-albums/${albumId}`;
    const res = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: await headersForTenantScope(tid, { 'Content-Type': 'application/merge-patch+json' }),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to update album:', res.status, errorText);
      throwFormattedBackendError(errorText, 'Failed to update album');
    }

    return await res.json();
  } catch (error) {
    console.error('Error updating album:', error);
    throw error;
  }
}

/**
 * Delete album
 */
export async function deleteAlbumServer(albumId: number, tenantId?: string): Promise<void> {
  try {
    const url = `${API_BASE_URL}/api/gallery-albums/${albumId}`;
    const res = await fetchWithJwtRetry(url, {
      method: 'DELETE',
      cache: 'no-store',
      headers: await headersForTenantScope(tenantId),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to delete album:', res.status, errorText);
      throwFormattedBackendError(errorText, 'Failed to delete album');
    }
  } catch (error) {
    console.error('Error deleting album:', error);
    throw error;
  }
}

/**
 * Add media to album
 */
export async function addMediaToAlbumServer(albumId: number, mediaIds: number[]): Promise<void> {
  try {
    // Update each media item to set album_id and clear event_id
    for (const mediaId of mediaIds) {
      const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
      const payload = {
        id: mediaId,
        albumId,
        eventId: null, // Clear event association
        updatedAt: new Date().toISOString(),
      };

      const res = await fetchWithJwtRetry(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to add media ${mediaId} to album:`, res.status, errorText);
        throw new Error(`Failed to add media ${mediaId} to album: ${errorText}`);
      }
    }
  } catch (error) {
    console.error('Error adding media to album:', error);
    throw error;
  }
}

/**
 * Remove media from album
 */
export async function removeMediaFromAlbumServer(mediaId: number): Promise<void> {
  try {
    const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;

    // Backend PATCH ignores null fields, so albumId:null never clears the album.
    // PUT replaces the full record, which requires the complete current DTO.
    const currentRes = await fetchWithJwtRetry(url, { cache: 'no-store' });
    if (!currentRes.ok) {
      const errorText = await currentRes.text();
      throw new Error(`Failed to load media ${mediaId}: ${errorText}`);
    }
    const current: EventMediaDTO = await currentRes.json();

    const payload = {
      ...current,
      id: mediaId,
      albumId: null,
      title: current.title || current.fileUrl?.split('/').pop() || `Media ${mediaId}`,
      eventMediaType: current.eventMediaType || current.contentType || 'image/jpeg',
      storageType: current.storageType || 'S3',
      createdAt: current.createdAt || new Date().toISOString(),
      isHomePageHeroImage: Boolean(current.isHomePageHeroImage ?? false),
      isFeaturedEventImage: Boolean(current.isFeaturedEventImage ?? false),
      isLiveEventImage: Boolean(current.isLiveEventImage ?? false),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetchWithJwtRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to remove media from album:', res.status, errorText);
      throw new Error(`Failed to remove media from album: ${errorText}`);
    }
  } catch (error) {
    console.error('Error removing media from album:', error);
    throw error;
  }
}

/**
 * Fetch media for album
 */
export async function fetchAlbumMediaServer(
  albumId: number,
  page: number = 0,
  size: number = 20
): Promise<{ media: EventMediaDTO[]; totalCount: number }> {
  try {
    const params = new URLSearchParams();
    params.append('albumId.equals', albumId.toString());
    params.append('page', page.toString());
    params.append('size', size.toString());
    params.append('sort', 'displayOrder,asc');
    params.append('sort', 'updatedAt,desc');

    const url = `${API_BASE_URL}/api/event-medias?${params.toString()}`;
    const res = await fetchWithJwtRetry(url, { cache: 'no-store' });

    if (!res.ok) {
      console.error('Failed to fetch album media:', res.status, res.statusText);
      return { media: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    const media: EventMediaDTO[] = await res.json();
    const mediaArray = Array.isArray(media) ? media : [];

    return { media: mediaArray, totalCount };
  } catch (error) {
    console.error('Error fetching album media:', error);
    return { media: [], totalCount: 0 };
  }
}


/**
 * Set cover image for album
 */
export async function setAlbumCoverImageServer(albumId: number, coverImageUrl: string): Promise<GalleryAlbumDTO> {
  try {
    const url = `${API_BASE_URL}/api/gallery-albums/${albumId}`;
    const payload = withTenantId({
      id: albumId,
      coverImageUrl,
      updatedAt: new Date().toISOString(),
    });

    const res = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to set cover image:', res.status, errorText);
      throw new Error(`Failed to set cover image: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error setting cover image:', error);
    throw error;
  }
}

/**
 * Edit media (update media properties)
 */
export async function editAlbumMediaServer(mediaId: number | string, payload: Partial<EventMediaDTO>): Promise<EventMediaDTO> {
  try {
    const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
    const cleanedPayload = withTenantId({
      ...payload,
      id: Number(mediaId),
      eventMediaType: payload.eventMediaType || 'gallery',
      storageType: payload.storageType || 's3',
      updatedAt: new Date().toISOString(),
    });

    const res = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(cleanedPayload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update media: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error updating media:', error);
    throw error;
  }
}

/**
 * Delete media
 */
export async function deleteAlbumMediaServer(mediaId: number | string): Promise<void> {
  try {
    const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
    const res = await fetchWithJwtRetry(url, {
      method: 'DELETE',
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete media: ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
}

/**
 * Add a YouTube video as an album gallery item.
 */
export async function createAlbumYoutubeMediaServer(input: {
  albumId: number;
  youtubeUrl: string;
  title: string;
  description?: string;
  displayOrder?: number;
  isPublic?: boolean;
}): Promise<EventMediaDTO> {
  const youtubeUrl = input.youtubeUrl.trim();
  const title = input.title.trim();
  const thumbnail = youtubeThumbnailUrl(youtubeUrl);
  if (!title) {
    throw new Error('Title is required.');
  }
  if (!thumbnail) {
    throw new Error('Enter a YouTube video URL.');
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const payload = withTenantId({
    title,
    description: input.description?.trim() || '',
    eventMediaType: YOUTUBE_GALLERY_MEDIA_TYPE,
    storageType: 'EXTERNAL',
    fileUrl: thumbnail,
    contentType: YOUTUBE_GALLERY_MEDIA_TYPE,
    isPublic: input.isPublic !== false,
    eventFlyer: false,
    isAgendaFlyer: false,
    isEventManagementOfficialDocument: false,
    altText: title,
    displayOrder: input.displayOrder ?? 0,
    isFeaturedVideo: true,
    featuredVideoUrl: youtubeUrl,
    isHeroImage: false,
    isActiveHeroImage: false,
    isHomePageHeroImage: false,
    isFeaturedEventImage: false,
    isLiveEventImage: false,
    albumId: input.albumId,
    startDisplayingFromDate: today,
    createdAt: now,
    updatedAt: now,
  });

  const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-medias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to add YouTube video');
  }

  return (await res.json()) as EventMediaDTO;
}

/**
 * Read text from a just-uploaded album cover and store it on the album.
 * A failed read leaves the uploaded image in place.
 */
export async function persistGalleryCoverOcrServer(
  albumId: number,
  file: File,
  tenantId?: string,
): Promise<number> {
  const { refreshImageSearchText } = await import('@/lib/search/refreshImageSearchText');
  return refreshImageSearchText('gallery_album', albumId);
}
