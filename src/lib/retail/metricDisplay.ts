/**
 * Shared morning-brief copy for gas and retail screens.
 * Origin is inferred from table/column shape — not stored in the database.
 */

export type MetricOrigin = 'Fuel' | 'Register' | 'Labor' | 'Profit' | 'Chain' | 'Other';

export type MetricTileKey =
  | 'expectedProfit'
  | 'fuelGallons'
  | 'fuelRevenue'
  | 'inStoreSales'
  | 'transactions'
  | 'laborCost'
  | 'wasteShrink';

export interface MetricTileCopy {
  label: string;
  origin: MetricOrigin;
  /** Short clarification shown in brackets under the label. */
  detail: string;
  /** Full descriptive tooltip for hover / focus. */
  tooltip: string;
}

export const METRIC_TILES: Record<MetricTileKey, MetricTileCopy> = {
  expectedProfit: {
    label: "Today's expected profit",
    origin: 'Profit',
    detail: 'model estimate for this brief date',
    tooltip:
      'Expected profit for the selected date. This is a model estimate from the morning brief, not a final accounting close. It may be empty until enough day history and cost files are available.',
  },
  fuelGallons: {
    label: 'Gallons sold',
    origin: 'Fuel',
    detail: 'fuel controller for this day',
    tooltip:
      'Total fuel gallons sold for this day from the fuel controller file (or the fuel day row on the shared retail API). This is pump volume, not shop sales and not register ticket count.',
  },
  fuelRevenue: {
    label: 'Fuel revenue',
    origin: 'Fuel',
    detail: 'pump sales, not shop sales',
    tooltip:
      'Dollar revenue from fuel pumps for this day. Comes from the fuel controller / fuel-day total. It does not include in-store shop supplies, lottery, food, or other register lines.',
  },
  inStoreSales: {
    label: 'In-store sales',
    origin: 'Register',
    detail: 'shop supplies and inside sales — not fuel',
    tooltip:
      'Inside / shop sales from the register (POS) for this day: shop supplies, foodservice, lottery, car wash, and other non-fuel lines. Fuel pump dollars are reported separately under Fuel revenue.',
  },
  transactions: {
    label: 'Transaction count',
    origin: 'Register',
    detail: 'register tickets for the day',
    tooltip:
      'Number of register tickets (transactions) for this day from the POS / register file. This counts visits or tickets at the till, not gallons pumped and not a separate fuel-controller ticket count.',
  },
  laborCost: {
    label: 'Labor cost',
    origin: 'Labor',
    detail: 'payroll file when present',
    tooltip:
      'Labor cost for this day when a payroll or scheduling file has been ingested. Shows as empty until that file exists for the brief date.',
  },
  wasteShrink: {
    label: 'Waste + shrink',
    origin: 'Other',
    detail: 'spoilage and shrink costs when present',
    tooltip:
      'Combined waste and shrink cost for this day when those amounts are present on the daily metrics row. Empty until the related cost inputs exist.',
  },
};

export const ORIGIN_CHIP_STYLES: Record<MetricOrigin, string> = {
  Fuel: 'bg-orange-100 text-orange-800',
  Register: 'bg-blue-100 text-blue-800',
  Labor: 'bg-indigo-100 text-indigo-800',
  Profit: 'bg-emerald-100 text-emerald-800',
  Chain: 'bg-violet-100 text-violet-800',
  Other: 'bg-gray-100 text-gray-800',
};

const CATEGORY_ORIGIN: Record<string, MetricOrigin> = {
  FUEL_PRICING: 'Fuel',
  LOSS_PREVENTION: 'Fuel',
  ORDERING: 'Register',
  INVENTORY: 'Register',
  STAFFING: 'Labor',
  COMPLIANCE: 'Other',
  MAINTENANCE: 'Other',
  ANOMALY: 'Other',
  OTHER: 'Other',
};

/** Origin chip for an action card. Chain wins when the card has no store. */
export function originForRecommendationCategory(
  category: string,
  options?: { isChain?: boolean }
): MetricOrigin {
  if (options?.isChain) return 'Chain';
  return CATEGORY_ORIGIN[category] ?? 'Other';
}

export function categoryDisplayLabel(category: string): string {
  return category.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
