'use client';

import { DOMAIN_OWNERSHIP_OPTIONS } from '@/lib/onboarding/onboardingShared';
import { useRetailerTypeOptions } from '@/lib/onboarding/useRetailerTypeOptions';

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
  siteType: 'EVENT_ORG',
  domainOwnership: 'CUSTOMER_REGISTRAR',
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

export const onboardingInputClass = (hasError = false) =>
  `mt-1 block w-full border rounded-xl focus:ring-blue-500 px-4 py-3 text-base disabled:bg-gray-100 disabled:text-gray-600 ${
    hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-400 focus:border-blue-500'
  }`;

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface Props {
  values: OnboardingFieldValues;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (name: keyof OnboardingFieldValues, value: string | boolean) => void;
  onBlurField?: (name: keyof OnboardingFieldValues) => void;
  registerRef?: (name: string) => (el: FieldElement | null) => void;
}

const TEXT_FIELDS: { name: keyof OnboardingFieldValues; label: string; span?: boolean; required?: boolean; placeholder?: string }[] = [
  { name: 'organizationName', label: 'Organization name', required: true },
  { name: 'requestedHostname', label: 'Requested domain', required: true, placeholder: 'www.example.org' },
  { name: 'contactFirstName', label: 'Contact first name' },
  { name: 'contactLastName', label: 'Contact last name' },
  { name: 'contactEmail', label: 'Contact email', required: true },
  { name: 'contactPhone', label: 'Contact phone' },
  { name: 'addressLine1', label: 'Address line 1', span: true },
  { name: 'addressLine2', label: 'Address line 2', span: true },
  { name: 'city', label: 'City' },
  { name: 'stateProvince', label: 'State / province' },
  { name: 'zipCode', label: 'ZIP / postal code' },
  { name: 'country', label: 'Country' },
  { name: 'primaryColor', label: 'Primary color', placeholder: '#1E40AF' },
  { name: 'secondaryColor', label: 'Secondary color', placeholder: '#F59E0B' },
  { name: 'logoUrl', label: 'Logo URL', span: true, placeholder: 'https://...' },
];

export default function OnboardingRequestFields({ values, errors, disabled, onChange, onBlurField, registerRef }: Props) {
  const siteTypeOptions = useRetailerTypeOptions('server');
  const handle = (e: React.ChangeEvent<FieldElement>) => {
    const { name, value, type } = e.target;
    onChange(name as keyof OnboardingFieldValues, type === 'checkbox' ? (e.target as HTMLInputElement).checked : value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {TEXT_FIELDS.map((f) => (
        <div key={f.name} className={f.span ? 'md:col-span-2' : undefined}>
          <label htmlFor={`onb-${f.name}`} className="block text-sm font-medium text-gray-700">
            {f.label}
            {f.required ? ' *' : ''}
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
      ))}

      <div>
        <label htmlFor="onb-siteType" className="block text-sm font-medium text-gray-700">Site type</label>
        <select id="onb-siteType" name="siteType" value={values.siteType} onChange={handle} disabled={disabled} className={onboardingInputClass()}>
          {siteTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="onb-domainOwnership" className="block text-sm font-medium text-gray-700">Domain ownership</label>
        <select id="onb-domainOwnership" name="domainOwnership" value={values.domainOwnership} onChange={handle} disabled={disabled} className={onboardingInputClass()}>
          {DOMAIN_OWNERSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="onb-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="onb-description" name="description" rows={3} value={values.description} onChange={handle} disabled={disabled} className={onboardingInputClass()} />
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
