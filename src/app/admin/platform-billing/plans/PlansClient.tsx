'use client';

import { useState, type FormEvent } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import SuccessDialog from '@/components/SuccessDialog';
import Modal from '@/components/ui/Modal';
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

function PlanFields({
  plan,
  priceText,
  onPlan,
  onPrice,
}: {
  plan: PlatformBillingPlanDTO;
  priceText: string;
  onPlan: (plan: PlatformBillingPlanDTO) => void;
  onPrice: (price: string) => void;
}) {
  return (
    <>
      <label className="block text-sm font-medium">
        Product
        <select
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          value={plan.product}
          onChange={(event) => onPlan({ ...plan, product: event.target.value as PlatformProduct })}
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
          value={plan.name}
          onChange={(event) => onPlan({ ...plan, name: event.target.value })}
        />
      </label>
      <label className="block text-sm font-medium">
        Code
        <input
          required
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          value={plan.code}
          onChange={(event) => onPlan({ ...plan, code: event.target.value })}
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
            onPrice(next);
          }}
          onBlur={() => onPrice((Number(priceText) || 0).toFixed(2))}
        />
      </label>
      <label className="block text-sm font-medium">
        Billing
        <select
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          value={plan.billingMode}
          onChange={(event) =>
            onPlan({ ...plan, billingMode: event.target.value as PlatformBillingPlanDTO['billingMode'] })
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
          value={plan.stripePriceId || ''}
          onChange={(event) => onPlan({ ...plan, stripePriceId: event.target.value })}
          placeholder="price_..."
        />
      </label>
      <label className="block text-sm font-medium md:col-span-2">
        Feature summary
        <textarea
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          value={plan.featureSummary || ''}
          onChange={(event) => onPlan({ ...plan, featureSummary: event.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!plan.published}
          onChange={(event) => onPlan({ ...plan, published: event.target.checked })}
        />
        Published
      </label>
    </>
  );
}

export default function PlansClient({ initialPlans }: { initialPlans: PlatformBillingPlanDTO[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [draft, setDraft] = useState<PlatformBillingPlanDTO>(emptyPlan());
  const [priceText, setPriceText] = useState('0.00');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlatformBillingPlanDTO | null>(null);
  const [editPrice, setEditPrice] = useState('0.00');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setDraft(emptyPlan());
    setPriceText('0.00');
    setEditing(null);
    setAdding(true);
    setError('');
  }

  function openEdit(plan: PlatformBillingPlanDTO) {
    setAdding(false);
    setEditing(plan);
    setEditPrice(Number(plan.listPriceUsd || 0).toFixed(2));
    setError('');
  }

  async function savePlan(plan: PlatformBillingPlanDTO, price: string, creating: boolean) {
    setSaving(true);
    setError('');
    try {
      const savedPlan = await savePlatformBillingPlan({
        ...plan,
        listPriceUsd: Number(price) || 0,
        stripePriceId: plan.stripePriceId || null,
        graduatedTiersJson: plan.graduatedTiersJson || null,
      });
      setPlans((current) => {
        const without = current.filter((item) => item.id !== savedPlan.id);
        return [...without, savedPlan].sort((a, b) => a.product.localeCompare(b.product) || a.name.localeCompare(b.name));
      });
      if (creating) {
        setDraft(emptyPlan());
        setPriceText('0.00');
        setAdding(false);
      } else {
        setEditing(null);
      }
      setSaved(creating ? 'The plan was added.' : 'The plan was updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    void savePlan(draft, priceText, true);
  }

  function onUpdate(event: FormEvent) {
    event.preventDefault();
    if (editing) void savePlan(editing, editPrice, false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingTop: '120px' }}>
      <AdminNavigation contextLine="Platform fee catalog — list prices used to charge tenants (not ticket or membership prices)." />
      <h1 className="font-heading text-3xl text-foreground mb-2">Platform billing plans</h1>
      <p className="text-muted-foreground mb-8">
        Catalog prices for event sites and gas stations. These are not ticket prices and not membership plans.
      </p>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        title="Add plan"
        aria-label="Add plan"
        onClick={openAdd}
        className="mb-6 flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl bg-blue-100 px-6 font-semibold text-blue-700 transition-all duration-300 hover:scale-105 hover:bg-blue-200"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-200">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        Add plan
      </button>
      <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-card rounded-lg sacred-shadow p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{plan.name}</div>
                <div className="text-sm text-muted-foreground">
                  {plan.product} · {plan.billingMode} · {money(plan.listPriceUsd)}
                  {plan.published ? ' · published' : ' · hidden'}
                </div>
              </div>
              <button
                type="button"
                title="Edit"
                aria-label={`Edit ${plan.name}`}
                onClick={() => openEdit(plan)}
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 transition-all duration-300 hover:scale-110 hover:bg-blue-200"
              >
                <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          ))}
          {plans.length === 0 && <p>No plans yet.</p>}
      </div>
      <Modal
        isOpen={adding}
        onClose={() => {
          if (!saving) {
            setAdding(false);
            setDraft(emptyPlan());
            setPriceText('0.00');
          }
        }}
        title="Add plan"
        size="lg"
      >
        <form onSubmit={onCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PlanFields plan={draft} priceText={priceText} onPlan={setDraft} onPrice={setPriceText} />
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-14 rounded-xl bg-blue-100 px-6 font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
            >
              {saving && adding ? 'Saving...' : 'Create plan'}
            </button>
            <button
              type="button"
              title="Cancel"
              aria-label="Cancel"
              disabled={saving}
              onClick={() => {
                setAdding(false);
                setDraft(emptyPlan());
                setPriceText('0.00');
              }}
              className="h-14 rounded-xl bg-gray-100 px-6 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={editing != null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editing ? `Edit plan ${editing.name}` : 'Edit plan'}
        size="lg"
      >
        <form onSubmit={onUpdate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {editing && (
            <PlanFields plan={editing} priceText={editPrice} onPlan={setEditing} onPrice={setEditPrice} />
          )}
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-14 rounded-xl bg-blue-100 px-6 font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update plan'}
            </button>
            <button
              type="button"
              title="Cancel"
              aria-label="Cancel"
              disabled={saving}
              onClick={() => setEditing(null)}
              className="h-14 rounded-xl bg-gray-100 px-6 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      <SuccessDialog isOpen={saved != null} onClose={() => setSaved(null)} title="Saved" message={saved || ''} buttonText="OK" />
    </div>
  );
}
