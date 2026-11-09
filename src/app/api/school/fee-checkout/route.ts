import { startSchoolFeeCheckout } from '@/lib/payments/schoolFeeCheckout';

export async function POST(request: Request) {
  return startSchoolFeeCheckout(request);
}
