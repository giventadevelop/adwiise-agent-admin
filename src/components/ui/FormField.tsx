'use client';

import React from 'react';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'datetime-local';
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  options?: { value: string | number; label: string }[];
  rows?: number;
  className?: string;
  helpText?: string;
}

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  required = false,
  placeholder,
  error,
  disabled = false,
  options = [],
  rows = 3,
  className = '',
  helpText,
}: FormFieldProps) {
  const baseInputClasses = `
    mt-1 block w-full border border-gray-400 rounded-xl
    focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label htmlFor={name} className="flex items-center gap-3 cursor-pointer">
            <span className="relative flex items-center justify-center">
              <input
                id={name}
                name={name}
                type="checkbox"
                checked={Boolean(value)}
                onChange={onChange}
                onBlur={onBlur}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                className="custom-checkbox"
              />
              <span className="custom-checkbox-tick">
                {Boolean(value) && (
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                  </svg>
                )}
              </span>
            </span>
            <span className="text-sm font-medium text-gray-700 select-none">{label}</span>
          </label>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderInput()}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

// Form Section Component
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
