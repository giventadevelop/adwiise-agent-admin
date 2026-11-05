'use server';

import { currentUser } from '@clerk/nextjs/server';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import {
  applySiteTypePresetsForTenant,
  fetchTenantSettingsByTenantId,
  patchTenantSetting,
} from '@/app/admin/tenant-management/settings/ApiServerActions';
import { previewNextTenantIdServer } from '@/app/admin/tenant-management/organizations/tenantIdServerActions';
import { listOrganizationPortfolioMembers } from '@/app/admin/tenant-management/portfolios/ApiServerActions';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import { revalidateSatelliteConfigCache } from '@/lib/satelliteConfigRuntime';
import {
  describeOnboardingBackendError,
  normalizeOnboardingHostname,
  validateOnboardingSubmit,
} from '@/lib/onboarding/onboardingShared';
import type {
  OnboardingRequestStatus,
  TenantOnboardingApproveDTO,
  TenantOnboardingRejectDTO,
  TenantOnboardingRequestDTO,
  TenantSiteType,
} from '@/types';

const BASE_PATH = '/api/tenant-onboarding-requests';

export type OnboardingActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function apiUrl(path = ''): string {
  return `${getApiBaseUrl()}${BASE_PATH}${path}`;
}

async function currentReviewer(): Promise<{ reviewedByClerkUserId?: string; reviewedByEmail?: string }> {
  try {
    const user = await currentUser();
    return {
      reviewedByClerkUserId: user?.id,
      reviewedByEmail: user?.emailAddresses?.[0]?.emailAddress,
    };
  } catch {
    return {};
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  return describeOnboardingBackendError(text, fallback);
}

export async function fetchOnboardingRequestsServer(options: {
  page?: number;
  size?: number;
  status?: OnboardingRequestStatus | 'ALL';
  search?: string;
}): Promise<OnboardingActionResult<{ items: TenantOnboardingRequestDTO[]; totalCount: number }>> {
  await assertPlatformSuperAdmin();
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 0));
  params.set('size', String(options.size ?? 20));
  params.append('sort', 'createdAt,desc');
  params.append('sort', 'id,desc');
  if (options.status && options.status !== 'ALL') {
    params.set('status.equals', options.status);
  }
  const search = options.search?.trim();
  if (search) {
    if (/^onb-/i.test(search)) params.set('requestCode.contains', search.toUpperCase());
    else if (search.includes('@')) params.set('contactEmail.contains', search.toLowerCase());
    else if (search.includes('.')) params.set('requestedHostname.contains', search.toLowerCase());
    else params.set('organizationName.contains', search);
  }

  try {
    const response = await fetchWithJwtRetry(`${apiUrl()}?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Failed to load onboarding requests') };
    }
    const data = await response.json();
    const items = Array.isArray(data) ? (data as TenantOnboardingRequestDTO[]) : [];
    const totalCount = parseInt(response.headers.get('x-total-count') || String(items.length), 10);
    return { ok: true, data: { items, totalCount } };
  } catch (error) {
    console.error('[onboarding-requests] list failed', error);
    return { ok: false, error: 'Failed to load onboarding requests' };
  }
}

export async function countPendingOnboardingRequestsServer(): Promise<number> {
  await assertPlatformSuperAdmin();
  try {
    const response = await fetchWithJwtRetry(`${apiUrl('/count')}?status.equals=PENDING`, { cache: 'no-store' });
    if (!response.ok) return 0;
    return Number(await response.json()) || 0;
  } catch {
    return 0;
  }
}

export async function fetchOnboardingRequestServer(id: number): Promise<OnboardingActionResult<TenantOnboardingRequestDTO>> {
  await assertPlatformSuperAdmin();
  try {
    const response = await fetchWithJwtRetry(apiUrl(`/${id}`), { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Onboarding request not found') };
    }
    return { ok: true, data: (await response.json()) as TenantOnboardingRequestDTO };
  } catch (error) {
    console.error('[onboarding-requests] get failed', error);
    return { ok: false, error: 'Failed to load onboarding request' };
  }
}

/** Admin-entered request (phone call, email). Saved as PENDING so it goes through the same review. */
export async function createManualOnboardingRequestServer(
  input: Record<string, unknown>
): Promise<OnboardingActionResult<TenantOnboardingRequestDTO>> {
  await assertPlatformSuperAdmin();
  const { payload, errors } = validateOnboardingSubmit(input);
  const firstError = Object.values(errors)[0];
  if (firstError) return { ok: false, error: firstError };

  try {
    const response = await fetchWithJwtRetry(apiUrl('/submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: 'ADMIN_MANUAL' }),
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Failed to create onboarding request') };
    }
    return { ok: true, data: (await response.json()) as TenantOnboardingRequestDTO };
  } catch (error) {
    console.error('[onboarding-requests] manual create failed', error);
    return { ok: false, error: 'Failed to create onboarding request' };
  }
}

/** Saves reviewer edits on a PENDING or FAILED request (backend ignores status / provisioning fields). */
export async function updateOnboardingRequestServer(
  id: number,
  patch: Partial<TenantOnboardingRequestDTO>
): Promise<OnboardingActionResult<TenantOnboardingRequestDTO>> {
  await assertPlatformSuperAdmin();
  const body: Partial<TenantOnboardingRequestDTO> = { ...patch, id };
  if (typeof body.requestedHostname === 'string') {
    body.requestedHostname = normalizeOnboardingHostname(body.requestedHostname);
  }
  if (typeof body.contactEmail === 'string') {
    body.contactEmail = body.contactEmail.trim().toLowerCase();
  }
  try {
    const response = await fetchWithJwtRetry(apiUrl(`/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Failed to save changes') };
    }
    return { ok: true, data: (await response.json()) as TenantOnboardingRequestDTO };
  } catch (error) {
    console.error('[onboarding-requests] patch failed', error);
    return { ok: false, error: 'Failed to save changes' };
  }
}

