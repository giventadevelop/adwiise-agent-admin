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
  RetailLocationDTO,
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

const ENGINE_BASE_URL = process.env.RETAIL_ENGINE_BASE_URL || 'http://127.0.0.1:8090';

export async function askRetailBriefServer(
  tenantId: string,
  date: string,
  stationCode: string,
  question: string
): Promise<{ reply: string | null }> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE' || !question.trim()) return { reply: null };
  const res = await fetch(`${ENGINE_BASE_URL}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, metricDate: date, stationCode, question }),
    cache: 'no-store',
  });
  if (!res.ok) return { reply: null };
  const body = (await res.json()) as { reply?: string };
  return { reply: body.reply || null };
}

export async function refreshRetailBriefServer(
  tenantId: string,
  date: string
): Promise<{ ok: boolean }> {
  const access = await getRetailMorningAccess(tenantId);
  if (access.scope === 'NONE') return { ok: false };
  const res = await fetch(`${ENGINE_BASE_URL}/v1/runs/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, metricDate: date, source: 'history', post: false }),
    cache: 'no-store',
  });
  return { ok: res.ok };
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
