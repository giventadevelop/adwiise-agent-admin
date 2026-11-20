import AdminBackButton from '@/components/admin/AdminBackButton';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { fetchPlatformBillingPlans } from '../ApiServerActions';
import { fetchRetailerTypes } from '@/app/admin/access-catalogs/ApiServerActions';
import { retailPacks } from '@/lib/platformBilling/shopPack';
import PlansClient from './PlansClient';

export const dynamic = 'force-dynamic';

export default async function PlatformBillingPlansPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isPlatformSuperAdmin) redirect('/admin');
  const [plans, packs] = await Promise.all([
    fetchPlatformBillingPlans().catch(() => []),
    fetchRetailerTypes().catch(() => []),
  ]);
  return (
    <div className="w-full min-w-0 px-2 sm:px-4 py-4 space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6 flex flex-wrap items-center gap-4" style={adminPageTopStyle}>
        <AdminBackButton href="/admin/platform-billing" label="Back to Platform Billing" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform billing plans</h1>
          <p className="text-sm text-gray-600 mt-1">Catalog prices for event sites and retail shops. A shop pack such as gas station, liquor store, or Dunkin is optional on a retail plan. These are not ticket prices and not membership plans.</p>
        </div>
      </div>
      <PlansClient initialPlans={plans} packs={retailPacks(packs)} />
    </div>
  );
}
