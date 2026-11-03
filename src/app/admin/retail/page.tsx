'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, RetailNav, fieldClass, labelClass } from '@/components/retail/RetailUi';
import MorningMetricTile from '@/components/retail/MorningMetricTile';
import {
  METRIC_TILES,
  ORIGIN_CHIP_STYLES,
  ORIGIN_SURFACE,
  STATUS_CHIP,
  categoryDisplayLabel,
  originForRecommendationCategory,
  packSurface,
} from '@/lib/retail/metricDisplay';
import { useAdminTenantId } from '../AdminTenantContext';
import TenantSiteTypePicker from '../TenantSiteTypePicker';
import type { RetailDailyMetricsDTO, RetailFuelDayDTO, RetailLocationDTO, RetailRecommendationDTO } from '@/types/retail';
import {
  askRetailBriefServer,
  loadRetailMorningBundle,
  refreshRetailBriefServer,
  updateRetailRecommendationServer,
} from './retailServer';

const GAS_PACKS = new Set(['GAS_STATION']);

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
  const [storeError, setStoreError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
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
      setStoreError(null);
      setMetricsError(null);
      setFuelError(null);
      setCardError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setStoreError(null);
    setMetricsError(null);
    setFuelError(null);
    setCardError(null);
    (async () => {
      const bundle = await loadRetailMorningBundle(date, tenantId);
      if (cancelled) return;
      setCanAssign(bundle.canAssign);
      setDenied(bundle.denied);
      setLocations(bundle.locations);
      setMetrics(bundle.metrics);
      setFuelDays(bundle.fuelDays);
      setRecommendations(bundle.recommendations);
      setStoreError(bundle.storeError);
      setMetricsError(bundle.metricsError);
      setFuelError(bundle.fuelError);
      setCardError(bundle.cardError);
      setLocationId(current => {
        if (current != null && bundle.locations.some(location => location.id === current)) return current;
        return bundle.locations[0]?.id ?? null;
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
        <p className="mt-2 text-lg text-gray-800">
          Stores you are allowed to see for this tenant. Gallons appear only for a gas station.
        </p>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="morning" showAccess={canAssign} />
        </div>

        {!tenantId && <TenantSiteTypePicker siteTypes={['RETAIL']} title="Retail tenants" />}

        {tenantId && denied && (
          <p className="mt-6 text-gray-700">You do not have a retail role for this tenant.</p>
        )}

        {tenantId && !denied && (
          <div className="mt-6 space-y-6">
            <div className="bg-sky-200 text-sky-950 border-l-4 border-sky-700 rounded-lg shadow-md p-6 grid gap-4 md:grid-cols-3 items-end">
              <label className={`${labelClass} text-base text-sky-950`}>
                Brief date
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className={fieldClass}
                  disabled={loading}
                />
              </label>
              <label className={`${labelClass} text-base text-sky-950`}>
                Store
                <select
                  value={locationId ?? ''}
                  onChange={event => setLocationId(event.target.value ? Number(event.target.value) : null)}
                  className={fieldClass}
                  disabled={loading || locations.length === 0}
                >
                  {locations.length === 0 && <option value="">No stores</option>}
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.locationCode} ({location.retailerTypeCode || 'no pack'})
                    </option>
                  ))}
                </select>
              </label>
              <ActionButton
                tone="teal"
                icon="refresh"
                label={asking ? 'Refreshing' : 'Refresh brief'}
                disabled={asking || loading}
                onClick={async () => {
                  if (!tenantId) return;
                  setAsking(true);
                  const refreshed = await refreshRetailBriefServer(tenantId, date);
                  setAsking(false);
                  if (refreshed.ok) setRefreshKey(current => current + 1);
                }}
              />
              {!loading && locations.length === 0 && (
                <p className="text-base font-medium md:col-span-3">
                  {storeError
                    ? `The store list could not be loaded for tenant ${tenantId}. ${storeError}`
                    : `No stores are available for tenant ${tenantId}. The store list is the same on every brief date.`}
                </p>
              )}
              {!loading && (metricsError || fuelError) && (
                <p className="text-base font-medium md:col-span-3">
                  {[metricsError, fuelError].filter(Boolean).join(' ')} The store list is still available.
                </p>
              )}
            </div>

            {selected && (
              <div className="space-y-4">
                <div className={`rounded-lg shadow-md p-6 ${packSurface(selected.retailerTypeCode)}`}>
                  <p className="text-2xl font-bold">
                    {selected.locationName} · {selected.locationCode}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    Pack {selected.retailerTypeCode || 'not set'}
                    {selected.region ? ` · Region ${selected.region}` : ''}
                  </p>
                  <p className="mt-2 text-base font-medium">
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
                className="bg-cyan-200 text-cyan-950 border-l-4 border-cyan-700 rounded-lg shadow-md p-6 space-y-4"
                onSubmit={async event => {
                  event.preventDefault();
                  if (!tenantId || !selected.locationCode) return;
                  setAsking(true);
                  const result = await askRetailBriefServer(tenantId, date, selected.locationCode, question);
                  setAnswer(result.reply);
                  setAsking(false);
                }}
              >
                <label className={`${labelClass} text-base text-cyan-950`}>
                  Ask about this brief
                  <input
                    value={question}
                    onChange={event => setQuestion(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <ActionButton type="submit" tone="blue" icon="chat" label={asking ? 'Asking' : 'Ask'} disabled={asking || !question.trim()} />
                {answer && <p className="text-lg font-medium">{answer}</p>}
              </form>
            )}

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Morning action list</h2>
              {cardError && (
                <p className="text-lg text-gray-800">
                  Morning cards for {date} could not be loaded. {cardError} The store list does not depend on this date.
                </p>
              )}
              {!cardError && cards.length === 0 && (
                <p className="text-lg text-gray-800">No cards for this store on this date.</p>
              )}
              {cards.map(card => {
                const isChain = card.locationId == null;
                const origin = originForRecommendationCategory(card.category, { isChain });
                return (
                  <article key={card.id ?? card.title} className={`rounded-lg shadow-md p-6 ${ORIGIN_SURFACE[origin]}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ORIGIN_CHIP_STYLES[origin]}`}>
                            {categoryDisplayLabel(card.category)}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${ORIGIN_CHIP_STYLES[origin]}`}
                            title={
                              isChain
                                ? 'This card compares stores across the chain for this brief date.'
                                : `This action is driven by ${origin.toLowerCase()} data for this store.`
                            }
                          >
                            {origin}
                          </span>
                          {isChain && (
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-violet-800 text-white">
                              Chain-level
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_CHIP[card.status || 'NEW'] ?? STATUS_CHIP.NEW}`}>
                            {card.status || 'NEW'}
                          </span>
                        </div>
                        <p className="mt-3 text-xl font-bold">{card.title}</p>
                        {card.detail && <p className="mt-2 text-base font-medium">{card.detail}</p>}
                        {card.explanation && (
                          <p className="mt-2 text-base" title={card.explanation}>
                            {card.explanation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatUsd(card.estimatedImpactUsd)}</p>
                        <p className="text-base font-medium">est. impact</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ActionButton tone="emerald" icon="check" label="Accept" onClick={() => setStatus(card, 'ACCEPTED')} />
                      <ActionButton tone="orange" icon="ban" label="Dismiss" onClick={() => setStatus(card, 'DISMISSED')} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {loading && tenantId && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retail-morning-loading-title"
        >
          <div className="mx-4 w-full max-w-md rounded-xl border-2 border-blue-300 bg-blue-50 p-8 shadow-xl">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex items-center justify-center rounded-full bg-blue-100 p-4">
                <svg className="h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 id="retail-morning-loading-title" className="text-xl font-semibold text-blue-800">
                Loading stores
              </h2>
              <p className="text-base leading-relaxed text-blue-800">
                Loading the store list for tenant {tenantId} on {date}. The list stays disabled until this finishes.
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-blue-200">
                <div className="h-2 w-3/5 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
