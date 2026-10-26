'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { FaSave, FaBan, FaUpload, FaEye } from 'react-icons/fa';
import type { TenantOrganizationDTO, TenantOrganizationFormDTO } from '@/app/admin/tenant-management/types';
import {
  getTenantIdPrefixValidationError,
  normalizeTenantIdPrefix,
  sanitizeTenantIdPrefixInput,
  suggestTenantIdPrefixFromName,
  TENANT_ID_PREFIX_MAX_LENGTH,
  isValidGeneratedTenantId,
  formatTenantIdSequence,
  TENANT_ID_FIRST_SEQUENCE,
} from '@/lib/tenantIdGeneration';
import { getTenantDomainFormatError, normalizeTenantDomain } from '@/lib/tenantDomainValidation';
import { getWebsiteUrlFormatError, normalizeWebsiteUrl } from '@/lib/websiteUrlValidation';
import { previewNextTenantIdServer } from '@/app/admin/tenant-management/organizations/tenantIdServerActions';
import { isTenantOrganizationDomainAvailableServer } from '@/app/admin/tenant-management/organizations/domainServerActions';
import AddressFieldsSection from '@/components/admin/AddressFieldsSection';
import DescriptionTextareaField from '@/components/admin/DescriptionTextareaField';
import { useAdminTenantId } from '@/app/admin/AdminTenantContext';
import { useRetailerTypeOptions } from '@/lib/onboarding/useRetailerTypeOptions';

interface TenantOrganizationFormProps {
  initialData?: TenantOrganizationDTO;
  onSubmit: (data: TenantOrganizationFormDTO) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  mode: 'create' | 'edit';
  /** Platform super admin may change an existing tenant ID. Regular admins see it read-only. */
  canEditTenantId?: boolean;
}

