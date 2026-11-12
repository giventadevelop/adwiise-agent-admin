'use client';

import { useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { saveTenantProductBilling, setLocationIncludedInBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
import { YellowCheckbox } from '@/components/retail/RetailUi';
import type { RetailLocationDTO } from '@/types/retail';
import type { PlatformBillingChargeDTO, PlatformBillingPlanDTO, PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';

const money = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const PRODUCTS: PlatformProduct[] = ['EVENT_SITE', 'GAS_STATION'];

export default function BillingDesk({
  tenantId,
  canEditSwitch,
  initialRows,
  plans,
  locations,
  lockedNotice,
  complimentaryPlan = false,
  charges = [],
}: {
  tenantId: string;
  canEditSwitch: boolean;
  initialRows: TenantProductBillingDTO[];
  plans: PlatformBillingPlanDTO[];
  locations: RetailLocationDTO[];
  lockedNotice?: boolean;
  complimentaryPlan?: boolean;
  charges?: PlatformBillingChargeDTO[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [locationRows, setLocationRows] = useState(locations);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function rowFor(product: PlatformProduct): TenantProductBillingDTO {
    return (
      rows.find((row) => row.product === product) || {
        tenantId,
        product,
        chargeEnabled: false,
        status: 'COMPLIMENTARY',
        graceDays: 14,
        billingMode: 'RECURRING',
      }
    );
  }

  function updateRow(product: PlatformProduct, patch: Partial<TenantProductBillingDTO>) {
    setRows((current) => {
      const existing = current.find((row) => row.product === product) || {
        tenantId,
        product,
        chargeEnabled: false,
        status: 'COMPLIMENTARY' as const,
        graceDays: 14,
        billingMode: 'RECURRING' as const,
      };
      return [...current.filter((row) => row.product !== product), { ...existing, ...patch }];
    });
  }

  async function persist(next: TenantProductBillingDTO) {
    setBusy(true);
    setMessage('');
    try {
      const saved = await saveTenantProductBilling(next);
      setRows((current) => {
        const without = current.filter((row) => row.product !== saved.product);
        return [...without, saved];
      });
      setMessage('Billing saved. Turning the switch on does not charge the card by itself.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      if (data.url) window.location.href = data.url;
      else setMessage('Done.');
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" style={{ paddingTop: '120px' }}>
      <AdminNavigation
        tenantId={tenantId}
        contextLine="Platform billing for this tenant — event site and gas station fees."
      />
      <h1 className="font-heading text-3xl text-foreground">Platform billing</h1>
      <p className="text-muted-foreground">Tenant {tenantId}. Cards and US bank accounts. Complimentary until the charge switch is on.</p>
      {lockedNotice && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Paid admin tools are locked until this platform fee is paid. The site itself stays online.
        </div>
      )}
      {message && <p className="text-sm text-blue-800">{message}</p>}
      {PRODUCTS.map((product) => {
        const row = rowFor(product);
        const covered = isCoveredByPortfolio(row.notes);
        const productPlans = plans.filter((plan) => plan.product === product && (plan.published !== false || plan.id === row.platformPlanId));
        return (
          <section key={product} className="bg-card rounded-lg sacred-shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">{product === 'EVENT_SITE' ? 'Event site' : 'Gas stations'}</h2>
            <p className="text-sm">
              Status <strong>{row.status || 'COMPLIMENTARY'}</strong>
              {row.customFeeUsd != null ? ` · custom fee ${money(row.customFeeUsd)}` : ''}
              {row.graceEndsAt ? ` · grace ends ${new Date(row.graceEndsAt).toLocaleDateString()}` : ''}
              {row.locationQuantity != null ? ` · quantity ${row.locationQuantity}` : ''}
            </p>
            {canEditSwitch && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">
                  Catalog plan
                  <select
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={row.platformPlanId != null ? row.platformPlanId : ''}
                    onChange={(event) => updateRow(product, { platformPlanId: Number(event.target.value) || null })}
                  >
                    <option value="">No catalog plan</option>
                    {productPlans.filter((plan) => plan.id != null).map((plan) => (
                      <option key={plan.id} value={plan.id as number}>
                        {plan.name} ({money(plan.listPriceUsd)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Custom fee USD (blank uses the catalog)
                  <input
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    defaultValue={row.customFeeUsd != null ? Number(row.customFeeUsd).toFixed(2) : ''}
                    onBlur={(event) => {
                      const raw = event.target.value.trim();
                      const value = raw === '' ? null : Number(raw.startsWith('.') ? `0${raw}` : raw);
                      updateRow(product, { customFeeUsd: value, clearCustomFee: value == null });
                      if (raw) event.target.value = (Number(raw.startsWith('.') ? `0${raw}` : raw) || 0).toFixed(2);
                    }}
                  />
                </label>
                <label className="text-sm">
                  Review-by date (reminder only)
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={row.reviewByDate || ''}
                    onChange={(event) => updateRow(product, { reviewByDate: event.target.value })}
                  />
                </label>
                <label className="text-sm">
                  Grace days
                  <input
                    type="number"
                    min={0}
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={row.graceDays ?? 14}
                    onChange={(event) => updateRow(product, { graceDays: Number(event.target.value) })}
                  />
                </label>
                <YellowCheckbox
                  checked={complimentaryPlan ? false : !!row.chargeEnabled}
                  disabled={!canEditSwitch || complimentaryPlan}
                  onChange={checked => updateRow(product, { chargeEnabled: checked })}
                  label="Charge switch"
                />
                {complimentaryPlan && (
                  <p className="text-sm text-emerald-800">
                    This tenant plan is free or demo. The charge switch stays off, so Stripe is not called.
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 font-semibold text-blue-700"
                  onClick={() => persist(rowFor(product))}
                >
                  Save {product === 'EVENT_SITE' ? 'event site' : 'gas station'} billing
                </button>
              </div>
            )}
            {covered ? (
              <p className="text-sm text-emerald-800">
                This website is covered by its organization. The organization subscription is the one that is paid and canceled.
              </p>
            ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !row.id || !row.chargeEnabled || complimentaryPlan}
                className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-4 font-semibold text-green-700 disabled:opacity-50"
                onClick={() => post('/api/platform-billing/checkout', { billingId: row.id, tenantId, mode: row.billingMode || 'RECURRING' })}
              >
                Pay {row.billingMode === 'ONE_TIME' ? 'once' : 'monthly'}
              </button>
              {row.billingMode !== 'ONE_TIME' && (
                <button
                  type="button"
                  disabled={busy || !row.id || !row.chargeEnabled || complimentaryPlan}
                  className="h-14 rounded-xl bg-emerald-100 hover:bg-emerald-200 px-4 font-semibold text-emerald-700 disabled:opacity-50"
                  onClick={() => post('/api/platform-billing/checkout', { billingId: row.id, tenantId, mode: 'ONE_TIME' })}
                >
                  Pay once
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-4 font-semibold text-indigo-700 disabled:opacity-50"
                onClick={() => post('/api/platform-billing/portal', { tenantId })}
              >
                Payment methods
              </button>
              {product === 'GAS_STATION' && row.id && (
                <button
                  type="button"
                  disabled={busy}
                  className="h-14 rounded-xl bg-amber-100 hover:bg-amber-200 px-4 font-semibold text-amber-700"
                  onClick={() => post('/api/platform-billing/sync-quantity', { billingId: row.id, tenantId })}
                >
                  Update location count
                </button>
              )}
              {row.stripeSubscriptionId && (
                <button
                  type="button"
                  disabled={busy}
                  className="h-14 rounded-xl bg-red-100 hover:bg-red-200 px-4 font-semibold text-red-700"
                  onClick={() => post('/api/platform-billing/cancel', { billingId: row.id, tenantId, cancelNow: false })}
                >
                  Cancel at period end
                </button>
              )}
              {canEditSwitch && row.stripeSubscriptionId && (
                <button
                  type="button"
                  disabled={busy}
                  className="h-14 rounded-xl bg-red-100 hover:bg-red-200 px-4 font-semibold text-red-700"
                  onClick={() => post('/api/platform-billing/cancel', { billingId: row.id, tenantId, cancelNow: true })}
                >
                  Cancel now
                </button>
              )}
            </div>
            )}
            {!complimentaryPlan && !row.chargeEnabled && <p className="text-sm text-muted-foreground">Switch is off. Stripe is not called.</p>}
            <p className="text-sm text-muted-foreground">
              Pay opens Stripe Checkout with a card or a US bank account. Bank debit appears when ACH Direct Debit is active on the Stripe account.
            </p>
            {row.chargeEnabled && row.status !== 'ACTIVE' && (
              <p className="text-sm text-amber-800">
                Charging is allowed. Use a pay link. A review-by date does not start the charge. Unpaid grace locks paid admin tools and leaves the site online.
              </p>
            )}
          </section>
        );
      })}
      {rows.filter((row) => row.product === 'RETAIL').map((row) => (
        <section key={row.id || 'retail'} className="bg-card rounded-lg sacred-shadow p-6 space-y-3">
          <h2 className="text-xl font-semibold">Organization subscription</h2>
          <p className="text-sm">Status <strong>{row.status || 'COMPLIMENTARY'}</strong> · {money(row.customFeeUsd)} per month</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy || !row.id || !row.chargeEnabled} className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-4 font-semibold text-green-700 disabled:opacity-50" onClick={() => post('/api/platform-billing/checkout', { billingId: row.id, tenantId, mode: 'RECURRING' })}>Pay monthly</button>
            <button type="button" disabled={busy} className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-4 font-semibold text-indigo-700" onClick={() => post('/api/platform-billing/portal', { tenantId })}>Payment methods</button>
            {row.stripeSubscriptionId && <button type="button" disabled={busy} className="h-14 rounded-xl bg-red-100 hover:bg-red-200 px-4 font-semibold text-red-700" onClick={() => post('/api/platform-billing/cancel', { billingId: row.id, tenantId, cancelNow: false })}>Cancel at period end</button>}
            {canEditSwitch && row.stripeSubscriptionId && <button type="button" disabled={busy} className="h-14 rounded-xl bg-red-100 hover:bg-red-200 px-4 font-semibold text-red-700" onClick={() => post('/api/platform-billing/cancel', { billingId: row.id, tenantId, cancelNow: true })}>Cancel now</button>}
          </div>
        </section>
      ))}
      <section className="bg-card rounded-lg sacred-shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Charges</h2>
        {charges.length === 0 ? <p className="text-sm text-muted-foreground">No platform charges are recorded for this website yet.</p> : (
          <ul className="space-y-2 text-sm">
            {charges.map((charge) => (
              <li key={charge.id || charge.stripeEventId} className="flex flex-wrap justify-between gap-2 border-b border-gray-200 py-2">
                <span>{charge.status} · {money(charge.amountUsd)}</span>
                <span>{charge.occurredAt ? new Date(charge.occurredAt).toLocaleString() : ''}</span>
                <span className="text-gray-600">{charge.stripeInvoiceId || charge.stripeSubscriptionId || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {locationRows.length > 0 && (
        <section className="bg-card rounded-lg sacred-shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Locations counted in the location fee</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {locationRows.map((location) => (
              <YellowCheckbox
                key={location.id}
                checked={location.includedInSubscription !== false}
                disabled={busy || location.id == null}
                label={`${location.locationName || 'Location'} ${location.includedInSubscription === false ? '(not included)' : '(included)'}`}
                onChange={async (included) => {
                  if (location.id == null) return;
                  setBusy(true);
                  setMessage('');
                  try {
                    await setLocationIncludedInBilling(tenantId, location.id, included);
                    setLocationRows((current) =>
                      current.map((item) =>
                        item.id === location.id ? { ...item, includedInSubscription: included } : item
                      )
                    );
                    setMessage('Location inclusion saved. Use Update location count to change the Stripe quantity.');
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Could not update the location');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            A custom flat fee uses quantity 1. Otherwise the count is active locations marked included. Update the count after you change locations.
          </p>
        </section>
      )}
    </div>
  );
}