export async function previewOnboardingTenantIdServer(rawPrefix: string): Promise<string | null> {
  await assertPlatformSuperAdmin();
  const preview = await previewNextTenantIdServer(rawPrefix);
  return preview?.tenantId ?? null;
}

export interface OnboardingAvailability {
  tenantIdTaken: boolean;
  organizationDomainTaken: boolean;
  satelliteKeyTaken: boolean;
  hostnameTaken: boolean;
}

async function existsInList(path: string, params: Record<string, string>): Promise<boolean> {
  const qs = new URLSearchParams({ ...params, size: '1' });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${path}?${qs.toString()}`, { cache: 'no-store' });
  if (!response.ok) return false;
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

/** Pre-flight checks shown on the review screen. The backend repeats them inside the approve transaction. */
export async function checkOnboardingAvailabilityServer(input: {
  tenantId?: string;
  organizationDomain?: string;
  satelliteKey?: string;
  hostname?: string;
}): Promise<OnboardingAvailability> {
  await assertPlatformSuperAdmin();
  const tenantId = input.tenantId?.trim();
  const domain = input.organizationDomain?.trim().toLowerCase();
  const satelliteKey = input.satelliteKey?.trim();
  const hostname = normalizeOnboardingHostname(input.hostname);

  const [tenantIdTaken, organizationDomainTaken, satelliteKeyTaken, hostnameTaken] = await Promise.all([
    tenantId ? existsInList('/api/tenant-organizations', { 'tenantId.equals': tenantId }) : Promise.resolve(false),
    domain ? existsInList('/api/tenant-organizations', { 'domain.equals': domain }) : Promise.resolve(false),
    satelliteKey ? existsInList('/api/satellite-domains', { 'satelliteKey.equals': satelliteKey }) : Promise.resolve(false),
    hostname ? existsInList('/api/satellite-domains', { 'hostname.equals': hostname }) : Promise.resolve(false),
  ]).catch((error) => {
    console.error('[onboarding-requests] availability check failed', error);
    return [false, false, false, false];
  });

  return { tenantIdTaken, organizationDomainTaken, satelliteKeyTaken, hostnameTaken };
}

function defaultHeroPatch(tenantId: string): Record<string, unknown> | null {
  const templateRaw = process.env.DEFAULT_HERO_TEMPLATE_URLS || process.env.AMPLIFY_DEFAULT_HERO_TEMPLATE_URLS || '';
  const urls = templateRaw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => url.replace('{tenantId}', tenantId));
  if (urls.length === 0) return null;
  return {
    defaultHeroImageUrlsJson: JSON.stringify(urls),
    defaultHeroDisplayMode: 'slideshow',
    defaultHeroIncludeWithEvents: true,
  };
}

/**
 * Approves a request: the backend creates organization, settings, emails, satellite domain and
 * admin profiles in one transaction. Site-type presets and hero defaults are applied afterwards
 * (best effort) and the satellite config cache is refreshed.
 */
export async function approveOnboardingRequestServer(
  id: number,
  approve: TenantOnboardingApproveDTO,
  siteType?: TenantSiteType | null
): Promise<OnboardingActionResult<{ request: TenantOnboardingRequestDTO; warnings: string[] }>> {
  await assertPlatformSuperAdmin();
  let request: TenantOnboardingRequestDTO;
  try {
    const response = await fetchWithJwtRetry(apiUrl(`/${id}/approve`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...approve, ...(await currentReviewer()) }),
      cache: 'no-store',
      timeout: 60000,
    });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Approval failed') };
    }
    request = (await response.json()) as TenantOnboardingRequestDTO;
  } catch (error) {
    console.error('[onboarding-requests] approve failed', error);
    return { ok: false, error: 'Approval failed. Check the request status before retrying.' };
  }

  const warnings: string[] = [];
  const tenantId = request.assignedTenantId || approve.tenantId;

  if (siteType) {
    const applied = await applySiteTypePresetsForTenant(tenantId, siteType).catch(() => false);
    if (!applied) warnings.push('Site-type presets were not applied; set them in Tenant Settings.');
  }

  const heroPatch = defaultHeroPatch(tenantId);
  if (heroPatch) {
    try {
      const settings = await fetchTenantSettingsByTenantId(tenantId);
      if (settings?.id && !settings.defaultHeroImageUrlsJson) {
        await patchTenantSetting(settings.id, { ...heroPatch, tenantId });
      }
    } catch (error) {
      console.error('[onboarding-requests] hero defaults failed', error);
      warnings.push('Default hero images were not applied; set them in Tenant Settings.');
    }
  }

  if (approve.portfolioId) {
    try {
      const members = await listOrganizationPortfolioMembers(approve.portfolioId);
      const linked = members.some((member) => member.tenantId === tenantId);
      if (!linked) {
        warnings.push('The site was created, but it was not added to the portfolio. Add it from Organization portfolios.');
      }
    } catch (error) {
      console.error('[onboarding-requests] portfolio membership check failed', error);
      warnings.push('The site was created. Confirm the portfolio membership on Organization portfolios.');
    }
  }

  revalidateSatelliteConfigCache();
  return { ok: true, data: { request, warnings } };
}

export async function rejectOnboardingRequestServer(
  id: number,
  reject: TenantOnboardingRejectDTO
): Promise<OnboardingActionResult<TenantOnboardingRequestDTO>> {
  await assertPlatformSuperAdmin();
  if (!reject.adminComments?.trim()) {
    return { ok: false, error: 'A rejection reason is required' };
  }
  try {
    const response = await fetchWithJwtRetry(apiUrl(`/${id}/reject`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reject, ...(await currentReviewer()) }),
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, error: await readError(response, 'Rejection failed') };
    }
    return { ok: true, data: (await response.json()) as TenantOnboardingRequestDTO };
  } catch (error) {
    console.error('[onboarding-requests] reject failed', error);
    return { ok: false, error: 'Rejection failed' };
  }
}
