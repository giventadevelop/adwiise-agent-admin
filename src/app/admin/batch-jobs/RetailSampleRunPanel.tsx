'use client';

import { useState } from 'react';
import type { RetailSamplePack, RetailSampleRunResponse } from '@/types/retailSampleRun';

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
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set('retailerType', retailerType);
      form.set('siteType', 'RETAIL');
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
    <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Retail file run</h2>
      <p className="text-gray-700 mb-4">
        Run a bundled sample now, or upload a register file. Fuel is optional and is used for a gas pack.
        This does not wait for the night job and does not open a customer connection.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Shop pack
          <select
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
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
        <label className="block text-sm font-medium text-gray-700">
          Tenant id
          <input
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            value={tenantId}
            onChange={event => setTenantId(event.target.value)}
            placeholder="Uses the signed-in tenant when left blank"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Register file
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept=".csv,text/csv"
            onChange={event => setRegisterFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fuel file
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept=".csv,text/csv"
            disabled={!FUEL_PACKS.has(retailerType)}
            onChange={event => setFuelFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
          onClick={runSample}
        >
          Run bundled sample
        </button>
        <button
          type="button"
          className="rounded bg-white px-4 py-2 text-indigo-800 border border-indigo-300 disabled:opacity-60"
          disabled={loading}
          onClick={runUpload}
        >
          Upload and run
        </button>
      </div>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {result && (
        <div className="mt-4 rounded bg-white p-4 text-sm text-gray-800">
          <p>
            <strong>{result.stationCode}</strong> on {result.metricDate}. Pack {result.retailerType}. Source {result.source}.
          </p>
          <p>{result.fuelDay ? `Fuel day: ${result.fuelDay.fuelGallonsSold} gallons.` : 'No fuel day.'}</p>
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
