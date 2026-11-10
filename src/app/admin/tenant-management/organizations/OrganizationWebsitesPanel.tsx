'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TenantOrganizationSearchSelect from '@/app/admin/tenant-management/components/TenantOrganizationSearchSelect';
import {
  attachWebsiteToClient,
  loadOrganizationFlatFee,
  loadOrganizationWebsites,
  moveWebsiteToClient,
  resolveClientOrganizationId,
  saveOrganizationFlatFee,
  type OrganizationFlatFee,
  type OrganizationWebsitesView,
} from './websiteActions';

const money = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function OrganizationWebsitesPanel({ organizationId }: { organizationId: number }) {
  const [view, setView] = useState<OrganizationWebsitesView | null>(null);
  const [fee, setFee] = useState<OrganizationFlatFee | null>(null);
  const [displayAmount, setDisplayAmount] = useState('');
  const [addTenantId, setAddTenantId] = useState('');
  const [moveWebsiteId, setMoveWebsiteId] = useState('');
  const [moveTenantId, setMoveTenantId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const loaded = await loadOrganizationWebsites(organizationId);
    setView(loaded);
    const loadedFee = await loadOrganizationFlatFee(loaded.clientId, loaded.homeTenantId);
    setFee(loadedFee);
    setDisplayAmount(loadedFee.monthlyUsd != null ? loadedFee.monthlyUsd.toFixed(2) : '');
  }

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load websites');
      });
    return () => {
      cancelled = true;
    };
    // organizationId is the only input. reload closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await reload();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The change was not saved');
    } finally {
      setBusy(false);
    }
  }

  async function saveFee(amount: number) {
    if (!view) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveOrganizationFlatFee({
        organizationId: view.clientId,
        homeTenantId: view.homeTenantId,
        monthlyUsd: amount,
      });
      setFee(saved);
      setDisplayAmount(saved.monthlyUsd != null ? saved.monthlyUsd.toFixed(2) : amount.toFixed(2));
      setMessage(
        amount > 0
          ? `One monthly charge of ${money(amount)} is set on ${view.clientName}. Its websites are covered and are not charged separately.`
          : 'The organization charge is off. Websites can be billed on their own again.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the monthly charge');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!fee?.billingId || !view) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/platform-billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingId: fee.billingId,
          tenantId: view.homeTenantId,
          mode: 'RECURRING',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  }

  const movable = (view?.websites || []).filter((site) => !site.isHome);

  return (
    <div className="mt-6 bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Websites for this organization</h3>
        <p className="text-sm text-gray-600 mt-1">
          One client owns these tenant IDs. The home tenant carries the single monthly charge. A website can move to another client.
        </p>
      </div>
      <div className="px-6 py-4 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {!view ? (
          <p className="text-sm text-gray-600">Loading websites...</p>
        ) : (
          <>
            <p className="text-sm text-gray-700">
              Client: <span className="font-semibold">{view.clientName}</span>
              {!view.viewedIsClient ? ' (this page is one of its websites)' : ''}
            </p>
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {view.websites.map((site) => (
                <li key={site.tenantId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-gray-900">{site.tenantId}</p>
                    <p className="text-sm text-gray-600">
                      {site.organizationName}
                      {site.isHome ? ' · Home site' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {site.settingsId != null ? (
                      <Link href={`/admin/tenant-management/settings/${site.settingsId}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                        Tenant settings
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">No settings row</span>
                    )}
                    {!site.isHome ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => moveWebsiteToClient(site.id, null),
                            `${site.tenantId} is now its own organization.`
                          )
                        }
                        className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
                      >
                        Detach
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Add a website</h4>
                <TenantOrganizationSearchSelect value={addTenantId} onChange={setAddTenantId} />
                <button
                  type="button"
                  disabled={busy || !addTenantId.trim()}
                  onClick={() =>
                    void run(async () => {
                      await attachWebsiteToClient(view.clientId, addTenantId.trim());
                      setAddTenantId('');
                    }, `Tenant ${addTenantId.trim()} is now a website of ${view.clientName}.`)
                  }
                  className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50"
                >
                  Add website
                </button>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Move a website</h4>
                <select
                  value={moveWebsiteId}
                  onChange={(event) => setMoveWebsiteId(event.target.value)}
                  className="block w-full border border-gray-400 rounded-xl px-4 py-3"
                >
                  <option value="">Choose a website</option>
                  {movable.map((site) => (
                    <option key={site.id} value={String(site.id)}>
                      {site.organizationName} ({site.tenantId})
                    </option>
                  ))}
                </select>
                <TenantOrganizationSearchSelect value={moveTenantId} onChange={setMoveTenantId} />
                <button
                  type="button"
                  disabled={busy || !moveWebsiteId || !moveTenantId.trim()}
                  onClick={() =>
                    void run(async () => {
                      const destinationId = await resolveClientOrganizationId(moveTenantId.trim());
                      await moveWebsiteToClient(Number(moveWebsiteId), destinationId);
                      setMoveWebsiteId('');
                      setMoveTenantId('');
                    }, 'The website moved to the selected organization.')
                  }
                  className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-6 font-semibold text-indigo-700 disabled:opacity-50"
                >
                  Move website
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-indigo-900">One monthly charge for this organization</h3>
                <p className="text-sm text-indigo-800 mt-1">
                  Stripe bills the home tenant once. Every website in this organization stays complimentary so it is not invoiced again.
                  Checkout accepts a card or a US bank account.
                </p>
              </div>
              <label className="block text-sm text-gray-700">
                Monthly amount (USD)
                <input
                  type="text"
                  inputMode="decimal"
                  value={displayAmount}
                  onChange={(event) => {
                    let next = event.target.value;
                    if (next.startsWith('.')) next = `0${next}`;
                    setDisplayAmount(next);
                  }}
                  onBlur={() => {
                    const parsed = Number.parseFloat(displayAmount);
                    if (!Number.isFinite(parsed)) {
                      setDisplayAmount(fee?.monthlyUsd != null ? fee.monthlyUsd.toFixed(2) : '');
                      return;
                    }
                    setDisplayAmount(parsed.toFixed(2));
                  }}
                  placeholder="0.00"
                  className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveFee(Number.parseFloat(displayAmount) || 0)}
                  className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-6 font-semibold text-indigo-700 disabled:opacity-50"
                >
                  Save monthly charge
                </button>
                <button
                  type="button"
                  disabled={busy || !fee?.billingId || !fee.chargeEnabled}
                  onClick={() => void pay()}
                  className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700 disabled:opacity-50"
                >
                  Pay monthly charge
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
