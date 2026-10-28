export interface LeagueDTO {
  id?: number | null;
  tenantId?: string;
  name: string;
  slug?: string;
  seasonLabel?: string;
  description?: string;
  logoUrl?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isPublished?: boolean;
  showOnHomepage?: boolean;
  homepageDisplayOrder?: number | null;
  standingsSource?: string;
  pointsForWin?: number;
  pointsForDraw?: number;
  pointsForLoss?: number;
}

export interface LeagueClubDTO {
  id?: number | null;
  tenantId?: string;
  leagueId: number;
  name: string;
  shortName?: string;
  logoUrl?: string;
  isHomeClub?: boolean;
  displayOrder?: number | null;
}

export interface LeagueMatchDTO {
  id?: number | null;
  tenantId?: string;
  leagueId: number;
  homeClubId: number;
  awayClubId: number;
  playedAt?: string;
  venue?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
  notes?: string;
}

export interface LeagueStandingDTO {
  id?: number | null;
  tenantId?: string;
  leagueId: number;
  leagueClubId: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
  position?: number | null;
}

export interface LeagueStandingRowDTO {
  leagueClubId: number;
  clubName: string;
  shortName?: string;
  logoUrl?: string;
  homeClub?: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position?: number | null;
  source?: string;
}

export interface TeamGroupMembershipDTO {
  id?: number | null;
  tenantId?: string;
  teamGroupId: number;
  teamMemberId: number;
  jerseyNumber?: number | null;
  position?: string;
  isActive?: boolean;
}
