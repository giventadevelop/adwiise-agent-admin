'use client';

import { useState } from 'react';
import type { RetailSamplePack, RetailSampleRunResponse } from '@/types/retailSampleRun';
import { ActionButton, YellowCheckbox, fieldClass, labelClass } from '@/components/retail/RetailUi';

const FUEL_PACKS = new Set<RetailSamplePack>(['GAS_STATION']);

const PACKS: { value: RetailSamplePack; label: string }[] = [
  { value: 'GAS_STATION', label: 'Gas sample (register and fuel)' },
  { value: 'LIQUOR_STORE', label: 'Liquor sample (register only)' },
  { value: 'DUNKIN_DONUTS', label: 'Dunkin sample (register only)' },
  { value: 'SEVEN_ELEVEN', label: '7-Eleven sample (register only)' },
  { value: 'RESTAURANT', label: 'Restaurant sample (register only)' },
  { value: 'CLINIC', label: 'Clinic sample (register only)' },
];

export default function RetailSampleRunPanel() {
  const [retailerType, setRetailerType] = useState<RetailSamplePack>('GAS_STATION');
  const [tenantId, setTenantId] = useState('');
  const [metricDate, setMetricDate] = useState('');
  const [saveToRetail, setSaveToRetail] = useState(false);
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [fuelFile, setFuelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RetailSampleRunResponse | null>(null);

  async function runSample() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/proxy/retail-sample-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerType,
          siteType: 'RETAIL',
          source: 'sample',
          post: saveToRetail,
          ...(metricDate ? { metricDate } : {}),
          ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {}),
        }),
      });
      const body = (await response.json()) as RetailSampleRunResponse;
      if (!response.ok || body.accepted === false) {
        setError(body.message || 'The sample run did not finish');
      } else {
        setResult(body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The sample run did not finish');
    } finally {
      setLoading(false);
    }
  }

  async function runUpload() {
    if (!registerFile) {
      setError('Choose a register file');
      return;
    }
    if (FUEL_PACKS.has(retailerType) && !fuelFile) {
      setError('Choose a fuel file for a gas pack');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set('retailerType', retailerType);
      form.set('siteType', 'RETAIL');
      form.set('post', saveToRetail ? 'true' : 'false');
      if (metricDate) form.set('metricDate', metricDate);
      if (tenantId.trim()) form.set('tenantId', tenantId.trim());
      form.set('registerFile', registerFile);
      if (FUEL_PACKS.has(retailerType) && fuelFile) form.set('fuelFile', fuelFile);
      const response = await fetch('/api/retail-sample-runs/upload', { method: 'POST', body: form });
      const body = (await response.json()) as RetailSampleRunResponse;
      if (!response.ok || body.accepted === false) {
        setError(body.message || 'The uploaded file run did not finish');
      } else {
        setResult(body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The uploaded file run did not finish');
    } finally {
      setLoading(false);
    }
  }

  const cards = result?.recommendations ?? [];

  return (
    <section className="mb-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Retail file run</h2>
      <p className="text-gray-700 mb-4">
        Run a bundled sample now, or upload a register file. A gas pack needs a fuel file. Other packs do not.
        This does not wait for the night job and does not open a customer connection.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Shop pack
          <select
            className={fieldClass}
            value={retailerType}
            onChange={event => setRetailerType(event.target.value as RetailSamplePack)}
          >
            {PACKS.map(pack => (
              <option key={pack.value} value={pack.value}>
                {pack.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Tenant id
          <input
            className={fieldClass}
            value={tenantId}
            onChange={event => setTenantId(event.target.value)}
            placeholder="Uses the signed-in tenant when left blank"
          />
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
        <div className="flex items-end">
          <YellowCheckbox checked={saveToRetail} onChange={setSaveToRetail} label="Save to retail tables" />
        </div>
        <label className={labelClass}>
          Register file
          <input
            className={`${fieldClass} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-700`}
            type="file"
            accept=".csv,text/csv"
            onChange={event => setRegisterFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className={labelClass}>
          Fuel file
          <input
            className={`${fieldClass} file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 disabled:opacity-50`}
            type="file"
            accept=".csv,text/csv"
            disabled={!FUEL_PACKS.has(retailerType)}
            onChange={event => setFuelFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ActionButton tone="teal" icon="play" label="Run bundled sample" disabled={loading} onClick={runSample} />
        <ActionButton tone="indigo" icon="upload" label="Upload and run" disabled={loading} onClick={runUpload} />
      </div>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {result && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-gray-800">
          <p>
            <strong>{result.stationCode}</strong> on {result.metricDate}. Pack {result.retailerType}. Source {result.source}.
          </p>
          <p>{result.fuelDay ? `Fuel day: ${result.fuelDay.fuelGallonsSold} gallons.` : 'No fuel day.'}</p>
          {result.featurePath && <p>Feature file: {result.featurePath}</p>}
          <ul className="mt-2 list-disc pl-5">
            {cards.map((card, index) => (
              <li key={`${card.category}-${index}`}>
                {card.category}: {card.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
