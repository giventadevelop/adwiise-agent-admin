export interface AccessRoleDTO {
  id?: number | null;
  tenantId?: string | null;
  code: string;
  label: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
  grantsAdmin?: boolean | null;
  platformSuper?: boolean | null;
  locationScope?: 'ALL' | 'ASSIGNED' | 'NONE' | string | null;
}

export interface RetailerTypeDTO {
  id?: number | null;
  tenantId?: string | null;
  code: string;
  label: string;
  hint?: string | null;
  moduleKey?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

export interface RetailerSizeBandDTO {
  id?: number | null;
  tenantId?: string | null;
  retailerTypeCode: string;
  code: string;
  label: string;
  minLocations?: number | null;
  maxLocations?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

export interface RecommendationCategoryDTO {
  id?: number | null;
  tenantId?: string | null;
  code: string;
  label: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
}
