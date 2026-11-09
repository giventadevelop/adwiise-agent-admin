import { receiveSchoolFeeWebhook } from '@/lib/payments/schoolFeeCheckout';

export async function POST(request: Request) {
  return receiveSchoolFeeWebhook('RAZORPAY', request);
}
