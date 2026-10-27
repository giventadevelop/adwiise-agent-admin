import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchOnboardingRequestServer } from '../ApiServerActions';
import OnboardingRequestReviewClient from './OnboardingRequestReviewClient';
import AdminBackButton from '@/components/admin/AdminBackButton';

export const dynamic = 'force-dynamic';

export default async function OnboardingRequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await assertPlatformSuperAdmin();
  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  const result = Number.isFinite(requestId) ? await fetchOnboardingRequestServer(requestId) : null;

  if (!result || !result.ok) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" style={{ paddingTop: '180px' }}>
        <div className="max-w-3xl mx-auto px-4">
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-sm font-medium text-red-700">{result && !result.ok ? result.error : 'Invalid request id'}</p>
          </div>
          <AdminBackButton href="/admin/onboarding-requests" label="Back to onboarding requests" />
        </div>
      </div>
    );
  }

  return <OnboardingRequestReviewClient initialRequest={result.data} />;
}
