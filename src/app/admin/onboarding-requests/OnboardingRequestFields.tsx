'use client';

import { useRef, useState } from 'react';
import { DOMAIN_OWNERSHIP_OPTIONS, onboardingInputClass } from '@/lib/onboarding/onboardingShared';
import { useRetailerTypeOptions } from '@/lib/onboarding/useRetailerTypeOptions';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import { uploadTenantLogoClient } from '@/app/admin/tenant-management/settings/ApiServerActions';
import OnboardingOrganizationNameCombobox from './OnboardingOrganizationNameCombobox';

export { onboardingInputClass };

/** Editable customer-facing fields of an onboarding request (string values; booleans as checkboxes). */
export interface OnboardingFieldValues {
  organizationName: string;
  requestedHostname: string;
  siteType: string;
  domainOwnership: string;
  description: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  wantsPayments: boolean;
  customerNotes: string;
}

export const EMPTY_ONBOARDING_FIELDS: OnboardingFieldValues = {
  organizationName: '',
  requestedHostname: '',
  siteType: '',
  domainOwnership: '',
  description: '',
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
  primaryColor: '',
  secondaryColor: '',
  logoUrl: '',
  wantsPayments: false,
  customerNotes: '',
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface Props {
  values: OnboardingFieldValues;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (name: keyof OnboardingFieldValues, value: string | boolean) => void;
  onBlurField?: (name: keyof OnboardingFieldValues) => void;
  registerRef?: (name: string) => (el: FieldElement | null) => void;
  /** Called when the admin picks an existing tenant organization from typeahead. */
  onSelectExistingOrganization?: (org: TenantOrganizationDTO) => void;
  onClearExistingOrganization?: () => void;
  /** When true (no existing org selected), mark contact first/last/phone as required. */
  requireContactDetails?: boolean;
  /**
   * Hide contact/address CRM fields (already on the Organization record).
   * Values are still held in state when an org is selected for API submit.
   */
  hideCrmFields?: boolean;
  /** Require picking an existing organization — no free-typed “new org” name. */
  selectExistingOnly?: boolean;
  /**
   * Provisional or assigned website Tenant ID — used so optional logo upload
   * is stored under the tenant being provisioned (tenant_settings.logoImageUrl path).
   */
  tenantIdForLogoUpload?: string;
}

const CRM_FIELD_NAMES = new Set<keyof OnboardingFieldValues>([
  'contactFirstName',
  'contactLastName',
  'contactEmail',
  'contactPhone',
  'addressLine1',
  'addressLine2',
  'city',
  'stateProvince',
  'zipCode',
  'country',
]);

const TEXT_FIELDS: {
  name: keyof OnboardingFieldValues;
  label: string;
  span?: boolean;
  required?: boolean;
  contactRequired?: boolean;
  placeholder?: string;
}[] = [
  { name: 'requestedHostname', label: 'Requested domain', required: true, placeholder: 'www.example.org' },
  { name: 'contactFirstName', label: 'Contact first name', contactRequired: true },
  { name: 'contactLastName', label: 'Contact last name', contactRequired: true },
  { name: 'contactEmail', label: 'Contact email', required: true },
  { name: 'contactPhone', label: 'Contact phone', contactRequired: true },
  { name: 'addressLine1', label: 'Address line 1', span: true },
  { name: 'addressLine2', label: 'Address line 2', span: true },
  { name: 'city', label: 'City' },
  { name: 'stateProvince', label: 'State / province' },
  { name: 'zipCode', label: 'ZIP / postal code' },
  { name: 'country', label: 'Country' },
  { name: 'primaryColor', label: 'Primary color', placeholder: '#1E40AF' },
  { name: 'secondaryColor', label: 'Secondary color', placeholder: '#F59E0B' },
];

export default function OnboardingRequestFields({
  values,
  errors,
  disabled,
  onChange,
  onBlurField,
  registerRef,
  onSelectExistingOrganization,
  onClearExistingOrganization,
  requireContactDetails = false,
  hideCrmFields = false,
  selectExistingOnly = false,
  tenantIdForLogoUpload,
}: Props) {
  const siteTypeOptions = useRetailerTypeOptions('server');
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const handle = (e: React.ChangeEvent<FieldElement>) => {
    const { name, value, type } = e.target;
    onChange(name as keyof OnboardingFieldValues, type === 'checkbox' ? (e.target as HTMLInputElement).checked : value);
  };

  const visibleTextFields = hideCrmFields
    ? TEXT_FIELDS.filter((f) => !CRM_FIELD_NAMES.has(f.name))
    : TEXT_FIELDS;

  const canUploadLogo = Boolean(tenantIdForLogoUpload?.trim()) && !disabled && !uploadingLogo;

  const processLogoUpload = async (file: File) => {
    const tenantId = tenantIdForLogoUpload?.trim();
    if (!file || !tenantId || disabled) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoUploadError('File size must be less than 10MB');
      return;
    }

    setUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const result = await uploadTenantLogoClient(file, tenantId);
      if (!result.url) {
        throw new Error('Upload succeeded but no logo URL was returned');
      }
      onChange('logoUrl', result.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      setLogoUploadError(message);
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (!canUploadLogo) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processLogoUpload(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <OnboardingOrganizationNameCombobox
        value={values.organizationName}
        error={errors.organizationName || errors.sourceTenantId}
        disabled={disabled}
        onChangeName={(name) => onChange('organizationName', name)}
        onSelectExisting={(org) => onSelectExistingOrganization?.(org)}
        onClearExisting={onClearExistingOrganization}
        registerRef={registerRef?.('organizationName')}
        onBlurField={() => onBlurField?.('organizationName')}
        selectExistingOnly={selectExistingOnly}
      />

      {visibleTextFields.map((f) => {
        const showRequired = f.required || (f.contactRequired && requireContactDetails);
        return (
        <div key={f.name} className={f.span ? 'md:col-span-2' : undefined}>
          <label htmlFor={`onb-${f.name}`} className="block text-sm font-medium text-gray-700">
            {f.label}
            {showRequired ? ' *' : ''}
          </label>
          <input
            ref={registerRef?.(f.name)}
            id={`onb-${f.name}`}
            name={f.name}
            type="text"
            placeholder={f.placeholder}
            value={values[f.name] as string}
            onChange={handle}
            onBlur={() => onBlurField?.(f.name)}
            disabled={disabled}
            className={onboardingInputClass(!!errors[f.name])}
          />
          {errors[f.name] && <div className="text-red-500 text-sm mt-1">{errors[f.name]}</div>}
        </div>
        );
      })}

      <div>
        <label htmlFor="onb-siteType" className="block text-sm font-medium text-gray-700">
          Site type *
        </label>
        <select
          ref={registerRef?.('siteType')}
          id="onb-siteType"
          name="siteType"
          value={values.siteType}
          onChange={handle}
          onBlur={() => onBlurField?.('siteType')}
          disabled={disabled}
          className={onboardingInputClass(!!errors.siteType)}
        >
          <option value="">Select site type</option>
          {siteTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {values.siteType ? (
          <p className="text-xs text-gray-500 mt-1">
            {siteTypeOptions.find((o) => o.value === values.siteType)?.hint}
          </p>
        ) : null}
        {errors.siteType && <div className="text-red-500 text-sm mt-1">{errors.siteType}</div>}
      </div>
      <div>
        <label htmlFor="onb-domainOwnership" className="block text-sm font-medium text-gray-700">
          Domain ownership *
        </label>
        <select
          ref={registerRef?.('domainOwnership')}
          id="onb-domainOwnership"
          name="domainOwnership"
          value={values.domainOwnership}
          onChange={handle}
          onBlur={() => onBlurField?.('domainOwnership')}
          disabled={disabled}
          className={onboardingInputClass(!!errors.domainOwnership)}
        >
          <option value="">Select domain ownership</option>
          {DOMAIN_OWNERSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {errors.domainOwnership && (
          <div className="text-red-500 text-sm mt-1">{errors.domainOwnership}</div>
        )}
      </div>

      {/* Optional tenant logo — purple upload styling (icons_buttons / media gallery patterns) */}
      <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-violet-50 to-purple-50 border-2 border-purple-300/50 shadow-md">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at top left, rgba(139, 92, 246, 0.12), transparent 55%)',
          }}
        />
        <div className="relative px-5 py-6 sm:px-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-purple-900">Tenant logo (optional)</h3>
              <p className="text-sm text-purple-800/80 mt-1 leading-relaxed">
                Associated with the <span className="font-semibold">new website tenant</span> (not the
                organization CRM record). Used for satellite sign-in branding and tenant settings.
                After a Tenant ID is generated (name prefix section), upload here or paste a URL.
              </p>
            </div>
          </div>

          {values.logoUrl ? (
            <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-purple-200 bg-white shadow-sm p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={values.logoUrl}
                alt="Tenant logo preview"
                className="max-w-full h-auto max-h-48 rounded-lg object-contain"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange('logoUrl', '')}
                  className="absolute top-3 right-3 flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                  title="Remove logo"
                  aria-label="Remove logo"
                >
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                disabled={!canUploadLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processLogoUpload(file);
                }}
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (canUploadLogo) setIsDraggingLogo(true);
                }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={handleLogoDrop}
                onClick={() => canUploadLogo && logoFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 w-full ${
                  isDraggingLogo
                    ? 'border-purple-500 bg-purple-100 scale-[1.01]'
                    : 'border-purple-300 bg-white/70 hover:border-purple-500 hover:bg-purple-50/80'
                } ${canUploadLogo ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div
                  className={`flex-shrink-0 w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center transition-all duration-300 ${
                    isDraggingLogo ? 'bg-purple-200 scale-110' : 'bg-purple-100'
                  }`}
                >
                  <svg
                    className={`w-10 h-10 ${isDraggingLogo ? 'text-purple-600' : 'text-purple-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <p
                  className={`text-sm font-medium ${
                    isDraggingLogo ? 'text-purple-700' : 'text-purple-800'
                  }`}
                >
                  {uploadingLogo
                    ? 'Uploading...'
                    : isDraggingLogo
                      ? 'Drop image here'
                      : tenantIdForLogoUpload?.trim()
                        ? 'Click to upload or drag and drop tenant logo'
                        : 'Generate a Tenant ID (name prefix) first to enable upload'}
                </p>
                <p className="text-xs text-purple-600/80 mt-1">PNG, JPG, GIF, WebP — max 10MB</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="onb-logoUrl" className="block text-sm font-medium text-purple-900">
              Logo URL
            </label>
            <input
              ref={registerRef?.('logoUrl')}
              id="onb-logoUrl"
              name="logoUrl"
              type="text"
              placeholder="https://... (optional — filled by upload)"
              value={values.logoUrl}
              onChange={handle}
              onBlur={() => onBlurField?.('logoUrl')}
              disabled={disabled}
              className={onboardingInputClass(!!errors.logoUrl)}
            />
            {errors.logoUrl && <div className="text-red-500 text-sm mt-1">{errors.logoUrl}</div>}
            {logoUploadError && <div className="text-red-500 text-sm mt-1">{logoUploadError}</div>}
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="onb-description" className="block text-sm font-medium text-gray-700">
          Tenant / site description
        </label>
        <p className="text-xs text-gray-500 mt-0.5 mb-1">
          Describes this website tenant only — not copied from the organization CRM record.
        </p>
        <textarea
          id="onb-description"
          name="description"
          rows={3}
          value={values.description}
          onChange={handle}
          disabled={disabled}
          placeholder="What this site is for (audience, purpose, location)…"
          className={onboardingInputClass()}
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="onb-customerNotes" className="block text-sm font-medium text-gray-700">Customer notes</label>
        <textarea id="onb-customerNotes" name="customerNotes" rows={3} value={values.customerNotes} onChange={handle} disabled={disabled} className={onboardingInputClass()} />
      </div>
      <label className="md:col-span-2 flex items-center gap-3 text-gray-800">
        <input
          type="checkbox"
          name="wantsPayments"
          checked={values.wantsPayments}
          onChange={handle}
          disabled={disabled}
          className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
        />
        <span>Wants online payments (tickets / donations)</span>
      </label>
    </div>
  );
}
