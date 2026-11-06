'use server';

import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { appendAdminTenantFilter, getCurrentAdminAccess } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import { pickAllUserProfiles } from '@/lib/pickFirstUserProfile';
import {
  RETAIL_REGIONAL_MANAGER_ROLE,
  RETAIL_STORE_MANAGER_ROLE,
  retailScopeForRole,
  type RetailLocationScope,
} from '@/lib/retailAccess';
import type { UserProfileDTO } from '@/types';
import type {
  RetailDailyMetricsDTO,
  RetailFuelDayDTO,
  RetailIntegrationDTO,
  RetailLocationDTO,
  RetailLocationProfileDTO,
  RetailRecommendationDTO,
  RetailRecommendationStatus,
  RetailUserLocationAssignmentDTO,
  RetailUserRegionAssignmentDTO,
} from '@/types/retail';

const API_BASE_URL = getApiBaseUrl();

export interface RetailMorningAccess {
  scope: RetailLocationScope;
  allowedLocationIds: number[] | null;
  canAssign: boolean;
  role: string | null;
}

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T[];
    const embedded = obj._embedded as Record<string, unknown> | undefined;
    if (embedded) {
      const firstArray = Object.values(embedded).find(Array.isArray);
      if (firstArray) return firstArray as T[];
    }
  }
  return [];
}

async function clerkIdentity(): Promise<{ userId: string | null; email?: string }> {
  const authResult = await auth();
  const userId = authResult?.userId || null;
  let email: string | undefined;
  try {
    email = (await currentUser())?.emailAddresses?.[0]?.emailAddress;
  } catch {
    email = undefined;
  }
  return { userId, email };
}

async function listProfiles(query: URLSearchParams): Promise<UserProfileDTO[]> {
  const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles?${query}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    omitEnvTenantId: true,
  });
  if (!res.ok) return [];
  return pickAllUserProfiles(await res.json());
}

function retailRoleQuery(field: 'userId.equals' | 'email.equals', value: string): URLSearchParams {
  const query = new URLSearchParams();
  query.set(field, value);
  query.append('userRole.in', 'RETAIL_OWNER');
  query.append('userRole.in', 'RETAIL_REGIONAL_MANAGER');
  query.append('userRole.in', 'RETAIL_STORE_MANAGER');
  query.set('size', '50');
  return query;
}

export async function fetchRetailProfilesForClerkUser(
  userId: string,
  email?: string | null
): Promise<UserProfileDTO[]> {
  if (!userId) return [];
  let profiles = await listProfiles(retailRoleQuery('userId.equals', userId));
  if (email?.trim()) {
    const byEmail = await listProfiles(retailRoleQuery('email.equals', email.trim()));
    const seen = new Set(profiles.map(profile => profile.id));
    profiles = profiles.concat(byEmail.filter(profile => profile.id == null || !seen.has(profile.id)));
  }
  return profiles;
}

