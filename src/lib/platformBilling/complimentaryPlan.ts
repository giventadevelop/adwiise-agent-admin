/** Catalog codes that must not start a platform Stripe charge. */
export function isComplimentarySubscriptionPlan(code?: string | null): boolean {
  const normalized = (code || '').trim().toLowerCase();
  return normalized === 'free' || normalized === 'demo';
}

export function organizationChargeNote(organizationId: number): string {
  return `organization-flat:${organizationId}`;
}

export function coveredByOrganizationNote(organizationId: number): string {
  return `covered-by-organization:${organizationId}`;
}

export function isCoveredByPortfolio(notes?: string | null): boolean {
  return (notes || '')
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('covered-by-organization:') || trimmed.startsWith('covered-by-portfolio:');
    });
}

export function withNoteLine(notes: string | null | undefined, line: string): string {
  const lines = (notes || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== line);
  lines.push(line);
  return lines.join('\n');
}

export function withoutNoteLine(notes: string | null | undefined, line: string): string {
  return (notes || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== line)
    .join('\n');
}
