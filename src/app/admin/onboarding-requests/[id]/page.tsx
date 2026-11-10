import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchOnboardingRequestServer } from '../ApiServerActions';
import OnboardingRequestReviewClient from './OnboardingRequestReviewClient';
import AdminRecordMissing from '@/components/admin/AdminRecordMissing';

export const dynamic = 'force-dynamic';

export default async function OnboardingRequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await assertPlatformSuperAdmin();
  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  const result = Number.isFinite(requestId) ? await fetchOnboardingRequestServer(requestId) : null;
  const deleted =
    !Number.isFinite(requestId) ||
    !result ||
    (!result.ok && /not found|no longer|deleted|404|NEXT_HTTP_ERROR_FALLBACK/i.test(result.error));

  if (deleted) {
    return (
      <AdminRecordMissing
        title="This onboarding request is no longer available"
        message={`Request #${id} was deleted, or this link is out of date. Open the onboarding list to see the requests that are still there.`}
        backHref="/admin/onboarding-requests"
        backLabel="Back to onboarding requests"
      />
    );
  }

  if (!result || !result.ok) {
    return (
      <AdminRecordMissing
        title="This onboarding request could not be loaded"
        message="Refresh the page, or go back to the onboarding list."
        backHref="/admin/onboarding-requests"
        backLabel="Back to onboarding requests"
      />
    );
  }

  return <OnboardingRequestReviewClient initialRequest={result.data} />;
}
