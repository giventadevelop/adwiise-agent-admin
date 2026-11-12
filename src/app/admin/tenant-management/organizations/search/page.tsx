import AdminBackButton from '@/components/admin/AdminBackButton';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import OrganizationSearchClient from './OrganizationSearchClient';

export default function OrganizationSearchPage() {
  return (
    <div className="w-full overflow-x-hidden box-border" style={adminPageTopStyle}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <AdminBackButton href="/admin/tenant-management/organizations" label="Back to Organizations" />
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">Search organizations</h1>
            <p className="mt-2 text-sm text-gray-600 max-w-3xl">
              Filter by any combination of fields. Each text field matches anywhere in that value. Results are paged.
              Export results downloads every match, and Export all organizations downloads the full table.
            </p>
          </div>
        </div>
        <OrganizationSearchClient />
      </div>
    </div>
  );
}
