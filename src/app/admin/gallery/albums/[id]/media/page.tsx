import { fetchAlbumServer, fetchAlbumMediaServer } from '../../ApiServerActions';
import { fetchUserProfileServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import { auth } from '@clerk/nextjs/server';
import AdminNavigation from '@/components/AdminNavigation';
import AlbumMediaClientPage from './AlbumMediaClientPage';
import { notFound } from 'next/navigation';
import { effectiveTenantId } from '@/lib/env';

export default async function AlbumMediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  const resolvedParams = typeof params.then === 'function' ? await params : params;
  const resolvedSearch =
    searchParams && typeof (searchParams as Promise<{ tenant?: string }>).then === 'function'
      ? await (searchParams as Promise<{ tenant?: string }>)
      : ((searchParams as { tenant?: string } | undefined) ?? {});
  const albumId = parseInt(resolvedParams.id, 10);

  if (isNaN(albumId)) {
    notFound();
  }

  const album = await fetchAlbumServer(albumId, effectiveTenantId(resolvedSearch.tenant));
  if (!album) {
    notFound();
  }

  const { media, totalCount } = await fetchAlbumMediaServer(albumId, 0, 100);

  const { userId } = await auth();
  let userProfileId = null;
  if (userId) {
    try {
      const profile = await fetchUserProfileServer(userId);
      userProfileId = profile?.id ?? null;
    } catch {
      userProfileId = null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16" style={{ paddingTop: '180px', paddingBottom: '48px' }}>
        <AdminNavigation currentPage="gallery-albums" />
        <AlbumMediaClientPage
          albumId={albumId}
          album={album}
          initialMediaList={media}
          userProfileId={userProfileId}
        />
      </div>
    </div>
  );
}

