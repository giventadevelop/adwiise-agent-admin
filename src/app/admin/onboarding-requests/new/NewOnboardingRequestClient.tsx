'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import { validateOnboardingSubmit } from '@/lib/onboarding/onboardingShared';
import OnboardingRequestFields, { EMPTY_ONBOARDING_FIELDS, type OnboardingFieldValues } from '../OnboardingRequestFields';
import { createManualOnboardingRequestServer } from '../ApiServerActions';
import AdminBackButton from '@/components/admin/AdminBackButton';

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export default function NewOnboardingRequestClient() {
  const router = useRouter();
  const [values, setValues] = useState<OnboardingFieldValues>(EMPTY_ONBOARDING_FIELDS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, FieldElement>>({});

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

  const onBlurField = (name: keyof OnboardingFieldValues) => {
    const { errors: errs } = validateOnboardingSubmit({ ...values });
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
    const { errors: errs } = validateOnboardingSubmit({ ...values });
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
    const result = await createManualOnboardingRequestServer({ ...values });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
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
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Add onboarding request</h1>
            <p className="text-gray-600 mt-1">
              For customers who reached you by phone or email. The request is saved as PENDING and approved from the review screen.
            </p>
          </div>

          <OnboardingRequestFields values={values} errors={errors} onChange={onChange} onBlurField={onBlurField} registerRef={registerRef} />

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
