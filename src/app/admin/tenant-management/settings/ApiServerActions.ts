'use server';
import { appendAdminTenantFilter, getCurrentAdminAccess, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { withTenantId } from '@/lib/withTenantId';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl, getAppUrl } from '@/lib/env';
import { fetchTenantOrganizations } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { stripDeprecatedSettingsIdentityFields } from '@/lib/stripDeprecatedSettingsIdentityFields';
import { getSiteTypePresetSettings } from '@/lib/siteTypePresets';
import { fetchRetailerTypes } from '@/app/admin/access-catalogs/ApiServerActions';
import type {
  TenantSettingsDTO,
  TenantSettingsFormDTO,
  TenantSettingsFilters,
  TenantOrganizationDTO,
  PaginationParams,
  PaginatedResponse
} from '@/app/admin/tenant-management/types';
import { normalizeDefaultHeroImageUrlsJsonForApi } from '@/lib/hero/defaultHeroImages';
import { revalidateSatelliteConfigCache } from '@/lib/satelliteConfigRuntime';

const API_BASE_URL = getApiBaseUrl();

/** Logo changes feed auth branding via getMergedSatelliteConfigs — bust that cache. */
function maybeRevalidateSatelliteAuthBranding(data: Partial<TenantSettingsFormDTO>) {
  if ('logoImageUrl' in data) {
    revalidateSatelliteConfigCache();
  }
}

/**
 * Resolve the tenant_organization row for a tenantId so create/update can set
 * tenant_organization_id (form DTO omits tenantOrganization).
 */
async function resolveTenantOrganizationByTenantId(
  tenantId: string | undefined,
  logLabel: string,
): Promise<TenantOrganizationDTO | null> {
  const tid = await resolveAdminMutationTenantId(tenantId);
  if (!tid) return null;

  try {
    const orgResult = await fetchTenantOrganizations(
      { page: 0, pageSize: 1 },
      { tenantId: tid },
    );
    const org = orgResult.data?.[0];
    if (org?.id) {
      console.log(`[${logLabel}] Found tenantOrganization:`, {
        id: org.id,
        organizationName: org.organizationName,
        tenantId: org.tenantId,
      });
      return org;
    }
    console.warn(`[${logLabel}] No tenant organization found for tenantId:`, tid);
  } catch (orgError) {
    console.error(`[${logLabel}] Error fetching tenant organization:`, orgError);
  }
  return null;
}

/**
 * Fetch paginated list of tenant settings
 */
