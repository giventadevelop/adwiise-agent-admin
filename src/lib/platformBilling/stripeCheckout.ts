import { getApiBaseUrl, getAppUrlFromRequestHeaders } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { initStripeConfig } from '@/lib/stripe/init';
import type { PlatformBillingPlanDTO, TenantProductBillingDTO } from '@/types/platformBilling';
import type { RetailLocationDTO } from '@/types/retail';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import type Stripe from 'stripe';

export async function loadBillingRow(billingId: number, tenantId: string): Promise<TenantProductBillingDTO> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-product-billings/${billingId}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function loadPlan(planId: number, tenantId: string): Promise<PlatformBillingPlanDTO | null> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/platform-billing-plans/${planId}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function loadOrganization(tenantId: string): Promise<TenantOrganizationDTO | null> {
  const params = new URLSearchParams({ 'tenantId.equals': tenantId, size: '1' });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : data?.content?.[0];
  return row ?? null;
}

export async function countBillableLocations(tenantId: string): Promise<number> {
  const params = new URLSearchParams({
    'tenantId.equals': tenantId,
    'isActive.equals': 'true',
    size: '500',
  });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/retail-locations?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return 1;
  const data = await response.json();
  const rows: RetailLocationDTO[] = Array.isArray(data) ? data : data?.content ?? [];
  const count = rows.filter((row) => row.includedInSubscription !== false).length;
  return Math.max(count, 1);
}

async function patchBilling(row: TenantProductBillingDTO, patch: Partial<TenantProductBillingDTO>) {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-product-billings/${row.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'X-Tenant-ID': row.tenantId,
    },
    body: JSON.stringify({ id: row.id, ...patch, updatedAt: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<TenantProductBillingDTO>;
}

export async function ensureStripeCustomer(org: TenantOrganizationDTO): Promise<string> {
  const stripe = initStripeConfig();
  if (!stripe) throw new Error('Charging is not live yet. Stripe is not configured.');
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: org.contactEmail || undefined,
    name: org.organizationName || org.tenantId,
    metadata: { billingScope: 'platform_tenant', tenantId: org.tenantId },
  });
  await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${org.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'X-Tenant-ID': org.tenantId,
    },
    body: JSON.stringify({
      id: org.id,
      stripeCustomerId: customer.id,
      updatedAt: new Date().toISOString(),
    }),
  });
  return customer.id;
}

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export async function createPlatformCheckout(input: {
  billing: TenantProductBillingDTO;
  plan: PlatformBillingPlanDTO | null;
  mode: 'RECURRING' | 'ONE_TIME';
}): Promise<{ url: string }> {
  const stripe = initStripeConfig();
  if (!stripe) {
    throw new Error('Charging is not live yet. Add the Stripe secret before sending a pay link.');
  }
  const { billing, plan, mode } = input;
  if (!billing.chargeEnabled) {
    throw new Error('The charge switch is off. This tenant is complimentary.');
  }
  if (!billing.id) throw new Error('Billing row is missing an id');

  const org = await loadOrganization(billing.tenantId);
  if (!org?.id) throw new Error('Tenant organization was not found');
  const customerId = await ensureStripeCustomer(org);

  const customFee = billing.customFeeUsd != null && Number(billing.customFeeUsd) > 0;
  const quantity = billing.product === 'GAS_STATION' && !customFee ? await countBillableLocations(billing.tenantId) : 1;
  await patchBilling(billing, { locationQuantity: quantity, billingMode: mode });

  let priceId = customFee ? null : plan?.stripePriceId || billing.stripePriceId || null;
  if (!priceId) {
    if (billing.product === 'GAS_STATION' && !customFee && plan?.graduatedTiersJson && !plan.stripePriceId) {
      throw new Error('Paste the Stripe graduated price id on the gas-station catalog plan before charging by location.');
    }
    const amount = customFee ? Number(billing.customFeeUsd) : Number(plan?.listPriceUsd ?? 0);
    if (!amount || amount <= 0) throw new Error('Set a catalog price or a custom fee before charging.');
    const interval = (billing.billingMode === 'ONE_TIME' ? plan?.billingInterval : plan?.billingInterval) || 'MONTH';
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: dollarsToCents(amount),
      product_data: { name: customFee ? `Custom ${billing.product} fee` : plan?.name || 'Platform fee' },
      ...(mode === 'RECURRING'
        ? { recurring: { interval: interval === 'YEAR' ? 'year' : 'month' } }
        : {}),
    });
    priceId = price.id;
    if (customFee) await patchBilling(billing, { stripePriceId: priceId });
  }

  const origin = await getAppUrlFromRequestHeaders();
  const metadata: Record<string, string> = {
    billingScope: 'platform_tenant',
    tenantId: billing.tenantId,
    product: billing.product,
    billingId: String(billing.id),
    billingMode: mode,
  };
  const success = `${origin}/admin/billing?checkout=success`;
  const cancel = `${origin}/admin/billing?checkout=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: mode === 'RECURRING' ? 'subscription' : 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity }],
    payment_method_types: ['card', 'us_bank_account'],
    success_url: success,
    cancel_url: cancel,
    metadata,
    ...(mode === 'RECURRING'
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata } }),
  });
  if (!session.url) throw new Error('Stripe did not return a checkout link');
  return { url: session.url };
}

export async function openCustomerPortal(tenantId: string): Promise<{ url: string }> {
  const stripe = initStripeConfig();
  if (!stripe) throw new Error('Charging is not live yet.');
  const org = await loadOrganization(tenantId);
  if (!org?.stripeCustomerId) throw new Error('This tenant does not have a Stripe customer yet.');
  const origin = await getAppUrlFromRequestHeaders();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/admin/billing`,
  });
  return { url: session.url };
}

export async function cancelPlatformSubscription(billing: TenantProductBillingDTO, cancelNow: boolean) {
  const stripe = initStripeConfig();
  if (!stripe) throw new Error('Charging is not live yet.');
  if (!billing.stripeSubscriptionId) return;
  if (cancelNow) {
    await stripe.subscriptions.cancel(billing.stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(billing.stripeSubscriptionId, { cancel_at_period_end: true });
  }
}

export async function syncGasQuantity(billing: TenantProductBillingDTO): Promise<TenantProductBillingDTO> {
  const customFee = billing.customFeeUsd != null && Number(billing.customFeeUsd) > 0;
  const quantity = billing.product === 'GAS_STATION' && !customFee ? await countBillableLocations(billing.tenantId) : 1;
  const updated = await patchBilling(billing, { locationQuantity: quantity });
  const stripe = initStripeConfig();
  if (stripe && billing.stripeSubscriptionId && !customFee && billing.product === 'GAS_STATION') {
    const subscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
    const item = subscription.items.data[0];
    if (item) {
      await stripe.subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ id: item.id, quantity }],
        proration_behavior: 'create_prorations',
      });
    }
  }
  return updated;
}

export type { Stripe };
