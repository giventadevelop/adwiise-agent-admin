'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import MorningMetricTile from '@/components/retail/MorningMetricTile';
import {
  METRIC_TILES,
  ORIGIN_CHIP_STYLES,
  categoryDisplayLabel,
  originForRecommendationCategory,
} from '@/lib/retail/metricDisplay';
import { useAdminTenantId } from '../AdminTenantContext';
import TenantSiteTypePicker from '../TenantSiteTypePicker';
import type {
  GasStationLocationDTO,
  GasStationDailyMetricsDTO,
  GasStationRecommendationDTO,
  GasStationRecommendationStatus,
} from '@/types/gasStation';

const CATEGORY_STYLES: Record<string, string> = {
  FUEL_PRICING: 'bg-orange-100 text-orange-800',
  ORDERING: 'bg-blue-100 text-blue-800',
  STAFFING: 'bg-indigo-100 text-indigo-800',
  INVENTORY: 'bg-cyan-100 text-cyan-800',
  LOSS_PREVENTION: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800',
  ANOMALY: 'bg-rose-100 text-rose-800',
  COMPLIANCE: 'bg-slate-200 text-slate-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  VIEWED: 'bg-gray-50 text-gray-700 border-gray-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-gray-100 text-gray-500 border-gray-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
};

export type UpdateGasStationRecommendation = (
  id: number,
  patch: { status?: GasStationRecommendationStatus; ownerFeedback?: string; tenantId?: string }
) => Promise<GasStationRecommendationDTO | null>;

