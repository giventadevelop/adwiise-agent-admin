'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  lookupTenantForMove,
  reassignTenantToOrganization,
  type TenantMovePreview,
} from '@/app/admin/tenant-management/organizations/websiteActions';

export default function MoveTenantClient({
  organizationId,
  organizationName,
}: {
  organizationId: number;
  organizationName: string;
}) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [preview, setPreview] = useState<TenantMovePreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await lookupTenantForMove(tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not look up that tenant ID.');
    } finally {
      setBusy(false);
    }
  };

  const move = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await reassignTenantToOrganization(preview.tenantId, organizationId);
      router.push(`/admin/tenant-management/organizations/${organizationId}#tenant-ids`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the tenant ID.');
      setBusy(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
      <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
        Tenant ID
      </label>
      <input
        id="tenantId"
        type="text"
        value={tenantId}
        onChange={(event) => {
          setTenantId(event.target.value);
          setPreview(null);
        }}
        className="block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base font-mono"
        placeholder="tenant_id"
      />
      <button
        type="button"
        onClick={() => void lookup()}
        disabled={busy || !tenantId.trim()}
        className="w-full flex-shrink-0 h-14 rounded-xl bg-sky-100 hover:bg-sky-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Look up tenant ID"
        aria-label="Look up tenant ID"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="font-semibold text-sky-700">{busy && !preview ? 'Looking up...' : 'Look up tenant ID'}</span>
      </button>

      {preview ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
          <p>
            <span className="font-mono font-semibold">{preview.tenantId}</span> is on{' '}
            <span className="font-semibold">{preview.organizationName}</span>.
          </p>
          <p className="mt-2">Moving it sets its organization to {organizationName}.</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={() => void move()}
        disabled={busy || !preview || preview.organizationId === organizationId}
        className="w-full flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Move tenant ID to this organization"
        aria-label="Move tenant ID to this organization"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span className="font-semibold text-indigo-700">{busy && preview ? 'Moving...' : 'Move to this organization'}</span>
      </button>
    </div>
  );
}
