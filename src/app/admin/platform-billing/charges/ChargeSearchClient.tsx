'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSearch, FaTimes } from 'react-icons/fa';
import BillingPagination from '../BillingPagination';
import {
  exportPlatformCharges,
  loadChargeDetail,
  searchPlatformBillingHistory,
  searchPlatformCharges,
} from './ApiServerActions';
import { billingFeeLabel, billingStatusClass, billingStatusLabel } from '@/lib/platformBilling/statusLabel';
import type {
  BillingHistoryResult,
  BillingHistoryRow,
  ChargeDetail,
  ChargeFeeFilter,
  ChargeSearchFilters,
  ChargeSearchResult,
  ChargeSearchRow,
} from '@/types/platformBilling';

type PlanOption = { id: number | null; code: string; name: string };
type Tab = 'charges' | 'history';

const STATUSES = ['OPEN', 'PAID', 'FAILED', 'VOID', 'REFUNDED'];
const PAGE_SIZE = 20;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inputClass = 'mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-sm font-normal';
const labelClass = 'text-sm font-medium text-gray-700';
const headClass = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wide';

function when(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function day(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function period(charge: { periodStart?: string | null; periodEnd?: string | null }): string {
  if (!charge.periodStart && !charge.periodEnd) return '—';
  return `${day(charge.periodStart) || '…'} to ${day(charge.periodEnd) || '…'}`;
}

function isoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The form holds plain days. The server gets instants of the viewer's own day. */
function toFilters(form: FormState): ChargeSearchFilters {
  const from = form.from ? new Date(`${form.from}T00:00:00`) : null;
  const to = form.to ? new Date(`${form.to}T23:59:59.999`) : null;
  return {
    find: form.q,
    tenantId: form.tenant,
    fee: form.fee,
    statuses: form.status,
    fromIso: from && !Number.isNaN(from.getTime()) ? from.toISOString() : undefined,
    toIso: to && !Number.isNaN(to.getTime()) ? to.toISOString() : undefined,
    amountMin: form.min,
    amountMax: form.max,
    planId: form.plan,
    sort: form.sort,
  };
}

interface FormState {
  q: string;
  tenant: string;
  fee: ChargeFeeFilter | '';
  status: string[];
  from: string;
  to: string;
  min: string;
  max: string;
  plan: string;
  sort: NonNullable<ChargeSearchFilters['sort']>;
}

const SORTS: Array<{ value: FormState['sort']; label: string }> = [
  { value: 'occurredAt,desc', label: 'Newest first' },
  { value: 'occurredAt,asc', label: 'Oldest first' },
  { value: 'amountUsd,desc', label: 'Largest amount first' },
  { value: 'amountUsd,asc', label: 'Smallest amount first' },
];

function readForm(params: URLSearchParams): FormState {
  const fee = params.get('fee') || '';
  const sort = params.get('sort') || '';
  return {
    q: params.get('q') || '',
    tenant: params.get('tenant') || '',
    fee: fee === 'EVENT_SITE' || fee === 'GAS_STATION' || fee === 'ORGANIZATION' ? fee : '',
    status: (params.get('status') || '').split(',').filter((status) => STATUSES.includes(status)),
    from: params.get('from') || '',
    to: params.get('to') || '',
    min: params.get('min') || '',
    max: params.get('max') || '',
    plan: params.get('plan') || '',
    sort: SORTS.some((option) => option.value === sort) ? (sort as FormState['sort']) : 'occurredAt,desc',
  };
}

function toQuery(form: FormState, tab: Tab, page: number): string {
  const params = new URLSearchParams();
  if (tab === 'history') params.set('tab', 'history');
  if (form.q.trim()) params.set('q', form.q.trim());
  if (form.tenant.trim()) params.set('tenant', form.tenant.trim());
  if (form.fee) params.set('fee', form.fee);
  if (form.status.length) params.set('status', form.status.join(','));
  if (form.from) params.set('from', form.from);
  if (form.to) params.set('to', form.to);
  if (form.min) params.set('min', form.min);
  if (form.max) params.set('max', form.max);
  if (form.plan) params.set('plan', form.plan);
  if (form.sort !== 'occurredAt,desc') params.set('sort', form.sort);
  if (page > 0) params.set('page', String(page));
  return params.toString();
}

async function downloadSheet(name: string, rows: Array<Array<string | number>>) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  XLSX.writeFile(workbook, `${name}.xlsx`);
}

function StatusBadge({ status, paidLater }: { status?: string | null; paidLater?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit px-2 py-1 rounded-full text-xs font-semibold ${billingStatusClass(status)}`}>
        {billingStatusLabel(status)}
      </span>
      {paidLater && <span className="text-xs text-gray-600">Paid later</span>}
    </div>
  );
}

export default function ChargeSearchClient({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const pathname = usePathname() || '/admin/platform-billing/charges';
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() || '';
  const applied = useMemo(() => readForm(new URLSearchParams(queryString)), [queryString]);
  const tab: Tab = new URLSearchParams(queryString).get('tab') === 'history' ? 'history' : 'charges';
  const page = Math.max(0, Number(new URLSearchParams(queryString).get('page') || 0) || 0);

  const [form, setForm] = useState<FormState>(applied);
  const [charges, setCharges] = useState<ChargeSearchResult | null>(null);
  const [history, setHistory] = useState<BillingHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');
  const [detail, setDetail] = useState<ChargeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /** Takes a plan id or a plan code. The ledger stores the id, the change history stores either. */
  const planName = (plan?: string | number | null) => {
    if (plan == null || plan === '') return '—';
    const key = String(plan);
    const found = plans.find((entry) => entry.code === key || String(entry.id) === key);
    return found ? found.name : key;
  };

  useEffect(() => {
    setForm(applied);
  }, [applied]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    const filters = toFilters(applied);
    const request =
      tab === 'history'
        ? searchPlatformBillingHistory(filters, page).then((result) => {
            if (current) setHistory(result);
          })
        : searchPlatformCharges(filters, page).then((result) => {
            if (current) setCharges(result);
          });
    request
      .catch((error) => {
        const notice = error instanceof Error ? error.message : 'The billing search is unavailable.';
        if (!current) return;
        if (tab === 'history') setHistory({ rows: [], totalCount: 0, notice });
        else setCharges({ rows: [], totalCount: 0, totals: [], notice });
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [applied, tab, page]);

  function go(next: FormState, nextTab: Tab, nextPage: number) {
    const query = toQuery(next, nextTab, nextPage);
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function shortcut(kind: 'today' | 'week' | 'month' | 'lastMonth') {
    const now = new Date();
    let from = now;
    let to = now;
    if (kind === 'week') from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (kind === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (kind === 'lastMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    setForm((value) => ({ ...value, from: isoDay(from), to: isoDay(to) }));
  }

  async function exportAll() {
    setExporting(true);
    setExportNote('');
    try {
      const result = await exportPlatformCharges(toFilters(applied));
      if (result.notice) {
        setExportNote(result.notice);
        return;
      }
      await downloadSheet('platform-charges', [
        ['When', 'Organization', 'Organization id', 'Website', 'Fee', 'Plan', 'Amount', 'Status', 'Period start', 'Period end', 'Invoice', 'Subscription', 'Payment', 'Failure reason'],
        ...result.rows.map((row) => [
          row.occurredAt || '',
          row.organizationName || '',
          row.organizationId ?? '',
          row.tenantId || '',
          billingFeeLabel(row.product),
          planName(row.platformPlanId ?? row.planCode),
          Number(row.amountUsd ?? 0),
          billingStatusLabel(row.status) + (row.paidLater ? ' (paid later)' : ''),
          row.periodStart || '',
          row.periodEnd || '',
          row.stripeInvoiceId || '',
          row.stripeSubscriptionId || '',
          row.stripePaymentIntentId || '',
          row.failureReason || '',
        ]),
      ]);
      setExportNote(
        result.truncated
          ? `Exported the first ${result.rows.length} of ${result.totalCount} charges. Narrow the search to export the rest.`
          : `Exported ${result.rows.length} charges.`
      );
    } catch (error) {
      setExportNote(error instanceof Error ? error.message : 'The export failed.');
    } finally {
      setExporting(false);
    }
  }

  async function openDetail(row: ChargeSearchRow) {
    if (!row.id) return;
    setDetailLoading(true);
    try {
      setDetail(await loadChargeDetail(row.id));
    } finally {
      setDetailLoading(false);
    }
  }

  const tabClass = (name: Tab) =>
    `px-5 py-3 rounded-t-lg text-sm font-semibold border-2 border-b-0 ${
      tab === name ? 'bg-white text-blue-700 border-blue-300' : 'bg-blue-50 text-gray-700 border-transparent hover:bg-blue-100'
    }`;

  return (
    <div className="space-y-6">
      <form
        className="bg-white rounded-lg shadow-md p-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          go(form, tab, 0);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className={`${labelClass} lg:col-span-2`}>
            Find
            <input
              value={form.q}
              onChange={(event) => setForm({ ...form, q: event.target.value })}
              placeholder="Organization name or number, email, or a Stripe id (in_, sub_, pi_, cus_)"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Website id
            <input
              value={form.tenant}
              onChange={(event) => setForm({ ...form, tenant: event.target.value })}
              placeholder="Exact website id"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fee
            <select
              value={form.fee}
              onChange={(event) => setForm({ ...form, fee: event.target.value as FormState['fee'] })}
              className={inputClass}
            >
              <option value="">All fees</option>
              <option value="EVENT_SITE">Event site</option>
              <option value="GAS_STATION">Retail locations</option>
              <option value="ORGANIZATION">Organization fee</option>
            </select>
          </label>
          <label className={labelClass}>
            From
            <input type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            To
            <input type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} className={inputClass} />
          </label>
          {tab === 'charges' && (
            <>
              <label className={labelClass}>
                Amount from ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min}
                  onChange={(event) => setForm({ ...form, min: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Amount to ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max}
                  onChange={(event) => setForm({ ...form, max: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Plan
                <select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} className={inputClass}>
                  <option value="">All plans</option>
                  {plans.map((plan) => (
                    <option key={plan.code} value={plan.id ?? ''}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Order
                <select
                  value={form.sort}
                  onChange={(event) => setForm({ ...form, sort: event.target.value as FormState['sort'] })}
                  className={inputClass}
                >
                  {SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Dates:</span>
          {(
            [
              ['today', 'Today'],
              ['week', 'Last 7 days'],
              ['month', 'This month'],
              ['lastMonth', 'Last month'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => shortcut(kind)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200"
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'charges' && (
          <fieldset className="flex flex-wrap items-center gap-4 text-sm">
            <legend className="font-medium text-gray-700 mb-1">Status</legend>
            {STATUSES.map((status) => (
              <label key={status} className="inline-flex items-center gap-2 cursor-pointer">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={form.status.includes(status)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.checked
                          ? [...form.status, status]
                          : form.status.filter((entry) => entry !== status),
                      })
                    }
                  />
                  <span className="custom-checkbox-tick">
                    {form.status.includes(status) && (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                {billingStatusLabel(status)}
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105"
            title="Search"
            aria-label="Search"
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <FaSearch className="w-5 h-5 text-blue-600" />
            </span>
            Search
          </button>
          <button
            type="button"
            onClick={() => go(readForm(new URLSearchParams()), tab, 0)}
            className="h-14 rounded-xl bg-teal-100 hover:bg-teal-200 px-6 font-semibold text-teal-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105"
            title="Clear filters"
            aria-label="Clear filters"
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
              <FaTimes className="w-5 h-5 text-teal-600" />
            </span>
            Clear filters
          </button>
          {tab === 'charges' && (
            <button
              type="button"
              onClick={exportAll}
              disabled={exporting}
              className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
              title="Export every charge that matches"
              aria-label="Export every charge that matches"
            >
              <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                <FaFileExcel className="w-5 h-5 text-green-600" />
              </span>
              {exporting ? 'Exporting…' : 'Export matching charges'}
            </button>
          )}
        </div>
        {exportNote && <p className="text-sm text-gray-700">{exportNote}</p>}
      </form>

      <div>
        <div className="flex gap-2">
          <button type="button" className={tabClass('charges')} onClick={() => go(applied, 'charges', 0)}>
            Charges
          </button>
          <button type="button" className={tabClass('history')} onClick={() => go(applied, 'history', 0)}>
            Change history
          </button>
        </div>
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md p-6 border-2 border-blue-300">
          {tab === 'charges' ? (
            <>
              {charges?.notice && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-sm text-amber-800 mb-4">{charges.notice}</div>
              )}
              <div className="flex flex-wrap gap-3 mb-4 text-sm" aria-live="polite">
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 font-semibold text-blue-800">
                  {loading ? 'Searching…' : `${charges?.totalCount ?? 0} charges found`}
                </span>
                {!loading &&
                  (charges?.totals || []).map((total) => (
                    <span key={total.status} className={`px-3 py-1.5 rounded-lg font-semibold ${billingStatusClass(total.status)}`}>
                      {billingStatusLabel(total.status)}: {total.count}, {money.format(total.amountUsd)}
                    </span>
                  ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-blue-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                      {['When', 'Organization', 'Website', 'Fee', 'Plan', 'Amount', 'Status', 'Period', 'Invoice'].map((heading) => (
                        <th key={heading} className={headClass}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(charges?.rows || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-600">
                          {loading ? 'Searching…' : 'No charges match this search.'}
                        </td>
                      </tr>
                    ) : (
                      (charges?.rows || []).map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-blue-100 hover:bg-blue-50 cursor-pointer"
                          onClick={() => openDetail(row)}
                          title="Open the charge details"
                        >
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{when(row.occurredAt)}</td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            <Link
                              href={`/admin/platform-billing/organization/${row.organizationId}`}
                              className="text-indigo-700 hover:text-indigo-900 underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {row.organizationName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {row.tenantId ? (
                              <Link
                                href={`/admin/platform-billing/${encodeURIComponent(row.tenantId)}`}
                                className="text-indigo-700 hover:text-indigo-900 underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {row.tenantId}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{billingFeeLabel(row.product)}</td>
                          <td className="px-4 py-3 text-sm">{planName(row.platformPlanId ?? row.planCode)}</td>
                          <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">{money.format(Number(row.amountUsd || 0))}</td>
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge status={row.status} paidLater={row.paidLater} />
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{period(row)}</td>
                          <td className="px-4 py-3 text-sm break-all">{row.stripeInvoiceId || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <BillingPagination
                page={page}
                totalCount={charges?.totalCount ?? 0}
                pageSize={PAGE_SIZE}
                itemLabel="charges"
                onPage={(next) => go(applied, 'charges', next)}
              />
            </>
          ) : (
            <>
              {history?.notice && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-sm text-amber-800 mb-4">{history.notice}</div>
              )}
              <HistoryTable rows={history?.rows || []} loading={loading} planName={planName} showOrganization />
              <BillingPagination
                page={page}
                totalCount={history?.totalCount ?? 0}
                pageSize={PAGE_SIZE}
                itemLabel="changes"
                onPage={(next) => go(applied, 'history', next)}
              />
            </>
          )}
        </div>
      </div>

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Charge details"
          onClick={() => setDetail(null)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 p-6 space-y-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Charge details</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center"
                title="Close"
                aria-label="Close"
              >
                <FaTimes className="w-5 h-5 text-red-600" />
              </button>
            </div>
            {!detail ? (
              <p className="text-sm text-gray-600">Loading…</p>
            ) : (
              <ChargeDetailBody detail={detail} planName={planName} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTable({
  rows,
  loading,
  planName,
  showOrganization,
}: {
  rows: BillingHistoryRow[];
  loading: boolean;
  planName: (plan?: string | number | null) => string;
  showOrganization?: boolean;
}) {
  const headings = [
    'When',
    ...(showOrganization ? ['Organization', 'Website'] : []),
    'Fee',
    'Change',
    'Plan',
    'Amount',
    'Changed by',
  ];
  const change = (before: string, after: string) => (before === after ? after : `${before} → ${after}`);
  const amount = (value?: number | null) => (value == null ? '—' : money.format(Number(value)));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-blue-200">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            {headings.map((heading) => (
              <th key={heading} className={headClass}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headings.length} className="px-4 py-8 text-center text-sm text-gray-600">
                {loading ? 'Searching…' : 'No billing changes match this search.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-blue-100">
                <td className="px-4 py-3 text-sm whitespace-nowrap">{when(row.occurredAt)}</td>
                {showOrganization && (
                  <>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {row.organizationId != null ? (
                        <Link
                          href={`/admin/platform-billing/organization/${row.organizationId}`}
                          className="text-indigo-700 hover:text-indigo-900 underline"
                        >
                          {row.organizationName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.tenantId || '—'}</td>
                  </>
                )}
                <td className="px-4 py-3 text-sm">{billingFeeLabel(row.product)}</td>
                <td className="px-4 py-3 text-sm">{row.reason || '—'}</td>
                <td className="px-4 py-3 text-sm">{change(planName(row.previousPlanCode), planName(row.newPlanCode))}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{change(amount(row.previousAmountUsd), amount(row.newAmountUsd))}</td>
                <td className="px-4 py-3 text-sm">{row.actorName || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CopyId({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-gray-700 w-28">{label}</span>
      <code className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 break-all">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-900 underline">
          Open in Stripe
        </a>
      )}
    </div>
  );
}

function ChargeDetailBody({ detail, planName }: { detail: ChargeDetail; planName: (plan?: string | number | null) => string }) {
  const { charge } = detail;
  const stripe = `https://dashboard.stripe.com/${detail.stripeTestMode ? 'test/' : ''}`;
  const facts: Array<[string, string]> = [
    ['Organization', `${charge.organizationName || ''} (${charge.organizationId})`],
    ['Website', charge.tenantId || 'None. This is the organization charge.'],
    ['Fee', billingFeeLabel(charge.product)],
    ['Plan', planName(charge.platformPlanId ?? charge.planCode)],
    ['Billing scope', charge.billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website'],
    ['Amount', `${money.format(Number(charge.amountUsd || 0))} ${charge.currency || 'USD'}`],
    ['Interval', charge.billingInterval ? `Every ${charge.intervalCount || 1} ${charge.billingInterval.toLowerCase()}` : 'One time'],
    ['When', when(charge.occurredAt)],
    ['Period', period(charge)],
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={charge.status} paidLater={charge.paidLater} />
        {charge.failureReason && <span className="text-sm text-red-700">{charge.failureReason}</span>}
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="font-medium text-gray-700 w-28 flex-shrink-0">{label}</dt>
            <dd className="text-gray-900 break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {charge.notes && <p className="text-sm text-gray-700">Notes: {charge.notes}</p>}
      <div className="space-y-2">
        <CopyId label="Invoice" value={charge.stripeInvoiceId} href={`${stripe}invoices/${charge.stripeInvoiceId}`} />
        <CopyId label="Subscription" value={charge.stripeSubscriptionId} href={`${stripe}subscriptions/${charge.stripeSubscriptionId}`} />
        <CopyId label="Payment" value={charge.stripePaymentIntentId} href={`${stripe}payments/${charge.stripePaymentIntentId}`} />
        <CopyId label="Event" value={charge.stripeEventId} href={`${stripe}events/${charge.stripeEventId}`} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/admin/platform-billing/organization/${charge.organizationId}`} className="text-indigo-700 hover:text-indigo-900 underline">
          Open the organization billing page
        </Link>
        {charge.tenantId && (
          <Link href={`/admin/platform-billing/${encodeURIComponent(charge.tenantId)}`} className="text-indigo-700 hover:text-indigo-900 underline">
            Open the website billing page
          </Link>
        )}
      </div>
      {detail.sameInvoice.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ledger rows of this invoice</h3>
          <ul className="space-y-1 text-sm">
            {detail.sameInvoice.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3">
                <span className="w-44">{when(row.occurredAt)}</span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${billingStatusClass(row.status)}`}>
                  {billingStatusLabel(row.status)}
                </span>
                <span className="font-semibold">{money.format(Number(row.amountUsd || 0))}</span>
                {row.failureReason && <span className="text-red-700">{row.failureReason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Latest billing changes for this fee</h3>
        <HistoryTable rows={detail.history} loading={false} planName={planName} />
      </div>
    </>
  );
}
