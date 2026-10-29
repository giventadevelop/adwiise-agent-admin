/**
 * DTOs for the shared retail module (GAS_STATION and LIQUOR_STORE).
 * Import these types from here. Do not redeclare them in API routes.
 */

export type RetailSystemType =
  | 'POS'
  | 'FUEL_CONTROLLER'
  | 'INVENTORY'
  | 'PAYROLL_SCHEDULING'
  | 'ACCOUNTING'
  | 'LOTTERY'
  | 'CAR_WASH'
  | 'FOODSERVICE'
  | 'OTHER';

export type RetailConnectionMode = 'API' | 'FILE_UPLOAD' | 'SFTP' | 'MANUAL';

export type RetailDepartment =
  | 'BEER'
  | 'WINE'
  | 'SPIRITS'
  | 'FUEL'
  | 'IN_STORE'
  | 'LOTTERY'
  | 'FOODSERVICE'
  | 'CAR_WASH'
  | 'OTHER';

export type RetailRecommendationCategory =
  | 'FUEL_PRICING'
  | 'ORDERING'
  | 'STAFFING'
  | 'INVENTORY'
  | 'LOSS_PREVENTION'
  | 'MAINTENANCE'
  | 'ANOMALY'
  | 'COMPLIANCE'
  | 'OTHER';

export type RetailRecommendationStatus = 'NEW' | 'VIEWED' | 'ACCEPTED' | 'DISMISSED' | 'COMPLETED';

export interface RetailLocationDTO {
  id?: number;
  tenantId: string;
  locationName: string;
  locationCode: string;
  retailerTypeCode?: string;
  brand?: string;
  region?: string;
  city?: string;
  timezone?: string;
  is24Hours?: boolean;
  isActive?: boolean;
  includedInSubscription?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailDailyMetricsDTO {
  id?: number;
  tenantId: string;
  locationId: number;
  metricDate: string;
  salesUsd?: number;
  transactionsCount?: number;
  laborHours?: number;
  laborCostUsd?: number;
  shrinkCostUsd?: number;
  expectedProfitUsd?: number;
  actualProfitUsd?: number;
  sourceModelRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailFuelDayDTO {
  id?: number;
  tenantId: string;
  locationId: number;
  metricDate: string;
  fuelGallonsSold?: number;
  fuelRevenueUsd?: number;
  fuelMarginCentsPerGallon?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailDepartmentDayDTO {
  id?: number;
  tenantId: string;
  locationId: number;
  metricDate: string;
  department: RetailDepartment;
  salesUsd?: number;
  units?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailRecommendationDTO {
  id?: number;
  tenantId: string;
  locationId?: number | null;
  recommendationDate: string;
  category: RetailRecommendationCategory;
  title: string;
  detail?: string;
  estimatedImpactUsd?: number;
  priority?: number;
  confidencePct?: number;
  explanation?: string;
  status?: RetailRecommendationStatus;
  ownerFeedback?: string;
  sourceModelRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailUserLocationAssignmentDTO {
  id?: number;
  tenantId: string;
  userProfileId: number;
  locationId: number;
  assignedByUserProfileId?: number | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailUserRegionAssignmentDTO {
  id?: number;
  tenantId: string;
  userProfileId: number;
  region: string;
  assignedByUserProfileId?: number | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailIntegrationDTO {
  id?: number;
  tenantId: string;
  locationId: number;
  systemType: RetailSystemType;
  providerName?: string;
  connectionMode?: RetailConnectionMode;
  credentialsRef?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
