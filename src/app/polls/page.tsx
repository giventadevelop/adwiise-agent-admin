import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { PollList } from '@/components/polls/PollList';
import { fetchUserProfileServer } from '@/app/profile/ApiServerActions';

export default async function PollsPage() {
  // CRITICAL: Next.js 15+ requires headers() to be awaited before calling auth()
  await headers();
  // Ensure auth() is properly awaited
  const authResult = await auth();
  const { userId } = authResult;

  // Get user profile if logged in
  let userProfile = null;
  if (userId) {
    try {
      userProfile = await fetchUserProfileServer(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem] py-4 sm:py-8" style={{ paddingTop: '120px' }}>
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Polls
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Participate in interactive polls and share your opinions with our community
          </p>
        </div>

        <PollList userId={userProfile?.id} />
      </div>
    </div>
  );
}

