'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, FilePickButton, RetailNav, fieldClass, labelClass } from '@/components/retail/RetailUi';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { RetailLocationDTO } from '@/types/retail';
import { fetchRetailLocationsServer } from '../retailServer';

type UploadResult = {
  accepted?: boolean;
  posted?: boolean;
  stationCode?: string;
  metricDate?: string;
  locationName?: string;
  s3Prefix?: string;
  featureS3Key?: string;
  storage?: string;
  overwritten?: boolean;
  recommendations?: unknown[];
  controllerGallons?: number | null;
  message?: string;
  detail?: string;
  error?: string;
  path?: string;
  status?: number;
};

function normalizeUploadResult(raw: Record<string, unknown>): UploadResult {
  const recommendations = raw.recommendations ?? raw.recommendationList;
  return {
    accepted: raw.accepted as boolean | undefined,
    posted: Boolean(raw.posted ?? raw.Posted),
    stationCode: String(raw.stationCode ?? raw.station_code ?? ''),
    metricDate: String(raw.metricDate ?? raw.metric_date ?? ''),
    locationName: String(raw.locationName ?? raw.location_name ?? ''),
    s3Prefix: (raw.s3Prefix ?? raw.s3_prefix) as string | undefined,
    featureS3Key: (raw.featureS3Key ?? raw.feature_s3_key) as string | undefined,
    storage: raw.storage as string | undefined,
    overwritten: Boolean(raw.overwritten),
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    controllerGallons: (raw.controllerGallons ?? raw.controller_gallons) as number | null | undefined,
    message: raw.message as string | undefined,
    detail: raw.detail as string | undefined,
    error: raw.error as string | undefined,
    path: raw.path as string | undefined,
    status: raw.status as number | undefined,
  };
}

