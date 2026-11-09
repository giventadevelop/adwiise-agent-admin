'use client';

import type { FieldErrors, Path, UseFormRegister } from 'react-hook-form';
import type { AddressFieldValues } from '@/components/admin/addressFieldTypes';

interface AddressFieldsSectionProps<T extends AddressFieldValues> {
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  stateProvinceMaxLength?: number;
  cityMaxLength?: number;
  /** When true, require address line 1, city, state/province, ZIP, and country. */
  requireCoreAddress?: boolean;
}

const inputClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base';

export default function AddressFieldsSection<T extends AddressFieldValues>({
  register,
  errors,
  stateProvinceMaxLength = 255,
  cityMaxLength = 255,
  requireCoreAddress = false,
}: AddressFieldsSectionProps<T>) {
  const fieldError = (name: Path<T>) => {
    const err = errors?.[name];
    if (err && typeof err === 'object' && 'message' in err) {
      return String(err.message);
    }
    return undefined;
  };

  const requiredRule = (message: string) =>
    requireCoreAddress
      ? {
          required: message,
          validate: (value: unknown) =>
            typeof value === 'string' && value.trim().length > 0 ? true : message,
        }
      : {};

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 1{requireCoreAddress ? ' *' : ''}
        </label>
        <input
          type="text"
          {...register('addressLine1' as Path<T>, {
            ...requiredRule('Address line 1 is required'),
            maxLength: { value: 255, message: 'Address line 1 must be 255 characters or less' },
          })}
          className={inputClass}
          placeholder="123 Main Street"
        />
        {fieldError('addressLine1' as Path<T>) && (
          <p className="mt-1 text-sm text-red-600">{fieldError('addressLine1' as Path<T>)}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
        <input
          type="text"
          {...register('addressLine2' as Path<T>, {
            maxLength: { value: 255, message: 'Address line 2 must be 255 characters or less' },
          })}
          className={inputClass}
          placeholder="Suite 100 (optional)"
        />
        {fieldError('addressLine2' as Path<T>) && (
          <p className="mt-1 text-sm text-red-600">{fieldError('addressLine2' as Path<T>)}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City{requireCoreAddress ? ' *' : ''}
          </label>
          <input
            type="text"
            {...register('city' as Path<T>, {
              ...requiredRule('City is required'),
              maxLength: {
                value: cityMaxLength,
                message: `City must be ${cityMaxLength} characters or less`,
              },
            })}
            className={inputClass}
            placeholder="Dallas"
          />
          {fieldError('city' as Path<T>) && (
            <p className="mt-1 text-sm text-red-600">{fieldError('city' as Path<T>)}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State / Province{requireCoreAddress ? ' *' : ''}
          </label>
          <input
            type="text"
            {...register('stateProvince' as Path<T>, {
              ...requiredRule('State / Province is required'),
              maxLength: {
                value: stateProvinceMaxLength,
                message: `State / Province must be ${stateProvinceMaxLength} characters or less`,
              },
            })}
            className={inputClass}
            placeholder="TX"
          />
          {fieldError('stateProvince' as Path<T>) && (
            <p className="mt-1 text-sm text-red-600">{fieldError('stateProvince' as Path<T>)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ZIP / Postal Code{requireCoreAddress ? ' *' : ''}
          </label>
          <input
            type="text"
            {...register('zipCode' as Path<T>, {
              ...requiredRule('ZIP / Postal code is required'),
              maxLength: { value: 20, message: 'ZIP code must be 20 characters or less' },
            })}
            className={inputClass}
            placeholder="75201"
          />
          {fieldError('zipCode' as Path<T>) && (
            <p className="mt-1 text-sm text-red-600">{fieldError('zipCode' as Path<T>)}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country{requireCoreAddress ? ' *' : ''}
          </label>
          <input
            type="text"
            {...register('country' as Path<T>, {
              ...requiredRule('Country is required'),
              maxLength: { value: 100, message: 'Country must be 100 characters or less' },
            })}
            className={inputClass}
            placeholder="United States"
          />
          {fieldError('country' as Path<T>) && (
            <p className="mt-1 text-sm text-red-600">{fieldError('country' as Path<T>)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
