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
            <div className="w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Tenant Organizations
                </h1>
                <SatelliteDomainsGuidance showHelp showBanner={false} />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm">
                Manage company organization records (contact and address). Website Tenant IDs and
                hostnames are provisioned from Onboarding.
              </p>
              <div className="mt-4">
                <Link
                  href="/admin/tenant-management/organizations/search"
                  className="inline-flex flex-shrink-0 h-14 rounded-xl bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900 dark:hover:bg-cyan-800 items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                  title="Search organizations"
                  aria-label="Search organizations"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-200 dark:bg-cyan-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-700 dark:text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-cyan-800 dark:text-cyan-100">Search organizations</span>
                </Link>
              </div>

              {/* Primary path: create Tenant ID + hostname via onboarding */}
              <div
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4"
                role="note"
                aria-label="Create Tenant ID via onboarding"
              >
                <p className="font-semibold text-emerald-950 dark:text-emerald-50 mb-1 text-sm">
                  Create a website Tenant ID for an organization
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-3">
                  After the company Organization exists here, go to Onboarding to create the site
                  Tenant ID, associate the hostname/domain, branding, and portfolio membership.
                  Do not expect those fields on Create Organization.
                </p>
                <Link
                  href="/admin/onboarding-requests/new"
                  className="inline-flex flex-shrink-0 h-14 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                  title="Add onboarding request — create Tenant ID"
                  aria-label="Add onboarding request — create Tenant ID"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-700 dark:text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-100">
                    Onboarding → Add Request (new Tenant ID)
                  </span>
                </Link>
              </div>

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