async function fetchScopedList<T>(path: string, tenantId: string | undefined, extra?: Record<string, string>): Promise<T[]> {
  const params = new URLSearchParams({ size: '200' });
  await appendAdminTenantFilter(params, tenantId);
  for (const [key, value] of Object.entries(extra ?? {})) {
    params.append(key, value);
  }
  const res = await fetchWithJwtRetry(`${API_BASE_URL}${path}?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return normalizeList<T>(await res.json());
}

function keepsLocation(locationId: number | null | undefined, allowed: number[] | null): boolean {
  if (allowed === null) return true;
  return locationId != null && allowed.includes(locationId);
}

export const getRetailMorningAccess = cache(async (tenantId?: string): Promise<RetailMorningAccess> => {
  const denied: RetailMorningAccess = { scope: 'NONE', allowedLocationIds: [], canAssign: false, role: null };
  const { userId, email } = await clerkIdentity();
  if (!userId) return denied;
  const adminAccess = await getCurrentAdminAccess();
  if (adminAccess.isPlatformSuperAdmin) {
    return { scope: 'ALL', allowedLocationIds: null, canAssign: true, role: 'SUPER_ADMIN' };
  }

  const params = new URLSearchParams({ size: '20' });
  params.set('userId.equals', userId);
  await appendAdminTenantFilter(params, tenantId);
  let profiles = await listProfiles(params);
  if (profiles.length === 0 && email?.trim()) {
    const byEmail = new URLSearchParams({ size: '20', 'email.equals': email.trim() });
    await appendAdminTenantFilter(byEmail, tenantId);
    profiles = await listProfiles(byEmail);
  }
  const profile = profiles[0];
  const role = profile?.userRole ?? null;
  const scope = retailScopeForRole(role);
  if (scope === 'ALL') {
    return { scope, allowedLocationIds: null, canAssign: true, role };
  }
  if (scope === 'ASSIGNED' && profile?.id != null) {
    if (role === RETAIL_REGIONAL_MANAGER_ROLE) {
      const regions = await fetchScopedList<RetailUserRegionAssignmentDTO>(
        '/api/retail-user-region-assignments',
        tenantId,
        { 'userProfileId.equals': String(profile.id) }
      );
      const names = new Set(regions.map(row => row.region).filter(Boolean));
      const locations = await fetchScopedList<RetailLocationDTO>('/api/retail-locations', tenantId, {
        sort: 'locationCode,asc',
      });
      const ids = locations
        .filter(location => location.id != null && location.region && names.has(location.region))
        .map(location => location.id as number);
      return { scope, allowedLocationIds: ids, canAssign: false, role };
    }
    if (role === RETAIL_STORE_MANAGER_ROLE) {
      const rows = await fetchScopedList<RetailUserLocationAssignmentDTO>(
        '/api/retail-user-location-assignments',
        tenantId,
        { 'userProfileId.equals': String(profile.id) }
      );
      return {
        scope,
        allowedLocationIds: rows.map(row => row.locationId),
        canAssign: false,
        role,
      };
    }
  }
  if (adminAccess.isAdmin) {
    return { scope: 'ALL', allowedLocationIds: null, canAssign: true, role: role || 'ADMIN' };
  }
  return denied;
});

export async function fetchRetailLocationsServer(tenantId?: string): Promise<RetailLocationDTO[]> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return [];
  const rows = await fetchScopedList<RetailLocationDTO>('/api/retail-locations', tenantId, { sort: 'locationCode,asc' });
  return rows.filter(row => keepsLocation(row.id, access.allowedLocationIds));
}

export async function fetchRetailMetricsServer(date: string, tenantId?: string): Promise<RetailDailyMetricsDTO[]> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return [];
  const rows = await fetchScopedList<RetailDailyMetricsDTO>('/api/retail-daily-metrics', tenantId, {
    'metricDate.equals': date,
  });
  return rows.filter(row => keepsLocation(row.locationId, access.allowedLocationIds));
}

export async function fetchRetailFuelDaysServer(date: string, tenantId?: string): Promise<RetailFuelDayDTO[]> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return [];
  const rows = await fetchScopedList<RetailFuelDayDTO>('/api/retail-fuel-days', tenantId, {
    'metricDate.equals': date,
  });
  return rows.filter(row => keepsLocation(row.locationId, access.allowedLocationIds));
}

export async function fetchRetailRecommendationsServer(
  date: string,
  tenantId?: string
): Promise<RetailRecommendationDTO[]> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return [];
  const rows = await fetchScopedList<RetailRecommendationDTO>('/api/retail-recommendations', tenantId, {
    'recommendationDate.equals': date,
  });
  return rows.filter(row => keepsLocation(row.locationId, access.allowedLocationIds));
}

export interface RetailMorningBundle {
  locations: RetailLocationDTO[];
  metrics: RetailDailyMetricsDTO[];
  fuelDays: RetailFuelDayDTO[];
  recommendations: RetailRecommendationDTO[];
  canAssign: boolean;
  denied: boolean;
  storeError: string | null;
  metricsError: string | null;
  fuelError: string | null;
  cardError: string | null;
}

function describeRetailFailure(label: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  if (/unexpected end of json|empty response/i.test(raw)) {
    return `The ${label} service returned an empty response.`;
  }
  if (/timed out/i.test(raw)) {
    return `The ${label} service timed out.`;
  }
  return `The ${label} service did not respond.`;
}

async function settleRetailList<T>(label: string, run: () => Promise<T[]>): Promise<{ rows: T[]; error: string | null }> {
  try {
    return { rows: await run(), error: null };
  } catch (error) {
    console.error(`[loadRetailMorningBundle] ${label}`, error);
    return { rows: [], error: describeRetailFailure(label, error) };
  }
}

const EMPTY_MORNING_BUNDLE: RetailMorningBundle = {
  locations: [],
  metrics: [],
  fuelDays: [],
  recommendations: [],
  canAssign: false,
  denied: false,
  storeError: null,
  metricsError: null,
  fuelError: null,
  cardError: null,
};

export async function loadRetailMorningBundle(date: string, tenantId?: string): Promise<RetailMorningBundle> {
  try {
    const access = await getRetailMorningAccess(tenantId);
    if (access.scope === 'NONE') {
      return { ...EMPTY_MORNING_BUNDLE, denied: true };
    }
    const [locations, metrics, fuelDays, recommendations] = await Promise.all([
      settleRetailList('store', () => fetchRetailLocationsServer(tenantId)),
      settleRetailList('daily numbers', () => fetchRetailMetricsServer(date, tenantId)),
      settleRetailList('fuel', () => fetchRetailFuelDaysServer(date, tenantId)),
      settleRetailList('morning card', () => fetchRetailRecommendationsServer(date, tenantId)),
    ]);
    return {
      locations: locations.rows,
      metrics: metrics.rows,
      fuelDays: fuelDays.rows,
      recommendations: recommendations.rows,
      canAssign: access.canAssign,
      denied: false,
      storeError: locations.error,
      metricsError: metrics.error,
      fuelError: fuelDays.error,
      cardError: recommendations.error,
    };
  } catch (error) {
    console.error('[loadRetailMorningBundle]', error);
    return { ...EMPTY_MORNING_BUNDLE, storeError: describeRetailFailure('store', error) };
  }
}

async function readProblemDetail(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: string; title?: string; message?: string };
    const detail = (body.detail || body.message || body.title || '').trim();
    return detail || null;
  } catch {
    return null;
  }
}

export async function askRetailBriefServer(
  tenantId: string,
  date: string,
  stationCode: string,
  question: string,
  options?: {
    recommendationId?: number | string;
    recommendationTitle?: string;
    siteType?: string;
    /** Snapshot of what the morning page already shows (platform Postgres), so Ask matches the UI. */
    context?: {
      stationCode?: string;
      metrics?: Record<string, unknown> | null;
      fuelDay?: Record<string, unknown> | null;
      recommendations?: Array<Record<string, unknown>>;
    };
  }
): Promise<{ reply: string | null; error?: string }> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE' || !question.trim()) return { reply: null };
  try {
    // Amplify cannot reach the internal engine ALB; backend forwards to RETAIL_ENGINE_BASE_URL.
    const payload: Record<string, unknown> = { tenantId, metricDate: date, stationCode, question };
    if (options?.recommendationId != null) payload.recommendationId = String(options.recommendationId);
    if (options?.recommendationTitle) payload.recommendationTitle = options.recommendationTitle;
    if (options?.siteType) payload.siteType = options.siteType;
    if (options?.context) payload.context = options.context;
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-brief/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detail = await readProblemDetail(res);
      return {
        reply: null,
        error: detail
          ? `Ask failed (HTTP ${res.status}): ${detail}`
          : `Ask failed (HTTP ${res.status}). Is the AI engine running at RETAIL_ENGINE_BASE_URL?`,
      };
    }
    const body = (await res.json()) as { reply?: string };
    return { reply: body.reply || null };
  } catch (error) {
    console.error('[askRetailBriefServer]', error);
    return { reply: null, error: 'Ask failed. Try again in a moment.' };
  }
}

export async function refreshRetailBriefServer(
  tenantId: string,
  date: string,
  stationCode?: string
): Promise<{ ok: boolean; error?: string }> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return { ok: false };
  try {
    // Best-effort engine refresh; morning brief still reloads from the platform either way.
    const payload: Record<string, unknown> = {
      tenantId,
      metricDate: date,
      source: 'history',
      post: false,
    };
    if (stationCode) payload.stationCode = stationCode;
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-brief/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detail = await readProblemDetail(res);
      return {
        ok: false,
        error: detail
          ? `Refresh trigger failed (HTTP ${res.status}): ${detail}`
          : `Refresh trigger failed (HTTP ${res.status}).`,
      };
    }
    return { ok: true };
  } catch (error) {
    console.error('[refreshRetailBriefServer]', error);
    return { ok: false, error: 'Refresh trigger failed. Reloading saved brief.' };
  }
}

export async function updateRetailRecommendationServer(
  id: number,
  locationId: number,
  status: RetailRecommendationStatus,
  tenantId?: string
): Promise<RetailRecommendationDTO | null> {
  const access = await getRetailMorningAccess(tenantId);
  if (!keepsLocation(locationId, access.scope === 'NONE' ? [] : access.allowedLocationIds)) return null;
  const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-recommendations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ id, locationId, status, updatedAt: new Date().toISOString() }),
  });
  if (!res.ok) return null;
  return (await res.json()) as RetailRecommendationDTO;
}

async function requireAssigner(tenantId?: string): Promise<RetailMorningAccess | null> {
  const access = await getRetailMorningAccess(tenantId);
  return access.canAssign ? access : null;
}

export async function fetchRetailPeopleServer(tenantId: string | undefined, role: string): Promise<UserProfileDTO[]> {
  if (!(await requireAssigner(tenantId))) return [];
  const params = new URLSearchParams({ size: '200', 'userRole.equals': role });
  await appendAdminTenantFilter(params, tenantId);
  return listProfiles(params);
}

export async function fetchRetailLocationAssignmentsServer(tenantId?: string): Promise<RetailUserLocationAssignmentDTO[]> {
  if (!(await requireAssigner(tenantId))) return [];
  return fetchScopedList<RetailUserLocationAssignmentDTO>('/api/retail-user-location-assignments', tenantId);
}

export async function fetchRetailRegionAssignmentsServer(tenantId?: string): Promise<RetailUserRegionAssignmentDTO[]> {
  if (!(await requireAssigner(tenantId))) return [];
  return fetchScopedList<RetailUserRegionAssignmentDTO>('/api/retail-user-region-assignments', tenantId);
}

export async function replaceRetailLocationAssignmentsServer(
  userProfileId: number,
  locationIds: number[],
  tenantId?: string
): Promise<boolean> {
  if (!(await requireAssigner(tenantId))) return false;
  const existing = await fetchScopedList<RetailUserLocationAssignmentDTO>('/api/retail-user-location-assignments', tenantId, {
    'userProfileId.equals': String(userProfileId),
  });
  const desired = new Set(locationIds);
  for (const row of existing) {
    if (row.id == null || desired.has(row.locationId)) continue;
    const removed = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-user-location-assignments/${row.id}`, {
      method: 'DELETE',
    });
    if (!removed.ok) return false;
  }
  const have = new Set(existing.map(row => row.locationId));
  const scopedTenant = tenantId;
  for (const locationId of locationIds) {
    if (have.has(locationId)) continue;
    const created = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-user-location-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: scopedTenant,
        userProfileId,
        locationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
    if (!created.ok) return false;
  }
  return true;
}

