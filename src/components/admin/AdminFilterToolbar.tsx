'use client';

import React from 'react';

/**
 * Wrapping grid for admin list filters. Each child is one cell of at least 18rem,
 * or the full row when the screen is narrower, so fields do not overlap when the
 * page font grows.
 */
export default function AdminFilterToolbar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-3 sm:gap-4 items-end [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))] ${className}`}
    >
      {children}
    </div>
  );
}