export async function fetchTenantSettings(
  pagination: PaginationParams,
  filters: TenantSettingsFilters = {}
): Promise<PaginatedResponse<TenantSettingsDTO>> {
  try {
    const params = new URLSearchParams();

    // Add pagination parameters
    params.append('page', pagination.page.toString());
    params.append('size', pagination.pageSize.toString());

    await appendAdminTenantFilter(params, filters.tenantId);

    const tenantIdContains = filters.tenantIdContains?.trim() || filters.search?.trim();
    if (tenantIdContains) {
      params.append('tenantId.contains', tenantIdContains);
    }
    if (filters.idEquals != null && !Number.isNaN(filters.idEquals)) {
      params.append('id.equals', String(filters.idEquals));
    }
    if (filters.emailContains?.trim()) {
      params.append('email.contains', filters.emailContains.trim());
    }
    if (filters.phoneNumberContains?.trim()) {
      params.append('phoneNumber.contains', filters.phoneNumberContains.trim());
    }
    if (filters.countryContains?.trim()) {
      params.append('country.contains', filters.countryContains.trim());
    }
    if (filters.stateProvinceContains?.trim()) {
      params.append('stateProvince.contains', filters.stateProvinceContains.trim());
    }
    if (filters.addressLine1Contains?.trim()) {
      params.append('addressLine1.contains', filters.addressLine1Contains.trim());
    }

    // Organization name is not a supported criteria on /api/tenant-settings in practice.
    // Resolve matching tenant IDs from /api/tenant-organizations, then filter settings with tenantId.in.
    const orgNameQ = filters.organizationNameContains?.trim();
    if (orgNameQ) {
      const orgPageSize = 200;
      const tenantIdSet = new Set<string>();
      let orgPage = 0;
      let orgTotal = Infinity;
      const maxOrgPages = 50;
      while (orgPage < maxOrgPages && orgPage * orgPageSize < orgTotal) {
        const orgResult = await fetchTenantOrganizations(
          { page: orgPage, pageSize: orgPageSize },
          {
            search: orgNameQ,
            tenantId: filters.tenantId?.trim() || undefined,
          }
        );
        for (const o of orgResult.data) {
          if (typeof o.tenantId === 'string' && o.tenantId.trim() !== '') {
            tenantIdSet.add(o.tenantId.trim());
          }
        }
        orgTotal = orgResult.totalCount;
        orgPage += 1;
        if (orgResult.data.length < orgPageSize) break;
      }
      const tenantIds = [...tenantIdSet];
      if (tenantIds.length === 0) {
        return {
          data: [],
          totalCount: 0,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: 0,
        };
      }
      params.append('tenantId.in', tenantIds.join(','));
    }

    const boolParam = (key: string, v: boolean | undefined) => {
      if (v !== undefined) params.append(`${key}.equals`, String(v));
    };
    boolParam('allowUserRegistration', filters.allowUserRegistration);
    boolParam('requireAdminApproval', filters.requireAdminApproval);
    boolParam('enableWhatsappIntegration', filters.enableWhatsappIntegration);
    boolParam('enableEmailMarketing', filters.enableEmailMarketing);
    boolParam('enableGuestRegistration', filters.enableGuestRegistration);
    boolParam('isMembershipSubscriptionEnabled', filters.isMembershipSubscriptionEnabled);

    // Add sorting
    if (filters.sortBy) {
      const sortDirection = filters.sortOrder || 'asc';
      params.append('sort', `${filters.sortBy},${sortDirection}`);
    }

    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-settings?${params.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant settings: ${response.statusText}`);
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get('x-total-count') || '0');

    return {
      data: Array.isArray(data) ? data : [],
      totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize)
    };
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    throw new Error('Failed to fetch tenant settings');
  }
}

/**
 * Fetch a single tenant setting by ID
 */
export async function fetchTenantSetting(id: number): Promise<TenantSettingsDTO | null> {
  try {
    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-settings/${id}`,
      { cache: 'no-store' }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant setting: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tenant setting:', error);
    throw new Error('Failed to fetch tenant setting');
  }
}

/**
 * Fetch tenant settings by tenant ID
 */
export async function fetchTenantSettingsByTenantId(tenantId: string): Promise<TenantSettingsDTO | null> {
  try {
    const params = new URLSearchParams();
    params.append('tenantId.equals', tenantId);

    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-settings?${params.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant settings by tenant ID: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching tenant settings by tenant ID:', error);
    throw new Error('Failed to fetch tenant settings by tenant ID');
  }
}

/**
 * Create a new tenant setting
 */
function getOnboardingDefaultHeroPayload(tenantId: string): Partial<TenantSettingsFormDTO> {
  const templateRaw = process.env.DEFAULT_HERO_TEMPLATE_URLS || process.env.AMPLIFY_DEFAULT_HERO_TEMPLATE_URLS || '';
  const templateUrls = templateRaw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => url.replace('{tenantId}', tenantId));

  if (templateUrls.length === 0) {
    return {};
  }

  return {
    defaultHeroImageUrlsJson: JSON.stringify(templateUrls),
    defaultHeroDisplayMode: 'slideshow',
    defaultHeroIncludeWithEvents: true,
  };
}

function parseTenantSettingsApiError(errorText: string, action: 'create' | 'update'): string {
  const lower = errorText.toLowerCase();
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'Settings for this tenant already exist. Edit the existing settings instead of creating new ones.';
  }
  if (lower.includes('column') && lower.includes('does not exist')) {
    return 'The backend database is missing required columns. Apply the tenant profile migration and restart the API server.';
  }
  try {
    const parsed = JSON.parse(errorText) as {
      detail?: string;
      title?: string;
      message?: string;
      error?: string;
    };
    if (parsed.detail) return parsed.detail;
    if (parsed.message) return parsed.message;
    if (parsed.title) return parsed.title;
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }
  const trimmed = errorText.trim();
  if (trimmed.length > 0 && trimmed.length <= 500) {
    return trimmed;
  }
  return action === 'create' ? 'Failed to create tenant settings.' : 'Failed to update tenant settings.';
}

async function repositoryUrlForSave(
  requested: unknown,
  existingUrl: string | null | undefined,
): Promise<string | null> {
  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin) {
    const kept = existingUrl?.trim();
    return kept && kept.length > 0 ? kept : null;
  }
  if (typeof requested !== 'string') {
    const kept = existingUrl?.trim();
    return kept && kept.length > 0 ? kept : null;
  }
  const trimmed = requested.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1024) {
    throw new Error('Repository URL must be 1024 characters or less.');
  }
  return trimmed;
}

