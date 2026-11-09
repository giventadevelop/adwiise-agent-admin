import { NextResponse } from 'next/server';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import { gatewayAdapterFor, type GatewayCredentials, type ParsedGatewayWebhook } from '@/lib/payments/gatewayAdapter';

type Invoice = {
  id?: number;
  tenantId?: string;
  title?: string;
  amountDue?: number;
  currency?: string;
  status?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
};

type FeePayment = {
  id?: number;
  tenantId?: string;
  invoiceId?: number;
};

function peekTenantId(rawBody: string): string {
  try {
    const body = JSON.parse(rawBody) as {
      payload?: { payment?: { entity?: { notes?: { tenantId?: string } } } };
      data?: { object?: { metadata?: { tenantId?: string } } };
      notes?: { tenantId?: string };
    };
    return (
      body.payload?.payment?.entity?.notes?.tenantId ||
      body.data?.object?.metadata?.tenantId ||
      body.notes?.tenantId ||
      ''
    );
  } catch {
    return '';
  }
}

function listFrom(data: unknown): FeePayment[] {
  if (Array.isArray(data)) return data as FeePayment[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown[] }).content)) {
    return (data as { content: FeePayment[] }).content;
  }
  return [];
}

export async function startSchoolFeeCheckout(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { invoiceId?: number };
  const invoiceId = Number(body.invoiceId);
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
  }

  const invoiceRes = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-invoices/${invoiceId}`, {
    cache: 'no-store',
  });
  if (!invoiceRes.ok) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  const invoice = (await invoiceRes.json()) as Invoice;
  if (invoice.status !== 'OPEN') {
    return NextResponse.json({ error: 'Only an open invoice can be paid' }, { status: 409 });
  }
  const amount = Number(invoice.amountDue || 0);
  const currency = (invoice.currency || 'INR').toUpperCase();
  const tenantId = invoice.tenantId || '';
  if (!tenantId || amount <= 0) {
    return NextResponse.json({ error: 'Invoice is missing a tenant or amount' }, { status: 400 });
  }

  const bundleRes = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/internal/payment-gateway-bundle?tenantId=${encodeURIComponent(tenantId)}&paymentUseCase=FEE_COLLECTION`,
    { cache: 'no-store', headers: { 'X-Tenant-ID': tenantId } }
  );
  if (bundleRes.status === 404) {
    return NextResponse.json({ error: 'This school has not connected a payment gateway' }, { status: 409 });
  }
  if (!bundleRes.ok) {
    return NextResponse.json({ error: 'Could not load the school payment gateway' }, { status: 502 });
  }
  const credentials = (await bundleRes.json()) as GatewayCredentials;
  if (!credentials?.providerName) {
    return NextResponse.json({ error: 'This school has not connected a payment gateway' }, { status: 409 });
  }

  let session;
  try {
    session = await gatewayAdapterFor(credentials.providerName).createClientSession({
      credentials,
      amount,
      currency,
      reference: `fee-${invoiceId}`,
      notes: { tenantId, invoiceId: String(invoiceId) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gateway checkout failed';
    const status = message.includes('not enabled') ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const paymentRes = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
    body: JSON.stringify({
      tenantId,
      invoiceId,
      providerName: credentials.providerName,
      providerOrderId: session.providerOrderId,
      amount,
      currency,
      status: 'CREATED',
    }),
  });
  if (!paymentRes.ok) {
    return NextResponse.json({ error: (await paymentRes.text()) || 'Could not record the fee payment' }, { status: 502 });
  }

  return NextResponse.json({
    publishableKey: session.publishableKey,
    clientPayload: {
      ...session.clientPayload,
      invoiceId,
      name: invoice.title || 'School fee',
      prefill: {
        name: invoice.payerName || '',
        email: invoice.payerEmail || '',
        contact: invoice.payerPhone || '',
      },
    },
  });
}

export async function receiveSchoolFeeWebhook(providerName: string, request: Request) {
  const rawBody = await request.text();
  const adapter = gatewayAdapterFor(providerName);
  const orderId = adapter.peekOrderId(rawBody);
  if (!orderId) {
    return NextResponse.json({ error: 'Webhook is missing an order id' }, { status: 400 });
  }
  const tenantHint = peekTenantId(rawBody);
  const lookupHeaders = tenantHint ? { 'X-Tenant-ID': tenantHint } : undefined;

  const lookup = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/school-fee-payments?providerOrderId.equals=${encodeURIComponent(orderId)}&size=1`,
    { cache: 'no-store', headers: lookupHeaders }
  );
  if (!lookup.ok) {
    return NextResponse.json({ error: 'Payment lookup failed' }, { status: 502 });
  }
  const existing = listFrom(await lookup.json())[0];
  if (!existing?.id || !existing.tenantId) {
    return NextResponse.json({ error: 'Fee payment row not found' }, { status: 404 });
  }

  const bundleRes = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/internal/payment-gateway-bundle?tenantId=${encodeURIComponent(existing.tenantId)}&paymentUseCase=FEE_COLLECTION`,
    { cache: 'no-store', headers: { 'X-Tenant-ID': existing.tenantId } }
  );
  if (!bundleRes.ok) {
    return NextResponse.json({ error: 'School gateway secret is not available' }, { status: 502 });
  }
  const credentials = (await bundleRes.json()) as GatewayCredentials;
  const parsed = adapter.verifyAndParseWebhook(rawBody, request.headers, credentials.webhookSecret || '');
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  if (parsed.ignored) {
    return NextResponse.json({ received: true, ignored: true });
  }
  return saveFinalReport(existing, parsed);
}

async function saveFinalReport(existing: FeePayment, parsed: ParsedGatewayWebhook) {
  const tenantId = existing.tenantId || '';
  const headers = { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/merge-patch+json' };
  const paidAt = new Date().toISOString();
  const patchPayment = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-payments/${existing.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      id: existing.id,
      tenantId,
      providerPaymentId: parsed.paymentId,
      providerReportJson: JSON.stringify(parsed.report),
      status: parsed.status,
      paidAt,
    }),
  });
  if (!patchPayment.ok) {
    return NextResponse.json({ error: 'Could not update fee payment' }, { status: 502 });
  }
  if (!existing.invoiceId) {
    return NextResponse.json({ received: true });
  }
  const patchInvoice = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-invoices/${existing.invoiceId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ id: existing.invoiceId, tenantId, status: 'PAID' }),
  });
  if (!patchInvoice.ok) {
    return NextResponse.json({ error: 'Could not mark the invoice paid' }, { status: 502 });
  }
  return NextResponse.json({ received: true });
}
