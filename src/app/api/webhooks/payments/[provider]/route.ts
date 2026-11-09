import { receiveSchoolFeeWebhook } from '@/lib/payments/schoolFeeCheckout';

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  return receiveSchoolFeeWebhook(provider, request);
}
