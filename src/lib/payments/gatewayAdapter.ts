import { createHmac, timingSafeEqual } from 'crypto';

export type GatewayCredentials = {
  providerName: string;
  publishableKey?: string | null;
  apiKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
  configurationJson?: string | null;
  checkoutMode?: string | null;
  clientScriptUrl?: string | null;
  signatureHeader?: string | null;
};

export type GatewaySessionInput = {
  credentials: GatewayCredentials;
  amount: number;
  currency: string;
  reference: string;
  notes: Record<string, string>;
};

export type GatewayClientSession = {
  publishableKey: string | null;
  providerOrderId: string;
  clientPayload: Record<string, unknown>;
};

export type ParsedGatewayWebhook = {
  orderId: string;
  paymentId: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  report: Record<string, unknown>;
  ignored?: boolean;
};

export interface GatewayAdapter {
  createClientSession(input: GatewaySessionInput): Promise<GatewayClientSession>;
  peekOrderId(rawBody: string): string | null;
  verifyAndParseWebhook(rawBody: string, headers: Headers, webhookSecret: string): ParsedGatewayWebhook | null;
}

function publicConfig(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function hmacMatches(secret: string, payload: string, signature: string | null): boolean {
  if (!secret || !signature) return false;
  const digest = createHmac('sha256', secret).update(payload).digest('hex');
  const left = Buffer.from(digest);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const razorpayAdapter: GatewayAdapter = {
  async createClientSession(input) {
    const keyId = input.credentials.publishableKey || input.credentials.apiKey || '';
    const keySecret = input.credentials.secretKey || '';
    if (!keyId || !keySecret) {
      throw new Error('This school has not connected a Razorpay key');
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.reference,
        notes: input.notes,
      }),
    });
    if (!response.ok) {
      throw new Error((await response.text()) || 'Razorpay order failed');
    }
    const order = (await response.json()) as { id: string; amount: number; currency: string };
    return {
      publishableKey: keyId,
      providerOrderId: order.id,
      clientPayload: {
        checkoutMode: 'CLIENT_SDK',
        provider: 'RAZORPAY',
        scriptUrl: input.credentials.clientScriptUrl || 'https://checkout.razorpay.com/v1/checkout.js',
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  },
  peekOrderId(rawBody) {
    try {
      const event = JSON.parse(rawBody) as { payload?: { payment?: { entity?: { order_id?: string } } } };
      return event.payload?.payment?.entity?.order_id || null;
    } catch {
      return null;
    }
  },
  verifyAndParseWebhook(rawBody, headers, webhookSecret) {
    const signature = headers.get('x-razorpay-signature');
    if (!hmacMatches(webhookSecret, rawBody, signature)) return null;
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } } };
    };
    if (event.event !== 'payment.captured') {
      return {
        orderId: event.payload?.payment?.entity?.order_id || '',
        paymentId: event.payload?.payment?.entity?.id || null,
        status: 'IGNORED',
        amount: null,
        currency: null,
        report: event as Record<string, unknown>,
        ignored: true,
      };
    }
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) return null;
    return {
      orderId: payment.order_id,
      paymentId: payment.id || null,
      status: 'CAPTURED',
      amount: typeof payment.amount === 'number' ? payment.amount / 100 : null,
      currency: payment.currency || null,
      report: event as Record<string, unknown>,
    };
  },
};