function formatUsd(value?: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function GasStationDashboardClient({
  tenantId: tenantFromServer,
  date: dateFromServer,
  stations,
  metrics,
  recommendations: initialRecommendations,
  updateRecommendation,
}: {
  tenantId?: string;
  date: string;
  stations: GasStationLocationDTO[];
  metrics: GasStationDailyMetricsDTO[];
  recommendations: GasStationRecommendationDTO[];
  updateRecommendation: UpdateGasStationRecommendation;
}) {
  const contextTenantId = useAdminTenantId();
  const tenantId = tenantFromServer || contextTenantId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(dateFromServer);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [stationFilter, setStationFilter] = useState<'all' | number>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState('');
  const [isPending, startTransition] = useTransition();

  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('date', nextDate);
    if (tenantId) next.set('tenant', tenantId);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const stationById = useMemo(() => {
    const map = new Map<number, GasStationLocationDTO>();
    for (const s of stations) if (s.id != null) map.set(s.id, s);
    return map;
  }, [stations]);

  const visibleMetrics = useMemo(
    () => (stationFilter === 'all' ? metrics : metrics.filter((m) => m.stationId === stationFilter)),
    [metrics, stationFilter]
  );

  const headline = useMemo(() => {
    const sum = (pick: (m: GasStationDailyMetricsDTO) => number | undefined) =>
      visibleMetrics.reduce((acc, m) => acc + (pick(m) ?? 0), 0);
    return {
      expectedProfit: sum((m) => m.expectedProfitUsd),
      fuelGallons: sum((m) => m.fuelGallonsSold),
      fuelRevenue: sum((m) => m.fuelRevenueUsd),
      inStoreSales: sum((m) => m.inStoreSalesUsd),
      transactions: sum((m) => m.transactionsCount),
      laborCost: sum((m) => m.laborCostUsd),
      wasteCost: sum((m) => (m.wasteCostUsd ?? 0) + (m.shrinkCostUsd ?? 0)),
      hasData: visibleMetrics.length > 0,
    };
  }, [visibleMetrics]);

  const { chainRecs, stationGroups } = useMemo(() => {
    const relevant =
      stationFilter === 'all'
        ? recommendations
        : recommendations.filter((r) => r.stationId === stationFilter);
    const chain = relevant.filter((r) => r.stationId == null);
    const byStation = new Map<number, GasStationRecommendationDTO[]>();
    for (const rec of relevant) {
      if (rec.stationId == null) continue;
      const list = byStation.get(rec.stationId) ?? [];
      list.push(rec);
      byStation.set(rec.stationId, list);
    }
    const groups = [...byStation.entries()].sort((a, b) => {
      const impact = (list: GasStationRecommendationDTO[]) =>
        list.reduce((acc, r) => acc + (r.estimatedImpactUsd ?? 0), 0);
      return impact(b[1]) - impact(a[1]);
    });
    return { chainRecs: chain, stationGroups: groups };
  }, [recommendations, stationFilter]);

  const updateStatus = (rec: GasStationRecommendationDTO, status: GasStationRecommendationStatus) => {
    if (rec.id == null) return;
    const id = rec.id;
    const ownerFeedback = feedbackDrafts[id]?.trim() || undefined;
    setActionError('');
    startTransition(async () => {
      const updated = await updateRecommendation(id, {
        status,
        ownerFeedback,
        tenantId: rec.tenantId,
      });
      if (updated) {
        setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      } else {
        setActionError('Could not update that recommendation. Try again.');
      }
    });
  };

  const renderRecCard = (rec: GasStationRecommendationDTO) => {
    const expanded = expandedId === rec.id;
    const isChain = rec.stationId == null;
    const origin = originForRecommendationCategory(rec.category, { isChain });
    return (
      <div
        key={rec.id}
        className={`border rounded-lg p-4 ${STATUS_STYLES[rec.status ?? 'NEW'] ?? 'bg-white border-gray-200'}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_STYLES[rec.category] ?? CATEGORY_STYLES.OTHER}`}
              >
                {categoryDisplayLabel(rec.category)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ORIGIN_CHIP_STYLES[origin]}`}
                title={
                  isChain
                    ? 'This card compares stores across the chain for this brief date.'
                    : `This action is driven by ${origin.toLowerCase()} data for this store.`
                }
              >
                {origin}
              </span>
              {isChain && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                  Chain-level
                </span>
              )}
              <span className="text-xs text-gray-500">{rec.status ?? 'NEW'}</span>
            </div>
            <p className="mt-2 font-medium text-gray-900">{rec.title}</p>
            {rec.detail && <p className="mt-1 text-sm text-gray-600">{rec.detail}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatUsd(rec.estimatedImpactUsd)}</p>
            <p className="text-xs text-gray-500">est. impact</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpandedId(expanded ? null : rec.id ?? null)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? 'Hide details' : 'Why am I being told this?'}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={isPending || rec.status === 'ACCEPTED'}
              onClick={() => updateStatus(rec, 'ACCEPTED')}
              className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-semibold disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={isPending || rec.status === 'DISMISSED'}
              onClick={() => updateStatus(rec, 'DISMISSED')}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              disabled={isPending || rec.status === 'COMPLETED'}
              onClick={() => updateStatus(rec, 'COMPLETED')}
              className="px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
            <p className="text-sm text-gray-700">
              {rec.explanation || 'No explanation provided by the AI engine for this recommendation.'}
            </p>
            {rec.confidencePct != null && (
              <p className="text-xs text-gray-500">Confidence: {rec.confidencePct}%</p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Feedback to the AI engine (stored with Accept / Dismiss / Done)
              </label>
              <textarea
                rows={2}
                value={feedbackDrafts[rec.id ?? -1] ?? rec.ownerFeedback ?? ''}
                onChange={(e) =>
                  setFeedbackDrafts((prev) => ({ ...prev, [rec.id ?? -1]: e.target.value }))
                }
                className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Gas Station COO
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Daily morning brief per tenant — prescriptive actions with dollar impact per station
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/admin/gas-station/access${tenantQuery}`}
              className="px-4 py-2 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-700 font-semibold transition-colors"
            >
              Location access
            </Link>
            <Link
              href={`/admin/gas-station/stations${tenantQuery}`}
              className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold transition-colors"
            >
              Stations
            </Link>
            <Link
              href={`/admin/gas-station/integrations${tenantQuery}`}
              className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition-colors"
            >
              Integrations
            </Link>
            <Link
              href={`/admin/gas-station/compare${tenantQuery}`}
              className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold transition-colors"
            >
              Compare
            </Link>
          </div>
        </div>

        {!tenantId && (
          <TenantSiteTypePicker
            siteTypes={['GAS_STATION', 'GAS_STATION_ENT']}
            title="Gas station tenants"
          />
        )}

        {tenantId && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brief date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => changeDate(e.target.value)}
                  className="border border-gray-400 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {stations.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Station
                  </label>
                  <select
                    value={stationFilter === 'all' ? 'all' : String(stationFilter)}
                    onChange={(e) =>
                      setStationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className="border border-gray-400 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All stations ({stations.length})</option>
                    {stations.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.stationCode} — {s.stationName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isPending && <span className="text-sm text-gray-500 pb-2">Loading…</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <MorningMetricTile
                copy={METRIC_TILES.expectedProfit}
                value={formatUsd(headline.expectedProfit)}
                hasData={headline.hasData}
                wide
                valueTone="profit"
                valueClassName="text-2xl font-bold"
              />
              <MorningMetricTile
                copy={METRIC_TILES.fuelGallons}
                value={headline.fuelGallons.toLocaleString()}
                hasData={headline.hasData}
              />
              <MorningMetricTile
                copy={METRIC_TILES.fuelRevenue}
                value={formatUsd(headline.fuelRevenue)}
                hasData={headline.hasData}
              />
              <MorningMetricTile
                copy={METRIC_TILES.inStoreSales}
                value={formatUsd(headline.inStoreSales)}
                hasData={headline.hasData}
              />
              <MorningMetricTile
                copy={METRIC_TILES.transactions}
                value={headline.transactions.toLocaleString()}
                hasData={headline.hasData}
              />
              <MorningMetricTile
                copy={METRIC_TILES.laborCost}
                value={formatUsd(headline.laborCost)}
                hasData={headline.hasData}
              />
              <MorningMetricTile
                copy={METRIC_TILES.wasteShrink}
                value={formatUsd(headline.wasteCost)}
                hasData={headline.hasData}
                valueTone="alert"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Morning action list
                </h2>
                <span className="text-sm text-gray-500">
                  {chainRecs.length + stationGroups.reduce((acc, [, list]) => acc + list.length, 0)}{' '}
                  items
                </span>
              </div>

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              {stations.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No stations registered for tenant <code>{tenantId}</code>. Add stores under{' '}
                  <strong>Stations</strong>.
                </p>
              )}

              {stations.length > 0 && chainRecs.length === 0 && stationGroups.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No recommendations for this date — the AI engine writes the morning brief overnight.
                </p>
              )}

              {chainRecs.length > 0 && (
                <div className="space-y-3">
                  {stationFilter === 'all' && stations.length > 1 && (
                    <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide">
                      Across this tenant&apos;s stores
                    </h3>
                  )}
                  {chainRecs.map(renderRecCard)}
                </div>
              )}

              {stationGroups.map(([stationId, recs]) => {
                const station = stationById.get(stationId);
                return (
                  <div key={stationId} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {station
                        ? `${station.stationCode} — ${station.stationName}`
                        : `Station #${stationId}`}
                    </h3>
                    {recs.map(renderRecCard)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
