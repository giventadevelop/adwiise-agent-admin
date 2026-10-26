'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  DOMAIN_OWNERSHIP_OPTIONS,
  validateOnboardingSubmit,
} from '@/lib/onboarding/onboardingShared';
import { useRetailerTypeOptions } from '@/lib/onboarding/useRetailerTypeOptions';

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface FormState {
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
  website: string;
}

const INITIAL_STATE: FormState = {
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
  website: '',
};

const FIELD_LABELS: Record<string, string> = {
  organizationName: 'Organization name',
  requestedHostname: 'Website domain',
  contactEmail: 'Contact email',
  primaryColor: 'Primary color',
  secondaryColor: 'Secondary color',
  logoUrl: 'Logo URL',
};

const inputClass = (hasError: boolean) =>
  `mt-1 block w-full border rounded-xl focus:ring-blue-500 px-4 py-3 text-base ${
    hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-400 focus:border-blue-500'
  }`;

export default function GetStartedForm() {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestCode, setRequestCode] = useState<string | null | undefined>(undefined);
  const fieldRefs = useRef<Record<string, FieldElement>>({});
  const siteTypeOptions = useRetailerTypeOptions('proxy');

  const registerRef = (name: string) => (el: FieldElement | null) => {
    if (el) fieldRefs.current[name] = el;
  };

  const scrollToFirstError = (errorObj?: Record<string, string>) => {
    const errorsToUse = errorObj || errors;
    const firstErrorField = Object.keys(errorsToUse)[0];
    const field = firstErrorField ? fieldRefs.current[firstErrorField] : undefined;
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setTimeout(() => fieldRefs.current[firstErrorField]?.focus(), 100);
    }
  };

  const getErrorCount = () => Object.keys(errors).length;

  function validate(): boolean {
    const { errors: errs } = validateOnboardingSubmit({ ...formData });
    const hasErrors = Object.keys(errs).length > 0;
    if (hasErrors) {
      flushSync(() => {
        setErrors(errs);
        setShowErrors(true);
      });
      scrollToFirstError(errs);
    } else {
      setErrors({});
      setShowErrors(false);
    }
    return !hasErrors;
  }

  const validateField = (fieldName: keyof FormState) => {
    const { errors: errs } = validateOnboardingSubmit({ ...formData });
    setErrors((prev) => {
      const next = { ...prev };
      if (errs[fieldName]) next[fieldName] = errs[fieldName];
      else delete next[fieldName];
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<FieldElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/onboarding-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        requestCode?: string | null;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok) {
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          flushSync(() => {
            setErrors(data.fieldErrors ?? {});
            setShowErrors(true);
          });
          scrollToFirstError(data.fieldErrors);
        }
        setSubmitError(data.error || 'We could not save your request. Please try again.');
        return;
      }
      setRequestCode(data.requestCode ?? null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (requestCode !== undefined) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you, we received your request</h2>
        {requestCode && (
          <p className="text-gray-700 mb-2">
            Your request number is <span className="font-mono font-semibold text-blue-700">{requestCode}</span>.
          </p>
        )}
        <p className="text-gray-600">
          We sent a confirmation to <span className="font-semibold">{formData.contactEmail.trim().toLowerCase()}</span>.
          Our team will review your request and email you with next steps, including the DNS records for your domain.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 space-y-8">
      {/* Honeypot: hidden from people, filled by bots */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={formData.website} onChange={handleChange} />
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your organization</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">Organization name *</label>
            <input
              ref={registerRef('organizationName')}
              id="organizationName"
              name="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={handleChange}
              onBlur={() => validateField('organizationName')}
              className={inputClass(!!errors.organizationName)}
              maxLength={255}
            />
            {errors.organizationName && <div className="text-red-500 text-sm mt-1">{errors.organizationName}</div>}
          </div>

          <div>
            <label htmlFor="requestedHostname" className="block text-sm font-medium text-gray-700">Website domain *</label>
            <input
              ref={registerRef('requestedHostname')}
              id="requestedHostname"
              name="requestedHostname"
              type="text"
              inputMode="url"
              placeholder="www.your-organization.org"
              value={formData.requestedHostname}
              onChange={handleChange}
              onBlur={() => validateField('requestedHostname')}
              className={inputClass(!!errors.requestedHostname)}
              maxLength={255}
            />
            {errors.requestedHostname && <div className="text-red-500 text-sm mt-1">{errors.requestedHostname}</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="siteType" className="block text-sm font-medium text-gray-700">Type of website</label>
              <select id="siteType" name="siteType" value={formData.siteType} onChange={handleChange} className={inputClass(false)}>
                {siteTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {siteTypeOptions.find((o) => o.value === formData.siteType)?.hint}
              </p>
            </div>
            <div>
              <label htmlFor="domainOwnership" className="block text-sm font-medium text-gray-700">Domain</label>
              <select id="domainOwnership" name="domainOwnership" value={formData.domainOwnership} onChange={handleChange} className={inputClass(false)}>
                {DOMAIN_OWNERSHIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">About your organization</label>
            <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className={inputClass(false)} maxLength={4000} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact person</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactFirstName" className="block text-sm font-medium text-gray-700">First name</label>
            <input id="contactFirstName" name="contactFirstName" type="text" value={formData.contactFirstName} onChange={handleChange} className={inputClass(false)} maxLength={100} />
          </div>
          <div>
            <label htmlFor="contactLastName" className="block text-sm font-medium text-gray-700">Last name</label>
            <input id="contactLastName" name="contactLastName" type="text" value={formData.contactLastName} onChange={handleChange} className={inputClass(false)} maxLength={100} />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              ref={registerRef('contactEmail')}
              id="contactEmail"
              name="contactEmail"
              type="email"
              autoComplete="email"
              value={formData.contactEmail}
              onChange={handleChange}
              onBlur={() => validateField('contactEmail')}
              className={inputClass(!!errors.contactEmail)}
              maxLength={255}
            />
            {errors.contactEmail && <div className="text-red-500 text-sm mt-1">{errors.contactEmail}</div>}
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">Phone</label>
            <input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" value={formData.contactPhone} onChange={handleChange} className={inputClass(false)} maxLength={50} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Address <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Address line 1</label>
            <input id="addressLine1" name="addressLine1" type="text" value={formData.addressLine1} onChange={handleChange} className={inputClass(false)} maxLength={255} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Address line 2</label>
            <input id="addressLine2" name="addressLine2" type="text" value={formData.addressLine2} onChange={handleChange} className={inputClass(false)} maxLength={255} />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
            <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} className={inputClass(false)} maxLength={100} />
          </div>
          <div>
            <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700">State / province</label>
            <input id="stateProvince" name="stateProvince" type="text" value={formData.stateProvince} onChange={handleChange} className={inputClass(false)} maxLength={100} />
          </div>
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">ZIP / postal code</label>
            <input id="zipCode" name="zipCode" type="text" value={formData.zipCode} onChange={handleChange} className={inputClass(false)} maxLength={20} />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
            <input id="country" name="country" type="text" value={formData.country} onChange={handleChange} className={inputClass(false)} maxLength={100} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">Primary color</label>
            <input
              ref={registerRef('primaryColor')}
              id="primaryColor"
              name="primaryColor"
              type="text"
              placeholder="#1E40AF"
              value={formData.primaryColor}
              onChange={handleChange}
              onBlur={() => validateField('primaryColor')}
              className={inputClass(!!errors.primaryColor)}
              maxLength={7}
            />
            {errors.primaryColor && <div className="text-red-500 text-sm mt-1">{errors.primaryColor}</div>}
          </div>
          <div>
            <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">Secondary color</label>
            <input
              ref={registerRef('secondaryColor')}
              id="secondaryColor"
              name="secondaryColor"
              type="text"
              placeholder="#F59E0B"
              value={formData.secondaryColor}
              onChange={handleChange}
              onBlur={() => validateField('secondaryColor')}
              className={inputClass(!!errors.secondaryColor)}
              maxLength={7}
            />
            {errors.secondaryColor && <div className="text-red-500 text-sm mt-1">{errors.secondaryColor}</div>}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              ref={registerRef('logoUrl')}
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://..."
              value={formData.logoUrl}
              onChange={handleChange}
              onBlur={() => validateField('logoUrl')}
              className={inputClass(!!errors.logoUrl)}
              maxLength={1024}
            />
            {errors.logoUrl && <div className="text-red-500 text-sm mt-1">{errors.logoUrl}</div>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <label className="flex items-center gap-3 text-gray-800">
          <input type="checkbox" name="wantsPayments" checked={formData.wantsPayments} onChange={handleChange} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
          <span>I want to sell tickets or accept donations online</span>
        </label>
        <div>
          <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700">Anything else we should know?</label>
          <textarea id="customerNotes" name="customerNotes" rows={3} value={formData.customerNotes} onChange={handleChange} className={inputClass(false)} maxLength={4000} />
        </div>
      </section>

      {showErrors && getErrorCount() > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following {getErrorCount()} error{getErrorCount() !== 1 ? 's' : ''}:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                {Object.entries(errors).map(([fieldName, message]) => (
                  <li key={fieldName}>
                    <span className="font-medium">{FIELD_LABELS[fieldName] ?? fieldName}:</span> {message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg" role="alert">
          <p className="text-sm font-medium text-red-700">{submitError}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            {submitting ? (
              <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-blue-700">{submitting ? 'Sending...' : 'Send request'}</span>
        </button>
      </div>
    </form>
  );
}
