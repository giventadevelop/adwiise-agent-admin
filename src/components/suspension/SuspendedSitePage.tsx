import Link from 'next/link';

/**
 * Shown in place of a public website that a platform super admin has suspended.
 * Keeps the wording neutral: visitors are not told why.
 */
export default function SuspendedSitePage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16 bg-gray-50 min-h-screen">
      <meta name="robots" content="noindex" />
      <div className="max-w-lg w-full text-center bg-white shadow rounded-2xl px-8 py-12">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">This website is temporarily unavailable</h1>
        <p className="mt-4 text-gray-600">
          The site is paused for now. Please check back later.
        </p>
        <p className="mt-6 text-sm text-gray-500">
          Do you manage this website?{' '}
          <Link href="/admin" className="text-blue-600 hover:underline">
            Sign in to the admin dashboard
          </Link>{' '}
          or contact support to restore it.
        </p>
      </div>
    </main>
  );
}
