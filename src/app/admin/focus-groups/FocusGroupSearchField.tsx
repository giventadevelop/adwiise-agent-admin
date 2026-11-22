'use client';

import { useRef, useState } from 'react';
import SearchFieldClearButton from '@/components/admin/SearchFieldClearButton';

export default function FocusGroupSearchField({ initialQuery }: { initialQuery: string }) {
  const [value, setValue] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="focus-group-search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search name, image text, or search text"
        className="w-full h-12 px-4 pr-10 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {value ? (
        <SearchFieldClearButton
          label="Clear focus group search"
          onClear={() => {
            setValue('');
            const input = inputRef.current;
            if (!input) return;
            input.value = '';
            input.form?.requestSubmit();
          }}
        />
      ) : null}
    </div>
  );
}
