import AdminBackButton from '@/components/admin/AdminBackButton';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';

type AdminRecordMissingProps = {
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
};

/**
 * Shown when an admin opens a record that was deleted, or a link whose id is no longer valid.
 * Replaces Next.js notFound() on these screens so the page does not surface NEXT_HTTP_ERROR_FALLBACK.
 */
export default function AdminRecordMissing({ title, message, backHref, backLabel }: AdminRecordMissingProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      <div className="mb-6">
        <AdminBackButton href={backHref} label={backLabel} />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h1 className="text-lg font-semibold text-amber-900">{title}</h1>
        <p className="mt-2 text-sm text-amber-800">{message}</p>
      </div>
    </div>
  );
}

/** True when a thrown notFound() or a 404 response was caught and would otherwise be shown raw. */
export function isMissingRecordError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /NEXT_HTTP_ERROR_FALLBACK|\b404\b|not found|no longer available/i.test(message);
}
