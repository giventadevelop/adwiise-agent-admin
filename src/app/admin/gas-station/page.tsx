import {
  getCurrentAdminAccess,
  resolveAdminTenantFilterForRequest,
  resolveSessionTenantForAccess,
} from '../adminAccessServer';
import {
  fetchGasStationDailyMetricsServer,
  fetchGasStationLocationsServer,
  fetchGasStationRecommendationsServer,
  updateGasStationRecommendationServer,
} from './ApiServerActions';
import GasStationDashboardClient from './GasStationDashboardClient';
import type {
  GasStationDailyMetricsDTO,
  GasStationLocationDTO,
  GasStationRecommendationDTO,
  GasStationRecommendationStatus,
} from '@/types/gasStation';

export const dynamic = 'force-dynamic';

type GasStationSearchParams = { tenant?: string; date?: string };

function briefDate(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

async function resolveDashboardTenant(requested: string | undefined): Promise<string | undefined> {
  const explicit = requested?.trim();
  if (explicit) {
    const resolved = await resolveAdminTenantFilterForRequest(explicit);
    return resolved.kind === 'equals' ? resolved.tenantId : undefined;
  }
  const access = await getCurrentAdminAccess();
  const session = await resolveSessionTenantForAccess(access);
  if (session.allTenants) return access.defaultTenantId;
  return session.tenantId || access.defaultTenantId;
}

export default async function GasStationDashboardPage(props: {
  searchParams?: Promise<GasStationSearchParams> | GasStationSearchParams;
}) {
  const searchParams =
    props.searchParams && typeof (props.searchParams as Promise<GasStationSearchParams>).then === 'function'
      ? await (props.searchParams as Promise<GasStationSearchParams>)
      : ((props.searchParams as GasStationSearchParams | undefined) ?? {});

  const tenantId = await resolveDashboardTenant(searchParams.tenant);
  const date = briefDate(searchParams.date);

  // Bound to this page so Accept/Dismiss is handled here. A client-only page
  // that imported the shared actions made Next forward the POST to another
  // worker; that forward waits out undici's 5-minute headers timeout, then 404s.
  async function updateRecommendation(
    id: number,
    patch: { status?: GasStationRecommendationStatus; ownerFeedback?: string; tenantId?: string }
  ) {
    'use server';
    return updateGasStationRecommendationServer(id, patch);
  }

  let stations: GasStationLocationDTO[] = [];
  let metrics: GasStationDailyMetricsDTO[] = [];
  let recommendations: GasStationRecommendationDTO[] = [];
  if (tenantId) {
    [stations, metrics, recommendations] = await Promise.all([
      fetchGasStationLocationsServer(tenantId),
      fetchGasStationDailyMetricsServer(date, tenantId),
      fetchGasStationRecommendationsServer(date, tenantId),
    ]);
  }

  return (
    <GasStationDashboardClient
      key={`${tenantId ?? 'none'}-${date}`}
      tenantId={tenantId}
      date={date}
      stations={stations}
      metrics={metrics}
      recommendations={recommendations}
      updateRecommendation={updateRecommendation}
    />
  );
}
