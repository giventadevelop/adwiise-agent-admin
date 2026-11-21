export type PlatformProduct = 'EVENT_SITE' | 'GAS_STATION';
/** RETAIL on a billing row is the organization portfolio charge. Catalog plans use EVENT_SITE or RETAIL. A shop pack such as gas station is retailerTypeCode, not a separate fee. */
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
  product: BillingRowProduct;
  name: string;
  code: string;
  billingMode: PlatformBillingMode;
  billingInterval?: PlatformBillingInterval | null;
  intervalCount?: number | null;
  listPriceUsd: number;
  published?: boolean | null;
  featureSummary?: string | null;
  graduatedTiersJson?: string | null;
  /** Empty means every retail pack. A code such as GAS_STATION limits the plan to that pack. */
  retailerTypeCode?: string | null;
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
  clearPlatformPlan?: boolean | null;
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

/** Fee filter on the charge search. ORGANIZATION is the one charge an organization pays for all its websites. */
export type ChargeFeeFilter = 'EVENT_SITE' | 'GAS_STATION' | 'ORGANIZATION';

/** Dates are ISO instants worked out in the browser, so "today" means the viewer's day. */
export interface ChargeSearchFilters {
  find?: string;
  tenantId?: string;
  fee?: ChargeFeeFilter | '';
  statuses?: string[];
  fromIso?: string;
  toIso?: string;
  amountMin?: string;
  amountMax?: string;
  /** Id of the catalog plan. The ledger stores the plan id, not its code. */
  planId?: string;
  sort?: 'occurredAt,desc' | 'occurredAt,asc' | 'amountUsd,desc' | 'amountUsd,asc';
}

export interface ChargeSearchRow extends PlatformBillingChargeDTO {
  organizationName?: string;
  /** An Open or Failed row whose invoice was paid afterward. */
  paidLater?: boolean;
}

export interface ChargeStatusTotal {
  status: string;
  count: number;
  amountUsd: number;
}

export interface ChargeSearchResult {
  rows: ChargeSearchRow[];
  totalCount: number;
  totals: ChargeStatusTotal[];
  notice: string;
}

export interface BillingHistoryRow {
  id?: number | null;
  organizationId?: number | null;
  organizationName?: string;
  tenantId?: string | null;
  product?: string | null;
  previousPlanCode?: string | null;
  newPlanCode?: string | null;
  previousAmountUsd?: number | null;
  newAmountUsd?: number | null;
  actorUserId?: string | null;
  actorName?: string;
  reason?: string | null;
  occurredAt?: string | null;
}

export interface BillingHistoryResult {
  rows: BillingHistoryRow[];
  totalCount: number;
  notice: string;
}

export interface ChargeDetail {
  charge: ChargeSearchRow;
  sameInvoice: PlatformBillingChargeDTO[];
  history: BillingHistoryRow[];
  stripeTestMode: boolean;
}
