'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import RetailBusyDialog from '@/components/retail/RetailBusyDialog';
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
const DEFAULT_BRIEF_DATE = '2026-07-08';

/** Suggested questions so non-AI-savvy owners are not stuck with a blank Ask box. */
const ASK_SUGGESTIONS = [
  "What's driving today's top card?",
  'How much is in-store sales?',
  'Which card has the biggest estimated impact?',
  'How did fuel gallons look today?',
] as const;

function formatUsd(value?: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatCount(value?: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

export default function RetailMorningPage() {
  const tenantIdFromContext = useAdminTenantId();
  const searchParams = useSearchParams();
  const urlTenant = (searchParams?.get('tenant') ?? '').trim() || undefined;
  // URL fallback so hard refresh still has a tenant before AdminTenantContext catches up.
  const tenantId = tenantIdFromContext || urlTenant;

  // dateInput = calendar field; date = committed value that triggers loads (on blur / Enter).
  const [dateInput, setDateInput] = useState(DEFAULT_BRIEF_DATE);
  const [date, setDate] = useState(DEFAULT_BRIEF_DATE);
  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [metrics, setMetrics] = useState<RetailDailyMetricsDTO[]>([]);
  const [fuelDays, setFuelDays] = useState<RetailFuelDayDTO[]>([]);
  const [recommendations, setRecommendations] = useState<RetailRecommendationDTO[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [canAssign, setCanAssign] = useState(false);
  const [denied, setDenied] = useState(false);
  // Stores dialog only for first load / tenant change — not for calendar date commits.
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askFocusTitle, setAskFocusTitle] = useState<string | null>(null);
  const [askFocusId, setAskFocusId] = useState<number | string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const storesLoadedForTenantRef = useRef<string | null>(null);
  const dateCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitForBriefAfterRefreshRef = useRef(false);
  const committedDateRef = useRef(date);
  committedDateRef.current = date;

  const commitBriefDate = (nextValue?: string) => {
    if (dateCommitTimerRef.current) {
      clearTimeout(dateCommitTimerRef.current);
      dateCommitTimerRef.current = null;
    }
    const next = (nextValue ?? dateInput).trim();
    if (!next || next === committedDateRef.current) return;
    setDate(next);
  };

  /** Calendar day click may not blur; spinner arrows fire many changes — wait until value settles. */
  const scheduleBriefDateCommit = (nextValue: string) => {
    if (dateCommitTimerRef.current) clearTimeout(dateCommitTimerRef.current);
    dateCommitTimerRef.current = setTimeout(() => {
      dateCommitTimerRef.current = null;
      commitBriefDate(nextValue);
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (dateCommitTimerRef.current) clearTimeout(dateCommitTimerRef.current);
    };
  }, []);

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
      storesLoadedForTenantRef.current = null;
      setLoadingStores(Boolean(urlTenant));
      setLoadingBrief(false);
      return;
    }
    let cancelled = false;
    const needStores = storesLoadedForTenantRef.current !== tenantId;
    if (needStores) {
      setLoadingStores(true);
      setLocations([]);
      setLocationId(null);
    } else {
      // Date/refresh only — keep store list; no stores modal.
      setLoadingBrief(true);
    }
    setStoreError(null);
    setMetricsError(null);
    setFuelError(null);
    setCardError(null);
    (async () => {
      try {
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
        storesLoadedForTenantRef.current = tenantId;
        setLocationId(current => {
          if (current != null && bundle.locations.some(location => location.id === current)) return current;
          return bundle.locations[0]?.id ?? null;
        });
      } finally {
        if (!cancelled) {
          setLoadingStores(false);
          setLoadingBrief(false);
          if (waitForBriefAfterRefreshRef.current) {
            waitForBriefAfterRefreshRef.current = false;
            setRefreshing(false);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, date, refreshKey, urlTenant]);

  const loading = loadingStores || loadingBrief;
  const selected = locations.find(location => location.id === locationId) ?? null;
  const sellsFuel = GAS_PACKS.has(selected?.retailerTypeCode ?? '');
  const metric = metrics.find(row => row.locationId === locationId) ?? null;
  const fuel = fuelDays.find(row => row.locationId === locationId) ?? null;
  const cards = useMemo(
    () => recommendations.filter(row => row.locationId === locationId),
    [recommendations, locationId]
  );
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';
  const storeDialogTenant = tenantId || urlTenant || 'this tenant';
  const showStoresDialog = loadingStores && Boolean(tenantId || urlTenant) && !refreshing && !asking;

  const setStatus = async (card: RetailRecommendationDTO, status: 'ACCEPTED' | 'DISMISSED') => {
    if (card.id == null || card.locationId == null) return;
    const updated = await updateRetailRecommendationServer(card.id, card.locationId, status, tenantId);
    if (!updated) return;
    setRecommendations(current => current.map(row => (row.id === updated.id ? { ...row, status: updated.status } : row)));
  };

  const runAsk = async (
    nextQuestion: string,
    focus?: { recommendationId?: number | string; recommendationTitle?: string }
  ) => {
    if (!tenantId || !selected?.locationCode || !nextQuestion.trim()) return;
    setAsking(true);
    setAskFocusTitle(focus?.recommendationTitle ?? null);
    setAskFocusId(focus?.recommendationId ?? null);
    try {
      const result = await askRetailBriefServer(tenantId, date, selected.locationCode, nextQuestion, {
        recommendationId: focus?.recommendationId,
        recommendationTitle: focus?.recommendationTitle,
        siteType: selected.retailerTypeCode || undefined,
      });
      setAnswer(result.reply ?? result.error ?? 'No answer yet for this brief.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="relative z-0 w-full overflow-x-hidden box-border pt-28 sm:pt-32">
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Retail morning brief</h1>
        <p className="mt-2 text-base sm:text-lg text-gray-800">
          Stores you are allowed to see for this tenant. Gallons appear only for a gas station.
        </p>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="morning" showAccess={canAssign} />
        </div>

        {!tenantId && (
          <div className="mt-6">
            <TenantSiteTypePicker siteTypes={['RETAIL']} title="Retail tenants" />
          </div>
        )}

        {tenantId && denied && (
          <p className="mt-6 text-gray-700">You do not have a retail role for this tenant.</p>
        )}

        {tenantId && !denied && (
          <div className="mt-6 space-y-6">
            <div className="bg-sky-200 text-sky-950 border-l-4 border-sky-700 rounded-lg shadow-md p-4 sm:p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <label className={`${labelClass} text-base text-sky-950 min-w-0`}>
                Brief date
                <input
                  type="date"
                  value={dateInput}
                  onChange={event => {
                    const next = event.target.value;
                    setDateInput(next);
                    // Do not load on every calendar/spinner step — settle or blur/Enter commits.
                    scheduleBriefDateCommit(next);
                  }}
                  onBlur={() => commitBriefDate()}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitBriefDate();
                      (event.target as HTMLInputElement).blur();
                    }
                  }}
                  className={fieldClass}
                  disabled={loadingStores || refreshing}
                />
              </label>
              <label className={`${labelClass} text-base text-sky-950 min-w-0`}>
                Store
                <select
                  value={locationId ?? ''}
                  onChange={event => setLocationId(event.target.value ? Number(event.target.value) : null)}
                  className={fieldClass}
                  disabled={loadingStores || locations.length === 0 || refreshing}
                >
                  {loadingStores && <option value="">Loading stores…</option>}
                  {!loadingStores && locations.length === 0 && <option value="">No stores</option>}
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.locationCode} ({location.retailerTypeCode || 'no pack'})
                    </option>
                  ))}
                </select>
              </label>
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <ActionButton
                  tone="teal"
                  icon="refresh"
                  label={refreshing ? 'Refreshing' : 'Refresh brief'}
                  disabled={asking || refreshing || loading}
                  onClick={async () => {
                    if (!tenantId) return;
                    setRefreshNotice(null);
                    setRefreshing(true);
                    waitForBriefAfterRefreshRef.current = true;
                    try {
                      const result = await refreshRetailBriefServer(tenantId, date, selected?.locationCode);
                      if (result.error) setRefreshNotice(result.error);
                      // Always reload platform metrics/cards, even if the engine trigger fails.
                      setRefreshKey(current => current + 1);
                    } catch {
                      waitForBriefAfterRefreshRef.current = false;
                      setRefreshing(false);
                      setRefreshNotice('Refresh failed. Try again in a moment.');
                    }
                  }}
                />
              </div>
              {refreshNotice && (
                <p className="text-base font-medium sm:col-span-2 lg:col-span-3">{refreshNotice}</p>
              )}
              {!loading && locations.length === 0 && (
                <p className="text-base font-medium sm:col-span-2 lg:col-span-3">
                  {storeError
                    ? `The store list could not be loaded for tenant ${tenantId}. ${storeError}`
                    : `No stores are available for tenant ${tenantId}. The store list is the same on every brief date.`}
                </p>
              )}
              {!loading && (metricsError || fuelError) && (
                <p className="text-base font-medium sm:col-span-2 lg:col-span-3">
                  {[metricsError, fuelError].filter(Boolean).join(' ')} The store list is still available.
                </p>
              )}
            </div>

            {selected && (
              <div className="space-y-4">
                <div className={`rounded-lg shadow-md p-4 sm:p-6 ${packSurface(selected.retailerTypeCode)}`}>
                  <p className="text-xl sm:text-2xl font-bold break-words">
                    {selected.locationName} · {selected.locationCode}
                  </p>
                  <p className="mt-1 text-base sm:text-lg font-semibold">
                    Pack {selected.retailerTypeCode || 'not set'}
                    {selected.region ? ` · Region ${selected.region}` : ''}
                  </p>
                  <p className="mt-2 text-sm sm:text-base font-medium">
                    One brief date, one store. Day numbers come from the register and, for gas packs, the fuel controller.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                className="bg-cyan-200 text-cyan-950 border-l-4 border-cyan-700 rounded-lg shadow-md p-4 sm:p-6 space-y-4"
                onSubmit={async event => {
                  event.preventDefault();
                  await runAsk(question, {
                    recommendationId: askFocusId ?? undefined,
                    recommendationTitle: askFocusTitle ?? undefined,
                  });
                }}
              >
                <label className={`${labelClass} text-base text-cyan-950`}>
                  Ask about this brief
                  <input
                    value={question}
                    onChange={event => {
                      setQuestion(event.target.value);
                      setAskFocusTitle(null);
                      setAskFocusId(null);
                    }}
                    className={fieldClass}
                    disabled={asking || refreshing}
                    placeholder="Or tap a suggestion / Ask about this on a card"
                  />
                </label>
                {askFocusTitle && (
                  <p className="text-sm font-semibold text-cyan-900">
                    Focused on card: {askFocusTitle}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {ASK_SUGGESTIONS.filter(chip => sellsFuel || !chip.toLowerCase().includes('fuel')).map(chip => (
                    <button
                      key={chip}
                      type="button"
                      className="rounded-md bg-cyan-800 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-60"
                      disabled={asking || refreshing}
                      onClick={async () => {
                        setQuestion(chip);
                        setAskFocusTitle(null);
                        setAskFocusId(null);
                        await runAsk(chip);
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:max-w-xs">
                  <ActionButton
                    type="submit"
                    tone="blue"
                    icon="chat"
                    label={asking ? 'Asking' : 'Ask'}
                    disabled={asking || refreshing || !question.trim()}
                  />
                </div>
                {answer && <p className="text-base sm:text-lg font-medium break-words">{answer}</p>}
              </form>
            )}

            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Morning action list</h2>
              {cardError && (
                <p className="text-base sm:text-lg text-gray-800">
                  Morning cards for {date} could not be loaded. {cardError} The store list does not depend on this date.
                </p>
              )}
              {!cardError && cards.length === 0 && (
                <p className="text-base sm:text-lg text-gray-800">No cards for this store on this date.</p>
              )}
              {cards.map(card => {
                const isChain = card.locationId == null;
                const origin = originForRecommendationCategory(card.category, { isChain });
                return (
                  <article key={card.id ?? card.title} className={`rounded-lg shadow-md p-4 sm:p-6 ${ORIGIN_SURFACE[origin]}`}>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
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
                        <p className="mt-3 text-lg sm:text-xl font-bold break-words">{card.title}</p>
                        {card.detail && <p className="mt-2 text-base font-medium break-words">{card.detail}</p>}
                        {card.explanation && (
                          <p className="mt-2 text-base break-words" title={card.explanation}>
                            {card.explanation}
                          </p>
                        )}
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xl sm:text-2xl font-bold">{formatUsd(card.estimatedImpactUsd)}</p>
                        <p className="text-base font-medium">est. impact</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
                      <ActionButton tone="emerald" icon="check" label="Accept" onClick={() => setStatus(card, 'ACCEPTED')} />
                      <ActionButton tone="orange" icon="ban" label="Dismiss" onClick={() => setStatus(card, 'DISMISSED')} />
                      <ActionButton
                        tone="blue"
                        icon="chat"
                        label="Ask about this"
                        disabled={asking || refreshing}
                        onClick={async () => {
                          const next = `Why this recommendation: ${card.title}?`;
                          setQuestion(next);
                          setAskFocusTitle(card.title);
                          setAskFocusId(card.id ?? card.sourceModelRunId ?? null);
                          await runAsk(next, {
                            recommendationId: card.id ?? card.sourceModelRunId,
                            recommendationTitle: card.title,
                          });
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {showStoresDialog && (
        <RetailBusyDialog
          titleId="retail-morning-loading-title"
          title="Loading stores"
          message={`Loading the store list for tenant ${storeDialogTenant} on ${date}. The list stays disabled until this finishes.`}
        />
      )}
      {refreshing && (
        <RetailBusyDialog
          titleId="retail-morning-refresh-title"
          title="Refreshing brief"
          message="Rebuilding cards for this store and date. Usually under a minute — please wait until this finishes."
        />
      )}
      {asking && (
        <RetailBusyDialog
          titleId="retail-morning-ask-title"
          title="Asking about this brief"
          message="Waiting for the AI engine answer. This usually takes a few seconds."
        />
      )}
    </div>
  );
}