export default function TenantOrganizationForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode,
  canEditTenantId = false,
}: TenantOrganizationFormProps) {
  const router = useRouter();
  const tenantId = useAdminTenantId();
  const retailerOptions = useRetailerTypeOptions('server', tenantId);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [tenantIdPrefix, setTenantIdPrefix] = useState('');
  const [tenantSequencePreview, setTenantSequencePreview] = useState<string>(
    formatTenantIdSequence(TENANT_ID_FIRST_SEQUENCE),
  );
  const [tenantIdPreviewLoading, setTenantIdPreviewLoading] = useState(mode === 'create');
  const [tenantIdPreviewError, setTenantIdPreviewError] = useState<string | null>(null);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [domainAvailabilityError, setDomainAvailabilityError] = useState<string | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);
  const prefixDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<TenantOrganizationFormDTO>({
    defaultValues: {
      tenantId: initialData?.tenantId || '',
      organizationName: initialData?.organizationName || '',
      domain: initialData?.domain || '',
      primaryColor: initialData?.primaryColor || '#3B82F6',
      secondaryColor: initialData?.secondaryColor || '#10B981',
      logoUrl: initialData?.logoUrl || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
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
    }
  });

  // Watch form values for real-time updates
  const watchedValues = watch();

  const domainField = register('domain', {
    required: 'Website / domain is required',
    validate: (value) => {
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

  // Set logo preview when initial data changes
  useEffect(() => {
    if (initialData?.logoUrl) {
      setLogoPreview(initialData.logoUrl);
    }
  }, [initialData]);

  const refreshTenantIdPreview = useCallback(async (rawPrefix: string) => {
    if (mode !== 'create') return;

    const normalized = normalizeTenantIdPrefix(rawPrefix);
    const prefixError = getTenantIdPrefixValidationError(rawPrefix);
    if (!normalized || prefixError) {
      setTenantSequencePreview(formatTenantIdSequence(TENANT_ID_FIRST_SEQUENCE));
      setValue('tenantId', '');
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
        setValue('tenantId', '');
        return;
      }
      setTenantSequencePreview(preview.formattedSequence);
      setValue('tenantId', preview.tenantId, { shouldValidate: true });
    } catch (error) {
      console.error('[TenantOrganizationForm] Failed to preview tenant ID:', error);
      setTenantIdPreviewError('Could not load the next tenant number. Try again.');
    } finally {
      setTenantIdPreviewLoading(false);
    }
  }, [mode, setValue]);

  useEffect(() => {
    if (mode !== 'create') return;

    if (prefixDebounceRef.current) {
      clearTimeout(prefixDebounceRef.current);
    }

    prefixDebounceRef.current = setTimeout(() => {
      void refreshTenantIdPreview(tenantIdPrefix);
    }, tenantIdPrefix.trim() ? 350 : 0);

    return () => {
      if (prefixDebounceRef.current) {
        clearTimeout(prefixDebounceRef.current);
      }
    };
  }, [tenantIdPrefix, mode, refreshTenantIdPreview]);

  const validateDomainAvailability = useCallback(
    async (rawDomain: string): Promise<string | null> => {
      const formatError = getTenantDomainFormatError(rawDomain);
      if (formatError) {
        return formatError;
      }

      setDomainChecking(true);
      try {
        const result = await isTenantOrganizationDomainAvailableServer(
          rawDomain,
          mode === 'edit' ? initialData?.id : undefined,
        );
        if (!result.available) {
          return result.message || 'This domain is already registered.';
        }
        return null;
      } finally {
        setDomainChecking(false);
      }
    },
    [initialData?.id, mode],
  );

  const handleDomainBlur = async (rawDomain: string) => {
    const normalized = normalizeTenantDomain(rawDomain);
    if (normalized !== rawDomain.trim()) {
      setValue('domain', normalized, { shouldValidate: true });
    }
    const error = await validateDomainAvailability(normalized || rawDomain);
    setDomainAvailabilityError(error);
  };

  const handleWebsiteUrlBlur = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    const normalized = normalizeWebsiteUrl(trimmed);
    if (normalized !== trimmed) {
      setValue('websiteUrl', normalized, { shouldValidate: true });
    }
  };

  // Handle logo file upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onFormSubmit = async (data: TenantOrganizationFormDTO) => {
    setFormSubmitError(null);
    try {
      let submitData = { ...data };

      if (mode === 'create') {
        const prefixError = getTenantIdPrefixValidationError(tenantIdPrefix);
        if (prefixError) {
          setTenantIdPreviewError(prefixError);
          return;
        }
        const normalizedPrefix = normalizeTenantIdPrefix(tenantIdPrefix);
        const preview = await previewNextTenantIdServer(normalizedPrefix);
        if (!preview) {
          setTenantIdPreviewError('Could not generate tenant ID. Try again.');
          return;
        }
        submitData = { ...submitData, tenantId: preview.tenantId };
        setValue('tenantId', preview.tenantId);
      }

      const normalizedDomain = normalizeTenantDomain(submitData.domain || '');
      const domainError = await validateDomainAvailability(normalizedDomain);
      if (domainError) {
        setDomainAvailabilityError(domainError);
        setFormSubmitError(domainError);
        return;
      }

      const formData = {
        ...submitData,
        domain: normalizedDomain,
        websiteUrl: submitData.websiteUrl?.trim()
          ? normalizeWebsiteUrl(submitData.websiteUrl)
          : '',
        logoUrl: logoPreview || submitData.logoUrl || '',
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormSubmitError(
        error instanceof Error ? error.message : 'Failed to save organization. Please try again.',
      );
    }
  };

  // Color picker component
  const ColorPicker = ({
    name,
    label,
    value,
    onChange
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form
        onSubmit={handleSubmit(onFormSubmit, (formErrors) => {
          if (mode === 'create' && formErrors.tenantId) {
            setTenantIdPreviewError(
              formErrors.tenantId.message ?? 'Fix tenant ID before saving.',
            );
          }
        })}
        className="space-y-6"
      >
        {formSubmitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {formSubmitError}
          </div>
        )}
        {/* Basic Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mode === 'create' ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant ID *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Enter a short slug for the organization (letters, numbers, and underscores only; must end with a letter;
                  max {TENANT_ID_PREFIX_MAX_LENGTH} characters). The system appends the next sequence number. Example:{' '}
                  <span className="font-mono">ford_motors_1</span>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tenantIdPrefix" className="block text-xs font-medium text-gray-600 mb-1">
                      Name prefix (you supply)
                    </label>
                    <input
                      id="tenantIdPrefix"
                      type="text"
                      value={tenantIdPrefix}
                      onChange={(e) => setTenantIdPrefix(sanitizeTenantIdPrefixInput(e.target.value))}
                      onBlur={() => {
                        const trimmed = tenantIdPrefix.replace(/^_+|_+$/g, '');
                        if (trimmed !== tenantIdPrefix) {
                          setTenantIdPrefix(trimmed);
                        }
                      }}
                      maxLength={25}
                      className={`mt-1 block w-full border rounded-xl focus:ring-blue-500 px-4 py-3 text-base font-mono ${
                        tenantIdPreviewError
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-400 focus:border-blue-500'
                      }`}
                      placeholder="e.g., ford_motors"
                      autoComplete="off"
                      aria-invalid={tenantIdPreviewError ? true : undefined}
                      aria-describedby={tenantIdPreviewError ? 'tenantIdPrefix-error' : undefined}
                    />
                    {tenantIdPreviewError && (
                      <p id="tenantIdPrefix-error" className="mt-1 text-sm text-red-600">
                        {tenantIdPreviewError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="tenantSequenceNumber" className="block text-xs font-medium text-gray-600 mb-1">
                      Sequence number (auto-generated)
                    </label>
                    <input
                      id="tenantSequenceNumber"
                      type="text"
                      readOnly
                      value={tenantIdPreviewLoading ? 'Loading…' : tenantSequencePreview}
                      className="mt-1 block w-full border border-gray-300 rounded-xl bg-gray-50 text-gray-700 px-4 py-3 text-base font-mono"
                      aria-live="polite"
                    />
                  </div>
                </div>
                <input
                  type="hidden"
                  {...register('tenantId', {
                    required: 'Tenant ID is required',
                    validate: (value) =>
                      isValidGeneratedTenantId(value || '')
                        ? true
                        : 'Tenant ID must be prefix plus a numeric suffix (e.g. ford_motors_1)',
                  })}
                />
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Generated Tenant ID:</span>{' '}
                    <span className="font-mono">{watchedValues.tenantId || '—'}</span>
                  </p>
                </div>
                {errors.tenantId && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant ID
                </label>
                <input
                  type="text"
                  readOnly={!canEditTenantId}
                  {...register('tenantId', {
                    validate: (value) => {
                      if (!canEditTenantId) return true;
                      const trimmed = (value || '').trim();
                      if (!trimmed) return 'Tenant ID is required';
                      if (trimmed.length > 255) return 'Tenant ID must be 255 characters or less';
                      return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(trimmed)
                        ? true
                        : 'Use lowercase letters, numbers, and underscores (e.g. tenant_demo_002)';
                    },
                  })}
                  className={`mt-1 block w-full border rounded-xl px-4 py-3 text-base font-mono ${
                    canEditTenantId
                      ? 'border-gray-400 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500'
                      : 'border-gray-300 bg-gray-50 text-gray-700'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {canEditTenantId
                    ? 'Changing the Tenant ID updates every record that belongs to this tenant. Only a platform super admin can do this.'
                    : 'Tenant ID can be changed only by a platform super admin.'}
                </p>
                {errors.tenantId && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
                )}
              </div>
            )}

            <div className={mode === 'create' ? 'md:col-span-2' : ''}>
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
                  onChange: (e) => {
                    if (mode === 'create' && !tenantIdPrefix.trim()) {
                      setTenantIdPrefix(suggestTenantIdPrefixFromName(e.target.value));
                    }
                  },
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., Ford Motors"
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website / Domain *
              </label>
              <input
                type="text"
                {...domainField}
                onChange={(e) => {
                  domainField.onChange(e);
                  setDomainAvailabilityError(null);
                }}
                onBlur={(e) => {
                  domainField.onBlur(e);
                  void handleDomainBlur(e.target.value);
                }}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="e.g., malayalees-us.org"
              />
              {domainChecking && (
                <p className="mt-1 text-sm text-blue-600">Checking domain availability…</p>
              )}
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
              )}
              {!errors.domain && domainAvailabilityError && (
                <p className="mt-1 text-sm text-red-600">{domainAvailabilityError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be unique across all organizations. Protocol (https://) and www are optional.
              </p>
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
                Contact Phone
              </label>
              <input
                type="tel"
                {...register('contactPhone', {
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Type
              </label>
              <select
                {...register('siteType')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              >
                {retailerOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                {watchedValues.siteType && !retailerOptions.some((option) => option.value === watchedValues.siteType) && (
                  <option value={watchedValues.siteType}>{watchedValues.siteType}</option>
                )}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Changing the site type re-applies the matching homepage section presets to tenant settings
              </p>
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
          <AddressFieldsSection register={register} errors={errors} />
        </div>

        {/* Website URL (optional) */}
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
              Optional public website link (separate from the required domain field above).
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Branding</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorPicker
              name="primaryColor"
              label="Primary Color"
              value={watchedValues.primaryColor || '#3B82F6'}
              onChange={(value) => setValue('primaryColor', value)}
            />

            <ColorPicker
              name="secondaryColor"
              label="Secondary Color"
              value={watchedValues.secondaryColor || '#10B981'}
              onChange={(value) => setValue('secondaryColor', value)}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 cursor-pointer"
                title="Upload Logo"
                aria-label="Upload Logo"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <FaUpload className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-blue-700">Upload Logo</span>
              </label>
              {logoPreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 object-contain border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setLogoFile(null);
                      setValue('logoUrl', '');
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Recommended size: 200x200px or larger. Supported formats: PNG, JPG, SVG
            </p>
          </div>
        </div>

        {/* Subscription Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Plan
              </label>
              <select
                {...register('subscriptionPlan')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              >
                <option value="">Select Plan</option>
                <option value="BASIC">Basic</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Status
              </label>
              <select
                {...register('subscriptionStatus')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              >
                <option value="">Select Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Start Date
              </label>
              <input
                type="date"
                {...register('subscriptionStartDate')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription End Date
              </label>
              <input
                type="date"
                {...register('subscriptionEndDate')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Fee (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('monthlyFeeUsd', {
                  min: {
                    value: 0,
                    message: 'Monthly fee must be greater than or equal to 0'
                  }
                })}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="0.00"
              />
              {errors.monthlyFeeUsd && (
                <p className="mt-1 text-sm text-red-600">{errors.monthlyFeeUsd.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stripe Customer ID
              </label>
              <input
                type="text"
                {...register('stripeCustomerId')}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="cus_xxxxxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('isActive')}
              className="custom-checkbox"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Active Organization
            </label>
          </div>
          <p className="mt-1 text-sm text-gray-500">
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
