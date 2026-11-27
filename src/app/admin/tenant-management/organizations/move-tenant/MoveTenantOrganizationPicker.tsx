'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantOrganizationSearchSelect from '@/app/admin/tenant-management/components/TenantOrganizationSearchSelect';

export default function MoveTenantOrganizationPicker() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState('');
  const numericId = Number.parseInt(organizationId, 10);
  const canContinue = Number.isFinite(numericId) && numericId > 0;

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-1">Organization that receives the tenant ID</p>
        <TenantOrganizationSearchSelect value={organizationId} onChange={setOrganizationId} required={false} />
      </div>
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => router.push(`/admin/tenant-management/organizations/${numericId}/move-tenant`)}
        className="w-full flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Continue to move a tenant ID to this organization"
        aria-label="Continue to move a tenant ID to this organization"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span className="font-semibold text-indigo-700">Move a tenant ID to this organization</span>
      </button>
    </div>
  );
}
