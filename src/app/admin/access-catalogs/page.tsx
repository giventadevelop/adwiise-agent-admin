import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import { getCurrentAdminAccess } from '../adminAccessServer';
import AccessCatalogsClient from './AccessCatalogsClient';
import { fetchAccessRoles, fetchDomainOwnerships, fetchRecommendationCategories, fetchRetailerSizeBands, fetchRetailerTypes, fetchSiteTypes, fetchSubscriptionPlans } from './ApiServerActions';

export default async function AccessCatalogsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const access = await getCurrentAdminAccess();
  const [roles, retailers, siteTypes, plans, ownerships, sizeBands, categories] = await Promise.all([
    fetchAccessRoles().catch(() => []),
    fetchRetailerTypes().catch(() => []),
    fetchSiteTypes().catch(() => []),
    fetchSubscriptionPlans().catch(() => []),
    fetchDomainOwnerships().catch(() => []),
    fetchRetailerSizeBands().catch(() => []),
    fetchRecommendationCategories().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8" style={{ paddingTop: '180px' }}>
      <AdminNavigation currentPage="admin" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access and retailer catalogs</h1>
        <div className="rounded-xl border-2 border-sky-400 bg-sky-50 p-4">
          <h2 className="mb-1 text-lg font-semibold text-sky-900">What these catalogs control</h2>
          <p className="text-sky-950">
            Add an access role, a site type, a subscription plan, a domain ownership choice, a retailer pack, a size band, or a recommendation category. Site type, subscription plan, domain ownership, and retailer pack are separate catalogs. Shared rows are edited by a platform super admin. Each catalog has a manage page for search, paging, and add, edit, and remove. Billing prices stay on Billing Plans.
          </p>
        </div>
      </div>
      <AccessCatalogsClient
        initialRoles={roles}
        initialRetailers={retailers}
        initialSiteTypes={siteTypes}
        initialPlans={plans}
        initialOwnerships={ownerships}
        initialSizeBands={sizeBands}
        initialCategories={categories}
        canEditGlobal={access.isPlatformSuperAdmin}
      />
    </div>
  );
}
