import { Suspense } from 'react';
import TenantOrganizationList from '@/app/admin/tenant-management/components/TenantOrganizationList';
import AdminNavigation from '@/components/AdminNavigation';
import SatelliteDomainsGuidance from '@/components/admin/SatelliteDomainsGuidance';
import Link from 'next/link';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';

export default async function TenantOrganizationsPage() {
  return (
    <div className="w-full overflow-x-hidden box-border" style={adminPageTopStyle}>
      {/* Navigation Section - Full Width, Separate Responsive Container */}
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation contextLine="Tenant organizations — filter and open a row to view or edit." />
      </div>
      {/* Main Content Section - Constrained Width */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Tenant Organizations
                </h1>
                <SatelliteDomainsGuidance showHelp showBanner={false} />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm">
                Manage tenant organizations and their configurations.
              </p>
              <div className="mt-4">
                <SatelliteDomainsGuidance showHelp={false} showBanner context="organizations" />
              </div>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading organizations...</p>
              </div>
            </div>
          }>
            <TenantOrganizationList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
