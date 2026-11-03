'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
};

export default function RetailUploadPage() {
  const tenantId = useAdminTenantId();
  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [locationId, setLocationId] = useState<number>(0);
  const [metricDate, setMetricDate] = useState('');
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [fuelFile, setFuelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  useEffect(() => {
    let cancelled = false;
    fetchRetailLocationsServer(tenantId).then(stores => {
      if (cancelled) return;
      setLocations(stores);
      setLocationId(stores[0]?.id || 0);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

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
      const response = await fetch('/api/retail-day-uploads/upload', { method: 'POST', body: form });
      const body = (await response.json()) as UploadResult;
      if (!response.ok || body.accepted === false) {
        setError(body.message || body.detail || 'The day was not uploaded.');
      } else {
        setResult(body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The day was not uploaded.');
    } finally {
      setLoading(false);
    }
  }

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
              onChange={event => setLocationId(Number(event.target.value))}
            >
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
          <div className="sm:col-span-2">
            <ActionButton tone="blue" icon="upload" label="Upload and save" disabled={loading} onClick={upload} />
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
              Store {result.stationCode}
              {result.locationName ? ` (${result.locationName})` : ''} on {result.metricDate}.
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
    </div>
  );
}
