import { getApiBaseUrl, getAppUrlFromRequestHeaders } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { isComplimentarySubscriptionPlan, isCoveredByPortfolio } from '@/lib/platformBilling/complimentaryPlan';
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
  // A website belongs to its organization through tenant settings. The organization list has no tenant filter,
  // so asking it by tenant id returns some other organization.
  const params = new URLSearchParams({ 'tenantId.equals': tenantId, size: '1' });
  const settingsResponse = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!settingsResponse.ok) return null;
  const data = await settingsResponse.json();
  const settings = (Array.isArray(data) ? data[0] : data?.content?.[0]) as
    | { tenantId?: string; tenantOrganization?: { id?: number } }
    | undefined;
  const organizationId = settings?.tenantOrganization?.id;
  if (!organizationId || settings?.tenantId !== tenantId) return null;
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${organizationId}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  if (!response.ok) return null;
  const organization = (await response.json()) as TenantOrganizationDTO;
  return { ...organization, tenantId: organization.tenantId || tenantId };
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
    metadata: { billingScope: 'platform_tenant', tenantId: org.tenantId || '' },
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

function stripeSecretKey(): string {
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.AMPLIFY_STRIPE_SECRET_KEY ||
    process.env.AWS_AMPLIFY_STRIPE_SECRET_KEY ||
    ''
  );
}

function stripeRecurring(interval: string, intervalCount: number): { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } {
  const normalized = interval.toUpperCase();
  const count = Number.isFinite(intervalCount) && intervalCount >= 1 ? Math.floor(intervalCount) : 1;
  if ((normalized === 'DAY' || normalized === 'WEEK') && !stripeSecretKey().startsWith('sk_test_')) {
    throw new Error('Day and week billing intervals are only allowed while the Stripe secret key is a test key.');
  }
  const mapped = normalized === 'DAY' ? 'day' : normalized === 'WEEK' ? 'week' : normalized === 'YEAR' ? 'year' : 'month';
  return { interval: mapped, interval_count: count };
}

const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

export async function createPlatformCheckout(input: {
  billing: TenantProductBillingDTO;
  plan: PlatformBillingPlanDTO | null;
  mode: 'RECURRING' | 'ONE_TIME';
}): Promise<{ url?: string; updated?: boolean; quantity?: number; subscriptionId?: string; status?: 'ACTIVE' }> {
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
  if (billing.product !== 'RETAIL' && isComplimentarySubscriptionPlan(org.subscriptionPlan)) {
    throw new Error('This tenant plan is free or demo. Stripe is not called.');
  }
  if (billing.product !== 'RETAIL' && isCoveredByPortfolio(billing.notes)) {
    throw new Error('This tenant is covered by an organization portfolio charge.');
  }
  const customerId = await ensureStripeCustomer(org);
  await confirmPlatformBankDebit(stripe);

  const customFee = billing.customFeeUsd != null && Number(billing.customFeeUsd) > 0;
  const quantity = billing.product === 'GAS_STATION' && !customFee ? await countBillableLocations(billing.tenantId) : 1;
  const perLocationTiers = billing.product === 'GAS_STATION' && !customFee && Boolean(plan?.graduatedTiersJson);
  if (perLocationTiers && mode === 'ONE_TIME') {
    throw new Error('This plan is charged by location on a subscription. Use Pay monthly, or set a custom fee to pay once.');
  }
  // Pay once on a row that already holds a subscription is an extra charge. The row stays in subscription mode.
  const extraOneTime = mode === 'ONE_TIME' && Boolean(billing.stripeSubscriptionId);
  await patchBilling(billing, {
    locationQuantity: quantity,
    ...(extraOneTime ? {} : { billingMode: mode }),
    billingInterval: billing.billingInterval || plan?.billingInterval || null,
    intervalCount: billing.intervalCount || plan?.intervalCount || 1,
  });

  // billing.stripePriceId only records the last price sent to Stripe. It can be an old custom fee, so it is never reused here.
  let priceId = customFee ? null : plan?.stripePriceId || null;
  if (priceId) {
    // The plan's saved price is monthly or one-time. Stripe refuses a monthly price on Pay once, and the reverse.
    const saved = await stripe.prices.retrieve(priceId);
    if ((saved.type === 'recurring') !== (mode === 'RECURRING')) priceId = null;
  }
  if (!priceId) {
    if (billing.product === 'GAS_STATION' && !customFee && plan?.graduatedTiersJson && !plan.stripePriceId) {
      throw new Error('Paste the Stripe graduated price id on the gas-station catalog plan before charging by location.');
    }
    const amount = customFee ? Number(billing.customFeeUsd) : Number(plan?.listPriceUsd ?? 0);
    if (!amount || amount <= 0) throw new Error('Set a catalog price or a custom fee before charging.');
    const interval = billing.billingInterval || plan?.billingInterval || 'MONTH';
    const intervalCount = billing.intervalCount || plan?.intervalCount || 1;
    const recurring = mode === 'RECURRING' ? stripeRecurring(interval, intervalCount) : null;
    const portfolioFee = (billing.notes || '').includes('organization-flat:') || (billing.notes || '').includes('portfolio-flat:');
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: dollarsToCents(amount),
      product_data: {
        name: portfolioFee
          ? 'Organization portfolio fee'
          : customFee
            ? `Custom ${billing.product === 'EVENT_SITE' ? 'event site' : 'retail'} fee`
            : plan?.name || 'Platform fee',
      },
      ...(recurring ? { recurring } : {}),
    });
    priceId = price.id;
  }
  await patchBilling(billing, { stripePriceId: priceId });

  const origin = await getAppUrlFromRequestHeaders();
  const metadata: Record<string, string> = {
    billingScope: 'platform_tenant',
    tenantId: billing.tenantId,
    product: billing.product,
    billingId: String(billing.id),
    billingMode: mode,
  };
  const success = `${origin}/admin/billing/${encodeURIComponent(billing.tenantId)}?checkout=success`;
  const cancel = `${origin}/admin/billing/${encodeURIComponent(billing.tenantId)}?checkout=cancel`;

  if (mode === 'RECURRING') {
    // One billing row has one live subscription. Stripe is asked, because a missed webhook leaves the row without the id.
    const listed = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    const live = listed.data
      .filter(
        (entry) =>
          LIVE_SUBSCRIPTION_STATUSES.includes(entry.status) &&
          entry.metadata?.billingScope === 'platform_tenant' &&
          entry.metadata?.billingId === String(billing.id)
      )
      .sort((a, b) => b.created - a.created);
    // The row's own subscription counts even when it sits on another Stripe customer.
    if (billing.stripeSubscriptionId && !live.some((entry) => entry.id === billing.stripeSubscriptionId)) {
      const held = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId).catch(() => null);
      if (held && LIVE_SUBSCRIPTION_STATUSES.includes(held.status)) live.unshift(held);
    }
    const keep =live.find((entry) => entry.id === billing.stripeSubscriptionId) ?? live[0];
    if (!keep && billing.stripeSubscriptionId) {
      await patchBilling(billing, { stripeSubscriptionId: '' });
      billing.stripeSubscriptionId = '';
    }
    if (keep) {
      const item = keep.items.data[0];
      if (!item) throw new Error('The Stripe subscription has no item to update.');
      await stripe.subscriptions.update(keep.id, {
        items: [{ id: item.id, price: priceId, quantity }],
        proration_behavior: 'none',
        // Pay monthly on a subscription that was set to cancel at period end keeps it going.
        cancel_at_period_end: false,
        metadata,
      });
      // The row points at the kept subscription before the extras are canceled, so their cancel events are ignored.
      await patchBilling(billing, {
        stripeSubscriptionId: keep.id,
        stripePriceId: priceId,
        ...(keep.status === 'active' || keep.status === 'trialing' ? { status: 'ACTIVE' as const } : {}),
      });
      for (const extra of live) {
        if (extra.id !== keep.id) await stripe.subscriptions.cancel(extra.id);
      }
      const paying = keep.status === 'active' || keep.status === 'trialing';
      return { updated: true, quantity, subscriptionId: keep.id, ...(paying ? { status: 'ACTIVE' as const } : {}) };
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: mode === 'RECURRING' ? 'subscription' : 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity }],
    payment_method_types: ['card', 'us_bank_account'],
    // Cards saved by an earlier Checkout are marked "limited". Without this filter Checkout never offers them again.
    saved_payment_method_options: { allow_redisplay_filters: ['always', 'limited'] },
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

