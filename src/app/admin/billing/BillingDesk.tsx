'use client';

import { useState, type ReactNode } from 'react';
import { FaBan, FaCreditCard, FaSave, FaSyncAlt, FaUniversity } from 'react-icons/fa';
import AdminNavigation from '@/components/AdminNavigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TenantChargesTable from './TenantChargesTable';
import { saveTenantProductBilling, setLocationIncludedInBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { explainBillingSaveError } from '@/lib/platformBilling/billingMessages';
import { billingStatusLabel, billingStatusMeaning } from '@/lib/platformBilling/statusLabel';
import { isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
import type { RetailLocationDTO } from '@/types/retail';
import type { PlatformBillingPlanDTO, PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';

const money = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const PRODUCTS: PlatformProduct[] = ['EVENT_SITE', 'GAS_STATION'];

const dialogButton =
  'flex-1 flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';

type ConfirmRequest =
  | { kind: 'charge'; product: PlatformProduct; enable: boolean }
  | { kind: 'location'; locationId: number; name: string; include: boolean };

function productLabel(product: PlatformProduct): string {
  return product === 'EVENT_SITE' ? 'event site' : 'retail';
}

function StatusReadout({ status }: { status?: string | null }) {
  const value = status || 'COMPLIMENTARY';
  return (
    <label className="text-sm font-medium text-gray-700 md:col-span-2">
      Status
      <div className="mt-1 flex flex-wrap items-center gap-3 border border-gray-400 rounded-xl px-4 py-3">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass(value)}`}>
          {billingStatusLabel(value)}
        </span>
        <span className="text-sm font-normal text-gray-600">{billingStatusMeaning(value)}</span>
      </div>
    </label>
  );
}

function statusClass(status: string): string {
  const key = status.toUpperCase();
  if (key === 'ACTIVE' || key === 'PAID') return 'bg-green-100 text-green-800';
  if (key === 'PAYMENT_DUE' || key === 'OPEN') return 'bg-amber-100 text-amber-800';
  if (key === 'PAST_DUE' || key === 'FAILED' || key === 'LOCKED') return 'bg-red-100 text-red-800';
  if (key === 'REFUNDED') return 'bg-purple-100 text-purple-800';
  return 'bg-orange-100 text-orange-800';
}

function BillingSwitch({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className={`text-sm font-semibold ${on ? 'text-purple-300' : 'text-purple-600'}`}>Off</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
          on ? 'bg-blue-500 focus:ring-blue-500' : 'bg-purple-500 focus:ring-purple-500'
        }`}
        title={label}
        aria-label={label}
      >
        <span
          className={`inline-flex items-center justify-center h-8 w-8 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
            on ? 'translate-x-7' : 'translate-x-1'
          }`}
        >
          {on ? (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
      </button>
      <span className={`text-sm font-semibold ${on ? 'text-blue-600' : 'text-blue-300'}`}>On</span>
    </div>
  );
}

function DeskButton({
  color,
  icon,
  children,
  disabled,
  onClick,
  title,
}: {
  color: 'blue' | 'green' | 'emerald' | 'indigo' | 'amber' | 'red';
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  const tone = {
    blue: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
    green: 'bg-green-100 hover:bg-green-200 text-green-700',
    emerald: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
    indigo: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700',
    amber: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
    red: 'bg-red-100 hover:bg-red-200 text-red-700',
  }[color];
  const iconTone = {
    blue: 'bg-blue-200 text-blue-600',
    green: 'bg-green-200 text-green-600',
    emerald: 'bg-emerald-200 text-emerald-600',
    indigo: 'bg-indigo-200 text-indigo-600',
    amber: 'bg-amber-200 text-amber-600',
    red: 'bg-red-200 text-red-600',
  }[color];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`h-14 rounded-xl px-4 font-semibold inline-flex items-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${tone}`}
    >
      <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconTone}`}>{icon}</span>
      {children}
    </button>
  );
}

export default function BillingDesk({
  tenantId,
  canEditSwitch,
  initialRows,
  plans,
  locations,
  lockedNotice,
  complimentaryPlan = false,
  shopPackCode = null,
  shopPackLabel = null,
}: {
  tenantId: string;
  canEditSwitch: boolean;
  initialRows: TenantProductBillingDTO[];
  plans: PlatformBillingPlanDTO[];
  locations: RetailLocationDTO[];
  lockedNotice?: boolean;
  complimentaryPlan?: boolean;
  shopPackCode?: string | null;
  shopPackLabel?: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [locationRows, setLocationRows] = useState(locations);
  const [feeDraft, setFeeDraft] = useState<Partial<Record<PlatformProduct, string>>>({});
  const [busy, setBusy] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

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

  /**
   * Checkout, the Stripe webhook and the backend own these fields. The copy on this page can be older than the
   * saved row, so a save from the page must not send them back. An old grace end sent back would stop the backend
   * from starting a new grace period when the switch is turned on again.
   */
  function withoutStripeFields(next: TenantProductBillingDTO): TenantProductBillingDTO {
    if (!next.id) return next;
    const {
      billingMode: _billingMode,
      stripePriceId: _stripePriceId,
      stripeSubscriptionId: _stripeSubscriptionId,
      stripePaymentId: _stripePaymentId,
      paidThroughDate: _paidThroughDate,
      locationQuantity: _locationQuantity,
      graceEndsAt: _graceEndsAt,
      ...rest
    } = next;
    return rest;
  }

  function withoutCatalogPlan(next: TenantProductBillingDTO): TenantProductBillingDTO {
    if (next.customFeeUsd == null || Number(next.customFeeUsd) <= 0) return next;
    const selected = plans.find((plan) => plan.id != null && plan.id === next.platformPlanId);
    return {
      ...next,
      platformPlanId: null,
      clearPlatformPlan: true,
      billingInterval: next.billingInterval || selected?.billingInterval || null,
      intervalCount: next.intervalCount || selected?.intervalCount || 1,
    };
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
    try {
      const saved = await saveTenantProductBilling(withoutStripeFields(withoutCatalogPlan(next)));
      setRows((current) => [...current.filter((row) => row.product !== saved.product), saved]);
      setResult({
        ok: true,
        text: 'Billing saved. Turning the switch on does not charge the card by itself.',
      });
    } catch (error) {
      setResult({ ok: false, text: explainBillingSaveError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function pay(next: TenantProductBillingDTO, mode: 'RECURRING' | 'ONE_TIME') {
    if (!next.id) return;
    setBusy(true);
    try {
      let billingId = next.id;
      let amountSource = next;
      if (canEditSwitch) {
        const saved = await saveTenantProductBilling(withoutStripeFields(withoutCatalogPlan(next)));
        if (!saved.id) throw new Error('Billing row is missing an id');
        billingId = saved.id;
        amountSource = saved;
        setRows((current) => [...current.filter((row) => row.product !== saved.product), saved]);
      }
      const response = await fetch('/api/platform-billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingId, tenantId, mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.updated) {
        // The page learns the count and the subscription here, so the card and its Cancel buttons are right without a reload.
        setRows((current) =>
          current.map((item) =>
            item.id === billingId
              ? {
                  ...item,
                  locationQuantity: data.quantity ?? item.locationQuantity,
                  stripeSubscriptionId: data.subscriptionId ?? item.stripeSubscriptionId,
                  status: data.status ?? item.status,
                }
              : item
          )
        );
      }
      const amount = amountSource.customFeeUsd != null ? money(amountSource.customFeeUsd) : 'the catalog price';
      setResult({
        ok: true,
        text: data.updated
          ? `The subscription now uses ${amount}. The next invoice uses that amount. Checkout was not opened again.`
          : 'Done.',
      });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  }

  async function cancelBilling(row: TenantProductBillingDTO, cancelNow: boolean) {
    if (!row.id) return;
    setBusy(true);
    try {
      const response = await fetch('/api/platform-billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingId: row.id, tenantId, cancelNow }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      if (cancelNow) {
        const flatFee = /organization-flat:|portfolio-flat:/.test(row.notes || '');
        setRows((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  chargeEnabled: false,
                  status: 'COMPLIMENTARY',
                  stripeSubscriptionId: null,
                  ...(flatFee ? {} : { platformPlanId: null, customFeeUsd: null }),
                }
              : item
          )
        );
        if (!flatFee) {
          setFeeDraft((current) => {
            const next = { ...current };
            delete next[row.product as PlatformProduct];
            return next;
          });
        }
      }
      setResult({
        ok: true,
        text: cancelNow
          ? 'Canceled now. The card is Complimentary. Pay monthly starts a new subscription.'
          : 'The subscription will cancel at the end of the period.',
      });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  }

  async function syncLocationCount(row: TenantProductBillingDTO) {
    if (!row.id) return;
    setBusy(true);
    try {
      const response = await fetch('/api/platform-billing/sync-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingId: row.id, tenantId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      const quantity = Number(data.locationQuantity) || 1;
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, locationQuantity: quantity } : item))
      );
      const counted = `${quantity} ${quantity === 1 ? 'location' : 'locations'}`;
      const customFee = row.customFeeUsd != null && Number(row.customFeeUsd) > 0;
      setResult({
        ok: true,
        text: customFee
          ? 'This website pays a custom flat fee, so the quantity stays 1.'
          : row.stripeSubscriptionId
            ? `The fee now counts ${counted}. Stripe prorates the change on the next invoice.`
            : `The fee now counts ${counted}. The next payment uses that count.`,
      });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  }

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      if (data.url) window.location.href = data.url;
      else setResult({ ok: true, text: 'Done.' });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  }

  async function applyConfirm(request: ConfirmRequest) {
    if (request.kind === 'charge') {
      await persist({ ...rowFor(request.product), chargeEnabled: request.enable });
      return;
    }
    setBusy(true);
    try {
      await setLocationIncludedInBilling(tenantId, request.locationId, request.include);
      setLocationRows((current) =>
        current.map((item) =>
          item.id === request.locationId ? { ...item, includedInSubscription: request.include } : item
        )
      );
      setResult({
        ok: true,
        text: 'Location inclusion saved. Use Update location count to change the Stripe quantity.',
      });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Could not update the location' });
    } finally {
      setBusy(false);
    }
  }

  const turningOff = confirmRequest?.kind === 'charge' ? !confirmRequest.enable : confirmRequest?.kind === 'location' ? !confirmRequest.include : false;
  const confirmTitle = confirmRequest?.kind === 'charge'
    ? confirmRequest.enable ? 'Turn charging on' : 'Turn charging off'
    : confirmRequest?.kind === 'location'
      ? confirmRequest.include ? 'Include this location' : 'Remove this location'
      : '';
  const confirmText = confirmRequest?.kind === 'charge'
    ? confirmRequest.enable
      ? `Turn charging on for ${confirmRequest.product === 'EVENT_SITE' ? 'the event site' : 'retail'}. This marks the fee due. It does not charge the card.`
      : `Turn charging off for ${confirmRequest.product === 'EVENT_SITE' ? 'the event site' : 'retail'}.`
    : confirmRequest?.kind === 'location'
      ? confirmRequest.include
        ? `Include ${confirmRequest.name} in the location fee.`
        : `Remove ${confirmRequest.name} from the location fee.`
      : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" style={{ paddingTop: '120px' }}>
      <AdminNavigation
        tenantId={tenantId}
        contextLine="Platform billing for this tenant — event site and retail fees."
      />
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform billing</h1>
        <p className="text-gray-600 mt-2">Tenant {tenantId}. Cards and US bank accounts. Complimentary until the charge switch is on.</p>
      </div>
      {lockedNotice && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-800">
          Paid admin tools are locked until this platform fee is paid. The site itself stays online.
        </div>
      )}
      {PRODUCTS.map((product) => {
        const row = rowFor(product);
        const covered = isCoveredByPortfolio(row.notes);
        const productPlans = plans.filter((plan) => {
          const keepAssigned = plan.id != null && plan.id === row.platformPlanId;
          if (plan.published === false && !keepAssigned) return false;
          if (product === 'EVENT_SITE') return plan.product === 'EVENT_SITE' || keepAssigned;
          if (plan.product !== 'RETAIL' && plan.product !== 'GAS_STATION' && !keepAssigned) return false;
          const planPack = plan.retailerTypeCode?.trim() || '';
          if (!planPack) return true;
          return planPack === shopPackCode || keepAssigned;
        });
        const charged = complimentaryPlan ? false : !!row.chargeEnabled;
        const title = product === 'EVENT_SITE' ? 'Event site' : 'Retail';
        return (
          <section key={product} className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {product !== 'EVENT_SITE' && shopPackLabel && (
                  <p className="text-sm text-gray-600 mt-1">Shop pack: {shopPackLabel}</p>
                )}
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass(row.status || 'COMPLIMENTARY')}`}>
                {billingStatusLabel(row.status)}
              </span>
            </div>
            <p className="text-sm text-gray-700">
              {row.customFeeUsd != null ? `Custom fee ${money(row.customFeeUsd)}` : 'Catalog price'}
              {row.graceEndsAt ? ` · grace ends ${new Date(row.graceEndsAt).toLocaleDateString()}` : ''}
              {row.locationQuantity != null ? ` · quantity ${row.locationQuantity}` : ''}
            </p>
            {canEditSwitch && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusReadout status={row.status} />
                <label className="text-sm font-medium text-gray-700">
                  Catalog plan
                  <select
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={
                      row.customFeeUsd != null && Number(row.customFeeUsd) > 0
                        ? ''
                        : row.platformPlanId != null
                          ? row.platformPlanId
                          : ''
                    }
                    onChange={(event) => {
                      const platformPlanId = Number(event.target.value) || null;
                      const selected = plans.find((plan) => plan.id === platformPlanId);
                      setFeeDraft((current) => {
                        const next = { ...current };
                        delete next[product];
                        return next;
                      });
                      if (!platformPlanId) {
                        updateRow(product, { platformPlanId: null });
                        return;
                      }
                      updateRow(product, {
                        platformPlanId,
                        clearPlatformPlan: false,
                        customFeeUsd: null,
                        clearCustomFee: true,
                        billingInterval: selected?.billingInterval || row.billingInterval || null,
                        intervalCount: selected?.intervalCount || row.intervalCount || 1,
                      });
                    }}
                  >
                    <option value="">No catalog plan</option>
                    {productPlans.filter((plan) => plan.id != null).map((plan) => (
                      <option key={plan.id} value={plan.id as number}>
                        {plan.name} ({money(plan.listPriceUsd)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Custom fee USD (blank uses the catalog)
                  <input
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    inputMode="decimal"
                    value={feeDraft[product] ?? (row.customFeeUsd != null ? Number(row.customFeeUsd).toFixed(2) : '')}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setFeeDraft((current) => ({ ...current, [product]: raw }));
                      const trimmed = raw.trim();
                      if (trimmed === '' || trimmed === '.') {
                        updateRow(product, { customFeeUsd: trimmed === '' ? null : 0, clearCustomFee: trimmed === '' });
                        return;
                      }
                      const processed = trimmed.startsWith('.') ? `0${trimmed}` : trimmed;
                      const value = Number(processed);
                      if (!Number.isNaN(value) && value > 0) {
                        updateRow(product, withoutCatalogPlan({ ...row, customFeeUsd: value, clearCustomFee: false }));
                      } else if (!Number.isNaN(value)) {
                        updateRow(product, { customFeeUsd: value, clearCustomFee: false });
                      }
                    }}
                    onBlur={() => {
                      if (feeDraft[product] == null) return;
                      const raw = feeDraft[product].trim();
                      setFeeDraft((current) => {
                        const next = { ...current };
                        delete next[product];
                        return next;
                      });
                      if (raw === '' || raw === '.') {
                        updateRow(product, { customFeeUsd: null, clearCustomFee: true });
                        return;
                      }
                      const processed = raw.startsWith('.') ? `0${raw}` : raw;
                      const value = Number(processed);
                      if (!Number.isNaN(value) && value > 0) {
                        updateRow(product, withoutCatalogPlan({ ...row, customFeeUsd: Number(value.toFixed(2)), clearCustomFee: false }));
                      } else if (!Number.isNaN(value)) {
                        updateRow(product, { customFeeUsd: value, clearCustomFee: false });
                      }
                    }}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Review-by date (reminder only)
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={row.reviewByDate || ''}
                    onChange={(event) => updateRow(product, { reviewByDate: event.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Grace days
                  <input
                    type="number"
                    min={0}
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
                    value={row.graceDays ?? 14}
                    onChange={(event) => updateRow(product, { graceDays: Number(event.target.value) })}
                  />
                </label>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Charge switch</p>
                  <BillingSwitch
                    on={charged}
                    disabled={busy || complimentaryPlan}
                    label={charged ? 'Turn the charge switch off' : 'Turn the charge switch on'}
                    onToggle={() => setConfirmRequest({ kind: 'charge', product, enable: !charged })}
                  />
                  {complimentaryPlan && (
                    <p className="text-sm text-emerald-800 mt-2">
                      This tenant plan is free or demo. The charge switch stays off, so Stripe is not called.
                    </p>
                  )}
                </div>
                <DeskButton
                  color="blue"
                  icon={<FaSave className="w-5 h-5" />}
                  disabled={busy}
                  title={`Save ${productLabel(product)} billing`}
                  onClick={() => persist(rowFor(product))}
                >
                  Save {product === 'EVENT_SITE' ? 'event site' : 'retail'} billing
                </DeskButton>
              </div>
            )}
            {!canEditSwitch && (
              <div className="grid grid-cols-1 gap-4">
                <StatusReadout status={row.status} />
              </div>
            )}
            {covered ? (
              <p className="text-sm text-emerald-800">
                This website is covered by its organization. The organization subscription is the one that is paid and canceled.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <DeskButton
                  color="green"
                  icon={<FaCreditCard className="w-5 h-5" />}
                  disabled={busy || !row.id || !row.chargeEnabled || complimentaryPlan}
                  title="Pay monthly"
                  onClick={() => pay(rowFor(product), 'RECURRING')}
                >
                  Pay monthly
                </DeskButton>
                <DeskButton
                  color="emerald"
                  icon={<FaCreditCard className="w-5 h-5" />}
                  disabled={busy || !row.id || !row.chargeEnabled || complimentaryPlan}
                  title="Pay once"
                  onClick={() => pay(rowFor(product), 'ONE_TIME')}
                >
                  Pay once
                </DeskButton>
                <DeskButton
                  color="indigo"
                  icon={<FaUniversity className="w-5 h-5" />}
                  disabled={busy}
                  title="Payment methods"
                  onClick={() => post('/api/platform-billing/portal', { tenantId })}
                >
                  Payment methods
                </DeskButton>
                {product === 'GAS_STATION' && row.id && (
                  <DeskButton
                    color="amber"
                    icon={<FaSyncAlt className="w-5 h-5" />}
                    disabled={busy}
                    title="Update location count"
                    onClick={() => syncLocationCount(rowFor(product))}
                  >
                    Update location count
                  </DeskButton>
                )}
                {row.stripeSubscriptionId && (
                  <DeskButton
                    color="red"
                    icon={<FaBan className="w-5 h-5" />}
                    disabled={busy}
                    title="Cancel at period end"
                    onClick={() => cancelBilling(rowFor(product), false)}
                  >
                    Cancel at period end
                  </DeskButton>
                )}
                {canEditSwitch && row.stripeSubscriptionId && (
                  <DeskButton
                    color="red"
                    icon={<FaBan className="w-5 h-5" />}
                    disabled={busy}
                    title="Cancel now"
                    onClick={() => cancelBilling(rowFor(product), true)}
                  >
                    Cancel now
                  </DeskButton>
                )}
              </div>
            )}
            {!complimentaryPlan && !row.chargeEnabled && <p className="text-sm text-gray-600">Switch is off. Stripe is not called.</p>}
            <p className="text-sm text-gray-600">
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
      {/* An organization fee that was switched off is not shown. Its subscription is already set to end. */}
      {rows
        .filter((row) => row.product === 'RETAIL' && (row.chargeEnabled || (row.status || 'COMPLIMENTARY') !== 'COMPLIMENTARY'))
        .map((row) => (
        <section key={row.id || 'retail'} className="bg-white rounded-lg shadow-md p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Organization subscription</h2>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass(row.status || 'COMPLIMENTARY')}`}>
              {billingStatusLabel(row.status)}
            </span>
          </div>
          <StatusReadout status={row.status} />
          <p className="text-sm text-gray-700">{money(row.customFeeUsd)} per month</p>
          <div className="flex flex-wrap gap-3">
            <DeskButton color="green" icon={<FaCreditCard className="w-5 h-5" />} disabled={busy || !row.id || !row.chargeEnabled} title="Pay monthly" onClick={() => pay(row, 'RECURRING')}>Pay monthly</DeskButton>
            <DeskButton color="indigo" icon={<FaUniversity className="w-5 h-5" />} disabled={busy} title="Payment methods" onClick={() => post('/api/platform-billing/portal', { tenantId })}>Payment methods</DeskButton>
            {row.stripeSubscriptionId && <DeskButton color="red" icon={<FaBan className="w-5 h-5" />} disabled={busy} title="Cancel at period end" onClick={() => cancelBilling(row, false)}>Cancel at period end</DeskButton>}
            {canEditSwitch && row.stripeSubscriptionId && <DeskButton color="red" icon={<FaBan className="w-5 h-5" />} disabled={busy} title="Cancel now" onClick={() => cancelBilling(row, true)}>Cancel now</DeskButton>}
          </div>
        </section>
      ))}
      <TenantChargesTable tenantId={tenantId} showSearchLinks={canEditSwitch} />
      {locationRows.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Locations counted in the location fee</h2>
          <div className="space-y-3">
            {locationRows.map((location) => {
              const included = location.includedInSubscription !== false;
              const name = location.locationName || 'Location';
              return (
                <div key={location.id} className="flex flex-wrap items-center justify-between gap-3 border border-blue-100 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-sm text-gray-600">{included ? 'Included' : 'Not included'}</p>
                  </div>
                  {canEditSwitch && <BillingSwitch
                    on={included}
                    disabled={busy || location.id == null}
                    label={included ? `Remove ${name} from billing` : `Include ${name} in billing`}
                    onToggle={() => {
                      if (location.id == null) return;
                      setConfirmRequest({ kind: 'location', locationId: location.id, name, include: !included });
                    }}
                  />}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {canEditSwitch
              ? 'A custom flat fee uses quantity 1. Otherwise the count is active locations marked included. Update the count after you change locations.'
              : 'A custom flat fee uses quantity 1. Otherwise the count is active locations marked included. Ask the platform team to include or remove a location.'}
          </p>
        </section>
      )}

      <AlertDialog open={confirmRequest != null} onOpenChange={(open) => { if (!open) setConfirmRequest(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel className={`${dialogButton} bg-blue-100 hover:bg-blue-200`}>
              <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <span className="font-semibold text-blue-700">Keep as it is</span>
            </AlertDialogCancel>
            <AlertDialogAction
              className={`${dialogButton} ${turningOff ? 'bg-red-100 hover:bg-red-200' : 'bg-green-100 hover:bg-green-200'}`}
              onClick={() => {
                const request = confirmRequest;
                setConfirmRequest(null);
                if (request) void applyConfirm(request);
              }}
            >
              <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${turningOff ? 'bg-red-200' : 'bg-green-200'}`}>
                <svg className={`w-6 h-6 ${turningOff ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={turningOff ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'} />
                </svg>
              </span>
              <span className={`font-semibold ${turningOff ? 'text-red-700' : 'text-green-700'}`}>
                {confirmRequest?.kind === 'location' ? (turningOff ? 'Remove' : 'Include') : (turningOff ? 'Turn off' : 'Turn on')}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={result != null} onOpenChange={(open) => { if (!open) setResult(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{result?.ok ? 'Saved' : 'Could not save'}</AlertDialogTitle>
            <AlertDialogDescription>{result?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className={`${dialogButton} ${result?.ok ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'}`}
              onClick={() => setResult(null)}
            >
              <span className={`font-semibold ${result?.ok ? 'text-green-700' : 'text-red-700'}`}>OK</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
