'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaBan } from 'react-icons/fa';

type SearchField = 'title' | 'shortLabel' | 'year';

export default function TournamentListFilters({
  tenantId,
  title,
  label,
  year,
  header,
  status,
  published,
}: {
  tenantId: string;
  title?: string;
  label?: string;
  year?: string;
  header?: string;
  status?: string;
  published?: string;
}) {
  const router = useRouter();
  const initialField: SearchField = year ? 'year' : label ? 'shortLabel' : 'title';
  const [searchField, setSearchField] = useState<SearchField>(initialField);
  const [query, setQuery] = useState(year || label || title || '');
  const [headerFilter, setHeaderFilter] = useState(header === 'yes' || header === 'no' ? header : 'all');
  const [statusFilter, setStatusFilter] = useState(status || '');
  const [publishedFilter, setPublishedFilter] = useState(published === 'yes' || published === 'no' ? published : 'all');

  function apply() {
    const params = new URLSearchParams();
    params.set('tenant', tenantId);
    const value = query.trim();
    if (value) {
      if (searchField === 'title') params.set('title', value);
      if (searchField === 'shortLabel') params.set('label', value);
      if (searchField === 'year' && /^\d{4}$/.test(value)) params.set('year', value);
    }
    if (headerFilter !== 'all') params.set('header', headerFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (publishedFilter !== 'all') params.set('published', publishedFilter);
    router.push(`/admin/tournaments?${params.toString()}`);
  }

  function clearFilters() {
    setSearchField('title');
    setQuery('');
    setHeaderFilter('all');
    setStatusFilter('');
    setPublishedFilter('all');
    router.push(`/admin/tournaments?tenant=${encodeURIComponent(tenantId)}`);
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="text-lg font-semibold text-blue-800 mb-4">Search tournaments</div>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="tournament-search-field">
            Search by
          </label>
          <select
            id="tournament-search-field"
            className="border px-3 py-2 rounded w-44"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
          >
            <option value="title">Tournament name</option>
            <option value="shortLabel">Menu label</option>
            <option value="year">Year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="tournament-search-query">
            {searchField === 'year' ? 'Year' : 'Contains'}
          </label>
          <input
            id="tournament-search-query"
            type={searchField === 'year' ? 'number' : 'text'}
            className="border px-3 py-2 rounded w-56"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply();
            }}
            placeholder={searchField === 'year' ? '2026' : 'Type to search'}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="tournament-header-filter">
            Shown in header
          </label>
          <select
            id="tournament-header-filter"
            className="border px-3 py-2 rounded w-44"
            value={headerFilter}
            onChange={(e) => setHeaderFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="yes">Enabled</option>
            <option value="no">Not enabled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="tournament-status-filter">
            Status
          </label>
          <select
            id="tournament-status-filter"
            className="border px-3 py-2 rounded w-44"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="tournament-published-filter">
            Published
          </label>
          <select
            id="tournament-published-filter"
            className="border px-3 py-2 rounded w-40"
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="yes">Published</option>
            <option value="no">Not published</option>
          </select>
        </div>
        <button
          type="button"
          onClick={apply}
          className="h-10 px-4 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold border-2 border-blue-400"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="h-10 px-4 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-800 font-semibold flex items-center gap-2"
        >
          <FaBan />
          Clear
        </button>
      </div>
    </div>
  );
}
