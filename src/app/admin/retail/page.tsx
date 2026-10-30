'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import type { RetailDailyMetricsDTO, RetailFuelDayDTO, RetailLocationDTO, RetailRecommendationDTO } from '@/types/retail';
import {
  fetchRetailFuelDaysServer,
  fetchRetailLocationsServer,
  fetchRetailMetricsServer,
  fetchRetailRecommendationsServer,
  getRetailMorningAccess,
  askRetailBriefServer,
  refreshRetailBriefServer,
  updateRetailRecommendationServer,
} from './retailServer';

const GAS_PACKS = new Set(['GAS_STATION', 'GAS_STATION_ENT']);

function formatUsd(value?: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatCount(value?: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

export default function RetailMorningPage() {
  const tenantId = useAdminTenantId();
  const [date, setDate] = useState('2026-07-08');
  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [metrics, setMetrics] = useState<RetailDailyMetricsDTO[]>([]);
  const [fuelDays, setFuelDays] = useState<RetailFuelDayDTO[]>([]);
  const [recommendations, setRecommendations] = useState<RetailRecommendationDTO[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [canAssign, setCanAssign] = useState(false);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setLocations([]);
      setMetrics([]);
      setFuelDays([]);
      setRecommendations([]);
      setLocationId(null);
      setDenied(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const access = await getRetailMorningAccess(tenantId);
      if (cancelled) return;
      setCanAssign(access.canAssign);
      if (access.scope === 'NONE') {
        setDenied(true);
        setLocations([]);
        setMetrics([]);
        setFuelDays([]);
        setRecommendations([]);
        setLoading(false);
        return;
      }
      setDenied(false);
      const [loadedLocations, loadedMetrics, loadedFuel, loadedRecs] = await Promise.all([
        fetchRetailLocationsServer(tenantId),
        fetchRetailMetricsServer(date, tenantId),
        fetchRetailFuelDaysServer(date, tenantId),
        fetchRetailRecommendationsServer(date, tenantId),
      ]);
      if (cancelled) return;
      setLocations(loadedLocations);
      setMetrics(loadedMetrics);
      setFuelDays(loadedFuel);
      setRecommendations(loadedRecs);
      setLocationId(current => {
        if (current != null && loadedLocations.some(location => location.id === current)) return current;
        return loadedLocations[0]?.id ?? null;
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, date, refreshKey]);

  const selected = locations.find(location => location.id === locationId) ?? null;
  const sellsFuel = GAS_PACKS.has(selected?.retailerTypeCode ?? '');
  const metric = metrics.find(row => row.locationId === locationId) ?? null;
  const fuel = fuelDays.find(row => row.locationId === locationId) ?? null;
  const cards = useMemo(
    () => recommendations.filter(row => row.locationId === locationId),
    [recommendations, locationId]
  );
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  const setStatus = async (card: RetailRecommendationDTO, status: 'ACCEPTED' | 'DISMISSED') => {
    if (card.id == null || card.locationId == null) return;
    const updated = await updateRetailRecommendationServer(card.id, card.locationId, status, tenantId);
    if (!updated) return;
    setRecommendations(current => current.map(row => (row.id === updated.id ? { ...row, status: updated.status } : row)));
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Retail morning brief</h1>
        <p className="mt-2 text-sm text-gray-600">
          Stores you are allowed to see for this tenant. Gallons appear only for a gas station.
        </p>
        {canAssign && (
          <p className="mt-2">
            <Link href={`/admin/retail/access${tenantQuery}`} className="text-sm font-semibold text-teal-800 underline">
              Assign managers
            </Link>
          </p>
        )}

        {!tenantId && <TenantSiteTypePicker siteTypes={['RETAIL']} title="Retail tenants" />}

        {tenantId && denied && (
          <p className="mt-6 text-gray-700">You do not have a retail role for this tenant.</p>
        )}

        {tenantId && !denied && (
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-end gap-4">
              <label className="block text-sm font-medium text-gray-700">
                Brief date
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="mt-1 block border border-gray-400 rounded-xl px-4 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Store
                <select
                  value={locationId ?? ''}
                  onChange={event => setLocationId(event.target.value ? Number(event.target.value) : null)}
                  className="mt-1 block border border-gray-400 rounded-xl px-4 py-2"
                >
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.locationCode} ({location.retailerTypeCode || 'no pack'})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  if (!tenantId) return;
                  setAsking(true);
                  const refreshed = await refreshRetailBriefServer(tenantId, date);
                  setAsking(false);
                  if (refreshed.ok) setRefreshKey(current => current + 1);
                }}
              >
                Refresh
              </button>
              {loading && <p className="text-sm text-gray-500">Loading</p>}
            </div>

            {selected && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-lg font-semibold text-gray-900">
                    {selected.locationName} · {selected.locationCode}
                  </p>
                  <p className="text-sm text-gray-600">
                    Pack {selected.retailerTypeCode || 'not set'}
                    {selected.region ? ` · Region ${selected.region}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    One brief date, one store. Day numbers come from the register and, for gas packs, the fuel controller.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MorningMetricTile
                    copy={METRIC_TILES.inStoreSales}
                    value={formatUsd(metric?.salesUsd)}
                    hasData={metric?.salesUsd != null}
                  />
                  <MorningMetricTile
                    copy={METRIC_TILES.transactions}
                    value={formatCount(metric?.transactionsCount)}
                    hasData={metric?.transactionsCount != null}
                  />
                  {sellsFuel && (
                    <>
                      <MorningMetricTile
                        copy={METRIC_TILES.fuelGallons}
                        value={
                          fuel?.fuelGallonsSold != null
                            ? fuel.fuelGallonsSold.toLocaleString()
                            : 'no fuel day yet'
                        }
                        hasData={fuel?.fuelGallonsSold != null}
                      />
                      <MorningMetricTile
                        copy={METRIC_TILES.fuelRevenue}
                        value={formatUsd(fuel?.fuelRevenueUsd)}
                        hasData={fuel?.fuelRevenueUsd != null}
                      />
                    </>
                  )}
                  {(metric?.laborCostUsd != null || metric?.expectedProfitUsd != null) && (
                    <>
                      {metric?.laborCostUsd != null && (
                        <MorningMetricTile
                          copy={METRIC_TILES.laborCost}
                          value={formatUsd(metric.laborCostUsd)}
                          hasData
                        />
                      )}
                      {metric?.expectedProfitUsd != null && (
                        <MorningMetricTile
                          copy={METRIC_TILES.expectedProfit}
                          value={formatUsd(metric.expectedProfitUsd)}
                          hasData
                          valueTone="profit"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {selected && (
              <form
                className="bg-white rounded-lg shadow-md p-4 space-y-3"
                onSubmit={async event => {
                  event.preventDefault();
                  if (!tenantId || !selected.locationCode) return;
                  setAsking(true);
                  const result = await askRetailBriefServer(tenantId, date, selected.locationCode, question);
                  setAnswer(result.reply);
                  setAsking(false);
                }}
              >
                <label className="block text-sm font-medium text-gray-700">
                  Ask about this brief
                  <input
                    value={question}
                    onChange={event => setQuestion(event.target.value)}
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Ask
                </button>
                {answer && <p className="text-gray-800">{answer}</p>}
              </form>
            )}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Morning action list</h2>
              {cards.length === 0 && <p className="text-gray-600">No cards for this store on this date.</p>}
              {cards.map(card => {
                const isChain = card.locationId == null;
                const origin = originForRecommendationCategory(card.category, { isChain });
                return (
                  <article key={card.id ?? card.title} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {categoryDisplayLabel(card.category)}
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
                          <span className="text-xs text-gray-500">{card.status || 'NEW'}</span>
                        </div>
                        <p className="mt-2 font-medium text-gray-900">{card.title}</p>
                        {card.detail && <p className="mt-1 text-sm text-gray-600">{card.detail}</p>}
                        {card.explanation && (
                          <p className="mt-2 text-sm text-gray-700" title={card.explanation}>
                            {card.explanation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatUsd(card.estimatedImpactUsd)}</p>
                        <p className="text-xs text-gray-500">est. impact</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"
                        onClick={() => setStatus(card, 'ACCEPTED')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
                        onClick={() => setStatus(card, 'DISMISSED')}
                      >
                        Dismiss
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
