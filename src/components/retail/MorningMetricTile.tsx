'use client';

import type { MetricOrigin, MetricTileCopy } from '@/lib/retail/metricDisplay';
import { ORIGIN_CHIP_STYLES, ORIGIN_SURFACE } from '@/lib/retail/metricDisplay';
import { RetailIcon } from '@/components/retail/RetailUi';

type ValueTone = 'default' | 'profit' | 'alert';

const VALUE_TONE: Record<ValueTone, string> = {
  default: 'text-current',
  profit: 'text-current',
  alert: 'text-red-900',
};

const ORIGIN_ICON: Record<MetricOrigin, { name: string; tile: string }> = {
  Fuel: { name: 'fuel', tile: 'bg-orange-800 text-white' },
  Register: { name: 'register', tile: 'bg-blue-800 text-white' },
  Labor: { name: 'labor', tile: 'bg-indigo-800 text-white' },
  Profit: { name: 'profit', tile: 'bg-emerald-800 text-white' },
  Chain: { name: 'chain', tile: 'bg-violet-800 text-white' },
  Other: { name: 'chart', tile: 'bg-amber-800 text-white' },
};

export default function MorningMetricTile({
  copy,
  value,
  hasData = true,
  wide = false,
  valueTone = 'default',
  valueClassName,
}: {
  copy: MetricTileCopy;
  value: string;
  hasData?: boolean;
  wide?: boolean;
  valueTone?: ValueTone;
  /** Optional override for the value text size (e.g. text-2xl). */
  valueClassName?: string;
}) {
  const originClass = ORIGIN_CHIP_STYLES[copy.origin as MetricOrigin] ?? ORIGIN_CHIP_STYLES.Other;
  const originIcon = ORIGIN_ICON[copy.origin] ?? ORIGIN_ICON.Other;
  return (
    <div
      className={`relative rounded-lg shadow-md p-6 ${ORIGIN_SURFACE[copy.origin] ?? ORIGIN_SURFACE.Other} ${wide ? 'md:col-span-1 col-span-2' : ''}`}
      title={copy.tooltip}
    >
      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${originIcon.tile}`}>
        <RetailIcon name={originIcon.name} className="w-10 h-10" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{copy.label}</p>
          <p className="mt-1 text-sm font-medium opacity-90">[{copy.detail}]</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide ${originClass}`}>
            {copy.origin}
          </span>
          <span
            className="group relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            tabIndex={0}
            aria-label={copy.tooltip}
          >
            ?
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal normal-case tracking-normal text-white shadow-lg group-hover:block group-focus:block"
            >
              {copy.tooltip}
            </span>
          </span>
        </div>
      </div>
      <p className={`mt-3 font-bold ${valueClassName ?? 'text-3xl'} ${VALUE_TONE[valueTone]}`}>
        {hasData ? value : '—'}
      </p>
    </div>
  );
}
