'use client';

import { useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { savePlatformBillingPlan } from '../ApiServerActions';
import type { PlatformBillingPlanDTO, PlatformProduct } from '@/types/platformBilling';

const money = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const emptyPlan = (): PlatformBillingPlanDTO => ({
  product: 'EVENT_SITE',
  name: '',
  code: '',
  billingMode: 'BOTH',
  billingInterval: 'MONTH',
  listPriceUsd: 0,
  published: false,
  featureSummary: '',
  stripePriceId: '',
  graduatedTiersJson: '',
});

export default function PlansClient({ initialPlans }: { initialPlans: PlatformBillingPlanDTO[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [draft, setDraft] = useState<PlatformBillingPlanDTO>(emptyPlan());
  const [priceText, setPriceText] = useState('0.00');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function edit(plan: PlatformBillingPlanDTO) {
    setDraft(plan);
    setPriceText(Number(plan.listPriceUsd || 0).toFixed(2));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const saved = await savePlatformBillingPlan({
        ...draft,
        listPriceUsd: Number(priceText) || 0,
        stripePriceId: draft.stripePriceId || null,
        graduatedTiersJson: draft.graduatedTiersJson || null,
      });
      setPlans((current) => {
        const without = current.filter((plan) => plan.id !== saved.id);
        return [...without, saved].sort((a, b) => a.product.localeCompare(b.product) || a.name.localeCompare(b.name));
      });
      setDraft(emptyPlan());
      setPriceText('0.00');
      setMessage('Plan saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingTop: '120px' }}>
      <AdminNavigation contextLine="Platform fee catalog — list prices used to charge tenants (not ticket or membership prices)." />
      <h1 className="font-heading text-3xl text-foreground mb-2">Platform billing plans</h1>
      <p className="text-muted-foreground mb-8">
        Catalog prices for event sites and gas stations. These are not ticket prices and not membership plans.
      </p>
      {message && <p className="mb-4 text-sm text-blue-800">{message}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => edit(plan)}
              className="w-full text-left bg-card rounded-lg sacred-shadow p-4 hover:bg-muted"
            >
              <div className="font-semibold">{plan.name}</div>
              <div className="text-sm text-muted-foreground">
                {plan.product} · {plan.billingMode} · {money(plan.listPriceUsd)}
                {plan.published ? ' · published' : ' · hidden'}
              </div>
            </button>
          ))}
          {plans.length === 0 && <p>No plans yet.</p>}
        </div>
        <form onSubmit={onSave} className="bg-card rounded-lg sacred-shadow p-6 space-y-4">
          <label className="block text-sm font-medium">
            Product
            <select
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.product}
              onChange={(event) => setDraft({ ...draft, product: event.target.value as PlatformProduct })}
            >
              <option value="EVENT_SITE">Event site</option>
              <option value="GAS_STATION">Gas station</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Name
            <input
              required
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium">
            Code
            <input
              required
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium">
            List price (USD)
            <input
              required
              inputMode="decimal"
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={priceText}
              onChange={(event) => {
                let next = event.target.value;
                if (next.startsWith('.')) next = `0${next}`;
                setPriceText(next);
              }}
              onBlur={() => setPriceText((Number(priceText) || 0).toFixed(2))}
            />
          </label>
          <label className="block text-sm font-medium">
            Billing
            <select
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.billingMode}
              onChange={(event) =>
                setDraft({ ...draft, billingMode: event.target.value as PlatformBillingPlanDTO['billingMode'] })
              }
            >
              <option value="BOTH">Recurring or one-time</option>
              <option value="RECURRING">Recurring only</option>
              <option value="ONE_TIME">One-time only</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Stripe price id
            <input
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.stripePriceId || ''}
              onChange={(event) => setDraft({ ...draft, stripePriceId: event.target.value })}
              placeholder="price_..."
            />
          </label>
          <label className="block text-sm font-medium">
            Feature summary
            <textarea
              className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
              value={draft.featureSummary || ''}
              onChange={(event) => setDraft({ ...draft, featureSummary: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft.published}
              onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
            />
            Published
          </label>
          <button
            type="submit"
            disabled={saving}
            className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : draft.id ? 'Update plan' : 'Create plan'}
          </button>
        </form>
      </div>
    </div>
  );
}
