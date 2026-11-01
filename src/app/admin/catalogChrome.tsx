import Link from 'next/link';
import type { ReactNode } from 'react';

const tones = {
  indigo: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-indigo-700 bg-indigo-200 text-indigo-950 shadow-lg',
    header: 'flex items-center gap-3 bg-indigo-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-indigo-700 bg-indigo-200 px-4 py-3 text-base text-indigo-950',
    count: 'mb-4 text-base font-semibold text-indigo-950',
    button: 'bg-indigo-100 hover:bg-indigo-200',
    buttonIcon: 'bg-indigo-200',
    buttonSvg: 'text-indigo-600',
    buttonLabel: 'text-indigo-700',
  },
  sky: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-sky-700 bg-sky-200 text-sky-950 shadow-lg',
    header: 'flex items-center gap-3 bg-sky-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-sky-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-sky-700 bg-sky-200 px-4 py-3 text-base text-sky-950',
    count: 'mb-4 text-base font-semibold text-sky-950',
    button: 'bg-sky-100 hover:bg-sky-200',
    buttonIcon: 'bg-sky-200',
    buttonSvg: 'text-sky-600',
    buttonLabel: 'text-sky-700',
  },
  emerald: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-emerald-700 bg-emerald-200 text-emerald-950 shadow-lg',
    header: 'flex items-center gap-3 bg-emerald-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-emerald-700 bg-emerald-200 px-4 py-3 text-base text-emerald-950',
    count: 'mb-4 text-base font-semibold text-emerald-950',
    button: 'bg-emerald-100 hover:bg-emerald-200',
    buttonIcon: 'bg-emerald-200',
    buttonSvg: 'text-emerald-600',
    buttonLabel: 'text-emerald-700',
  },
  amber: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-amber-700 bg-amber-200 text-amber-950 shadow-lg',
    header: 'flex items-center gap-3 bg-amber-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-amber-700 bg-amber-200 px-4 py-3 text-base text-amber-950',
    count: 'mb-4 text-base font-semibold text-amber-950',
    button: 'bg-amber-100 hover:bg-amber-200',
    buttonIcon: 'bg-amber-200',
    buttonSvg: 'text-amber-700',
    buttonLabel: 'text-amber-800',
  },
  violet: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-violet-800 bg-violet-200 text-violet-950 shadow-lg',
    header: 'flex items-center gap-3 bg-violet-800 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-violet-900 text-white',
    intro: 'mb-4 rounded-lg border-2 border-violet-800 bg-violet-200 px-4 py-3 text-base text-violet-950',
    count: 'mb-4 text-base font-semibold text-violet-950',
    button: 'bg-violet-100 hover:bg-violet-200',
    buttonIcon: 'bg-violet-200',
    buttonSvg: 'text-violet-600',
    buttonLabel: 'text-violet-700',
  },
  cyan: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-cyan-700 bg-cyan-200 text-cyan-950 shadow-lg',
    header: 'flex items-center gap-3 bg-cyan-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-cyan-700 bg-cyan-200 px-4 py-3 text-base text-cyan-950',
    count: 'mb-4 text-base font-semibold text-cyan-950',
    button: 'bg-cyan-100 hover:bg-cyan-200',
    buttonIcon: 'bg-cyan-200',
    buttonSvg: 'text-cyan-700',
    buttonLabel: 'text-cyan-800',
  },
  rose: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-rose-700 bg-rose-200 text-rose-950 shadow-lg',
    header: 'flex items-center gap-3 bg-rose-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-rose-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-rose-700 bg-rose-200 px-4 py-3 text-base text-rose-950',
    count: 'mb-4 text-base font-semibold text-rose-950',
    button: 'bg-rose-100 hover:bg-rose-200',
    buttonIcon: 'bg-rose-200',
    buttonSvg: 'text-rose-600',
    buttonLabel: 'text-rose-700',
  },
  lime: {
    shell: 'scroll-mt-44 overflow-hidden rounded-xl border-2 border-lime-700 bg-lime-200 text-lime-950 shadow-lg',
    header: 'flex items-center gap-3 bg-lime-700 px-6 py-4 text-white',
    iconBox: 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-lime-800 text-white',
    intro: 'mb-4 rounded-lg border-2 border-lime-700 bg-lime-200 px-4 py-3 text-base text-lime-950',
    count: 'mb-4 text-base font-semibold text-lime-950',
    button: 'bg-lime-100 hover:bg-lime-200',
    buttonIcon: 'bg-lime-200',
    buttonSvg: 'text-lime-700',
    buttonLabel: 'text-lime-800',
  },
} as const;

export type CatalogTone = keyof typeof tones;

export function catalogTone(tone: CatalogTone) {
  return tones[tone];
}

export function CatalogHubCard({
  id,
  title,
  hint,
  count,
  href,
  manageLabel,
  tone,
  icon,
}: {
  id: string;
  title: string;
  hint: string;
  count: number;
  href: string;
  manageLabel: string;
  tone: CatalogTone;
  icon: ReactNode;
}) {
  const colors = tones[tone];
  return (
    <section id={id} className={colors.shell}>
      <div className={colors.header}>
        <div className={colors.iconBox}>{icon}</div>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <div className="p-6">
        <p className={colors.intro}>{hint}</p>
        <p className={colors.count}>
          {count} {count === 1 ? 'row' : 'rows'}. Search, add, edit, and remove them on the manage page.
        </p>
        <Link
          href={href}
          title={manageLabel}
          aria-label={manageLabel}
          className={`inline-flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl px-6 transition-all duration-300 hover:scale-105 ${colors.button}`}
        >
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors.buttonIcon}`}>
            <svg className={`h-6 w-6 ${colors.buttonSvg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <span className={`font-semibold ${colors.buttonLabel}`}>{manageLabel}</span>
        </Link>
      </div>
    </section>
  );
}

export function CatalogCheck({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label className={`flex items-center gap-3 text-base font-medium ${disabled ? 'opacity-60' : ''}`}>
      <span className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="custom-checkbox custom-checkbox--yellow"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
        <span className="custom-checkbox-tick">
          {checked && (
            <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
            </svg>
          )}
        </span>
      </span>
      {label}
    </label>
  );
}
