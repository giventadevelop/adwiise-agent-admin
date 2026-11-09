export type PlatformProduct = 'EVENT_SITE' | 'GAS_STATION';
/** RETAIL holds the one monthly portfolio charge. Catalog plans stay event site and gas station. */
export type BillingRowProduct = PlatformProduct | 'RETAIL';
export type PlatformBillingMode = 'RECURRING' | 'ONE_TIME' | 'BOTH';
export type PlatformBillingInterval = 'MONTH' | 'YEAR';
export type TenantPlatformBillingStatus =
  | 'COMPLIMENTARY'
  | 'PAYMENT_DUE'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'LOCKED';

export interface PlatformBillingPlanDTO {
  id?: number | null;
  tenantId?: string | null;
  product: PlatformProduct;
  name: string;
  code: string;
  billingMode: PlatformBillingMode;
  billingInterval?: PlatformBillingInterval | null;
  listPriceUsd: number;
  published?: boolean | null;
  featureSummary?: string | null;
  graduatedTiersJson?: string | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TenantProductBillingDTO {
  id?: number | null;
  tenantId: string;
  product: BillingRowProduct;
  chargeEnabled?: boolean | null;
  status?: TenantPlatformBillingStatus | null;
  platformPlanId?: number | null;
  customFeeUsd?: number | null;
  billingMode?: 'RECURRING' | 'ONE_TIME' | null;
  reviewByDate?: string | null;
  graceDays?: number | null;
  graceEndsAt?: string | null;
  notes?: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePaymentId?: string | null;
  paidThroughDate?: string | null;
  locationQuantity?: number | null;
  clearCustomFee?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
