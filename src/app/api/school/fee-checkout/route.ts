import { NextResponse } from 'next/server';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import { createRazorpayOrder, getRazorpayKeys, nttDataCheckoutUnavailable } from '@/lib/payments/razorpayFee';

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { invoiceId?: number; provider?: string };
  if ((body.provider || 'RAZORPAY').toUpperCase() === 'NTT_DATA') {
    return NextResponse.json(nttDataCheckoutUnavailable(), { status: 501 });
  }
  const invoiceId = Number(body.invoiceId);
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
  }

  const keys = getRazorpayKeys();
  if (!keys) {
    return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 503 });
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
  const currency = (invoice.currency || 'INR').toUpperCase();
  const amount = Number(invoice.amountDue || 0);
  if (currency !== 'INR' || amount <= 0) {
    return NextResponse.json({ error: 'School fee checkout expects a positive INR amount' }, { status: 400 });
  }
  const tenantId = invoice.tenantId || '';
  if (!tenantId) {
    return NextResponse.json({ error: 'Invoice is missing a tenant' }, { status: 400 });
  }

  const amountPaise = Math.round(amount * 100);
  const order = await createRazorpayOrder({
    amountPaise,
    currency,
    receipt: `fee-${invoiceId}`,
    notes: { tenantId, invoiceId: String(invoiceId) },
  });

  const paymentRes = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/school-fee-payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
    },
    body: JSON.stringify({
      tenantId,
      invoiceId,
      providerName: 'RAZORPAY',
      providerOrderId: order.id,
      amount,
      currency,
      status: 'CREATED',
    }),
  });
  if (!paymentRes.ok) {
    const detail = await paymentRes.text();
    return NextResponse.json({ error: detail || 'Could not record the fee payment' }, { status: 502 });
  }

  return NextResponse.json({
    keyId: keys.keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    invoiceId,
    name: invoice.title || 'School fee',
    prefill: {
      name: invoice.payerName || '',
      email: invoice.payerEmail || '',
      contact: invoice.payerPhone || '',
    },
  });
}
