'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaFileExcel, FaSearch } from 'react-icons/fa';
import BillingPagination from './BillingPagination';
import type { PlatformBillingPortfolioRow, PlatformBillingReport } from './reportActions';
import { billingStatusLabel, billingStatusMeaning } from '@/lib/platformBilling/statusLabel';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TILE_COLORS = [
  'bg-blue-50 text-blue-800 border-blue-300',
  'bg-green-50 text-green-800 border-green-300',
  'bg-amber-50 text-amber-800 border-amber-300',
  'bg-purple-50 text-purple-800 border-purple-300',
  'bg-teal-50 text-teal-800 border-teal-300',
  'bg-indigo-50 text-indigo-800 border-indigo-300',
  'bg-rose-50 text-rose-800 border-rose-300',
];

function when(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClass(status: string): string {
  const key = status.toUpperCase();
  if (key === 'ACTIVE' || key === 'PAID') return 'bg-green-100 text-green-800';
  if (key === 'PAYMENT_DUE' || key === 'OPEN') return 'bg-amber-100 text-amber-800';
  if (key === 'PAST_DUE' || key === 'FAILED' || key === 'LOCKED') return 'bg-red-100 text-red-800';
  if (key === 'REFUNDED') return 'bg-purple-100 text-purple-800';
  return 'bg-orange-100 text-orange-800';
}

async function downloadSheet(name: string, rows: Array<Array<string | number>>) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  XLSX.writeFile(workbook, `${name}.xlsx`);
}

const HEADERS: Array<{ label: string; path: string }> = [
  { label: 'Organization', path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
  { label: 'Scope', path: 'M4 6h16M4 12h16M4 18h10' },
  { label: 'Amount', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2' },
  { label: 'Status', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Stripe customer', path: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'Last payment', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Next period', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Covered', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0' },
];

export default function PlatformBillingHome({
  report,
  query,
}: {
  report: PlatformBillingReport;
  query: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const tiles = [
    ...Object.entries(report.statusCounts).map(([status, count]) => ({ label: billingStatusLabel(status), count })),
    ...Object.entries(report.scopeCounts).map(([scope, count]) => ({
      label: scope === 'ORGANIZATION' ? 'Organization billing' : 'Per website',
      count,
    })),
  ];

  function searchHref(page: number) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (page > 0) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/admin/platform-billing?${qs}` : '/admin/platform-billing';
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile, index) => (
          <div key={tile.label} className={`rounded-lg border-2 shadow-md p-4 ${TILE_COLORS[index % TILE_COLORS.length]}`}>
            <p className="text-sm font-semibold">{tile.label}</p>
            <p className="text-2xl font-bold">{tile.count}</p>
          </div>
        ))}
      </div>
      {report.notice && <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-sm text-amber-800">{report.notice}</div>}
      <form
        className="bg-white rounded-lg shadow-md p-6 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = text.trim();
          router.push(next ? `/admin/platform-billing?q=${encodeURIComponent(next)}` : '/admin/platform-billing');
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Organization, website, email, customer, subscription, or invoice"
          className="flex-1 min-w-[16rem] border border-gray-400 rounded-xl px-4 py-3"
          aria-label="Search billing"
        />
        <button type="submit" className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105" title="Search" aria-label="Search">
          <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center"><FaSearch className="w-5 h-5 text-blue-600" /></span>
          Search
        </button>
      </form>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105"
          title="Export portfolio"
          aria-label="Export portfolio"
          onClick={() =>
            downloadSheet('billing-portfolio', [
              ['Organization', 'Scope', 'Amount', 'Status', 'Stripe customer', 'Last payment', 'Next period', 'Covered websites', 'Websites'],
              ...report.rows.map((row) => [
                row.name,
                row.billingScope,
                row.amountUsd ?? '',
                row.status,
                row.stripeCustomerId,
                row.lastPayment,
                row.nextPeriod,
                row.coveredCount,
                row.websites.join(', '),
              ]),
            ])
          }
        >
          <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center"><FaFileExcel className="w-5 h-5 text-green-600" /></span>
          Export portfolio
        </button>
        <button
          type="button"
          className="h-14 rounded-xl bg-emerald-100 hover:bg-emerald-200 px-6 font-semibold text-emerald-700 inline-flex items-center gap-3 transition-all duration-300 hover:scale-105"
          title="Export ledger"
          aria-label="Export ledger"
          onClick={() =>
            downloadSheet('billing-ledger', [
              ['Organization', 'Website', 'Product', 'Status', 'Amount', 'Invoice', 'Subscription', 'Payment intent', 'Occurred'],
              ...report.charges.map((charge) => [
                charge.organizationId ?? '',
                charge.tenantId || '',
                charge.product || '',
                charge.status || '',
                charge.amountUsd ?? '',
                charge.stripeInvoiceId || '',
                charge.stripeSubscriptionId || '',
                charge.stripePaymentIntentId || '',
                charge.occurredAt || '',
              ]),
            ])
          }
        >
          <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center"><FaFileExcel className="w-5 h-5 text-emerald-600" /></span>
          Export ledger
        </button>
      </div>
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
            {report.rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-600">No billing records match this search.</td></tr>
            ) : report.rows.map((row: PlatformBillingPortfolioRow) => (
              <tr key={row.id} className="border-t border-blue-100 hover:bg-blue-50">
                <td className="px-4 py-3 text-sm font-semibold">
                  <Link
                    href={`/admin/platform-billing/organization/${row.id}`}
                    className="text-indigo-700 hover:text-indigo-900 underline"
                    title={`Open ${row.name}`}
                    aria-label={`Open ${row.name}`}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.billingScope === 'ORGANIZATION' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
                    {row.billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{row.amountUsd != null && row.amountUsd > 0 ? money.format(row.amountUsd) : '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-fit px-2 py-1 rounded-full text-xs font-semibold ${statusClass(row.status)}`}>
                      {billingStatusLabel(row.status)}
                    </span>
                    {billingStatusMeaning(row.status) && (
                      <span className="text-xs text-gray-600">{billingStatusMeaning(row.status)}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{row.stripeCustomerId || '—'}</td>
                <td className="px-4 py-3 text-sm">{when(row.lastPayment)}</td>
                <td className="px-4 py-3 text-sm">{when(row.nextPeriod)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-700">{row.coveredCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <BillingPagination
          page={report.page}
          totalCount={report.totalCount}
          pageSize={20}
          itemLabel="organizations"
          onPage={(next) => router.push(searchHref(next))}
        />
      </div>
    </div>
  );
}
