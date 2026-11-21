'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BillingPagination from '@/app/admin/platform-billing/BillingPagination';
import { searchTenantCharges } from '@/app/admin/platform-billing/charges/ApiServerActions';
import { billingFeeLabel, billingStatusClass, billingStatusLabel, billingStatusMeaning } from '@/lib/platformBilling/statusLabel';
import type { ChargeFeeFilter, ChargeSearchResult } from '@/types/platformBilling';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inputClass = 'mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-sm font-normal';
const labelClass = 'text-sm font-medium text-gray-700';

function day(value?: string | null): string {
  if (!value) return '…';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * The Charges table of one website. The server pages through the whole ledger, so old charges can be reached.
 * `refreshKey` changes when a payment or cancel on the page may have added a row.
 */
export default function TenantChargesTable({
  tenantId,
  showSearchLinks,
  refreshKey = 0,
}: {
  tenantId: string;
  showSearchLinks: boolean;
  refreshKey?: number;
}) {
  const [fee, setFee] = useState<ChargeFeeFilter | ''>('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ChargeSearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    searchTenantCharges(
      tenantId,
      {
        fee,
        statuses: status ? [status] : [],
        fromIso: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate.toISOString() : undefined,
        toIso: toDate && !Number.isNaN(toDate.getTime()) ? toDate.toISOString() : undefined,
      },
      page
    )
      .then((next) => {
        if (current) setResult(next);
      })
      .catch((error) => {
        if (current) {
          setResult({
            rows: [],
            totalCount: 0,
            totals: [],
            notice: error instanceof Error ? error.message : 'Charges could not be loaded.',
          });
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [tenantId, fee, status, from, to, page, refreshKey]);

  const rows = result?.rows || [];
  const filtered = Boolean(fee || status || from || to);

  return (
    <section className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Charges</h2>
        {showSearchLinks && (
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href={`/admin/platform-billing/charges?tenant=${encodeURIComponent(tenantId)}`}
              className="text-indigo-700 hover:text-indigo-900 underline"
            >
              Open in charge search
            </Link>
            <Link
              href={`/admin/platform-billing/charges?tab=history&tenant=${encodeURIComponent(tenantId)}`}
              className="text-indigo-700 hover:text-indigo-900 underline"
            >
              Change history
            </Link>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <label className={labelClass}>
          Fee
          <select
            value={fee}
            onChange={(event) => {
              setFee(event.target.value as ChargeFeeFilter | '');
              setPage(0);
            }}
            className={inputClass}
          >
            <option value="">All fees</option>
            <option value="EVENT_SITE">Event site</option>
            <option value="GAS_STATION">Retail locations</option>
          </select>
        </label>
        <label className={labelClass}>
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {['PAID', 'OPEN', 'FAILED', 'VOID', 'REFUNDED'].map((value) => (
              <option key={value} value={value}>
                {billingStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          From
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(0);
            }}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          To
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(0);
            }}
            className={inputClass}
          />
        </label>
      </div>
      {result?.notice && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-sm text-amber-800 mb-4">{result.notice}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-blue-200">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              {['Status', 'Fee', 'Amount', 'When', 'Period', 'Invoice'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-600">
                  {loading
                    ? 'Loading charges…'
                    : filtered
                      ? 'No charges match these filters.'
                      : 'No platform charges are recorded for this website yet.'}
                </td>
              </tr>
            ) : (
              rows.map((charge) => (
                <tr key={charge.id || charge.stripeEventId} className="border-t border-blue-100">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit px-2 py-1 rounded-full text-xs font-semibold ${billingStatusClass(charge.status)}`}>
                        {billingStatusLabel(charge.status)}
                      </span>
                      <span className="text-xs text-gray-600">
                        {charge.paidLater ? 'This invoice was paid later.' : charge.failureReason || billingStatusMeaning(charge.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{billingFeeLabel(charge.product)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{money.format(Number(charge.amountUsd || 0))}</td>
                  <td className="px-4 py-3 text-sm">{charge.occurredAt ? new Date(charge.occurredAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {charge.periodStart || charge.periodEnd ? `${day(charge.periodStart)} to ${day(charge.periodEnd)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm break-all">{charge.stripeInvoiceId || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <BillingPagination
        page={page}
        totalCount={result?.totalCount ?? 0}
        pageSize={10}
        itemLabel="charges"
        onPage={setPage}
      />
    </section>
  );
}
