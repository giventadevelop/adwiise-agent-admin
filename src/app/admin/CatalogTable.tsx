'use client';

import { useMemo, useState, type ReactNode } from 'react';

const PAGE_SIZE = 10;

export function CatalogTable<T>({
  rows,
  itemLabel,
  searchText,
  children,
}: {
  rows: T[];
  itemLabel: string;
  searchText: (row: T) => string;
  children: (pageRows: T[]) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => searchText(row).toLowerCase().includes(needle));
  }, [rows, query, searchText]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startItem = total > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  const endItem = total > 0 ? Math.min(total, currentPage * PAGE_SIZE + PAGE_SIZE) : 0;
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const isPrevDisabled = currentPage === 0;
  const isNextDisabled = currentPage >= totalPages - 1;

  const pageButtonClass =
    'px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md';

  return (
    <div>
      <label className="mb-4 block">
        <span className="mb-1 block text-base font-medium">Search {itemLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder={`Search by name or code`}
          className="w-full rounded-xl border border-gray-400 px-4 py-3 text-base"
          aria-label={`Search ${itemLabel}`}
        />
      </label>
      {children(pageRows)}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={isPrevDisabled}
            className={pageButtonClass}
            title="Previous Page"
            aria-label="Previous Page"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-blue-700">
              Page <span className="text-blue-600">{currentPage + 1}</span> of <span className="text-blue-600">{totalPages}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={isNextDisabled}
            className={pageButtonClass}
            title="Next Page"
            aria-label="Next Page"
          >
            <span>Next</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="mt-3 text-center">
          {total > 0 ? (
            <div className="inline-flex items-center rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-700">
                Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                <span className="font-bold text-blue-600">{total}</span> {itemLabel}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-2 shadow-sm">
              <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-700">No {itemLabel} found</span>
              <span className="text-sm text-orange-600">[No rows match your search]</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
