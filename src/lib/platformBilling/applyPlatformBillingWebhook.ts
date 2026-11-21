import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { initStripeConfig } from '@/lib/stripe/init';
import { patchTenantProductBillingFromWebhook } from '@/app/admin/platform-billing/ApiServerActions';
import { appendPlatformCharge, lockBillingIfGraceEnded } from '@/lib/platformBilling/chargeLedger';
import type { PlatformBillingChargeDTO, TenantProductBillingDTO } from '@/types/platformBilling';

function asMeta(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry != null) out[key] = String(entry);
  }
  return out;
}

async function findBySubscription(subscriptionId: string, tenantId?: string): Promise<TenantProductBillingDTO | null> {
  const params = new URLSearchParams({ 'stripeSubscriptionId.equals': subscriptionId, size: '1' });
  const headers: Record<string, string> = {};
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/tenant-product-billings?${params.toString()}`,
    { cache: 'no-store', headers }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : data?.content?.[0];
  return row ?? null;
}

async function loadRow(billingId: number, tenantId: string): Promise<TenantProductBillingDTO | null> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-product-billings/${billingId}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return null;
  return (await response.json()) as TenantProductBillingDTO;
}

/** A new Checkout was paid while the row still held another live subscription. The old one is canceled. */
async function cancelReplacedSubscription(subscriptionId: string): Promise<void> {
  try {
    const stripe = initStripeConfig();
    if (stripe) await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('[platform-billing] could not cancel the replaced subscription', subscriptionId, error);
  }
}

/** Plain words for the Charges table. Stripe's invoice status, such as open, is not a reason. */
function failureReason(event: Stripe.Event, object: Record<string, unknown>): string {
  if (typeof object.failure_message === 'string' && object.failure_message) return object.failure_message;
  const lastError = (object.last_finalization_error || object.last_payment_error) as { message?: string } | undefined;
  if (lastError?.message) return lastError.message;
  if (event.type === 'invoice.payment_failed') return 'The payment method was declined when the invoice was charged.';
  if (event.type === 'checkout.session.async_payment_failed') return 'The bank debit did not go through.';
  if (event.type === 'customer.subscription.deleted') return 'Stripe canceled the subscription after the payment kept failing.';
  return 'Payment failed';
}

function paidThrough(mode: string | undefined, interval: string | undefined): string {
  const date = new Date();
  if (interval === 'YEAR') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  if (mode !== 'ONE_TIME') return date.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/**
 * Handles Stripe events whose metadata says billingScope=platform_tenant.
 * Returns a response when the event belongs to platform billing so ticket and
 * membership code is not run. Returns null for every other event.
 */
export async function handlePlatformTenantBillingEvent(event: Stripe.Event): Promise<NextResponse | null> {
  const object = event.data.object as unknown as Record<string, unknown>;
  const nested = asMeta(
    (object.subscription_details as { metadata?: unknown } | undefined)?.metadata
  );
  const meta = { ...asMeta(object.metadata), ...nested };
  const subscriptionId =
    typeof object.subscription === 'string'
      ? object.subscription
      : event.type.startsWith('customer.subscription')
        ? String(object.id || '')
        : '';

  let billingId = meta.billingId ? Number(meta.billingId) : NaN;
  let tenantId = meta.tenantId || '';
  const isMarked = meta.billingScope === 'platform_tenant';

  if (!isMarked && !subscriptionId) return null;

  let existing: TenantProductBillingDTO | null = null;
  if ((!Number.isFinite(billingId) || !tenantId) && subscriptionId) {
    existing = await findBySubscription(subscriptionId, tenantId || undefined);
    if (!existing && !isMarked) return null;
    if (existing?.id) billingId = existing.id;
    if (existing?.tenantId) tenantId = existing.tenantId;
  }

  if (!isMarked && !existing) return null;
  if (!Number.isFinite(billingId) || !tenantId) {
    return new NextResponse('Platform billing event is missing billingId', { status: 200 });
  }

  const mode = meta.billingMode || existing?.billingMode || undefined;
  const base = { id: billingId, tenantId };

  // One billing row has one live subscription. An event from any other subscription must not change the row.
  const row = existing ?? (await loadRow(billingId, tenantId));
  const heldId = row?.stripeSubscriptionId || '';
  const fromOtherSubscription = Boolean(subscriptionId) && Boolean(heldId) && heldId !== subscriptionId;

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const paid = object.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded';
      if (!paid) {
        // A bank debit is still on its way. An extra one-time payment on a row that holds a subscription
        // must not move that row back to Payment due.
        const pendingExtra = mode === 'ONE_TIME' && !subscriptionId && Boolean(heldId);
        if (!pendingExtra) await patchTenantProductBillingFromWebhook({ ...base, status: 'PAYMENT_DUE' });
        await recordCharge(event, object, billingId, existing, tenantId, 'OPEN');
      } else {
        // A one-time payment on a row that already holds a subscription is an extra charge.
        // The subscription keeps the row paid, so no paid-through date is set. That date is what the batch job locks on.
        const extraOneTime = mode === 'ONE_TIME' && !subscriptionId && Boolean(heldId);
        await patchTenantProductBillingFromWebhook({
          ...base,
          status: 'ACTIVE',
          stripeSubscriptionId: subscriptionId || undefined,
          stripePaymentId: typeof object.payment_intent === 'string' ? object.payment_intent : undefined,
          billingMode: subscriptionId ? 'RECURRING' : extraOneTime ? undefined : 'ONE_TIME',
          paidThroughDate: mode === 'ONE_TIME' && !extraOneTime ? paidThrough(mode, meta.billingInterval) : undefined,
        });
        await recordCharge(event, object, billingId, existing, tenantId, 'PAID', subscriptionId);
        if (fromOtherSubscription) await cancelReplacedSubscription(heldId);
      }
    } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'invoice.payment_failed') {
      if (!fromOtherSubscription) {
        // The grace end on the row dates from the day the switch was turned on. A failed renewal starts a new grace
        // period, so the website is not locked on the next page open while Stripe is still retrying the card.
        const graceOver = !row?.graceEndsAt || new Date(row.graceEndsAt).getTime() <= Date.now();
        const graceDays = row?.graceDays ?? 14;
        await patchTenantProductBillingFromWebhook({
          ...base,
          status: 'PAST_DUE',
          ...(graceOver ? { graceEndsAt: new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString() } : {}),
        });
      }
      await recordCharge(event, object, billingId, existing, tenantId, 'FAILED', subscriptionId);
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      if (!fromOtherSubscription) {
        await patchTenantProductBillingFromWebhook({
          ...base,
          status: 'ACTIVE',
          stripeSubscriptionId: subscriptionId || undefined,
          // A paid subscription invoice means the row is on a subscription, whatever an earlier Pay once left behind.
          ...(subscriptionId ? { billingMode: 'RECURRING' as const } : {}),
        });
      }
      await recordCharge(event, object, billingId, existing, tenantId, 'PAID', subscriptionId);
    } else if (event.type === 'customer.subscription.deleted') {
      const reason = (object.cancellation_details as { reason?: string } | undefined)?.reason;
      if (heldId !== subscriptionId) {
        // Not the row's subscription: an extra one, or one the Cancel now button already cleared from the row.
        await recordCharge(event, object, billingId, existing, tenantId, 'VOID', subscriptionId);
      } else if (reason === 'payment_failed') {
        await patchTenantProductBillingFromWebhook({ ...base, status: 'LOCKED', stripeSubscriptionId: '' });
        await recordCharge(event, object, billingId, existing, tenantId, 'FAILED', subscriptionId);
      } else {
        await patchTenantProductBillingFromWebhook({
          ...base,
          chargeEnabled: false,
          status: 'COMPLIMENTARY',
          stripeSubscriptionId: '',
        });
        await recordCharge(event, object, billingId, existing, tenantId, 'VOID', subscriptionId);
      }
    } else if (!isMarked) {
      return null;
    }
    if (existing) await lockBillingIfGraceEnded(existing);
  } catch (error) {
    console.error('[platform-billing] webhook update failed', error);
    return new NextResponse('Platform billing update failed', { status: 500 });
  }

  return new NextResponse(JSON.stringify({ ok: true, billingScope: 'platform_tenant' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function recordCharge(
  event: Stripe.Event,
  object: Record<string, unknown>,
  billingId: number,
  existing: TenantProductBillingDTO | null,
  tenantId: string,
  status: PlatformBillingChargeDTO['status'],
  subscriptionId = ''
): Promise<void> {
  let row = existing;
  if (!row?.organizationId && Number.isFinite(billingId)) {
    const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-product-billings/${billingId}`, {
      cache: 'no-store',
      headers: tenantId ? { 'X-Tenant-ID': tenantId } : {},
    });
    if (response.ok) row = (await response.json()) as TenantProductBillingDTO;
  }
  const organizationId = row?.organizationId;
  if (!row || !organizationId) return;
  // A failed or open invoice has paid nothing yet. The ledger shows what was asked for.
  const unpaid = status === 'FAILED' || status === 'OPEN';
  const cents = Number(
    (unpaid ? object.amount_due ?? object.amount_total : object.amount_paid ?? object.amount_total ?? object.amount_due) ?? 0
  );
  const amount = Number.isFinite(cents) ? Math.round(cents) / 100 : Number(row.customFeeUsd || 0);
  const period = (object.lines as { data?: Array<{ period?: { start?: number; end?: number } }> } | undefined)?.data?.[0]?.period;
  const invoiceId = typeof object.invoice === 'string' ? object.invoice : event.type.startsWith('invoice.') ? String(object.id || '') : '';
  await appendPlatformCharge({
    organizationId,
    tenantId: row.product === 'RETAIL' && (row.notes || '').includes('organization-flat:') ? null : tenantId,
    product: row.product,
    billingScope: (row.notes || '').includes('organization-flat:') ? 'ORGANIZATION' : 'PER_TENANT',
    platformPlanId: row.platformPlanId ?? null,
    amountUsd: amount,
    currency: 'USD',
    billingInterval: row.billingInterval || null,
    intervalCount: row.intervalCount || 1,
    stripeEventId: event.id,
    stripeInvoiceId: invoiceId || null,
    stripeSubscriptionId: subscriptionId || row.stripeSubscriptionId || null,
    stripePaymentIntentId: typeof object.payment_intent === 'string' ? object.payment_intent : null,
    status,
    periodStart: period?.start ? new Date(period.start * 1000).toISOString() : null,
    periodEnd: period?.end ? new Date(period.end * 1000).toISOString() : null,
    occurredAt: new Date().toISOString(),
    failureReason: status === 'FAILED' ? failureReason(event, object) : null,
    notes: event.type,
  });
}
