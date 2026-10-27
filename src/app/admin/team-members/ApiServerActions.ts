'use server';
import { appendAdminTenantFilter, headersForAdminTenantScope, resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';

import { getAdminProxyBaseUrl } from '@/lib/adminProxyBaseUrl';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { parseTeamMembersResponse } from '@/lib/parseTeamMembersResponse';
import type { TeamMemberDTO } from '@/types/teamMember';
import type { TeamMemberAchievementDTO } from '@/types/teamMemberAchievement';

/** Optional filters for admin list; tenant only when `?tenant=` is passed (see effectiveTenantId). */
export interface TeamMemberListFilters {
  tenantId?: string;
  teamGroupId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  instrument?: string;
  /** Exact member id */
  id?: string;
  /** When set, adds isActive.equals */
  isActive?: boolean;
  /** Spring sort, e.g. priorityOrder,asc */
  sort?: string;
}

function appendContainsIfTrimmed(params: URLSearchParams, field: string, value: string | undefined): void {
  const v = value?.trim();
  if (v) params.append(`${field}.contains`, v);
}

/**
 * Paginated list for admin. Omit tenantId.equals unless filters.tenantId is set (URL ?tenant=);
 * otherwise proxy uses JWT + X-Tenant-ID only.
 */
export async function fetchTeamMembersPage(
  page: number,
  pageSize: number,
  filters?: TeamMemberListFilters
): Promise<{ members: TeamMemberDTO[]; totalCount: number }> {
  try {
    const baseUrl = await getAdminProxyBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const params = new URLSearchParams({
      sort: filters?.sort?.trim() || 'priorityOrder,asc',
      page: String(Math.max(0, page)),
      size: String(Math.max(1, pageSize)),
    });

    await appendAdminTenantFilter(params, filters?.tenantId);

    if (filters?.teamGroupId != null && Number.isFinite(filters.teamGroupId)) {
      params.append('teamGroupId.equals', String(filters.teamGroupId));
    }

    const idTrim = filters?.id?.trim();
    if (idTrim && /^\d+$/.test(idTrim)) {
      params.append('id.equals', idTrim);
    }

    appendContainsIfTrimmed(params, 'firstName', filters?.firstName);
    appendContainsIfTrimmed(params, 'lastName', filters?.lastName);
    appendContainsIfTrimmed(params, 'email', filters?.email);
    appendContainsIfTrimmed(params, 'position', filters?.position);
    appendContainsIfTrimmed(params, 'instrument', filters?.instrument);

    if (typeof filters?.isActive === 'boolean') {
      params.append('isActive.equals', filters.isActive ? 'true' : 'false');
    }

    const response = await fetch(
      `${baseUrl}/api/proxy/team-members?${params.toString()}`,
      {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch team members: ${response.status}`);
    }

    const data = await response.json();
    const members = parseTeamMembersResponse(data);
    const totalHeader = response.headers.get('x-total-count');
    const parsed = totalHeader != null ? parseInt(totalHeader, 10) : NaN;
    const totalCount = Number.isFinite(parsed) ? parsed : members.length;
    return { members, totalCount };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Team members fetch timed out after 15 seconds');
    } else {
      console.error('Error fetching team members:', error);
    }
    return { members: [], totalCount: 0 };
  }
}

/** Convenience for non-paginated callers. */
export async function fetchTeamMembers(
  teamGroupId?: number,
  tenantId?: string
): Promise<TeamMemberDTO[]> {
  const { members } = await fetchTeamMembersPage(0, 200, {
    tenantId,
    teamGroupId,
    sort: 'priorityOrder,asc',
  });
  return members;
}

export async function createTeamMember(
  payload: Omit<TeamMemberDTO, 'id'>,
  tenantId?: string
): Promise<TeamMemberDTO | null> {
  try {
    const baseUrl = await getAdminProxyBaseUrl();
    const body: Record<string, unknown> = { ...payload };
    const tid = await resolveAdminMutationTenantId(tenantId);
    if (tid != null) body.tenantId = tid;
    const now = new Date().toISOString();
    if (!body.createdAt) body.createdAt = now;
    if (!body.updatedAt) body.updatedAt = now;

    const response = await fetch(`${baseUrl}/api/proxy/team-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to create team member: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMember(
  id: number,
  payload: Partial<TeamMemberDTO>,
  tenantId?: string
): Promise<TeamMemberDTO | null> {
  try {
    const baseUrl = await getAdminProxyBaseUrl();
    const body: Record<string, unknown> = {
      ...payload,
      id,
      updatedAt: new Date().toISOString(),
    };
    const tid = await resolveAdminMutationTenantId(tenantId);
    if (tid != null) body.tenantId = tid;

    const response = await fetch(`${baseUrl}/api/proxy/team-members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to update team member: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating team member:', error);
    return null;
  }
}

export async function deleteTeamMember(id: number): Promise<boolean> {
  try {
    const baseUrl = await getAdminProxyBaseUrl();
    const response = await fetch(`${baseUrl}/api/proxy/team-members/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete team member: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting team member:', error);
    return false;
  }
}

export async function updateTeamMemberProfileImage(
  memberId: number,
  imageUrl: string,
  tenantId?: string
): Promise<TeamMemberDTO | null> {
  return updateTeamMember(memberId, { profileImageUrl: imageUrl }, tenantId);
}

function asAchievementList(data: unknown): TeamMemberAchievementDTO[] {
  if (Array.isArray(data)) return data as TeamMemberAchievementDTO[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: TeamMemberAchievementDTO[] }).content;
  }
  return [];
}

export async function fetchTeamMemberAchievements(teamMemberId: number): Promise<TeamMemberAchievementDTO[]> {
  const baseUrl = await getAdminProxyBaseUrl();
  const params = new URLSearchParams({
    'teamMemberId.equals': String(teamMemberId),
    sort: 'displayOrder,asc',
    size: '100',
  });
  const response = await fetch(`${baseUrl}/api/proxy/team-member-achievements?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load achievements: ${response.status}`);
  }
  return asAchievementList(await response.json());
}

export async function createTeamMemberAchievement(
  payload: Omit<TeamMemberAchievementDTO, 'id'>,
  tenantId?: string
): Promise<TeamMemberAchievementDTO> {
  const baseUrl = await getAdminProxyBaseUrl();
  const body: Record<string, unknown> = { ...payload };
  const tid = await resolveAdminMutationTenantId(tenantId);
  if (tid != null) body.tenantId = tid;
  const response = await fetch(`${baseUrl}/api/proxy/team-member-achievements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create achievement: ${response.status}`);
  }
  return await response.json();
}

export async function updateTeamMemberAchievement(
  id: number,
  payload: Partial<TeamMemberAchievementDTO>,
  tenantId?: string
): Promise<TeamMemberAchievementDTO> {
  const baseUrl = await getAdminProxyBaseUrl();
  const body: Record<string, unknown> = { ...payload, id };
  const tid = await resolveAdminMutationTenantId(tenantId);
  if (tid != null) body.tenantId = tid;
  const response = await fetch(`${baseUrl}/api/proxy/team-member-achievements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to update achievement: ${response.status}`);
  }
  return await response.json();
}

const publicOriginCache = new Map<string, string | null>();

function firstApiRecord(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0];
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  }
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.content)) {
    const row = obj.content[0];
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  }
  const embedded = obj._embedded;
  if (embedded && typeof embedded === 'object') {
    const list = Object.values(embedded as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined;
    const row = list?.[0];
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  }
  return obj;
}

