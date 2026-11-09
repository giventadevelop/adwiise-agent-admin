import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import type { OrganizationPortfolioDTO } from '@/types';
import type { OnboardingFieldValues } from './OnboardingRequestFields';

const SOURCE_TENANT_STORAGE_PREFIX = 'onboarding-source-tenant:';

/** Prefill intake fields from an existing tenant organization (does not copy domain/hostname). */
export function mapTenantOrganizationToOnboardingFields(
  org: TenantOrganizationDTO,
  previous: OnboardingFieldValues
): OnboardingFieldValues {
  return {
    ...previous,
    organizationName: org.organizationName?.trim() || previous.organizationName,
    // Description is per new website tenant — never copy org CRM description.
    // Site type is for the new website — always manual; do not copy from org or default.
    // Contact / address stay in state from previous when needed for API, but are not
    // overwritten here for display; create/new uses hideCrmFields + selectExistingOnly.
    contactEmail: org.contactEmail?.trim() || previous.contactEmail,
    contactPhone: org.contactPhone?.trim() || previous.contactPhone,
    addressLine1: org.addressLine1?.trim() || previous.addressLine1,
    addressLine2: org.addressLine2?.trim() || previous.addressLine2,
    city: org.city?.trim() || previous.city,
    stateProvince: org.stateProvince?.trim() || previous.stateProvince,
    zipCode: org.zipCode?.trim() || previous.zipCode,
    country: org.country?.trim() || previous.country || 'United States',
    primaryColor: org.primaryColor?.trim() || previous.primaryColor,
    secondaryColor: org.secondaryColor?.trim() || previous.secondaryColor,
    logoUrl: org.logoUrl?.trim() || previous.logoUrl,
    // New site needs its own hostname — never reuse the existing org domain.
  };
}

/** Prefer a portfolio whose primary tenant matches the source, else any portfolio name match. */
export function findPortfolioForSourceTenant(
  portfolios: OrganizationPortfolioDTO[],
  sourceTenantId: string,
  organizationName?: string
): OrganizationPortfolioDTO | undefined {
  const tid = sourceTenantId.trim();
  if (!tid) return undefined;
  const byPrimary = portfolios.find(
    (p) => p.isActive !== false && p.id != null && p.primaryTenantId === tid
  );
  if (byPrimary) return byPrimary;

  const name = organizationName?.trim().toLowerCase();
  if (!name) return undefined;
  return portfolios.find(
    (p) =>
      p.isActive !== false &&
      p.id != null &&
      p.portfolioName?.trim().toLowerCase() === name
  );
}

export function rememberOnboardingSourceTenant(requestId: number, sourceTenantId: string): void {
  if (typeof window === 'undefined' || !requestId || !sourceTenantId.trim()) return;
  try {
    sessionStorage.setItem(`${SOURCE_TENANT_STORAGE_PREFIX}${requestId}`, sourceTenantId.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export function readOnboardingSourceTenant(requestId: number): string {
  if (typeof window === 'undefined' || !requestId) return '';
  try {
    return sessionStorage.getItem(`${SOURCE_TENANT_STORAGE_PREFIX}${requestId}`)?.trim() || '';
  } catch {
    return '';
  }
}
