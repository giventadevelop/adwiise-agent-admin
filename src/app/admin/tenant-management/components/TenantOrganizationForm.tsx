'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { FaSave, FaBan } from 'react-icons/fa';
import type { TenantOrganizationDTO, TenantOrganizationFormDTO } from '@/app/admin/tenant-management/types';
import { getTenantDomainFormatError, normalizeTenantDomain } from '@/lib/tenantDomainValidation';
import { getWebsiteUrlFormatError, normalizeWebsiteUrl } from '@/lib/websiteUrlValidation';
import { isTenantOrganizationDomainAvailableServer } from '@/app/admin/tenant-management/organizations/domainServerActions';
import AddressFieldsSection from '@/components/admin/AddressFieldsSection';
import DescriptionTextareaField from '@/components/admin/DescriptionTextareaField';
import EventFormHelpTooltip from '@/components/EventFormHelpTooltip';

interface TenantOrganizationFormProps {
  initialData?: TenantOrganizationDTO;
  onSubmit: (data: TenantOrganizationFormDTO) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  mode: 'create' | 'edit';
}

export default function TenantOrganizationForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode,
}: TenantOrganizationFormProps) {
  const router = useRouter();
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<TenantOrganizationFormDTO>({
    defaultValues: {
      organizationName: initialData?.organizationName || '',
      domain: initialData?.domain || '',
      primaryColor: initialData?.primaryColor || '#3B82F6',
      secondaryColor: initialData?.secondaryColor || '#10B981',
      logoUrl: initialData?.logoUrl || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
      contactPersonName: initialData?.contactPersonName || '',
      subscriptionPlan: initialData?.subscriptionPlan || '',
      subscriptionStatus: initialData?.subscriptionStatus || '',
      subscriptionStartDate: initialData?.subscriptionStartDate || '',
      subscriptionEndDate: initialData?.subscriptionEndDate || '',
      monthlyFeeUsd: initialData?.monthlyFeeUsd || 0,
      stripeCustomerId: initialData?.stripeCustomerId || '',
      isActive: initialData?.isActive ?? true,
      description: initialData?.description || '',
      addressLine1: initialData?.addressLine1 || '',
      addressLine2: initialData?.addressLine2 || '',
      city: initialData?.city || '',
      stateProvince: initialData?.stateProvince || '',
      zipCode: initialData?.zipCode || '',
      country: initialData?.country || '',
      websiteUrl: initialData?.websiteUrl || '',
      siteType: initialData?.siteType || 'EVENT_ORG',
      retailerTypeCode: initialData?.retailerTypeCode === 'GAS_STATION_ENT' ? 'GAS_STATION' : (initialData?.retailerTypeCode || ''),
      retailerSizeBandCode: initialData?.retailerSizeBandCode || '',
    }
  });

  // Watch form values for real-time updates
  const watchedValues = watch();

  const domainField = register('domain', {
    validate: (value) => {
      if (!(value || '').trim()) return true;
      const formatError = getTenantDomainFormatError(value || '');
      return formatError || true;
    },
  });

  const websiteUrlField = register('websiteUrl', {
    validate: (value) => {
      const formatError = getWebsiteUrlFormatError(value || '');
      return formatError || true;
    },
  });

  const validateDomainAvailability = useCallback(
    async (rawDomain: string): Promise<string | null> => {
      const formatError = getTenantDomainFormatError(rawDomain);
      if (formatError) {
        return formatError;
      }

      try {
        const result = await isTenantOrganizationDomainAvailableServer(
          rawDomain,
          mode === 'edit' ? initialData?.id : undefined,
        );
        if (!result.available) {
          return result.message || 'This domain is already registered.';
        }
        return null;
      } catch {
        return 'Could not verify domain availability. Try again.';
      }
    },
    [initialData?.id, mode],
  );

  const handleWebsiteUrlBlur = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    const normalized = normalizeWebsiteUrl(trimmed);
    if (normalized !== trimmed) {
      setValue('websiteUrl', normalized, { shouldValidate: true });
    }
  };

  // Handle form submission
  const onFormSubmit = async (data: TenantOrganizationFormDTO) => {
    setFormSubmitError(null);
    try {
      const submitData = {
        ...data,
        tenantId: undefined,
        siteType: data.siteType || 'EVENT_ORG',
        primaryColor: data.primaryColor || '#3B82F6',
        secondaryColor: data.secondaryColor || '#10B981',
      };

      const normalizedDomain = normalizeTenantDomain(submitData.domain || '');
      if (normalizedDomain) {
        const domainError = await validateDomainAvailability(normalizedDomain);
        if (domainError) {
          setFormSubmitError(domainError);
          return;
        }
      }

      const formData = {
        ...submitData,
        domain: normalizedDomain,
        websiteUrl: submitData.websiteUrl?.trim()
          ? normalizeWebsiteUrl(submitData.websiteUrl)
          : '',
        logoUrl: submitData.logoUrl || '',
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormSubmitError(
        error instanceof Error ? error.message : 'Failed to save organization. Please try again.',
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-6"
      >
        {formSubmitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {formSubmitError}
          </div>
        )}
        {/* Company CRM — Tenant ID / domain / site type / branding / subscription live on Onboarding */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Company information</h3>
            <EventFormHelpTooltip
              fieldName="org-crm-shell"
              title="Organization before Tenant ID"
              customContent={
                <p className="text-sm text-gray-700 leading-relaxed">
                  An organization is the client. Its websites are tenant settings rows, each with its own tenant id.
                  Enter the company domain here when you have one. A website id is created later on tenant settings.
                </p>
              }
            />
          </div>
          <p className="text-sm text-gray-600 mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            {mode === 'create'
              ? 'Creates the client organization. It does not create a website tenant id. Add a tenant settings row after the organization exists.'
              : 'Edit the company and its domain. Website tenant ids are edited on tenant settings.'}
          </p>

          {/* Preserve site/tenant fields on save without exposing them in the CRM UI */}
          <input type="hidden" {...register('siteType')} />
          <input type="hidden" {...register('retailerTypeCode')} />
          <input type="hidden" {...register('retailerSizeBandCode')} />
          <input type="hidden" {...register('primaryColor')} />
          <input type="hidden" {...register('secondaryColor')} />
          <input type="hidden" {...register('logoUrl')} />
          <input type="hidden" {...register('subscriptionPlan')} />
          <input type="hidden" {...register('subscriptionStatus')} />
          <input type="hidden" {...register('subscriptionStartDate')} />
          <input type="hidden" {...register('subscriptionEndDate')} />
          <input type="hidden" {...register('monthlyFeeUsd')} />
          <input type="hidden" {...register('stripeCustomerId')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                {...register('organizationName', {
                  required: 'Organization name is required',
                  maxLength: {
                    value: 255,
                    message: 'Organization name must be less than 255 characters'
                  },
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., Ford Motors"
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="domain">
                Domain
              </label>
              <input
                id="domain"
                type="text"
                {...domainField}
                onBlur={(event) => {
                  domainField.onBlur(event);
                  const trimmed = event.target.value.trim();
                  if (!trimmed) return;
                  const normalized = normalizeTenantDomain(trimmed);
                  if (normalized !== trimmed) {
                    setValue('domain', normalized, { shouldValidate: true });
                  }
                }}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="example.org"
              />
              <p className="mt-1 text-xs text-gray-500">
                The company domain. Leave it empty when the organization does not have one yet.
              </p>
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                {...register('contactEmail', {
                  required: 'Contact email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., admin@malayalees-us.org"
              />
              {errors.contactEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                {...register('contactPhone', {
                  required: 'Contact phone is required',
                  validate: (value) =>
                    (value || '').trim() ? true : 'Contact phone is required',
                  maxLength: {
                    value: 50,
                    message: 'Phone number must be less than 50 characters'
                  }
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., +1 (555) 123-4567"
              />
              {errors.contactPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact person name *
              </label>
              <input
                type="text"
                {...register('contactPersonName', {
                  required: 'Contact person name is required',
                  validate: (value) => {
                    const trimmed = (value || '').trim();
                    if (!trimmed || trimmed.toLowerCase() === 'pending') {
                      return 'Enter the contact person name';
                    }
                    return true;
                  },
                  maxLength: {
                    value: 255,
                    message: 'Contact person name must be less than 255 characters',
                  },
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., Bino Joseph"
              />
              {errors.contactPersonName && (
                <p className="mt-1 text-sm text-red-600">{errors.contactPersonName.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
          <DescriptionTextareaField
            register={register}
            currentLength={(watchedValues.description || '').length}
            error={errors.description}
          />
        </div>

        {/* Address Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
          <AddressFieldsSection
            register={register}
            errors={errors}
            requireCoreAddress
          />
        </div>

        {/* Website URL (optional public link — not the satellite hostname) */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Website</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              {...websiteUrlField}
              onBlur={(e) => {
                websiteUrlField.onBlur(e);
                handleWebsiteUrlBlur(e.target.value);
              }}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              placeholder="https://www.example.org"
            />
            {errors.websiteUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Optional public marketing link. Leave blank if the company has no website yet.
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>

          <label className="flex flex-col items-center w-fit cursor-pointer">
            <span className="relative flex items-center justify-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="custom-checkbox custom-checkbox--yellow"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="custom-checkbox-tick">
                {watchedValues.isActive && (
                  <svg
                    className="w-6 h-6 text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                  </svg>
                )}
              </span>
            </span>
            <span className="mt-2 text-sm font-semibold text-center select-none text-gray-700">
              Active Organization
            </span>
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Inactive organizations cannot be used for new events or registrations
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : router.push('/admin/tenant-management/organizations'))}
            className="flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Cancel"
            aria-label="Cancel"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
              <FaBan className="w-6 h-6 text-red-600" />
            </div>
            <span className="font-semibold text-red-700">Cancel</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title={isSubmitting || loading ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
            aria-label={isSubmitting || loading ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              {isSubmitting || loading ? (
                <FaSave className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <FaSave className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <span className="font-semibold text-blue-700">
              {isSubmitting || loading ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
