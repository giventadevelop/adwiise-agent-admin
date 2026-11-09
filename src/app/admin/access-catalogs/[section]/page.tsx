import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import AdminBackButton from '@/components/admin/AdminBackButton';
import { getCurrentAdminAccess } from '../../adminAccessServer';
import AccessCatalogsClient, { type AccessCatalogSection } from '../AccessCatalogsClient';
import {
  fetchAccessRoles,
  fetchRecommendationCategories,
  fetchRetailerSizeBands,
  fetchRetailerTypes,
  fetchSiteTypes,
  fetchSubscriptionPlans,
} from '../ApiServerActions';

const TITLES: Record<string, string> = {
  'access-roles': 'Access roles',
  'site-types': 'Site types',
  'subscription-plans': 'Subscription plans',
  'retailer-types': 'Retailer packs',
  'retailer-size-bands': 'Size bands',
  'recommendation-categories': 'Recommendation categories',
};

export default async function AccessCatalogSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = TITLES[section];
  if (!title) notFound();

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const access = await getCurrentAdminAccess();
  const [roles, retailers, siteTypes, plans, sizeBands, categories] = await Promise.all([
    fetchAccessRoles().catch(() => []),
    fetchRetailerTypes().catch(() => []),
    fetchSiteTypes().catch(() => []),
    fetchSubscriptionPlans().catch(() => []),
    fetchRetailerSizeBands().catch(() => []),
    fetchRecommendationCategories().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8" style={{ paddingTop: '180px' }}>
      <AdminNavigation
        currentPage="admin"
        contextLine={`${title} catalog entries used across tenants.`}
      />
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <AdminBackButton href="/admin/access-catalogs" label="Back to Access catalogs" />
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      <AccessCatalogsClient
        initialRoles={roles}
        initialRetailers={retailers}
        initialSiteTypes={siteTypes}
        initialPlans={plans}
        initialSizeBands={sizeBands}
        initialCategories={categories}
        canEditGlobal={access.isPlatformSuperAdmin}
        only={section as AccessCatalogSection}
      />
    </div>
  );
}
