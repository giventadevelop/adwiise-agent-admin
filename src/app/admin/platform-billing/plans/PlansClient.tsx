'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { FaCheck, FaPlus, FaTimes } from 'react-icons/fa';
import BillingPagination from '../BillingPagination';
import Modal from '@/components/ui/Modal';
import SuccessDialog from '@/components/SuccessDialog';
import { savePlatformBillingPlan } from '../ApiServerActions';
import { packLabel, retailPacks } from '@/lib/platformBilling/shopPack';
import type { RetailerTypeDTO } from '@/types/accessCatalog';
import type { PlatformBillingPlanDTO } from '@/types/platformBilling';

const PAGE_SIZE = 20;

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
  intervalCount: 1,
  listPriceUsd: 0,
  published: false,
  featureSummary: '',
  stripePriceId: '',
  graduatedTiersJson: '',
});

const HEADERS: Array<{ label: string; path: string }> = [
  { label: 'Name', path: 'M7 7h10M7 12h10M7 17h6' },
  { label: 'Product', path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
  { label: 'Billing', path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { label: 'Interval', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Price', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2' },
  { label: 'Visibility', path: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Stripe price', path: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'Edit', path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
];

function productLabel(plan: PlatformBillingPlanDTO, packs: RetailerTypeDTO[]): string {
  if (plan.product === 'EVENT_SITE') return 'Event site';
  const pack = packLabel(plan.retailerTypeCode, packs) || (plan.product === 'GAS_STATION' ? 'Gas station' : null);
  return pack ? `Retail · ${pack}` : 'Retail';
}

function modeLabel(mode: string): string {
  if (mode === 'RECURRING') return 'Recurring';
  if (mode === 'ONE_TIME') return 'One-time';
  return 'Recurring or one-time';
}

function modeClass(mode: string): string {
  if (mode === 'RECURRING') return 'bg-blue-100 text-blue-800';
  if (mode === 'ONE_TIME') return 'bg-amber-100 text-amber-800';
  return 'bg-purple-100 text-purple-800';
}

function intervalLabel(interval?: string | null, count?: number | null): string {
  const n = count && count > 1 ? count : 1;
  const unit = interval === 'YEAR' ? 'year' : interval === 'WEEK' ? 'week' : interval === 'DAY' ? 'day' : 'month';
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

const fieldClass = 'mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base bg-white';

function PlanFields({
  plan,
  priceText,
  packs,
  onPlan,
  onPrice,
}: {
  plan: PlatformBillingPlanDTO;
  priceText: string;
  packs: RetailerTypeDTO[];
  onPlan: (plan: PlatformBillingPlanDTO) => void;
  onPrice: (price: string) => void;
}) {
  const retail = plan.product === 'RETAIL' || plan.product === 'GAS_STATION';
  const knownPacks = retailPacks(packs);
  const extraPack =
    plan.retailerTypeCode && !knownPacks.some((pack) => pack.code === plan.retailerTypeCode)
      ? plan.retailerTypeCode
      : null;
  return (
    <>
      <label className="block text-sm font-medium text-gray-700">
        Product
        <select
          className={fieldClass}
          value={plan.product}
          onChange={(event) => {
            const product = event.target.value as PlatformBillingPlanDTO['product'];
            onPlan({
              ...plan,
              product,
              retailerTypeCode: product === 'EVENT_SITE' ? null : plan.retailerTypeCode,
            });
          }}
        >
          <option value="EVENT_SITE">Event site</option>
          <option value="RETAIL">Retail</option>
          {plan.product === 'GAS_STATION' && <option value="GAS_STATION">Retail (saved as gas station)</option>}
        </select>
      </label>
      {retail && (
        <label className="block text-sm font-medium text-gray-700">
          Shop pack
          <select
            className={fieldClass}
            value={plan.retailerTypeCode || ''}
            onChange={(event) => onPlan({ ...plan, retailerTypeCode: event.target.value || null })}
          >
            <option value="">All retail packs</option>
            {knownPacks.map((pack) => (
              <option key={pack.code} value={pack.code}>{pack.label}</option>
            ))}
            {extraPack && <option value={extraPack}>{extraPack}</option>}
          </select>
          <span className="mt-1 block text-xs text-gray-600">Leave this empty to use the price for every shop pack.</span>
        </label>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Name
        <input
          required
          className={fieldClass}
          value={plan.name}
          onChange={(event) => onPlan({ ...plan, name: event.target.value })}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Code
        <input
          required
          className={fieldClass}
          value={plan.code}
          onChange={(event) => onPlan({ ...plan, code: event.target.value })}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        List price (USD)
        <input
          required
          inputMode="decimal"
          className={fieldClass}
          value={priceText}
          onChange={(event) => {
            let next = event.target.value;
            if (next.startsWith('.')) next = `0${next}`;
            onPrice(next);
          }}
          onBlur={() => onPrice((Number(priceText) || 0).toFixed(2))}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Billing
        <select
          className={fieldClass}
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
      <label className="block text-sm font-medium text-gray-700">
        Stripe price id
        <input
          className={fieldClass}
          value={plan.stripePriceId || ''}
          onChange={(event) => onPlan({ ...plan, stripePriceId: event.target.value })}
          placeholder="price_..."
        />
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        Feature summary
        <textarea
          className={fieldClass}
          rows={3}
          value={plan.featureSummary || ''}
          onChange={(event) => onPlan({ ...plan, featureSummary: event.target.value })}
        />
      </label>
      <label className="md:col-span-2 flex items-center gap-3 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
        <input
          type="checkbox"
          checked={!!plan.published}
          onChange={(event) => onPlan({ ...plan, published: event.target.checked })}
        />
        Published. Hidden plans stay off the tenant catalog until you assign one.
      </label>
    </>
  );
}

function DialogButton({
  type,
  color,
  label,
  icon,
  disabled,
  onClick,
}: {
  type: 'submit' | 'button';
  color: 'green' | 'blue';
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tone =
    color === 'green'
      ? 'bg-green-100 hover:bg-green-200 text-green-700'
      : 'bg-blue-100 hover:bg-blue-200 text-blue-700';
  const box = color === 'green' ? 'bg-green-200 text-green-600' : 'bg-blue-200 text-blue-600';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex-1 flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${tone}`}
    >
      <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${box}`}>{icon}</span>
      {label}
    </button>
  );
}

export default function PlansClient({
  initialPlans,
  packs,
}: {
  initialPlans: PlatformBillingPlanDTO[];
  packs: RetailerTypeDTO[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<PlatformBillingPlanDTO>(emptyPlan());
  const [priceText, setPriceText] = useState('0.00');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlatformBillingPlanDTO | null>(null);
  const [editPrice, setEditPrice] = useState('0.00');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const retailCount = plans.filter((plan) => plan.product === 'RETAIL' || plan.product === 'GAS_STATION').length;
  const eventSiteCount = plans.filter((plan) => plan.product === 'EVENT_SITE').length;
  const publishedCount = plans.filter((plan) => plan.published).length;
  const hiddenCount = plans.length - publishedCount;
  const pageRows = plans.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
        retailerTypeCode: plan.product === 'EVENT_SITE' ? null : plan.retailerTypeCode || null,
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
        setPage(0);
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

  const tiles = [
    { label: 'Event site', count: eventSiteCount, className: 'bg-blue-50 text-blue-800 border-blue-300' },
    { label: 'Retail', count: retailCount, className: 'bg-teal-50 text-teal-800 border-teal-300' },
    { label: 'Published', count: publishedCount, className: 'bg-green-50 text-green-800 border-green-300' },
    { label: 'Hidden', count: hiddenCount, className: 'bg-amber-50 text-amber-800 border-amber-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-lg border-2 shadow-md p-4 ${tile.className}`}>
            <p className="text-sm font-semibold">{tile.label}</p>
            <p className="text-2xl font-bold">{tile.count}</p>
          </div>
        ))}
      </div>
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-sm text-red-800">{error}</div>
      )}
      <button
        type="button"
        title="Add plan"
        aria-label="Add plan"
        onClick={openAdd}
        className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105"
      >
        <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
          <FaPlus className="w-5 h-5 text-blue-600" />
        </span>
        Add plan
      </button>
      <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
        <table className="min-w-full border border-blue-200">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              {HEADERS.map((heading) => (
                <th key={heading.label} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={heading.path} />
                    </svg>
                    {heading.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg text-sm font-medium text-orange-700">
                    No plans yet
                  </span>
                </td>
              </tr>
            ) : (
              pageRows.map((plan) => (
                <tr key={plan.id ?? plan.code} className="border-t border-blue-100 hover:bg-blue-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-semibold text-gray-900">{plan.name}</div>
                    <div className="text-xs text-gray-500">{plan.code}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${plan.product === 'EVENT_SITE' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
                      {productLabel(plan, packs)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${modeClass(plan.billingMode)}`}>
                      {modeLabel(plan.billingMode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{intervalLabel(plan.billingInterval, plan.intervalCount)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{money(plan.listPriceUsd)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${plan.published ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {plan.published ? 'Published' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{plan.stripePriceId || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      title={`Edit ${plan.name}`}
                      aria-label={`Edit ${plan.name}`}
                      onClick={() => openEdit(plan)}
                      className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                    >
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <BillingPagination
          page={page}
          totalCount={plans.length}
          pageSize={PAGE_SIZE}
          itemLabel="plans"
          onPage={setPage}
        />
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
          <PlanFields plan={draft} priceText={priceText} packs={packs} onPlan={setDraft} onPrice={setPriceText} />
          <div className="flex flex-row gap-3 sm:gap-4 md:col-span-2">
            <DialogButton
              type="button"
              color="blue"
              label="Cancel"
              icon={<FaTimes className="w-5 h-5" />}
              disabled={saving}
              onClick={() => {
                setAdding(false);
                setDraft(emptyPlan());
                setPriceText('0.00');
              }}
            />
            <DialogButton
              type="submit"
              color="green"
              label={saving && adding ? 'Saving...' : 'Create plan'}
              icon={<FaCheck className="w-5 h-5" />}
              disabled={saving}
            />
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={editing != null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editing ? `Edit ${editing.name}` : 'Edit plan'}
        size="lg"
      >
        <form onSubmit={onUpdate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {editing && (
            <PlanFields plan={editing} priceText={editPrice} packs={packs} onPlan={setEditing} onPrice={setEditPrice} />
          )}
          <div className="flex flex-row gap-3 sm:gap-4 md:col-span-2">
            <DialogButton
              type="button"
              color="blue"
              label="Cancel"
              icon={<FaTimes className="w-5 h-5" />}
              disabled={saving}
              onClick={() => setEditing(null)}
            />
            <DialogButton
              type="submit"
              color="green"
              label={saving ? 'Saving...' : 'Update plan'}
              icon={<FaCheck className="w-5 h-5" />}
              disabled={saving}
            />
          </div>
        </form>
      </Modal>
      <SuccessDialog isOpen={saved != null} onClose={() => setSaved(null)} title="Saved" message={saved || ''} buttonText="OK" />
    </div>
  );
}