const stripeAdapter: GatewayAdapter = {
  async createClientSession(input) {
    const secret = input.credentials.secretKey || '';
    const publishable = input.credentials.publishableKey || '';
    if (!secret || !publishable) {
      throw new Error('This school has not connected a Stripe key');
    }
    const body = new URLSearchParams();
    body.set('amount', String(Math.round(input.amount * 100)));
    body.set('currency', input.currency.toLowerCase());
    Object.entries(input.notes).forEach(([key, value]) => body.set(`metadata[${key}]`, value));
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error((await response.text()) || 'Stripe payment intent failed');
    }
    const intent = (await response.json()) as { id: string; client_secret?: string; amount: number; currency: string };
    return {
      publishableKey: publishable,
      providerOrderId: intent.id,
      clientPayload: {
        checkoutMode: 'CLIENT_SDK',
        provider: 'STRIPE',
        scriptUrl: input.credentials.clientScriptUrl || 'https://js.stripe.com/v3/',
        publishableKey: publishable,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
      },
    };
  },
  peekOrderId(rawBody) {
    try {
      const event = JSON.parse(rawBody) as { data?: { object?: { id?: string } } };
      return event.data?.object?.id || null;
    } catch {
      return null;
    }
  },
  verifyAndParseWebhook(rawBody, headers, webhookSecret) {
    const header = headers.get('stripe-signature') || '';
    const timestamp = header.match(/t=(\d+)/)?.[1] || '';
    const signature = header.match(/v1=([a-f0-9]+)/)?.[1] || null;
    if (!hmacMatches(webhookSecret, `${timestamp}.${rawBody}`, signature)) return null;
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: { id?: string; amount?: number; currency?: string; status?: string } };
    };
    const object = event.data?.object;
    if (!object?.id) return null;
    const captured = event.type === 'payment_intent.succeeded';
    return {
      orderId: object.id,
      paymentId: object.id,
      status: captured ? 'CAPTURED' : 'IGNORED',
      amount: typeof object.amount === 'number' ? object.amount / 100 : null,
      currency: object.currency || null,
      report: event as Record<string, unknown>,
      ignored: !captured,
    };
  },
};

const nttAdapter: GatewayAdapter = {
  async createClientSession() {
    throw new Error('NTT DATA fee checkout is not enabled yet. Connect Razorpay or another catalog gateway.');
  },
  peekOrderId() {
    return null;
  },
  verifyAndParseWebhook() {
    return null;
  },
};

const genericAdapter: GatewayAdapter = {
  async createClientSession(input) {
    const config = publicConfig(input.credentials.configurationJson);
    const orderUrl = typeof config.orderUrl === 'string' ? config.orderUrl : '';
    if (!orderUrl) {
      throw new Error(`No checkout adapter is registered for ${input.credentials.providerName}`);
    }
    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.credentials.secretKey || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        notes: input.notes,
      }),
    });
    if (!response.ok) {
      throw new Error((await response.text()) || 'Gateway order failed');
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const orderId = String(payload.id || payload.orderId || '');
    if (!orderId) throw new Error('Gateway did not return an order id');
    return {
      publishableKey: input.credentials.publishableKey || null,
      providerOrderId: orderId,
      clientPayload: {
        checkoutMode: input.credentials.checkoutMode || 'REDIRECT',
        provider: input.credentials.providerName,
        scriptUrl: input.credentials.clientScriptUrl || null,
        publishableKey: input.credentials.publishableKey || null,
        orderId,
        redirectUrl: payload.redirectUrl || payload.url || null,
      },
    };
  },
  peekOrderId(rawBody) {
    try {
      const body = JSON.parse(rawBody) as { orderId?: string; order_id?: string; id?: string };
      return body.orderId || body.order_id || body.id || null;
    } catch {
      return null;
    }
  },
  verifyAndParseWebhook(rawBody, headers, webhookSecret) {
    const signature = headers.get('x-payment-signature') || headers.get('x-webhook-signature');
    if (!hmacMatches(webhookSecret, rawBody, signature)) return null;
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const orderId = String(body.orderId || body.order_id || '');
    if (!orderId) return null;
    const status = String(body.status || '').toUpperCase();
    const captured = status === 'CAPTURED' || status === 'PAID' || status === 'SUCCEEDED';
    return {
      orderId,
      paymentId: body.paymentId ? String(body.paymentId) : body.payment_id ? String(body.payment_id) : null,
      status: captured ? 'CAPTURED' : 'IGNORED',
      amount: typeof body.amount === 'number' ? body.amount : null,
      currency: body.currency ? String(body.currency) : null,
      report: body,
      ignored: !captured,
    };
  },
};

const adapters: Record<string, GatewayAdapter> = {
  RAZORPAY: razorpayAdapter,
  STRIPE: stripeAdapter,
  NTT_DATA: nttAdapter,
};

export function gatewayAdapterFor(providerName: string): GatewayAdapter {
  return adapters[providerName.toUpperCase()] || genericAdapter;
}
