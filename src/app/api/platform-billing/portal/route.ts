import { NextResponse } from 'next/server';
import { assertCanPayTenant } from '@/app/admin/platform-billing/ApiServerActions';
import { openCustomerPortal } from '@/lib/platformBilling/stripeCheckout';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tenantId = String(body.tenantId || '');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await assertCanPayTenant(tenantId);
    const session = await openCustomerPortal(tenantId);
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal failed';
    console.error('[platform-billing] customer portal failed', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
