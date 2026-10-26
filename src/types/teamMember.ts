/**
 * DTO for squad/band team member (roster row).
 */
export interface TeamMemberDTO {
  id: number | null;
  tenantId?: string;
  teamGroupId: number;
  userProfileId?: number | null;
  firstName: string;
  lastName: string;
  title: string;
  designation?: string;
  bio?: string;
  email?: string;
  profileImageUrl?: string;
  expertise?: string;
  imageBackground?: string;
  imageStyle?: string;
  department?: string;
  joinDate?: string;
  isActive?: boolean;
  linkedinUrl?: string;
  twitterUrl?: string;
  priorityOrder?: number;
  websiteUrl?: string;
  jerseyNumber?: number | null;
  position?: string;
  lineupSubtitle?: string;
  instrument?: string;
  vocalRole?: string;
  nationality?: string;
  dateOfBirth?: string;
  preferredFoot?: string;
  heightCm?: number | null;
  instagramUrl?: string;
  seasonLabel?: string | null;
  seasonAppearances?: number | null;
  seasonGoals?: number | null;
  seasonAssists?: number | null;
  seasonMinutes?: number | null;
  seasonWins?: number | null;
  seasonDraws?: number | null;
  seasonLosses?: number | null;
  passAccuracyPct?: number | null;
  shotAccuracyPct?: number | null;
  topSpeedKmh?: number | null;
  careerAppearances?: number | null;
  careerGoals?: number | null;
  careerAssists?: number | null;
  coachName?: string | null;
  coachEmail?: string | null;
  coachPhone?: string | null;
  recentMatches?: string | null;
  /** Extra JSON kept beside the sport links. Categories are written from sportCategoryIds. */
  sportProfiles?: string;
  /** Selected sports_category ids. Null on update leaves existing links unchanged. */
  sportCategoryIds?: number[] | null;
  /** Labels returned with the member. Read-only. */
  sportLabels?: string[] | null;
}

export interface TeamMemberFormData extends Omit<TeamMemberDTO, 'id' | 'expertise'> {
  expertise: string[];
}
