'use client';

import type { ReactNode } from 'react';
import FeatureTileGrid, { toneCardClass, toneIconClass } from '@/components/admin/FeatureTileGrid';

export const fieldClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base bg-white';

export const labelClass = 'block text-sm font-medium text-gray-700';

type Tone = 'blue' | 'indigo' | 'teal' | 'purple' | 'orange' | 'emerald' | 'green' | 'red' | 'amber';

const ACTION: Record<Tone, string> = {
  blue: 'bg-blue-100 hover:bg-blue-200',
  indigo: 'bg-indigo-100 hover:bg-indigo-200',
  teal: 'bg-teal-100 hover:bg-teal-200',
  purple: 'bg-purple-100 hover:bg-purple-200',
  orange: 'bg-orange-100 hover:bg-orange-200',
  emerald: 'bg-emerald-100 hover:bg-emerald-200',
  green: 'bg-green-100 hover:bg-green-200',
  red: 'bg-red-100 hover:bg-red-200',
  amber: 'bg-amber-100 hover:bg-amber-200',
};

const ACTION_ICON: Record<Tone, string> = {
  blue: 'bg-blue-200 text-blue-600',
  indigo: 'bg-indigo-200 text-indigo-600',
  teal: 'bg-teal-200 text-teal-600',
  purple: 'bg-purple-200 text-purple-600',
  orange: 'bg-orange-200 text-orange-600',
  emerald: 'bg-emerald-200 text-emerald-600',
  green: 'bg-green-200 text-green-600',
  red: 'bg-red-200 text-red-600',
  amber: 'bg-amber-200 text-amber-600',
};

const ACTION_TEXT: Record<Tone, string> = {
  blue: 'text-blue-700',
  indigo: 'text-indigo-700',
  teal: 'text-teal-700',
  purple: 'text-purple-700',
  orange: 'text-orange-700',
  emerald: 'text-emerald-700',
  green: 'text-green-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
};

const GLYPH: Record<string, ReactNode> = {
  sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.7.7M4.04 19.96l-.7.7M21 12h-1M4 12H3m16.66 7.66l-.7-.7M4.04 4.04l-.7-.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" />,
  building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
  chart: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  key: <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
  refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  ban: <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
  save: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  upload: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
  play: <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7z" />,
  pencil: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
  left: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
  right: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />,
  fuel: <path strokeLinecap="round" strokeLinejoin="round" d="M17 8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2m0-8h2a2 2 0 012 2v2a2 2 0 01-2 2h-2" />,
  register: <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />,
  labor: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  profit: <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  chain: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
};

export function RetailIcon({ name, className }: { name: string; className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      {GLYPH[name] ?? GLYPH.sun}
    </svg>
  );
}