export async function createTenantSetting(data: TenantSettingsFormDTO): Promise<TenantSettingsDTO> {
  try {
    const heroDefaults =
      data.defaultHeroImageUrlsJson || data.defaultHeroImageUrls?.length
        ? {}
        : getOnboardingDefaultHeroPayload(data.tenantId);

    // Form omits tenantOrganization — auto-link by tenantId (same as update/patch).
    const tenantOrganization = await resolveTenantOrganizationByTenantId(
      data.tenantId,
      'createTenantSetting',
    );

    const repositoryUrl = await repositoryUrlForSave(data.repositoryUrl, null);
    const payload = withTenantId({
      ...stripDeprecatedSettingsIdentityFields(data as Record<string, unknown>),
      ...heroDefaults,
      repositoryUrl,
      displayEventHeroImages: data.displayEventHeroImages ?? true,
      tenantOrganization: tenantOrganization || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('[createTenantSetting] Payload with tenantOrganization:', {
      tenantId: payload.tenantId,
      organizationId: tenantOrganization?.id,
      organizationName: tenantOrganization?.organizationName,
      hasOrganization: !!tenantOrganization,
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[createTenantSetting] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 2000),
      });
      throw new Error(parseTenantSettingsApiError(errorText, 'create'));
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating tenant setting:', error);
    if (error instanceof Error && error.message !== 'Failed to create tenant settings.') {
      throw error;
    }
    throw new Error('Failed to create tenant settings. Please try again.');
  }
}

/**
 * Update an existing tenant setting
 */
export async function updateTenantSetting(
  id: number,
  data: Partial<TenantSettingsFormDTO>
): Promise<TenantSettingsDTO> {
  try {
    // First fetch the existing tenant setting to preserve fields not in form
    const existingSetting = await fetchTenantSetting(id);

    if (!existingSetting) {
      throw new Error('Tenant setting not found');
    }

    // If tenantOrganization is missing or incomplete, try to fetch it by tenantId
    let tenantOrganization = existingSetting.tenantOrganization;

    if (!tenantOrganization || !tenantOrganization.id) {
      console.log('[updateTenantSetting] Missing tenantOrganization, fetching by tenantId:', existingSetting.tenantId);
      tenantOrganization =
        (await resolveTenantOrganizationByTenantId(existingSetting.tenantId, 'updateTenantSetting')) ??
        undefined;
    }

    const repositoryUrl = await repositoryUrlForSave(data.repositoryUrl, existingSetting.repositoryUrl);
    const payload = withTenantId({
      ...stripDeprecatedSettingsIdentityFields(data as Record<string, unknown>),
      repositoryUrl,
      id,
      createdAt: existingSetting.createdAt, // Preserve original createdAt
      updatedAt: new Date().toISOString(),
      // Include the tenantOrganization relationship (either existing or newly fetched)
      tenantOrganization: tenantOrganization || null,
    });

    if ('defaultHeroImageUrlsJson' in payload) {
      payload.defaultHeroImageUrlsJson = normalizeDefaultHeroImageUrlsJsonForApi(
        payload.defaultHeroImageUrlsJson as string | null | undefined,
      );
    }

    console.log('[updateTenantSetting] Final payload with tenantOrganization:', {
      tenantId: payload.tenantId,
      organizationId: tenantOrganization?.id,
      organizationName: tenantOrganization?.organizationName,
      hasOrganization: !!tenantOrganization
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-settings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update tenant setting: ${errorText}`);
    }

    const result = await response.json();
    maybeRevalidateSatelliteAuthBranding(data);
    return result;
  } catch (error) {
    console.error('Error updating tenant setting:', error);
    throw new Error('Failed to update tenant setting');
  }
}

/**
 * Partially update an existing tenant setting
 */
export async function patchTenantSetting(
  id: number,
  data: Partial<TenantSettingsFormDTO>
): Promise<TenantSettingsDTO> {
  try {
    // For PATCH operations, we should also preserve tenantOrganization if not explicitly provided
    const existingSetting = await fetchTenantSetting(id);

    if (!existingSetting) {
      throw new Error('Tenant setting not found');
    }

    // If tenantOrganization is missing or incomplete, try to fetch it by tenantId
    let tenantOrganization = existingSetting.tenantOrganization;

    if (!tenantOrganization || !tenantOrganization.id) {
      console.log('[patchTenantSetting] Missing tenantOrganization, fetching by tenantId:', existingSetting.tenantId);
      tenantOrganization =
        (await resolveTenantOrganizationByTenantId(existingSetting.tenantId, 'patchTenantSetting')) ??
        undefined;
    }

    const repositoryUrl = await repositoryUrlForSave(
      'repositoryUrl' in data ? data.repositoryUrl : existingSetting.repositoryUrl,
      existingSetting.repositoryUrl,
    );
    const payload = withTenantId({
      ...stripDeprecatedSettingsIdentityFields(data as Record<string, unknown>),
      repositoryUrl,
      id,
      updatedAt: new Date().toISOString(),
      // Include the tenantOrganization relationship (either existing or newly fetched)
      tenantOrganization: tenantOrganization || null,
    });

    if ('defaultHeroImageUrlsJson' in payload) {
      payload.defaultHeroImageUrlsJson = normalizeDefaultHeroImageUrlsJsonForApi(
        payload.defaultHeroImageUrlsJson as string | null | undefined,
      );
    }

    console.log('[patchTenantSetting] Final payload with tenantOrganization:', {
      tenantId: payload.tenantId,
      organizationId: tenantOrganization?.id,
      organizationName: tenantOrganization?.organizationName,
      hasOrganization: !!tenantOrganization
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-settings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update tenant setting: ${errorText}`);
    }

    const result = await response.json();
    maybeRevalidateSatelliteAuthBranding(data);
    return result;
  } catch (error) {
    console.error('Error patching tenant setting:', error);
    throw new Error('Failed to update tenant setting');
  }
}

/**
 * Delete a tenant setting
 */
export async function deleteTenantSetting(id: number): Promise<void> {
  try {
    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-settings/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete tenant setting: ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting tenant setting:', error);
    throw new Error('Failed to delete tenant setting');
  }
}

/**
 * Upload email footer HTML file (client-side function)
 * Note: This must be called from client components, not server actions
 */
/** When editing another tenant's settings, pass their tenantId so S3/backend use the correct scope. */
function tenantUploadQuery(tenantIdForUpload?: string) {
  const t = tenantIdForUpload?.trim();
  return t ? `?tenantId=${encodeURIComponent(t)}` : '';
}

export async function uploadEmailFooterHtmlClient(
  file: File,
  tenantIdForUpload?: string
): Promise<{ url: string }> {
  const baseUrl = getAppUrl();
  const formData = new FormData();

  formData.append('file', file);

  const url = `${baseUrl}/api/proxy/tenant-settings/upload/email-footer-html${tenantUploadQuery(tenantIdForUpload)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Client] Error uploading email footer HTML: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Failed to upload email footer HTML. Status: ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.emailFooterHtmlUrl || result.url || '',
  };
}

/**
 * Upload tenant logo image (client-side function)
 * Note: This must be called from client components, not server actions
 */
export async function uploadTenantLogoClient(
  file: File,
  tenantIdForUpload?: string
): Promise<{ url: string }> {
  const baseUrl = getAppUrl();
  const formData = new FormData();

  formData.append('file', file);

  const url = `${baseUrl}/api/proxy/tenant-settings/upload/tenant-logo${tenantUploadQuery(tenantIdForUpload)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Client] Error uploading tenant logo: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Failed to upload tenant logo. Status: ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.logoImageUrl || result.url || '',
  };
}