async function writeRetailResource<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T | null> {
  const res = await fetchWithJwtRetry(method === 'POST' ? `${API_BASE_URL}${path}` : `${API_BASE_URL}${path}`, {
    method,
    headers: method === 'DELETE' ? undefined : { 'Content-Type': method === 'PATCH' ? 'application/merge-patch+json' : 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (method === 'DELETE') return (res.ok ? (true as T) : null);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export interface RetailLocationsPage {
  content: RetailLocationDTO[];
  totalElements: number;
  totalPages: number;
}

export async function fetchRetailLocationsPageServer(
  page: number,
  size: number,
  tenantId?: string
): Promise<RetailLocationsPage> {
  try {
    const params = new URLSearchParams({
      page: String(Math.max(0, page)),
      size: String(Math.min(Math.max(1, size), 100)),
      sort: 'locationCode,asc',
    });
    await appendAdminTenantFilter(params, tenantId);
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-locations?${params}`, { cache: 'no-store' });
    if (!res.ok) return { content: [], totalElements: 0, totalPages: 0 };
    const content = normalizeList<RetailLocationDTO>(await res.json());
    const rawTotal = res.headers.get('x-total-count');
    const totalElements = rawTotal != null && Number.isFinite(parseInt(rawTotal, 10))
      ? Math.max(0, parseInt(rawTotal, 10))
      : content.length;
    return {
      content,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / Math.max(1, size))),
    };
  } catch (error) {
    console.error('[fetchRetailLocationsPageServer]', error);
    return { content: [], totalElements: 0, totalPages: 0 };
  }
}

export async function saveRetailLocationServer(data: RetailLocationDTO): Promise<RetailLocationDTO | null> {
  const now = new Date().toISOString();
  if (data.id == null) {
    return writeRetailResource<RetailLocationDTO>('/api/retail-locations', 'POST', {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
  return writeRetailResource<RetailLocationDTO>(`/api/retail-locations/${data.id}`, 'PATCH', {
    ...data,
    updatedAt: now,
  });
}

export async function deleteRetailLocationServer(id: number): Promise<boolean> {
  const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-locations/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function fetchRetailProfilesServer(tenantId?: string): Promise<RetailLocationProfileDTO[]> {
  return fetchScopedList<RetailLocationProfileDTO>('/api/retail-location-profiles', tenantId);
}

export async function saveRetailProfileServer(data: RetailLocationProfileDTO): Promise<RetailLocationProfileDTO | null> {
  const now = new Date().toISOString();
  if (data.id == null) {
    return writeRetailResource<RetailLocationProfileDTO>('/api/retail-location-profiles', 'POST', {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
  return writeRetailResource<RetailLocationProfileDTO>(`/api/retail-location-profiles/${data.id}`, 'PATCH', {
    ...data,
    updatedAt: now,
  });
}

export async function fetchRetailIntegrationsAdminServer(tenantId?: string): Promise<RetailIntegrationDTO[]> {
  return fetchScopedList<RetailIntegrationDTO>('/api/retail-integrations', tenantId, { sort: 'systemType,asc' });
}

export async function saveRetailIntegrationServer(data: RetailIntegrationDTO): Promise<RetailIntegrationDTO | null> {
  const now = new Date().toISOString();
  if (data.id == null) {
    return writeRetailResource<RetailIntegrationDTO>('/api/retail-integrations', 'POST', {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
  return writeRetailResource<RetailIntegrationDTO>(`/api/retail-integrations/${data.id}`, 'PATCH', {
    ...data,
    updatedAt: now,
  });
}

export async function deleteRetailIntegrationServer(id: number): Promise<boolean> {
  const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-integrations/${id}`, { method: 'DELETE' });
  return res.ok;
}

async function fetchRetailRange<T>(path: string, fromDate: string, toDate: string, tenantId?: string): Promise<T[]> {
  const params = new URLSearchParams({
    size: '2000',
    'metricDate.greaterThanOrEqual': fromDate,
    'metricDate.lessThanOrEqual': toDate,
  });
  await appendAdminTenantFilter(params, tenantId);
  const res = await fetchWithJwtRetry(`${API_BASE_URL}${path}?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return normalizeList<T>(await res.json());
}

export async function fetchRetailMetricsRangeServer(
  fromDate: string,
  toDate: string,
  tenantId?: string
): Promise<RetailDailyMetricsDTO[]> {
  return fetchRetailRange<RetailDailyMetricsDTO>('/api/retail-daily-metrics', fromDate, toDate, tenantId);
}

export async function fetchRetailFuelRangeServer(
  fromDate: string,
  toDate: string,
  tenantId?: string
): Promise<RetailFuelDayDTO[]> {
  return fetchRetailRange<RetailFuelDayDTO>('/api/retail-fuel-days', fromDate, toDate, tenantId);
}

export async function replaceRetailRegionAssignmentsServer(
  userProfileId: number,
  regions: string[],
  tenantId?: string
): Promise<boolean> {
  if (!(await requireAssigner(tenantId))) return false;
  const cleaned = regions.map(region => region.trim()).filter(Boolean);
  const existing = await fetchScopedList<RetailUserRegionAssignmentDTO>('/api/retail-user-region-assignments', tenantId, {
    'userProfileId.equals': String(userProfileId),
  });
  const desired = new Set(cleaned);
  for (const row of existing) {
    if (row.id == null || desired.has(row.region)) continue;
    const removed = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-user-region-assignments/${row.id}`, {
      method: 'DELETE',
    });
    if (!removed.ok) return false;
  }
  const have = new Set(existing.map(row => row.region));
  for (const region of cleaned) {
    if (have.has(region)) continue;
    const created = await fetchWithJwtRetry(`${API_BASE_URL}/api/retail-user-region-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        userProfileId,
        region,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
    if (!created.ok) return false;
  }
  return true;
}