export function YellowCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex flex-col items-center ${disabled ? 'opacity-60' : ''}`}>
      <span className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="custom-checkbox custom-checkbox--yellow"
          checked={checked}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
          onClick={event => event.stopPropagation()}
        />
        <span className="custom-checkbox-tick">
          {checked && (
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
            </svg>
          )}
        </span>
      </span>
      <span className="mt-2 text-sm font-semibold text-center select-none break-words max-w-[9rem]">{label}</span>
    </label>
  );
}

const NAV = [
  { key: 'morning', href: '/admin/retail', label: 'Morning brief', summary: 'Today’s cards for this store', hint: 'Open the morning brief', searchTerms: ['retail', 'gas station', 'liquor', 'shop', 'store'], tone: 'teal' as Tone, icon: 'sun' },
  { key: 'locations', href: '/admin/retail/locations', label: 'Locations', summary: 'Stores in this organization', hint: 'Add and edit store locations', searchTerms: ['retail', 'shop', 'store'], tone: 'indigo' as Tone, icon: 'building' },
  { key: 'upload', href: '/admin/retail/upload', label: 'Upload day', summary: 'Upload register and fuel files', hint: 'Save one store day from files', searchTerms: ['retail', 'upload', 'register', 'fuel', 'csv', 'shop', 'store'], tone: 'blue' as Tone, icon: 'upload' },
  { key: 'integrations', href: '/admin/retail/integrations', label: 'Integrations', summary: 'Connect a store’s systems', hint: 'Payment and inventory connections', searchTerms: ['retail', 'shop', 'store'], tone: 'purple' as Tone, icon: 'link' },
  { key: 'compare', href: '/admin/retail/compare', label: 'Compare stores', summary: 'See stores side by side', hint: 'Compare morning results', searchTerms: ['retail', 'shop', 'store'], tone: 'orange' as Tone, icon: 'chart' },
  { key: 'access', href: '/admin/retail/access', label: 'Assign managers', summary: 'Assign store managers', hint: 'Choose who can open each store', searchTerms: ['retail', 'managers', 'shop', 'store'], tone: 'emerald' as Tone, icon: 'key' },
];

export function RetailNav({
  tenantQuery,
  current,
  showAccess = false,
}: {
  tenantQuery: string;
  current: string;
  showAccess?: boolean;
}) {
  const items = NAV.filter(item => item.key !== 'access' || showAccess || current === 'access');
  return (
    <div className="w-full mb-8">
      <FeatureTileGrid
        searchLabel="Search retail tools by name, such as morning brief, locations, or managers."
        tiles={items.map(item => ({
          key: item.key,
          href: `${item.href}${tenantQuery}`,
          label: item.label,
          summary: item.summary,
          hint: item.hint,
          searchTerms: item.searchTerms,
          guide: item.hint,
          active: item.key === current,
          cardClassName: toneCardClass(item.tone),
          iconWrapClassName: toneIconClass(item.tone),
          icon: <RetailIcon name={item.icon} className="w-10 h-10" />,
        }))}
      />
    </div>
  );
}

export function ActionButton({
  tone,
  icon,
  label,
  onClick,
  disabled,
  type = 'button',
  emphasized = false,
  className = '',
}: {
  tone: Tone;
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Stronger border + shadow so the control stands out from nearby fields. */
  emphasized?: boolean;
  className?: string;
}) {
  const border =
    emphasized
      ? 'border-2 border-blue-500 hover:border-blue-600 shadow-md ring-2 ring-blue-200'
      : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-full flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 ${ACTION[tone]} ${border} ${className}`.trim()}
    >
      <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ACTION_ICON[tone]}`}>
        <RetailIcon name={icon} className="w-6 h-6" />
      </span>
      <span className={`font-semibold ${ACTION_TEXT[tone]}`}>{label}</span>
    </button>
  );
}

/** File picker styled like ActionButton (hidden native input over design-system chrome). */
export function FilePickButton({
  tone,
  icon,
  label,
  accept,
  fileName,
  onChange,
  disabled,
}: {
  tone: Tone;
  icon: string;
  label: string;
  accept?: string;
  fileName?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-1 space-y-2">
      <label
        className={`relative block w-full cursor-pointer ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        title={label}
        aria-label={label}
      >
        <span
          className={`w-full flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4 ${ACTION[tone]}`}
        >
          <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ACTION_ICON[tone]}`}>
            <RetailIcon name={icon} className="w-6 h-6" />
          </span>
          <span className={`font-semibold ${ACTION_TEXT[tone]}`}>{label}</span>
        </span>
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={event => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {fileName ? (
        <p className="text-sm text-gray-700">
          Selected: <span className="font-semibold text-blue-700 break-all">{fileName}</span>
        </p>
      ) : (
        <p className="text-sm text-gray-500">No file chosen</p>
      )}
    </div>
  );
}

export function IconAction({
  tone,
  icon,
  label,
  onClick,
}: {
  tone: 'blue' | 'red';
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${tone === 'blue' ? 'bg-blue-100 hover:bg-blue-200 text-blue-600' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
    >
      <RetailIcon name={icon} className="w-8 h-8" />
    </button>
  );
}

export function PageFooter({
  page,
  totalPages,
  totalCount,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const pageButton =
    'px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md';
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center">
        <button type="button" className={pageButton} disabled={page <= 0} onClick={onPrev} title="Previous Page" aria-label="Previous Page">
          <RetailIcon name="left" className="w-5 h-5" />
          <span>Previous</span>
        </button>
        <span className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm font-bold text-blue-700">
          Page {page + 1} of {totalPages}
        </span>
        <button type="button" className={pageButton} disabled={page + 1 >= totalPages} onClick={onNext} title="Next Page" aria-label="Next Page">
          <span>Next</span>
          <RetailIcon name="right" className="w-5 h-5" />
        </button>
      </div>
      <div className="text-center mt-3">
        <span className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm text-gray-700">
          <span className="font-bold text-blue-600 mr-1">{totalCount}</span> stores
        </span>
      </div>
    </div>
  );
}
