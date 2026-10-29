'use server';

import {
  appendAdminTenantFilter,
  headersForAdminTenantScope,
  resolveAdminMutationTenantId,
} from '@/app/admin/adminAccessServer';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { LeagueClubDTO, LeagueDTO, LeagueMatchDTO, LeagueStandingDTO, LeagueStandingRowDTO } from '@/types/league';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { TeamGroupMembershipDTO } from '@/types/league';
import type { TeamMemberDTO } from '@/types/teamMember';

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

async function request<T>(
  path: string,
  init: RequestInit = {},
  scopeTenantId?: string | null
): Promise<T> {
  const scopedHeaders = await headersForAdminTenantScope(scopeTenantId);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...scopedHeaders,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

async function listQuery(extra: Record<string, string> = {}, tenantId?: string | null) {
  const params = new URLSearchParams({ size: '200', ...extra });
  await appendAdminTenantFilter(params, tenantId);
  return params.toString();
}

export async function listLeagues(tenantId?: string | null): Promise<LeagueDTO[]> {
  const qs = await listQuery({ sort: 'name,asc' }, tenantId);
  const data = await request<unknown>(`/api/leagues?${qs}`, {}, tenantId);
  return normalizeList<LeagueDTO>(data);
}

export async function saveLeague(
  league: LeagueDTO,
  tenantId?: string | null
): Promise<LeagueDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || league.tenantId);
  if (league.id) {
    return request<LeagueDTO>(
      `/api/leagues/${league.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...league, id: league.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<LeagueDTO>(
    '/api/leagues',
    {
      method: 'POST',
      body: JSON.stringify({ ...league, id: null, tenantId: resolvedTenantId }),
    },
    resolvedTenantId
  );
}

export async function deleteLeague(id: number, tenantId?: string | null): Promise<void> {
  await request(`/api/leagues/${id}`, { method: 'DELETE' }, tenantId);
}

export async function listLeagueClubs(
  leagueId: number,
  tenantId?: string | null
): Promise<LeagueClubDTO[]> {
  const qs = await listQuery(
    { 'leagueId.equals': String(leagueId), sort: 'displayOrder,asc' },
    tenantId
  );
  const data = await request<unknown>(`/api/league-clubs?${qs}`, {}, tenantId);
  return normalizeList<LeagueClubDTO>(data);
}

export async function saveLeagueClub(
  club: LeagueClubDTO,
  tenantId?: string | null
): Promise<LeagueClubDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || club.tenantId);
  if (club.id) {
    return request<LeagueClubDTO>(
      `/api/league-clubs/${club.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...club, id: club.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<LeagueClubDTO>(
    '/api/league-clubs',
    {
      method: 'POST',
      body: JSON.stringify({ ...club, id: null, tenantId: resolvedTenantId }),
    },
    resolvedTenantId
  );
}

export async function deleteLeagueClub(id: number, tenantId?: string | null): Promise<void> {
  await request(`/api/league-clubs/${id}`, { method: 'DELETE' }, tenantId);
}

export async function listLeagueMatches(
  leagueId: number,
  tenantId?: string | null
): Promise<LeagueMatchDTO[]> {
  const qs = await listQuery(
    { 'leagueId.equals': String(leagueId), sort: 'playedAt,desc' },
    tenantId
  );
  const data = await request<unknown>(`/api/league-matches?${qs}`, {}, tenantId);
  return normalizeList<LeagueMatchDTO>(data);
}

export async function saveLeagueMatch(
  match: LeagueMatchDTO,
  tenantId?: string | null
): Promise<LeagueMatchDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || match.tenantId);
  if (match.id) {
    return request<LeagueMatchDTO>(
      `/api/league-matches/${match.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...match, id: match.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<LeagueMatchDTO>(
    '/api/league-matches',
    {
      method: 'POST',
      body: JSON.stringify({ ...match, id: null, tenantId: resolvedTenantId }),
    },
    resolvedTenantId
  );
}

export async function deleteLeagueMatch(id: number, tenantId?: string | null): Promise<void> {
  await request(`/api/league-matches/${id}`, { method: 'DELETE' }, tenantId);
}

export async function listLeagueStandings(
  leagueId: number,
  tenantId?: string | null
): Promise<LeagueStandingDTO[]> {
  const qs = await listQuery({ 'leagueId.equals': String(leagueId) }, tenantId);
  const data = await request<unknown>(`/api/league-standings?${qs}`, {}, tenantId);
  return normalizeList<LeagueStandingDTO>(data);
}

export async function saveLeagueStanding(
  row: LeagueStandingDTO,
  tenantId?: string | null
): Promise<LeagueStandingDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || row.tenantId);
  if (row.id) {
    return request<LeagueStandingDTO>(
      `/api/league-standings/${row.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...row, id: row.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<LeagueStandingDTO>(
    '/api/league-standings',
    {
      method: 'POST',
      body: JSON.stringify({ ...row, id: null, tenantId: resolvedTenantId }),
    },
    resolvedTenantId
  );
}

export async function getStandingsTable(
  leagueId: number,
  tenantId?: string | null
): Promise<LeagueStandingRowDTO[]> {
  const data = await request<unknown>(`/api/leagues/${leagueId}/standings-table`, {}, tenantId);
  return normalizeList<LeagueStandingRowDTO>(data);
}

export async function copyCalculatedStandings(
  leagueId: number,
  tenantId?: string | null
): Promise<LeagueStandingRowDTO[]> {
  const data = await request<unknown>(
    `/api/leagues/${leagueId}/standings/copy-calculated`,
    { method: 'POST' },
    tenantId
  );
  return normalizeList<LeagueStandingRowDTO>(data);
}

export async function listSquads(tenantId?: string | null): Promise<TeamGroupDTO[]> {
  const qs = await listQuery({ sort: 'displayOrder,asc' }, tenantId);
  const data = await request<unknown>(`/api/team-groups?${qs}`, {}, tenantId);
  return normalizeList<TeamGroupDTO>(data);
}

export async function saveSquad(
  group: TeamGroupDTO,
  tenantId?: string | null
): Promise<TeamGroupDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || group.tenantId);
  if (group.id) {
    return request<TeamGroupDTO>(
      `/api/team-groups/${group.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...group, id: group.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<TeamGroupDTO>(
    '/api/team-groups',
    {
      method: 'POST',
      body: JSON.stringify({
        ...group,
        id: null,
        tenantId: resolvedTenantId,
        teamType: group.teamType || 'SPORTS',
      }),
    },
    resolvedTenantId
  );
}

export async function listSquadMembers(tenantId?: string | null): Promise<TeamMemberDTO[]> {
  const qs = await listQuery({ size: '500', sort: 'lastName,asc' }, tenantId);
  const data = await request<unknown>(`/api/team-members?${qs}`, {}, tenantId);
  return normalizeList<TeamMemberDTO>(data);
}

export async function listMemberships(tenantId?: string | null): Promise<TeamGroupMembershipDTO[]> {
  const qs = await listQuery({ size: '1000' }, tenantId);
  const data = await request<unknown>(`/api/team-group-memberships?${qs}`, {}, tenantId);
  return normalizeList<TeamGroupMembershipDTO>(data);
}

export async function saveMembership(
  membership: TeamGroupMembershipDTO,
  tenantId?: string | null
): Promise<TeamGroupMembershipDTO> {
  const resolvedTenantId = await resolveAdminMutationTenantId(tenantId || membership.tenantId);
  if (membership.id) {
    return request<TeamGroupMembershipDTO>(
      `/api/team-group-memberships/${membership.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ ...membership, id: membership.id, tenantId: resolvedTenantId }),
      },
      resolvedTenantId
    );
  }
  return request<TeamGroupMembershipDTO>(
    '/api/team-group-memberships',
    {
      method: 'POST',
      body: JSON.stringify({ ...membership, id: null, tenantId: resolvedTenantId }),
    },
    resolvedTenantId
  );
}

export async function deleteMembership(id: number, tenantId?: string | null): Promise<void> {
  await request(`/api/team-group-memberships/${id}`, { method: 'DELETE' }, tenantId);
}
