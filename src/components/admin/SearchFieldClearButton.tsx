'use client';

import { useEffect, useState } from 'react';

/**
 * In-field × used by the admin home feature search. Shown by the parent only
 * while the text box has a value.
 */
export default function SearchFieldClearButton({
  onClear,
  label = 'Clear search',
}: {
  onClear: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-gray-400 hover:text-gray-700"
      title="Clear search"
      aria-label={label}
    >
      ×
    </button>
  );
}

/** Clears an uncontrolled form field by id and submits its form. */
export function ClearNativeFieldButton({
  inputId,
  label = 'Clear search',
}: {
  inputId: string;
  label?: string;
}) {
  const [hasValue, setHasValue] = useState(false);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const sync = () => setHasValue(input.value.trim().length > 0);
    sync();
    input.addEventListener('input', sync);
    return () => input.removeEventListener('input', sync);
  }, [inputId]);

  if (!hasValue) return null;

  return (
    <SearchFieldClearButton
      label={label}
      onClear={() => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        if (!input) return;
        input.value = '';
        setHasValue(false);
        input.form?.requestSubmit();
      }}
    />
  );
}