const ACH_CAPABILITY = 'us_bank_account_ach_payments';

/**
 * Platform Checkout already asks for card and us_bank_account.
 * Request ACH Direct Debit on the Stripe account when it is not active yet.
 */
export async function confirmPlatformBankDebit(existing?: Stripe | null): Promise<{ status: string }> {
  try {
    const stripe = existing ?? initStripeConfig();
    if (!stripe) return { status: 'unconfigured' };
    const account = await stripe.accounts.retrieve();
    const current = account.capabilities?.[ACH_CAPABILITY] || 'inactive';
    if (current === 'active' || current === 'pending') return { status: current };
    const updated = await stripe.accounts.update(account.id, {
      capabilities: { [ACH_CAPABILITY]: { requested: true } },
    });
    return { status: updated.capabilities?.[ACH_CAPABILITY] || current };
  } catch (error) {
    console.error('[platform-billing] ACH capability request failed', error);
    return { status: 'unknown' };
  }
}

async function ensurePortalConfiguration(stripe: Stripe): Promise<string> {
  const listed = await stripe.billingPortal.configurations.list({ limit: 10, active: true });
  const existing = listed.data.find((item) => item.is_default) ?? listed.data[0];
  if (existing) return existing.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Manage your billing' },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
  });
  return created.id;
}

export async function openCustomerPortal(tenantId: string): Promise<{ url: string }> {
  const stripe = initStripeConfig();
  if (!stripe) throw new Error('Charging is not live yet.');
  const org = await loadOrganization(tenantId);
  if (!org?.id) throw new Error('Tenant organization was not found');
  let customerId = org.stripeCustomerId || '';
  if (!customerId) {
    if (!org.contactEmail?.trim()) {
      throw new Error('This tenant does not have a Stripe customer yet.');
    }
    customerId = await ensureStripeCustomer(org);
  }
  const origin = await getAppUrlFromRequestHeaders();
  const configuration = await ensurePortalConfiguration(stripe);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/admin/billing/${encodeURIComponent(tenantId)}`,
    configuration,
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
