'use client';

import type { MetricOrigin, MetricTileCopy } from '@/lib/retail/metricDisplay';
import { ORIGIN_CHIP_STYLES } from '@/lib/retail/metricDisplay';

type ValueTone = 'default' | 'profit' | 'alert';

const VALUE_TONE: Record<ValueTone, string> = {
  default: 'text-gray-900 dark:text-white',
  profit: 'text-emerald-600',
  alert: 'text-red-600',
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
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${wide ? 'md:col-span-1 col-span-2' : ''}`}
      title={copy.tooltip}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{copy.label}</p>
          <p className="mt-0.5 text-xs text-gray-400">[{copy.detail}]</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${originClass}`}>
            {copy.origin}
          </span>
          <span
            className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      <p className={`mt-2 font-semibold ${valueClassName ?? 'text-xl'} ${VALUE_TONE[valueTone]}`}>
        {hasData ? value : '—'}
      </p>
    </div>
  );
}