/**
 * Upload email header image (client-side function)
 * Note: This must be called from client components, not server actions
 */
export async function uploadEmailHeaderImageClient(
  file: File,
  tenantIdForUpload?: string
): Promise<{ url: string }> {
  const baseUrl = getAppUrl();
  const formData = new FormData();

  formData.append('file', file);

  const url = `${baseUrl}/api/proxy/tenant-settings/upload/email-header-image${tenantUploadQuery(tenantIdForUpload)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Client] Error uploading email header image: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Failed to upload email header image. Status: ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.emailHeaderImageUrl || result.url || '',
  };
}

/**
 * Upload a default homepage hero image (client-side function).
 * Stores under tenants/{tenantId}/hero-defaults/ on the backend.
 */
export async function uploadDefaultHeroImageClient(
  file: File,
  tenantIdForUpload?: string
): Promise<{ url: string }> {
  const baseUrl = getAppUrl();
  const formData = new FormData();

  formData.append('file', file);

  const url = `${baseUrl}/api/proxy/tenant-settings/upload/default-hero-image${tenantUploadQuery(tenantIdForUpload)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[Client] Error uploading default hero image: ${response.status} ${response.statusText}`,
      errorBody
    );
    throw new Error(`Failed to upload default hero image. Status: ${response.status}`);
  }

  const result = await response.json();
  return {
    url: result.defaultHeroImageUrl || result.url || '',
  };
}

/**
 * Apply homepage section presets for a tenant when its site type changes.
 * Tenant is always explicit — this admin app manages all tenants.
 */
export async function applySiteTypePresetsForTenant(
  tenantId: string,
  siteType: string
): Promise<boolean> {
  try {
    const settings = await fetchTenantSettingsByTenantId(tenantId);
    if (!settings?.id) {
      console.warn('[applySiteTypePresetsForTenant] No settings row for tenant', tenantId);
      return false;
    }
    const retailers = await fetchRetailerTypes(tenantId).catch(() => []);
    const moduleKey = retailers.find((row) => row.code === siteType)?.moduleKey;
    const presetPatch = getSiteTypePresetSettings(siteType, moduleKey);
    await patchTenantSetting(settings.id, { ...presetPatch, tenantId });
    return true;
  } catch (error) {
    console.error('[applySiteTypePresetsForTenant]', error);
    return false;
  }
}