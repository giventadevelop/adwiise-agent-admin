'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/nextjs';

type HubEntryButtonProps = {
  /** `primary` is the neon call-to-action; `outline` is the quieter secondary button. */
  variant?: 'primary' | 'outline';
};

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  minHeight: '52px',
  padding: '0 26px',
  borderRadius: '14px',
  fontWeight: 700,
  fontSize: '17px',
  textDecoration: 'none',
  color: '#15132E',
};

const variantStyle: Record<NonNullable<HubEntryButtonProps['variant']>, CSSProperties> = {
  primary: { background: '#19E6FF', boxShadow: '5px 5px 0 #FFE14D' },
  outline: { background: '#FFFFFF', border: '1.5px solid #15132E' },
};

/**
 * Hub call-to-action follows the live Clerk session.
 * The server-rendered page can still be holding the previous signed-in payload after sign-out.
 */
export default function HubEntryButton({ variant = 'primary' }: HubEntryButtonProps) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div style={{ minHeight: '52px' }} aria-hidden="true" />;
  }

  const signedIn = Boolean(userId);
  const label = signedIn ? 'Open admin hub' : 'Sign in';

  return (
    <Link href={signedIn ? '/admin' : '/sign-in'} style={{ ...baseStyle, ...variantStyle[variant] }} title={label}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
      </svg>
      {label}
    </Link>
  );
}
