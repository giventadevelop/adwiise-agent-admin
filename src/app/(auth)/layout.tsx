import { ReactNode } from 'react';

/**
 * Auth Layout — wraps sign-in, sign-up, etc.
 * The root layout already renders the site Header and Footer on these routes.
 * This wrapper only sets the gray page background.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
