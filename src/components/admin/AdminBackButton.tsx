'use client';

import Link from 'next/link';

type AdminBackButtonProps = {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/**
 * Shared admin back control. Indigo navigation styling from the admin action button pattern.
 * Width stays with the label so the button can sit beside a page title.
 */
export default function AdminBackButton({ label, href, onClick, className = '' }: AdminBackButtonProps) {
  const classes = `inline-flex flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 items-center justify-center gap-3 px-6 transition-all duration-300 hover:scale-105 ${className}`.trim();
  const content = (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </div>
      <span className="font-semibold text-indigo-700">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes} title={label} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} title={label} aria-label={label}>
      {content}
    </button>
  );
}
