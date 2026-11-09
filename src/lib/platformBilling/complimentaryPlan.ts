/** Catalog codes that must not start a platform Stripe charge. */
export function isComplimentarySubscriptionPlan(code?: string | null): boolean {
  const normalized = (code || '').trim().toLowerCase();
  return normalized === 'free' || normalized === 'demo';
}

export function portfolioChargeNote(portfolioId: number): string {
  return `portfolio-flat:${portfolioId}`;
}

export function coveredByPortfolioNote(portfolioId: number): string {
  return `covered-by-portfolio:${portfolioId}`;
}

export function isCoveredByPortfolio(notes?: string | null): boolean {
  return (notes || '')
    .split('\n')
    .some((line) => line.trim().startsWith('covered-by-portfolio:'));
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
