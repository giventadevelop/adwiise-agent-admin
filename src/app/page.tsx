import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { BRAND_NAME, BRAND_TAGLINE, BRAND_LOGO_PATH } from '@/lib/brand';

/**
 * Admin hub root. This project is not a tenant public site — do not load
 * events, sponsors, team, or other tenant-scoped homepage sections here.
 */
export default async function RootPage() {
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = !!session?.userId;
  } catch {
    signedIn = false;
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_PATH} alt={BRAND_NAME} className="h-16 w-auto" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{BRAND_NAME}</h1>
          <p className="text-base sm:text-lg text-gray-600">{BRAND_TAGLINE}</p>
          <p className="text-sm text-gray-500">
            Platform admin hub. Public event, team, and sponsor content lives on each tenant site — not here.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {signedIn ? (
            <Link
              href="/admin"
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Open Admin"
              aria-label="Open Admin"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Open Admin</span>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Sign in"
              aria-label="Sign in"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
