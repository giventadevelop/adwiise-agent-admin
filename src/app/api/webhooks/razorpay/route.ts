import { NextResponse } from 'next/server';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import { verifyRazorpayWebhook } from '@/lib/payments/razorpayFee';

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  notes?: { tenantId?: string; invoiceId?: string };
};

type FeePayment = {
  id?: number;
  tenantId?: string;
  invoiceId?: number;
  amount?: number;
  currency?: string;
};

function listFrom(data: unknown): FeePayment[] {
  if (Array.isArray(data)) return data as FeePayment[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown[] }).content)) {
    return (data as { content: FeePayment[] }).content;
  }
  return [];
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: RazorpayPaymentEntity } };
  };
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ received: true, ignored: event.event || 'unknown' });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const tenantId = payment?.notes?.tenantId || '';
  const invoiceId = Number(payment?.notes?.invoiceId);
  if (!orderId || !tenantId || !Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: 'Payment is missing order or tenant notes' }, { status: 400 });
  }

  const headers = { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' };
  const lookup = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/school-fee-payments?providerOrderId.equals=${encodeURIComponent(orderId)}&size=1`,
    { cache: 'no-store', headers }
  );
  if (!lookup.ok) {
    return NextResponse.json({ error: 'Payment lookup failed' }, { status: 502 });
  }
  const existing = listFrom(await lookup.json())[0];
  if (!existing?.id) {
    return NextResponse.json({ error: 'Fee payment row not found' }, { status: 404 });
  }

  const paidAt = new Date().toISOString();
  const patchPayment = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-payments/${existing.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({
      id: existing.id,
      tenantId,
      providerPaymentId: payment?.id,
      status: 'CAPTURED',
      paidAt,
    }),
  });
  if (!patchPayment.ok) {
    return NextResponse.json({ error: 'Could not update fee payment' }, { status: 502 });
  }

  const patchInvoice = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-invoices/${invoiceId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ id: invoiceId, tenantId, status: 'PAID' }),
  });
  if (!patchInvoice.ok) {
    return NextResponse.json({ error: 'Could not mark the invoice paid' }, { status: 502 });
  }

  return NextResponse.json({ received: true });
}
