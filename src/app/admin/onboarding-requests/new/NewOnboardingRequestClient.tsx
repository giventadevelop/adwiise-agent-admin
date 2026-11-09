'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import EventFormHelpTooltip from '@/components/EventFormHelpTooltip';
import { validateOnboardingSubmit, onboardingInputClass } from '@/lib/onboarding/onboardingShared';
import {
  formatTenantIdSequence,
  getTenantIdPrefixValidationError,
  normalizeTenantIdPrefix,
  sanitizeTenantIdPrefixInput,
  suggestTenantIdPrefixFromName,
  TENANT_ID_FIRST_SEQUENCE,
  TENANT_ID_PREFIX_MAX_LENGTH,
} from '@/lib/tenantIdGeneration';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import { previewNextTenantIdServer } from '@/app/admin/tenant-management/organizations/tenantIdServerActions';
import OnboardingRequestFields, { EMPTY_ONBOARDING_FIELDS, type OnboardingFieldValues } from '../OnboardingRequestFields';
import { createManualOnboardingRequestServer } from '../ApiServerActions';
import { fetchSubscriptionPlans } from '@/app/admin/access-catalogs/ApiServerActions';
import {
  mapTenantOrganizationToOnboardingFields,
  rememberOnboardingSourceTenant,
} from '../onboardingOrgPrefill';
import {
  EMPTY_SITE_PROVISION_DRAFT,
  rememberOnboardingSiteDraft,
  type OnboardingSiteProvisionDraft,
} from '../onboardingSiteProvisionDraft';
import AdminBackButton from '@/components/admin/AdminBackButton';

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export default function NewOnboardingRequestClient() {
  const router = useRouter();
  const [values, setValues] = useState<OnboardingFieldValues>(EMPTY_ONBOARDING_FIELDS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sourceTenantId, setSourceTenantId] = useState('');
  const [sourceOrganizationId, setSourceOrganizationId] = useState<number | null>(null);
  const [draft, setDraft] = useState<OnboardingSiteProvisionDraft>(EMPTY_SITE_PROVISION_DRAFT);
  const [planOptions, setPlanOptions] = useState<{ code: string; label: string }[]>([
    { code: 'BASIC', label: 'Basic' },
    { code: 'PROFESSIONAL', label: 'Professional' },
    { code: 'ENTERPRISE', label: 'Enterprise' },
  ]);

  useEffect(() => {
    fetchSubscriptionPlans()
      .then((rows) => {
        const active = rows
          .filter((row) => row.isActive !== false && row.code)
          .map((row) => ({ code: row.code, label: row.label || row.code }));
        if (active.length > 0) setPlanOptions(active);
      })
      .catch(() => {});
  }, []);
  const [tenantIdPreviewLoading, setTenantIdPreviewLoading] = useState(false);
  const [tenantSequencePreview, setTenantSequencePreview] = useState(
    formatTenantIdSequence(TENANT_ID_FIRST_SEQUENCE),
  );
  const [tenantIdPreviewError, setTenantIdPreviewError] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, FieldElement>>({});
  const prefixDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerRef = (name: string) => (el: FieldElement | null) => {
    if (el) fieldRefs.current[name] = el;
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    const field = first ? fieldRefs.current[first] : undefined;
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setTimeout(() => fieldRefs.current[first]?.focus(), 100);
    }
  };

  const onChange = (name: keyof OnboardingFieldValues, value: string | boolean) => {
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setDraftField = <K extends keyof OnboardingSiteProvisionDraft>(
    key: K,
    value: OnboardingSiteProvisionDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const refreshTenantIdPreview = useCallback(async (rawPrefix: string) => {
    const normalized = normalizeTenantIdPrefix(rawPrefix);
    const prefixError = getTenantIdPrefixValidationError(rawPrefix);
    if (!normalized || prefixError) {
      setTenantSequencePreview(formatTenantIdSequence(TENANT_ID_FIRST_SEQUENCE));
      setDraft((prev) => ({ ...prev, tenantId: '' }));
      setTenantIdPreviewError(prefixError);
      setTenantIdPreviewLoading(false);
      return;
    }

    setTenantIdPreviewLoading(true);
    setTenantIdPreviewError(null);
    try {
      const preview = await previewNextTenantIdServer(normalized);
      if (!preview) {
        setTenantIdPreviewError('Could not generate tenant ID. Check the prefix and try again.');
        setDraft((prev) => ({ ...prev, tenantId: '' }));
        return;
      }
      setTenantSequencePreview(preview.formattedSequence);
      setDraft((prev) => ({ ...prev, tenantPrefix: normalized, tenantId: preview.tenantId }));
    } catch (error) {
      console.error('[NewOnboardingRequest] Failed to preview tenant ID:', error);
      setTenantIdPreviewError('Could not load the next tenant number. Try again.');
    } finally {
      setTenantIdPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (prefixDebounceRef.current) clearTimeout(prefixDebounceRef.current);
    prefixDebounceRef.current = setTimeout(() => {
      void refreshTenantIdPreview(draft.tenantPrefix);
    }, draft.tenantPrefix.trim() ? 350 : 0);
    return () => {
      if (prefixDebounceRef.current) clearTimeout(prefixDebounceRef.current);
    };
  }, [draft.tenantPrefix, refreshTenantIdPreview]);

  const onSelectExistingOrganization = useCallback((org: TenantOrganizationDTO) => {
    const tid = org.tenantId?.trim() || '';
    setSourceTenantId(tid);
    setSourceOrganizationId(org.id ?? null);
    setValues((prev) => mapTenantOrganizationToOnboardingFields(org, prev));
    const suggested = suggestTenantIdPrefixFromName(org.organizationName || '');
    setDraft((prev) => ({
      ...prev,
      sourceTenantId: tid,
      sourceOrganizationId: org.id ?? null,
      tenantPrefix: suggested,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.organizationName;
      delete next.sourceTenantId;
      delete next.contactEmail;
      delete next.contactFirstName;
      delete next.contactLastName;
      delete next.contactPhone;
      return next;
    });
  }, []);

  const onClearExistingOrganization = useCallback(() => {
    setSourceTenantId('');
    setSourceOrganizationId(null);
    // Keep organizationName — the combobox owns search text via onChangeName.
    setValues((prev) => ({
      ...prev,
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      zipCode: '',
      country: 'United States',
    }));
    setDraft((prev) => ({
      ...prev,
      sourceTenantId: '',
      sourceOrganizationId: null,
    }));
  }, []);

  const onBlurField = (name: keyof OnboardingFieldValues) => {
    const { errors: errs } = validateOnboardingSubmit(
      { ...values },
      { requireContactDetails: false, skipCrmFieldValidation: true }
    );
    setErrors((prev) => {
      const next = { ...prev };
      if (errs[name]) next[name] = errs[name];
      else delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaveError(null);

    const errs: Record<string, string> = {};
    if (!sourceTenantId.trim() || sourceOrganizationId == null) {
      errs.sourceTenantId =
        'Select an existing organization from the list (create one under Organizations first if needed).';
      errs.organizationName = errs.sourceTenantId;
    } else if (!values.contactEmail?.trim()) {
      errs.sourceTenantId =
        'Selected organization has no contact email. Update it under Organizations, then select it again.';
      errs.organizationName = errs.sourceTenantId;
    }
    const prefixError = getTenantIdPrefixValidationError(draft.tenantPrefix);
    if (prefixError) {
      errs.tenantPrefix = prefixError;
    }
    if (!draft.tenantId.trim()) {
      errs.tenantId = 'Generated Tenant ID is required — enter a valid name prefix.';
    }

    const { errors: fieldErrs } = validateOnboardingSubmit(
      { ...values },
      { requireContactDetails: false, skipCrmFieldValidation: true }
    );
    // organizationName is enforced via sourceTenantId selection above.
    delete fieldErrs.organizationName;
    Object.assign(errs, fieldErrs);

    if (Object.keys(errs).length > 0) {
      flushSync(() => {
        setErrors(errs);
        setShowErrors(true);
      });
      scrollToFirstError(errs);
      return;
    }
    setErrors({});
    setShowErrors(false);
    setSaving(true);
    const result = await createManualOnboardingRequestServer({
      ...values,
      sourceOrganizationId,
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    if (result.data.id) {
      rememberOnboardingSourceTenant(result.data.id, sourceTenantId);
      rememberOnboardingSiteDraft(result.data.id, {
        ...draft,
        sourceTenantId,
        sourceOrganizationId,
      });
    }
    router.push(`/admin/onboarding-requests/${result.data.id}`);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8" style={{ paddingTop: '180px' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNavigation currentPage="onboarding-requests" />
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow mt-8 p-6 space-y-6">
          <div>
            <AdminBackButton href="/admin/onboarding-requests" label="Back to onboarding requests" />
            <div className="flex items-start justify-between gap-3 mt-2">
              <h1 className="text-2xl font-bold text-gray-900">Add onboarding request</h1>
              <EventFormHelpTooltip
                fieldName="onboarding-org-required"
                title="Organization ID required first"
                customContent={
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Create the company under <strong>Organizations</strong> first (contact and
                    address live there). On this page, <strong>select</strong> that organization,
                    then provision the website Tenant ID / hostname. Approve creates the site Tenant
                    ID and can add it to that organization&apos;s portfolio.
                  </p>
                }
              />
            </div>
            <p className="text-gray-600 mt-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
              Select an existing company organization (contact and address already live there). Then
              set the website Tenant ID prefix, domain, site type, branding, and optional
              subscription details. The request stays PENDING until you approve it on the review
              screen.
            </p>
          </div>

          <OnboardingRequestFields
            values={values}
            errors={errors}
            onChange={onChange}
            onBlurField={onBlurField}
            registerRef={registerRef}
            onSelectExistingOrganization={onSelectExistingOrganization}
            onClearExistingOrganization={onClearExistingOrganization}
            requireContactDetails={false}
            hideCrmFields
            selectExistingOnly
            tenantIdForLogoUpload={draft.tenantId}
          />

          {/* Site / Tenant provisioning (saved in session draft for approve) */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Website Tenant ID &amp; subscription</h2>
            <p className="text-sm text-gray-600">
              These values prefill the approve screen. The real Tenant ID is created when you approve
              the request. Selecting an organization above suggests a name prefix; once the Tenant ID
              appears, optional logo upload above becomes available.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tenantPrefix" className="block text-sm font-medium text-gray-700">
                  Name prefix (you supply) *
                </label>
                <input
                  ref={registerRef('tenantPrefix')}
                  id="tenantPrefix"
                  type="text"
                  value={draft.tenantPrefix}
                  onChange={(e) =>
                    setDraftField('tenantPrefix', sanitizeTenantIdPrefixInput(e.target.value))
                  }
                  maxLength={TENANT_ID_PREFIX_MAX_LENGTH + 8}
                  className={onboardingInputClass(!!errors.tenantPrefix || !!tenantIdPreviewError)}
                  placeholder="e.g., ford_motors"
                  autoComplete="off"
                />
                {(errors.tenantPrefix || tenantIdPreviewError) && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.tenantPrefix || tenantIdPreviewError}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Prefix is required. Max {TENANT_ID_PREFIX_MAX_LENGTH} characters after normalize.
                </p>
              </div>
              <div>
                <label htmlFor="tenantSequence" className="block text-sm font-medium text-gray-700">
                  Sequence number (auto-generated)
                </label>
                <input
                  id="tenantSequence"
                  type="text"
                  readOnly
                  value={tenantIdPreviewLoading ? 'Loading…' : tenantSequencePreview}
                  className="mt-1 block w-full border border-gray-300 rounded-xl bg-gray-50 text-gray-700 px-4 py-3 text-base font-mono"
                />
              </div>
              <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Generated Tenant ID:</span>{' '}
                  <span className="font-mono">{draft.tenantId || '—'}</span>
                </p>
                {errors.tenantId && (
                  <p className="text-red-500 text-sm mt-1">{errors.tenantId}</p>
                )}
              </div>

              <div>
                <label htmlFor="subscriptionPlan" className="block text-sm font-medium text-gray-700">
                  Subscription Plan
                </label>
                <select
                  id="subscriptionPlan"
                  value={draft.subscriptionPlan}
                  onChange={(e) => setDraftField('subscriptionPlan', e.target.value)}
                  className={onboardingInputClass()}
                >
                  <option value="">Select Plan</option>
                  {planOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                  {draft.subscriptionPlan && !planOptions.some((option) => option.code === draft.subscriptionPlan) && (
                    <option value={draft.subscriptionPlan}>{draft.subscriptionPlan}</option>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="subscriptionStatus" className="block text-sm font-medium text-gray-700">
                  Subscription Status
                </label>
                <select
                  id="subscriptionStatus"
                  value={draft.subscriptionStatus}
                  onChange={(e) => setDraftField('subscriptionStatus', e.target.value)}
                  className={onboardingInputClass()}
                >
                  <option value="">Select Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label htmlFor="subscriptionStartDate" className="block text-sm font-medium text-gray-700">
                  Subscription Start Date
                </label>
                <input
                  id="subscriptionStartDate"
                  type="date"
                  value={draft.subscriptionStartDate}
                  onChange={(e) => setDraftField('subscriptionStartDate', e.target.value)}
                  className={onboardingInputClass()}
                />
              </div>
              <div>
                <label htmlFor="subscriptionEndDate" className="block text-sm font-medium text-gray-700">
                  Subscription End Date
                </label>
                <input
                  id="subscriptionEndDate"
                  type="date"
                  value={draft.subscriptionEndDate}
                  onChange={(e) => setDraftField('subscriptionEndDate', e.target.value)}
                  className={onboardingInputClass()}
                />
              </div>
              <div>
                <label htmlFor="monthlyFeeUsd" className="block text-sm font-medium text-gray-700">
                  Monthly Fee (USD)
                </label>
                <input
                  id="monthlyFeeUsd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.monthlyFeeUsd}
                  onChange={(e) => setDraftField('monthlyFeeUsd', e.target.value)}
                  className={onboardingInputClass()}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="stripeCustomerId" className="block text-sm font-medium text-gray-700">
                  Stripe Customer ID
                </label>
                <input
                  id="stripeCustomerId"
                  type="text"
                  value={draft.stripeCustomerId}
                  onChange={(e) => setDraftField('stripeCustomerId', e.target.value)}
                  className={onboardingInputClass()}
                  placeholder="cus_xxxxxxxxxxxxx"
                />
              </div>
            </div>
          </div>

          {showErrors && errorCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following {errorCount} error{errorCount !== 1 ? 's' : ''}:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg" role="alert">
              <p className="text-sm font-medium text-red-700">{saveError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-semibold text-green-700">{saving ? 'Saving...' : 'Save request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
