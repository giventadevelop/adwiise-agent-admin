'use client';

import { useEffect, useState } from 'react';
import { fetchSubscriptionPlans } from '@/app/admin/access-catalogs/ApiServerActions';
import { patchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

const FALLBACK_PLANS = [
  { code: 'BASIC', label: 'Basic' },
  { code: 'PROFESSIONAL', label: 'Professional' },
  { code: 'ENTERPRISE', label: 'Enterprise' },
];
const STATUS_OPTIONS = ['', 'ACTIVE', 'INACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'] as const;

function statusClass(status: string | undefined): string {
  if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (status === 'TRIAL') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

interface Props {
  organization: TenantOrganizationDTO | null | undefined;
  /** When true, fields can be saved onto this tenant's organization row. */
  editable?: boolean;
}

/**
 * Per-tenant subscription. Columns live on tenant_organization (one row per tenant id).
 */
export default function TenantSubscriptionPanel({ organization, editable = false }: Props) {
  const [plan, setPlan] = useState(organization?.subscriptionPlan || '');
  const [planOptions, setPlanOptions] = useState(FALLBACK_PLANS);

  useEffect(() => {
    const tenantId = organization?.tenantId;
    fetchSubscriptionPlans(tenantId)
      .then((rows) => {
        const active = rows
          .filter((row) => row.isActive !== false && row.code)
          .map((row) => ({ code: row.code, label: row.label || row.code }));
        if (active.length > 0) setPlanOptions(active);
      })
      .catch(() => {});
  }, [organization?.tenantId]);
  const [status, setStatus] = useState(organization?.subscriptionStatus || '');
  const [startDate, setStartDate] = useState(organization?.subscriptionStartDate || '');
  const [endDate, setEndDate] = useState(organization?.subscriptionEndDate || '');
  const [monthlyFee, setMonthlyFee] = useState(
    organization?.monthlyFeeUsd != null ? String(organization.monthlyFeeUsd) : ''
  );
  const [stripeCustomerId, setStripeCustomerId] = useState(organization?.stripeCustomerId || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!organization?.id) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Subscription is stored on this tenant&apos;s organization row. Link a tenant organization before editing it.
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const fee = monthlyFee.trim() === '' ? undefined : Number.parseFloat(monthlyFee);
      await patchTenantOrganization(organization.id!, {
        subscriptionPlan: plan || undefined,
        subscriptionStatus: status || undefined,
        subscriptionStartDate: startDate || undefined,
        subscriptionEndDate: endDate || undefined,
        monthlyFeeUsd: fee != null && Number.isFinite(fee) ? fee : undefined,
        stripeCustomerId: stripeCustomerId.trim() || undefined,
      });
      setMessage('Subscription saved for this tenant.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-4 space-y-4">
      <div>
        <h4 className="text-md font-medium text-indigo-900">Tenant subscription</h4>
        <p className="text-xs text-indigo-800/80 mt-1">
          Applies to tenant <span className="font-mono">{organization.tenantId}</span> only. Other
          websites in the same company portfolio have their own subscription.
        </p>
      </div>

      {!editable ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(organization.subscriptionStatus)}`}>
                {organization.subscriptionStatus || 'Not specified'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Plan</dt>
            <dd className="mt-1 text-gray-900">{organization.subscriptionPlan || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Start</dt>
            <dd className="mt-1 text-gray-900">{organization.subscriptionStartDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">End</dt>
            <dd className="mt-1 text-gray-900">{organization.subscriptionEndDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Monthly fee (USD)</dt>
            <dd className="mt-1 text-gray-900">
              {organization.monthlyFeeUsd != null
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(organization.monthlyFeeUsd)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Stripe customer</dt>
            <dd className="mt-1 font-mono text-gray-900 break-all">{organization.stripeCustomerId || '—'}</dd>
          </div>
        </dl>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sub-status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="sub-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option || 'empty'} value={option}>
                  {option || 'Not specified'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sub-plan" className="block text-sm font-medium text-gray-700">Plan</label>
            <select
              id="sub-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white"
            >
              <option value="">Not specified</option>
              {planOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
              {plan && !planOptions.some((option) => option.code === plan) && (
                <option value={plan}>{plan}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="sub-start" className="block text-sm font-medium text-gray-700">Start date</label>
            <input
              id="sub-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white"
            />
          </div>
          <div>
            <label htmlFor="sub-end" className="block text-sm font-medium text-gray-700">End date</label>
            <input
              id="sub-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white"
            />
          </div>
          <div>
            <label htmlFor="sub-fee" className="block text-sm font-medium text-gray-700">Monthly fee (USD)</label>
            <input
              id="sub-fee"
              type="number"
              min="0"
              step="0.01"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="sub-stripe" className="block text-sm font-medium text-gray-700">Stripe customer ID</label>
            <input
              id="sub-stripe"
              type="text"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white font-mono"
              placeholder="cus_xxxxxxxxxxxxx"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-6 font-semibold text-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save subscription'}
            </button>
            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
