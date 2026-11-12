export type PlatformProduct = 'EVENT_SITE' | 'GAS_STATION';
/** RETAIL holds the one monthly portfolio charge. Catalog plans stay event site and gas station. */
export type BillingRowProduct = PlatformProduct | 'RETAIL';
export type PlatformBillingMode = 'RECURRING' | 'ONE_TIME' | 'BOTH';
export type PlatformBillingInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type OrganizationBillingScope = 'ORGANIZATION' | 'PER_TENANT';
export type PlatformChargeStatus = 'OPEN' | 'PAID' | 'FAILED' | 'VOID' | 'REFUNDED';
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
  intervalCount?: number | null;
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
  billingInterval?: PlatformBillingInterval | null;
  intervalCount?: number | null;
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
  organizationId?: number | null;
  organizationBillingScope?: OrganizationBillingScope | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PlatformBillingChargeDTO {
  id?: number | null;
  organizationId: number;
  tenantId?: string | null;
  product: BillingRowProduct;
  billingScope: OrganizationBillingScope;
  platformPlanId?: number | null;
  planCode?: string | null;
  amountUsd: number;
  currency?: string | null;
  billingInterval?: PlatformBillingInterval | null;
  intervalCount?: number | null;
  stripeEventId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePaymentIntentId?: string | null;
  status: PlatformChargeStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  occurredAt?: string | null;
  failureReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}
