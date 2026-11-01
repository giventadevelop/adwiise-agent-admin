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
  Fuel: 'bg-orange-800 text-white',
  Register: 'bg-blue-800 text-white',
  Labor: 'bg-indigo-800 text-white',
  Profit: 'bg-emerald-800 text-white',
  Chain: 'bg-violet-800 text-white',
  Other: 'bg-amber-800 text-white',
};

/** Stronger fill, dark text, and a darker left bar. */
export const ORIGIN_SURFACE: Record<MetricOrigin, string> = {
  Fuel: 'bg-orange-200 text-orange-950 border-l-4 border-orange-700',
  Register: 'bg-blue-200 text-blue-950 border-l-4 border-blue-700',
  Labor: 'bg-indigo-200 text-indigo-950 border-l-4 border-indigo-700',
  Profit: 'bg-emerald-200 text-emerald-950 border-l-4 border-emerald-700',
  Chain: 'bg-violet-200 text-violet-950 border-l-4 border-violet-800',
  Other: 'bg-amber-200 text-amber-950 border-l-4 border-amber-700',
};

export const PACK_SURFACE: Record<string, string> = {
  GAS_STATION: 'bg-orange-200 text-orange-950 border-l-4 border-orange-700',
  LIQUOR_STORE: 'bg-purple-200 text-purple-950 border-l-4 border-purple-700',
  DUNKIN_DONUTS: 'bg-pink-200 text-pink-950 border-l-4 border-pink-700',
  SEVEN_ELEVEN: 'bg-green-200 text-green-950 border-l-4 border-green-700',
  RESTAURANT: 'bg-rose-200 text-rose-950 border-l-4 border-rose-700',
  CLINIC: 'bg-cyan-200 text-cyan-950 border-l-4 border-cyan-700',
};

export const STATUS_CHIP: Record<string, string> = {
  NEW: 'bg-sky-800 text-white',
  VIEWED: 'bg-blue-800 text-white',
  ACCEPTED: 'bg-emerald-800 text-white',
  DISMISSED: 'bg-rose-800 text-white',
  COMPLETED: 'bg-green-800 text-white',
};

export function packSurface(code?: string | null): string {
  return PACK_SURFACE[code || ''] ?? 'bg-teal-200 text-teal-950 border-l-4 border-teal-700';
}

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
