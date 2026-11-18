'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBuilding, FaEnvelope, FaIdBadge } from 'react-icons/fa';
import OrganizationBillingScopeCard from '@/app/admin/tenant-management/organizations/OrganizationBillingScopeCard';
import BillingPagination from '../BillingPagination';

const PAGE_SIZE = 20;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function OrganizationBillingClient({
  organizationId,
  name,
  contactEmail,
  stripeCustomerId,
  subscriptionStatus,
  billingScope,
  monthlyFeeUsd,
  websites,
  page,
}: {
  organizationId: number;
  name: string;
  contactEmail: string;
  stripeCustomerId: string;
  subscriptionStatus: string;
  billingScope: 'ORGANIZATION' | 'PER_TENANT';
  monthlyFeeUsd: number;
  websites: string[];
  page: number;
}) {
  const router = useRouter();
  const safePage = Math.min(page, Math.max(0, Math.ceil(websites.length / PAGE_SIZE) - 1));
  const visible = websites.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function goToPage(next: number) {
    router.push(`/admin/platform-billing/organization/${organizationId}?page=${next}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FaBuilding className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-600">Organization {organizationId}</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Billing scope</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${billingScope === 'ORGANIZATION' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>
                {billingScope === 'ORGANIZATION' ? 'Organization' : 'Per website'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Monthly amount</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{monthlyFeeUsd > 0 ? money.format(monthlyFeeUsd) : '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{subscriptionStatus || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Stripe customer</dt>
            <dd className="mt-1 text-sm text-gray-900">{stripeCustomerId || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 flex items-center gap-2"><FaEnvelope className="text-blue-500" /> Contact email</dt>
            <dd className="mt-1 text-sm text-gray-900">{contactEmail || '—'}</dd>
          </div>
        </dl>
        <OrganizationBillingScopeCard
          organizationId={organizationId}
          homeTenantId={websites[0] || ''}
          initialScope={billingScope}
          initialAmount={monthlyFeeUsd}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaIdBadge className="text-teal-600" /> Websites
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-blue-200">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Tenant id</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Billing</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-600">No websites are linked to this organization.</td>
                </tr>
              ) : visible.map((tenantId) => (
                <tr key={tenantId} className="border-t border-blue-100 hover:bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{tenantId}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/admin/platform-billing/${encodeURIComponent(tenantId)}`}
                      className="inline-flex h-14 items-center gap-3 rounded-xl bg-indigo-100 hover:bg-indigo-200 px-6 font-semibold text-indigo-700 transition-all duration-300 hover:scale-105"
                      title={`Open billing for ${tenantId}`}
                      aria-label={`Open billing for ${tenantId}`}
                    >
                      Open charge switch
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <BillingPagination
          page={safePage}
          totalCount={websites.length}
          pageSize={PAGE_SIZE}
          itemLabel="websites"
          onPage={goToPage}
        />
      </div>
    </div>
  );
}
