'use client';

import { useState } from 'react';
import Link from 'next/link';
import { setOrganizationBillingScope } from './websiteActions';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function OrganizationBillingScopeCard({
  organizationId,
  homeTenantId,
  initialScope,
  initialAmount,
}: {
  organizationId: number;
  homeTenantId: string;
  initialScope: 'ORGANIZATION' | 'PER_TENANT';
  initialAmount: number;
}) {
  const [scope, setScope] = useState(initialScope);
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toFixed(2) : '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const numeric = Number(amount.startsWith('.') ? `0${amount}` : amount);
      await setOrganizationBillingScope({
        organizationId,
        homeTenantId,
        scope,
        monthlyUsd: scope === 'ORGANIZATION' ? numeric : null,
      });
      setMessage(scope === 'ORGANIZATION' ? 'This organization now has one subscription.' : 'Each website stays complimentary until its own charge switch is turned on.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save billing scope');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm text-gray-700">
        Billing scope
        <select
          className="mt-1 block w-full max-w-md border border-gray-400 rounded-xl px-4 py-3"
          value={scope}
          onChange={(event) => setScope(event.target.value === 'ORGANIZATION' ? 'ORGANIZATION' : 'PER_TENANT')}
        >
          <option value="ORGANIZATION">Bill the organization once</option>
          <option value="PER_TENANT">Bill each website separately</option>
        </select>
      </label>
      {scope === 'ORGANIZATION' && (
        <label className="block text-sm text-gray-700">
          Monthly amount
          <input
            className="mt-1 block w-full max-w-md border border-gray-400 rounded-xl px-4 py-3"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onBlur={() => {
              const numeric = Number(amount.startsWith('.') ? `0${amount}` : amount);
              if (Number.isFinite(numeric)) setAmount(numeric.toFixed(2));
            }}
          />
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save billing scope'}
        </button>
        <Link
          href={`/admin/platform-billing?organizationId=${organizationId}`}
          className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-6 font-semibold text-indigo-700 inline-flex items-center"
        >
          Open billing area
        </Link>
      </div>
      {scope === 'ORGANIZATION' && initialAmount > 0 && (
        <p className="text-sm font-semibold text-gray-900">{money.format(initialAmount)} is the current organization amount.</p>
      )}
      {message && <p className="text-sm text-blue-800">{message}</p>}
    </div>
  );
}
