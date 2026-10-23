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
}

export interface TeamMemberFormData extends Omit<TeamMemberDTO, 'id' | 'expertise'> {
  expertise: string[];
}