function originFromOrganization(row: Record<string, unknown> | null): string | null {
  const website = typeof row?.websiteUrl === 'string' ? row.websiteUrl.trim() : '';
  const domain = typeof row?.domain === 'string' ? row.domain.trim() : '';
  const raw = website || (domain ? `https://${domain}` : '');
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, '');
}

async function fetchTenantPublicOrigin(tenantId?: string | null): Promise<string | null> {
  const key = tenantId?.trim() || '';
  if (!key) return null;
  if (publicOriginCache.has(key)) return publicOriginCache.get(key) ?? null;
  try {
    const headers = await headersForAdminTenantScope(key);
    const url = `${getApiBaseUrl()}/api/tenant-organizations?tenantId.equals=${encodeURIComponent(key)}&size=1`;
    const res = await fetchWithJwtRetry(url, { cache: 'no-store', headers });
    if (!res.ok) {
      publicOriginCache.set(key, null);
      return null;
    }
    const origin = originFromOrganization(firstApiRecord(await res.json()));
    publicOriginCache.set(key, origin);
    return origin;
  } catch (error) {
    console.error('[fetchTenantPublicOrigin]', error);
    return null;
  }
}

/**
 * Roster portraits are often stored as root-relative paths (`/images/...`) that exist on the
 * tenant public site, not on this admin hub. Absolute and data URLs are returned unchanged.
 */
export async function resolveTeamMemberPortraitUrl(
  profileImageUrl: string | null | undefined,
  tenantId?: string | null
): Promise<string | null> {
  const raw = profileImageUrl?.trim() || '';
  if (!raw) return null;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (!raw.startsWith('/')) return raw;
  const origin = await fetchTenantPublicOrigin(tenantId);
  return origin ? `${origin}${raw}` : raw;
}

export async function deleteTeamMemberAchievement(id: number): Promise<void> {
  const baseUrl = await getAdminProxyBaseUrl();
  const response = await fetch(`${baseUrl}/api/proxy/team-member-achievements/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete achievement: ${response.status}`);
  }
}
