const LABELS: Record<string, string> = {
  COMPLIMENTARY: 'Complimentary',
  PAYMENT_DUE: 'Payment due',
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  LOCKED: 'Locked',
  OPEN: 'Open',
  PAID: 'Paid',
  FAILED: 'Failed',
  VOID: 'Void',
  REFUNDED: 'Refunded',
};

const MEANINGS: Record<string, string> = {
  COMPLIMENTARY: 'The charge switch is off. This website is free.',
  PAYMENT_DUE: 'The charge switch is on. Grace days are still open and nobody has paid yet.',
  ACTIVE: 'The charge switch is on and the fee is paid.',
  PAST_DUE: 'A renewal failed and Stripe is still trying.',
  LOCKED: 'Grace days ended and the fee is unpaid. Paid admin tools are blocked. The public site stays online.',
  OPEN: 'This charge is waiting to be paid.',
  PAID: 'This charge was paid.',
  FAILED: 'This charge failed.',
  VOID: 'This charge was canceled.',
  REFUNDED: 'This charge was refunded.',
};

export function billingStatusKey(status?: string | null): string {
  return (status || 'COMPLIMENTARY').trim().toUpperCase();
}

export function billingStatusLabel(status?: string | null): string {
  const key = billingStatusKey(status);
  return LABELS[key] || status || 'Complimentary';
}

export function billingStatusMeaning(status?: string | null): string {
  return MEANINGS[billingStatusKey(status)] || '';
}

export function billingStatusClass(status?: string | null): string {
  const key = billingStatusKey(status);
  if (key === 'ACTIVE' || key === 'PAID') return 'bg-green-100 text-green-800';
  if (key === 'PAYMENT_DUE' || key === 'OPEN') return 'bg-amber-100 text-amber-800';
  if (key === 'PAST_DUE' || key === 'FAILED' || key === 'LOCKED') return 'bg-red-100 text-red-800';
  if (key === 'REFUNDED') return 'bg-purple-100 text-purple-800';
  return 'bg-orange-100 text-orange-800';
}

/** The fee a ledger row paid for. A row with product RETAIL is the one charge an organization pays for all its websites. */
export function billingFeeLabel(product?: string | null): string {
  if (product === 'EVENT_SITE') return 'Event site';
  if (product === 'GAS_STATION') return 'Retail locations';
  if (product === 'RETAIL') return 'Organization fee';
  return product || '—';
}