function RetailBusyDialog({
  titleId,
  title,
  message,
}: {
  titleId: string;
  title: string;
  message: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mx-4 w-full max-w-md rounded-xl border-2 border-blue-300 bg-blue-50 p-8 shadow-xl">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center justify-center rounded-full bg-blue-100 p-4">
            <svg className="h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 id={titleId} className="text-xl font-semibold text-blue-800">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-blue-800">{message}</p>
          <div className="mt-4 h-2 w-full rounded-full bg-blue-200">
            <div className="h-2 w-3/5 animate-pulse rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RetailUploadPage() {
  const tenantIdFromContext = useAdminTenantId();
  const searchParams = useSearchParams();
  const urlTenant = (searchParams?.get('tenant') ?? '').trim() || undefined;
  const tenantId = tenantIdFromContext || urlTenant;

  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [locationId, setLocationId] = useState<number>(0);
  const [metricDate, setMetricDate] = useState('');
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [fuelFile, setFuelFile] = useState<File | null>(null);
  // Start true so hard refresh / first paint shows the dialog before the effect runs.
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  useEffect(() => {
    if (!tenantId) {
      setLocations([]);
      setLocationId(0);
      // URL may resolve a moment after hard refresh; keep spinner only while a tenant is expected.
      setLoadingStores(Boolean(urlTenant));
      return;
    }
    let cancelled = false;
    setLoadingStores(true);
    setLocations([]);
    setLocationId(0);
    fetchRetailLocationsServer(tenantId)
      .then(stores => {
        if (cancelled) return;
        setLocations(stores);
        setLocationId(stores[0]?.id || 0);
      })
      .catch(() => {
        if (cancelled) return;
        setLocations([]);
        setLocationId(0);
      })
      .finally(() => {
        if (!cancelled) setLoadingStores(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, urlTenant]);

  const selected = useMemo(
    () => locations.find(location => location.id === locationId),
    [locations, locationId],
  );
  const gasStore = selected?.retailerTypeCode === 'GAS_STATION' || selected?.retailerTypeCode === 'GAS_STATION_ENT';

  async function upload() {
    if (!locationId) {
      setError('Choose a store.');
      return;
    }
    if (!metricDate.trim()) {
      setError('Choose a business date.');
      return;
    }
    if (!registerFile) {
      setError('Choose a register file.');
      return;
    }
    if (gasStore && !fuelFile) {
      setError('Choose a fuel file for a gas station.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.set('locationId', String(locationId));
      form.set('metricDate', metricDate.trim());
      if (tenantId) form.set('tenantId', tenantId);
      form.set('registerFile', registerFile);
      if (gasStore && fuelFile) form.set('fuelFile', fuelFile);
      const proxyUrl = tenantId
        ? `/api/proxy/retail-day-uploads/upload?tenantId=${encodeURIComponent(tenantId)}`
        : '/api/proxy/retail-day-uploads/upload';
      const response = await fetch(proxyUrl, { method: 'POST', body: form });
      const raw = (await response.json()) as Record<string, unknown>;
      const body = normalizeUploadResult(raw);
      // Fill identity from the form when the API omits it (older service builds).
      if (!body.stationCode && selected?.locationCode) body.stationCode = selected.locationCode;
      if (!body.locationName && selected?.locationName) body.locationName = selected.locationName;
      if (!body.metricDate && metricDate.trim()) body.metricDate = metricDate.trim();
      const incomplete = !body.stationCode || !body.metricDate;
      if (!response.ok || body.accepted === false || incomplete || body.posted !== true) {
        const detail =
          body.message ||
          body.detail ||
          body.error ||
          (incomplete
            ? 'The API returned an incomplete day result. Redeploy adwiise-agent-service (RetailDayUploadResource) and the engine image that serves POST /v1/uploads/day.'
            : body.posted !== true
              ? 'The day was accepted but not posted to the retail tables. Check that the serving engine can reach the API and FEATURE_STORE_S3_URI is set.'
              : '') ||
          `Upload failed (HTTP ${response.status}).`;
        setError(detail);
        setResult(null);
      } else {
        setResult(body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The day was not uploaded.');
    } finally {
      setLoading(false);
    }
  }

  const showStoresDialog = loadingStores;
  const storeDialogTenant = tenantId || 'this organization';

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Upload day</h1>
        <p className="mt-2 text-base text-gray-800 max-w-3xl">
          Upload the register file for a store and date. Gas stations also need a fuel file. The day is saved to the
          retail tables. Uploading the same date again overwrites that day.
        </p>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="upload" />
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Store
            <select
              className={fieldClass}
              value={locationId || ''}
              disabled={loadingStores || locations.length === 0}
              onChange={event => setLocationId(Number(event.target.value))}
            >
              {loadingStores && <option value="">Loading stores…</option>}
              {!loadingStores && locations.length === 0 && <option value="">No stores</option>}
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} — {location.locationName} ({location.retailerTypeCode})
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Business date
            <input
              className={fieldClass}
              type="date"
              value={metricDate}
              onChange={event => setMetricDate(event.target.value)}
            />
          </label>
          <div>
            <span className={labelClass}>Register file</span>
            <FilePickButton
              tone="blue"
              icon="register"
              label="Choose register file"
              accept=".csv,text/csv"
              fileName={registerFile?.name}
              onChange={setRegisterFile}
            />
          </div>
          {gasStore && (
            <div>
              <span className={labelClass}>Fuel file</span>
              <FilePickButton
                tone="amber"
                icon="fuel"
                label="Choose fuel file"
                accept=".csv,text/csv"
                fileName={fuelFile?.name}
                onChange={setFuelFile}
              />
            </div>
          )}
          {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
          {!loadingStores && tenantId && locations.length === 0 && (
            <p className="sm:col-span-2 text-sm text-gray-700">
              No stores are available for tenant {tenantId}. Add a store on Locations before uploading a day.
            </p>
          )}
          <div className="sm:col-span-2 pt-2 border-t-2 border-blue-200">
            <ActionButton
              tone="blue"
              icon="upload"
              label={loading ? 'Uploading…' : 'Upload and save'}
              emphasized
              disabled={loading || loadingStores || locations.length === 0}
              onClick={upload}
            />
          </div>
        </div>

        <div className="mt-6 bg-sky-200 border-l-4 border-sky-700 rounded-xl p-6 text-sky-950">
          <p className="text-base font-medium">Example files</p>
          <ul className="mt-2 list-disc pl-5 text-base space-y-1">
            <li>
              <a className="underline" href="/samples/manual-upload/gas-register.csv">
                gas-register.csv
              </a>{' '}
              and{' '}
              <a className="underline" href="/samples/manual-upload/gas-fuel.csv">
                gas-fuel.csv
              </a>{' '}
              for a gas station
            </li>
            <li>
              <a className="underline" href="/samples/manual-upload/liquor-register.csv">
                liquor-register.csv
              </a>{' '}
              for a liquor store (no fuel file)
            </li>
          </ul>
          <p className="mt-3 text-base">
            The sample files stay dated 2026-07-08. The business date you choose above becomes the day that is saved.
          </p>
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-base text-gray-900 space-y-2">
            <p className="font-semibold">Day saved</p>
            <p>
              Store {result.stationCode || '—'}
              {result.locationName ? ` (${result.locationName})` : ''} on {result.metricDate || '—'}.
            </p>
            <p>Posted to retail tables: {result.posted ? 'yes' : 'no'}.</p>
            <p>Cards: {(result.recommendations || []).length}.</p>
            {result.controllerGallons != null && <p>Controller gallons: {result.controllerGallons}.</p>}
            {result.s3Prefix && (
              <p>
                Inbox prefix: <code className="text-sm">{result.s3Prefix}</code>
              </p>
            )}
            {result.featureS3Key && (
              <p>
                Feature file: <code className="text-sm">{result.featureS3Key}</code>
              </p>
            )}
            {result.overwritten && <p>This date was overwritten.</p>}
            {result.storage === 'local' && (
              <p>Files were stored on the engine host. Cloud uploads use the S3 feature store.</p>
            )}
          </div>
        )}
      </div>

      {showStoresDialog && !loading && (
        <RetailBusyDialog
          titleId="retail-upload-loading-title"
          title="Loading stores"
          message={`Loading the store list for tenant ${storeDialogTenant}. The store dropdown stays disabled until this finishes.`}
        />
      )}

      {loading && (
        <RetailBusyDialog
          titleId="retail-upload-saving-title"
          title="Uploading day"
          message={
            tenantId
              ? `Uploading files for tenant ${tenantId}. Please wait until the day is saved.`
              : 'Uploading files. Please wait until the day is saved.'
          }
        />
      )}
    </div>
  );
}
