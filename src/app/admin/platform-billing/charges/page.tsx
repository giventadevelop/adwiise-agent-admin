import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchAdminAccessForClerkUser } from '@/app/admin/adminAccessServer';
import { fetchPlatformBillingPlans } from '@/app/admin/platform-billing/ApiServerActions';
import AdminBackButton from '@/components/admin/AdminBackButton';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import ChargeSearchClient from './ChargeSearchClient';

export const dynamic = 'force-dynamic';

export default async function PlatformChargeSearchPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');
  const user = await currentUser();
  const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
  if (!access.isPlatformSuperAdmin) redirect('/admin');
  const plans = await fetchPlatformBillingPlans().catch(() => []);
  return (
    <div className="w-full min-w-0 px-2 sm:px-4 py-4 space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6 flex flex-wrap items-center gap-4" style={adminPageTopStyle}>
        <AdminBackButton href="/admin/platform-billing" label="Back to Platform billing" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Charge search</h1>
          <p className="text-sm text-gray-600 mt-1">
            Find platform charges and billing changes across every organization. Click a charge to see all of its details.
          </p>
        </div>
      </div>
      <ChargeSearchClient
        plans={plans.map((plan) => ({ id: plan.id ?? null, code: plan.code, name: plan.name }))}
      />
    </div>
  );
}
