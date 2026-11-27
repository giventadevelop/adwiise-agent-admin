import Link from 'next/link';

/**
 * Shown in place of an admin or retail dashboard page when a platform super admin has
 * suspended dashboard access for the tenant ID being viewed.
 */
export default function DashboardSuspendedNotice({
  tenantId,
  canSwitchWorkspace,
}: {
  tenantId: string;
  canSwitchWorkspace: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white shadow rounded-2xl border-2 border-amber-300 px-8 py-10 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard access is paused</h1>
        <p className="mt-4 text-gray-700">
          Access to the dashboard for <span className="font-mono font-semibold">{tenantId}</span> is suspended. This usually
          means the account needs attention, such as an overdue payment. Your data is safe and nothing has been deleted.
        </p>
        <p className="mt-4 text-gray-700">Contact support to restore access.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/billing"
            className="flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center px-6 font-semibold text-green-700 transition-all duration-300 hover:scale-105"
            title="Open Billing"
            aria-label="Open Billing"
          >
            Open Billing
          </Link>
          {canSwitchWorkspace && (
            <Link
              href="/admin"
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center px-6 font-semibold text-blue-700 transition-all duration-300 hover:scale-105"
              title="Pick another site"
              aria-label="Pick another site"
            >
              Pick another site
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
