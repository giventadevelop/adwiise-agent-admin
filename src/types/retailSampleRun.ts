export type RetailSamplePack =
  | 'GAS_STATION'
  | 'GAS_STATION_ENT'
  | 'LIQUOR_STORE'
  | 'DUNKIN_DONUTS'
  | 'SEVEN_ELEVEN'
  | 'RESTAURANT'
  | 'CLINIC';

export interface RetailSampleRunRequest {
  tenantId?: string;
  retailerType: RetailSamplePack;
  siteType?: string;
  metricDate?: string;
  stationId?: number;
  source?: 'sample' | 'inbox';
  post?: boolean;
}

export interface RetailSampleRecommendation {
  category?: string;
  title?: string;
}

export interface RetailSampleRunResponse {
  accepted?: boolean;
  status?: string;
  tenantId?: string;
  siteType?: string;
  retailerType?: string;
  source?: string;
  posted?: boolean;
  stationCode?: string;
  metricDate?: string;
  fuelDay?: { fuelGallonsSold?: number } | null;
  recommendations?: RetailSampleRecommendation[];
  message?: string;
}
