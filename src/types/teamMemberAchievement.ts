/**
 * Award, honor, trophy, or cap for a squad member.
 */
export interface TeamMemberAchievementDTO {
  id: number | null;
  tenantId?: string;
  teamMemberId: number;
  title: string;
  description?: string;
  achievementDate?: string;
  category: 'AWARD' | 'HONOR' | 'TROPHY' | 'CAP' | 'OTHER';
  issuer?: string;
  url?: string;
  imageUrl?: string;
  displayOrder?: number;
  isFeatured?: boolean;
}
