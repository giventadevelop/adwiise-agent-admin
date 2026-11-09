/**
 * Client-only draft for site provisioning fields that are not on TenantOnboardingSubmitDTO
 * (tenant prefix / generated id, subscription intent). Survives navigate to review via sessionStorage.
 */

export interface OnboardingSiteProvisionDraft {
  sourceTenantId: string;
  sourceOrganizationId?: number | null;
  tenantPrefix: string;
  tenantId: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  monthlyFeeUsd: string;
  stripeCustomerId: string;
}

export const EMPTY_SITE_PROVISION_DRAFT: OnboardingSiteProvisionDraft = {
  sourceTenantId: '',
  sourceOrganizationId: null,
  tenantPrefix: '',
  tenantId: '',
  subscriptionPlan: '',
  subscriptionStatus: '',
  subscriptionStartDate: '',
  subscriptionEndDate: '',
  monthlyFeeUsd: '0',
  stripeCustomerId: '',
};

const DRAFT_STORAGE_PREFIX = 'onboarding-site-draft:';

export function rememberOnboardingSiteDraft(
  requestId: number,
  draft: OnboardingSiteProvisionDraft
): void {
  if (typeof window === 'undefined' || !requestId) return;
  try {
    sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${requestId}`, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readOnboardingSiteDraft(requestId: number): OnboardingSiteProvisionDraft | null {
  if (typeof window === 'undefined' || !requestId) return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${requestId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingSiteProvisionDraft>;
    return {
      ...EMPTY_SITE_PROVISION_DRAFT,
      ...parsed,
      sourceTenantId: parsed.sourceTenantId?.trim() || '',
      tenantPrefix: parsed.tenantPrefix?.trim() || '',
      tenantId: parsed.tenantId?.trim() || '',
    };
  } catch {
    return null;
  }
}
