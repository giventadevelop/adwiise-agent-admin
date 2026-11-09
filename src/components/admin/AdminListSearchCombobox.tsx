'use client';

import { useEffect, useId, useRef, useState } from 'react';

export interface AdminListSearchSuggestion {
  id: string;
  label: string;
  secondary?: string;
  /** Value committed to the list search when selected. */
  commitValue: string;
}

interface AdminListSearchComboboxProps {
  /** Committed search value (drives list fetch) — not updated while typing. */
  committedValue: string;
  onCommit: (value: string) => void;
  /** Debounced remote suggestions from the current input. */
  fetchSuggestions: (query: string) => Promise<AdminListSearchSuggestion[]>;
  placeholder?: string;
  searchButtonLabel?: string;
  inputId?: string;
  className?: string;
}

/**
 * Shared admin list typeahead: local inputValue, commit only on select / Enter / Search / clear.
 * See .cursor/rules/typeahead_search_combobox.mdc
 */
export default function AdminListSearchCombobox({
  committedValue,
  onCommit,
  fetchSuggestions,
  placeholder = 'Search…',
  searchButtonLabel = 'Search',
  inputId,
  className = '',
}: AdminListSearchComboboxProps) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const fieldId = inputId || `${autoId}-input`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(committedValue);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AdminListSearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGen = useRef(0);

  useEffect(() => {
    setInputValue(committedValue);
  }, [committedValue]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = inputValue.trim();
    if (!q || q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const rows = await fetchSuggestions(q);
          if (gen !== fetchGen.current) return;
          setSuggestions(rows);
        } catch {
          if (gen !== fetchGen.current) return;
          setSuggestions([]);
        } finally {
          if (gen === fetchGen.current) setLoading(false);
        }
      })();
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchSuggestions]);

  const commit = (value: string) => {
    const next = value.trim();
    setInputValue(next);
    onCommit(next);
    setOpen(false);
  };

  const clear = () => {
    setInputValue('');
    onCommit('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative flex gap-2 ${className}`}>
      <div className="relative flex-1 min-w-[16rem]">
        <input
          id={fieldId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestions.length === 1) {
                commit(suggestions[0].commitValue);
              } else {
                commit(inputValue);
              }
            }
          }}
          placeholder={placeholder}
          className="mt-0 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base pr-10"
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            title="Clear search"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        {open && (loading || suggestions.length > 0 || inputValue.trim()) && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto"
          >
            {loading && suggestions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Searching…</div>
            ) : suggestions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                No suggestions — press Search or Enter to filter by “{inputValue.trim()}”.
              </div>
            ) : (
              <ul className="py-1">
                {suggestions.map((item) => (
                  <li key={item.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(item.commitValue)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      {item.secondary && (
                        <div className="text-xs text-gray-500 mt-0.5">{item.secondary}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => commit(inputValue)}
        className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm whitespace-nowrap"
      >
        {searchButtonLabel}
      </button>
    </div>
  );
}
