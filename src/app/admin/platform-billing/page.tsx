import AdminBackButton from '@/components/admin/AdminBackButton';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import PlatformBillingHome from './PlatformBillingHome';
import { loadPlatformBillingReport } from './reportActions';

export const dynamic = 'force-dynamic';

export default async function PlatformBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; organizationId?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const query = resolved.organizationId ? String(resolved.organizationId) : String(resolved.q || '');
  const page = Number(resolved.page || 0);
  const report = await loadPlatformBillingReport(query, Number.isFinite(page) ? page : 0);
  return (
    <div className="w-full min-w-0 px-2 sm:px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4" style={adminPageTopStyle}>
        <AdminBackButton href="/admin" label="Back to Admin" />
        <h1 className="text-3xl font-bold">Platform billing</h1>
      </div>
      <PlatformBillingHome report={report} query={query} />
    </div>
  );
}
