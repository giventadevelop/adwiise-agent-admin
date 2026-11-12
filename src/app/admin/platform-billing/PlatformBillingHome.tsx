'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PlatformBillingPortfolioRow, PlatformBillingReport } from './reportActions';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function when(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function downloadSheet(name: string, rows: Array<Array<string | number>>) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  XLSX.writeFile(workbook, `${name}.xlsx`);
}

export default function PlatformBillingHome({
  report,
  query,
}: {
  report: PlatformBillingReport;
  query: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const [openId, setOpenId] = useState<number | null>(null);
  const start = report.totalCount === 0 ? 0 : report.page * 20 + 1;
  const end = Math.min(report.totalCount, report.page * 20 + report.rows.length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(report.statusCounts).map(([status, count]) => (
          <div key={status} className="bg-card rounded-lg sacred-shadow p-4">
            <p className="text-sm text-muted-foreground">{status}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
        {Object.entries(report.scopeCounts).map(([scope, count]) => (
          <div key={scope} className="bg-card rounded-lg sacred-shadow p-4">
            <p className="text-sm text-muted-foreground">{scope === 'ORGANIZATION' ? 'Organization billing' : 'Per website'}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
      {report.notice && <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{report.notice}</div>}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(`/admin/platform-billing?q=${encodeURIComponent(text.trim())}`);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Organization, website, email, customer, subscription, or invoice"
          className="flex-1 min-w-[16rem] border border-gray-400 rounded-xl px-4 py-3"
        />
        <button type="submit" className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700">Search</button>
      </form>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700"
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
          Export portfolio
        </button>
        <button
          type="button"
          className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700"
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
          Export ledger
        </button>
      </div>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {['Organization', 'Scope', 'Amount', 'Status', 'Stripe customer', 'Last payment', 'Next period', 'Covered'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-600">No billing records match this search.</td></tr>
            ) : report.rows.map((row: PlatformBillingPortfolioRow) => (
              <Fragment key={row.id}>
                <tr key={row.id} className="cursor-pointer hover:bg-blue-50" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website'}</td>
                  <td className="px-4 py-3 text-sm">{row.amountUsd != null && row.amountUsd > 0 ? money.format(row.amountUsd) : '—'}</td>
                  <td className="px-4 py-3 text-sm">{row.status}</td>
                  <td className="px-4 py-3 text-sm">{row.stripeCustomerId || '—'}</td>
                  <td className="px-4 py-3 text-sm">{when(row.lastPayment)}</td>
                  <td className="px-4 py-3 text-sm">{when(row.nextPeriod)}</td>
                  <td className="px-4 py-3 text-sm">{row.coveredCount}</td>
                </tr>
                {openId === row.id && (
                  <tr key={`${row.id}-sites`}>
                    <td colSpan={8} className="px-4 py-3 bg-blue-50 text-sm">
                      <div className="flex flex-wrap gap-3">
                        {row.websites.length === 0 ? <span>No websites are linked.</span> : row.websites.map((tenantId) => (
                          <Link key={tenantId} href={`/admin/platform-billing/${encodeURIComponent(tenantId)}`} className="text-indigo-700 font-semibold">{tenantId}</Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <div className="flex justify-between items-center">
          <button type="button" disabled={report.page <= 0} onClick={() => router.push(`/admin/platform-billing?q=${encodeURIComponent(query)}&page=${report.page - 1}`)} className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed">Previous</button>
          <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm font-bold text-blue-700">Page <span className="text-blue-600">{report.page + 1}</span> of <span className="text-blue-600">{report.totalPages}</span></div>
          <button type="button" disabled={report.page + 1 >= report.totalPages} onClick={() => router.push(`/admin/platform-billing?q=${encodeURIComponent(query)}&page=${report.page + 1}`)} className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed">Next</button>
        </div>
        <div className="text-center mt-3">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm text-gray-700">
            Showing <span className="font-bold text-blue-600 mx-1">{start}</span> to <span className="font-bold text-blue-600 mx-1">{end}</span> of <span className="font-bold text-blue-600 mx-1">{report.totalCount}</span> organizations
          </div>
        </div>
      </div>
    </div>
  );
}
