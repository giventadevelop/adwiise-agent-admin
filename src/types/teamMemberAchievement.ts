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
  /** Catalog code. The service also stores achievementCategoryId. */
  category: string;
  achievementCategoryId?: number | null;
  issuer?: string;
  url?: string;
  imageUrl?: string;
  displayOrder?: number;
  isFeatured?: boolean;
}
