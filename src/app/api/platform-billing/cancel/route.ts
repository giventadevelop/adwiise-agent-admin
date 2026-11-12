import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { fetchAdminAccessForClerkUser, resolveSessionTenantForAccess } from '@/app/admin/adminAccessServer';
import { assertPlatformSuperAdmin, saveTenantProductBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
import { cancelPlatformSubscription, loadBillingRow } from '@/lib/platformBilling/stripeCheckout';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const billingId = Number(body.billingId);
    const tenantId = String(body.tenantId || '');
    const cancelNow = body.cancelNow === true;
    if (!billingId || !tenantId) {
      return NextResponse.json({ error: 'billingId and tenantId are required' }, { status: 400 });
    }
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const user = await currentUser();
    const access = await fetchAdminAccessForClerkUser(userId, user?.emailAddresses?.[0]?.emailAddress);
    if (!access.isAdmin) return NextResponse.json({ error: 'Admin access is required' }, { status: 403 });
    if (cancelNow) {
      await assertPlatformSuperAdmin();
    } else if (!access.isPlatformSuperAdmin) {
      const session = await resolveSessionTenantForAccess(access);
      if (session.tenantId !== tenantId) {
        return NextResponse.json({ error: 'You can cancel only the website you pay for.' }, { status: 403 });
      }
    }
    const billing = await loadBillingRow(billingId, tenantId);
    if (isCoveredByPortfolio(billing.notes)) {
      return NextResponse.json({ error: 'This website is covered by the organization subscription.' }, { status: 400 });
    }
    await cancelPlatformSubscription(billing, cancelNow);
    if (cancelNow) {
      await saveTenantProductBilling({
        ...billing,
        chargeEnabled: false,
        status: 'COMPLIMENTARY',
        stripeSubscriptionId: null,
      });
    }
    return NextResponse.json({ ok: true, cancelNow });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cancel failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
