'use server';

import { getApiBaseUrl, getTenantId } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { LeagueClubDTO, LeagueDTO, LeagueMatchDTO, LeagueStandingDTO, LeagueStandingRowDTO } from '@/types/league';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { TeamGroupMembershipDTO } from '@/types/league';
import type { TeamMemberDTO } from '@/types/teamMember';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
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

function tenantQuery(extra = '') {
  const tenantId = encodeURIComponent(getTenantId());
  return `tenantId.equals=${tenantId}${extra ? `&${extra}` : ''}`;
}

export async function listLeagues(): Promise<LeagueDTO[]> {
  return request<LeagueDTO[]>(`/api/leagues?${tenantQuery('size=200&sort=name,asc')}`);
}

export async function saveLeague(league: LeagueDTO): Promise<LeagueDTO> {
  const tenantId = getTenantId();
  if (league.id) {
    return request<LeagueDTO>(`/api/leagues/${league.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...league, id: league.id, tenantId }),
    });
  }
  return request<LeagueDTO>('/api/leagues', {
    method: 'POST',
    body: JSON.stringify({ ...league, id: null, tenantId }),
  });
}

export async function deleteLeague(id: number): Promise<void> {
  await request(`/api/leagues/${id}`, { method: 'DELETE' });
}

export async function listLeagueClubs(leagueId: number): Promise<LeagueClubDTO[]> {
  return request<LeagueClubDTO[]>(`/api/league-clubs?${tenantQuery(`leagueId.equals=${leagueId}&size=200&sort=displayOrder,asc`)}`);
}

export async function saveLeagueClub(club: LeagueClubDTO): Promise<LeagueClubDTO> {
  const tenantId = getTenantId();
  if (club.id) {
    return request<LeagueClubDTO>(`/api/league-clubs/${club.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...club, id: club.id, tenantId }),
    });
  }
  return request<LeagueClubDTO>('/api/league-clubs', {
    method: 'POST',
    body: JSON.stringify({ ...club, id: null, tenantId }),
  });
}

export async function deleteLeagueClub(id: number): Promise<void> {
  await request(`/api/league-clubs/${id}`, { method: 'DELETE' });
}

export async function listLeagueMatches(leagueId: number): Promise<LeagueMatchDTO[]> {
  return request<LeagueMatchDTO[]>(`/api/league-matches?${tenantQuery(`leagueId.equals=${leagueId}&size=200&sort=playedAt,desc`)}`);
}

export async function saveLeagueMatch(match: LeagueMatchDTO): Promise<LeagueMatchDTO> {
  const tenantId = getTenantId();
  if (match.id) {
    return request<LeagueMatchDTO>(`/api/league-matches/${match.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...match, id: match.id, tenantId }),
    });
  }
  return request<LeagueMatchDTO>('/api/league-matches', {
    method: 'POST',
    body: JSON.stringify({ ...match, id: null, tenantId }),
  });
}

export async function deleteLeagueMatch(id: number): Promise<void> {
  await request(`/api/league-matches/${id}`, { method: 'DELETE' });
}

export async function listLeagueStandings(leagueId: number): Promise<LeagueStandingDTO[]> {
  return request<LeagueStandingDTO[]>(`/api/league-standings?${tenantQuery(`leagueId.equals=${leagueId}&size=200`)}`);
}

export async function saveLeagueStanding(row: LeagueStandingDTO): Promise<LeagueStandingDTO> {
  const tenantId = getTenantId();
  if (row.id) {
    return request<LeagueStandingDTO>(`/api/league-standings/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...row, id: row.id, tenantId }),
    });
  }
  return request<LeagueStandingDTO>('/api/league-standings', {
    method: 'POST',
    body: JSON.stringify({ ...row, id: null, tenantId }),
  });
}

export async function getStandingsTable(leagueId: number): Promise<LeagueStandingRowDTO[]> {
  return request<LeagueStandingRowDTO[]>(`/api/leagues/${leagueId}/standings-table`);
}

export async function copyCalculatedStandings(leagueId: number): Promise<LeagueStandingRowDTO[]> {
  return request<LeagueStandingRowDTO[]>(`/api/leagues/${leagueId}/standings/copy-calculated`, { method: 'POST' });
}

export async function listSquads(): Promise<TeamGroupDTO[]> {
  return request<TeamGroupDTO[]>(`/api/team-groups?${tenantQuery('size=200&sort=displayOrder,asc')}`);
}

export async function saveSquad(group: TeamGroupDTO): Promise<TeamGroupDTO> {
  const tenantId = getTenantId();
  if (group.id) {
    return request<TeamGroupDTO>(`/api/team-groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...group, id: group.id, tenantId }),
    });
  }
  return request<TeamGroupDTO>('/api/team-groups', {
    method: 'POST',
    body: JSON.stringify({ ...group, id: null, tenantId, teamType: group.teamType || 'SPORTS' }),
  });
}

export async function listSquadMembers(): Promise<TeamMemberDTO[]> {
  return request<TeamMemberDTO[]>(`/api/team-members?${tenantQuery('size=500&sort=lastName,asc')}`);
}

export async function listMemberships(): Promise<TeamGroupMembershipDTO[]> {
  return request<TeamGroupMembershipDTO[]>(`/api/team-group-memberships?${tenantQuery('size=1000')}`);
}

export async function saveMembership(membership: TeamGroupMembershipDTO): Promise<TeamGroupMembershipDTO> {
  const tenantId = getTenantId();
  if (membership.id) {
    return request<TeamGroupMembershipDTO>(`/api/team-group-memberships/${membership.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ ...membership, id: membership.id, tenantId }),
    });
  }
  return request<TeamGroupMembershipDTO>('/api/team-group-memberships', {
    method: 'POST',
    body: JSON.stringify({ ...membership, id: null, tenantId }),
  });
}

export async function deleteMembership(id: number): Promise<void> {
  await request(`/api/team-group-memberships/${id}`, { method: 'DELETE' });
}
