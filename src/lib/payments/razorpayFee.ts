import { createHmac, timingSafeEqual } from 'crypto';

export type RazorpayKeyPair = {
  keyId: string;
  keySecret: string;
};

export function getRazorpayKeys(): RazorpayKeyPair | null {
  const keyId =
    process.env.AMPLIFY_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    '';
  const keySecret = process.env.AMPLIFY_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function getRazorpayWebhookSecret(): string {
  return process.env.AMPLIFY_RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '';
}

/**
 * NTT DATA Payment Services uses the same school_fee_invoice and school_fee_payment rows
 * with provider_name NTT_DATA. Merchant id, product id, gateway URL, and hash key names
 * belong in payment_provider_config.configuration_json. Hash verification stays off until
 * a merchant account and the request/response hash spec are available.
 */
export function nttDataCheckoutUnavailable(): { error: string } {
  return {
    error: 'NTT DATA fee checkout is not enabled yet. Use Razorpay for INR fee collection.',
  };
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const keys = getRazorpayKeys();
  if (!keys) {
    throw new Error('Razorpay keys are not configured');
  }
  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Razorpay order failed: ${response.status}`);
  }
  return (await response.json()) as { id: string; amount: number; currency: string };
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  const secret = getRazorpayWebhookSecret();
  if (!secret || !signature) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const left = Buffer.from(digest);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
