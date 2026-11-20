export const ORGANIZATION_CUSTOMER_REQUIRED =
  'The organization needs a Stripe customer before this website can be charged.';

export function explainBillingSaveError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error || '');
  if (
    text.includes('organizationcustomerrequired') ||
    text.includes('needs a Stripe customer') ||
    text.includes('Stripe is not configured') ||
    text.includes('Charging is not live')
  ) {
    return ORGANIZATION_CUSTOMER_REQUIRED;
  }
  return text || 'Save failed';
}
