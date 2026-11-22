import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { fetchEventSponsorServer, fetchSponsorMediaServer } from '../ApiServerActions';
import SponsorEditClient from './SponsorEditClient';
import type { EventMediaDTO } from '@/types';

function visitorImageUrl(
  columnUrl: string | null | undefined,
  media: EventMediaDTO[],
  types: string[],
): string | undefined {
  if (columnUrl?.trim()) return undefined;
  const match = media.find(
    (item) => types.includes(item.eventMediaType) && (item.previewFileUrl || item.fileUrl),
  );
  return match?.previewFileUrl || match?.fileUrl;
}

interface SponsorEditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function SponsorEditPage({ params, searchParams }: SponsorEditPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;
  const sp = await searchParams;

  const sponsorId = parseInt(id, 10);
  if (isNaN(sponsorId)) {
    notFound();
  }

  // Fetch sponsor data
  let sponsor;
  try {
    sponsor = await fetchEventSponsorServer(sponsorId);
  } catch (error) {
    console.error('Failed to fetch sponsor:', error);
    notFound();
  }

  // Fetch media files (server-side, but we'll paginate on client)
  const mediaList = await fetchSponsorMediaServer(sponsorId, sponsor.tenantId).catch(() => []);

  // Pagination parameters
  const page = Math.max(0, parseInt(sp.page || '0', 10));
  const pageSize = parseInt(sp.pageSize || '10', 10);

  // Calculate pagination
  const totalCount = mediaList.length;
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMedia = mediaList.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const bannerPreviewUrl = visitorImageUrl(sponsor.bannerImageUrl, mediaList, ['SPONSOR_BANNER', 'BANNER_IMAGE']);
  const logoPreviewUrl = visitorImageUrl(sponsor.logoUrl, mediaList, ['LOGO_IMAGE', 'SPONSOR_LOGO']);
  const heroPreviewUrl = visitorImageUrl(sponsor.heroImageUrl, mediaList, ['HERO_IMAGE', 'SPONSOR_HERO']);

  return (
    <SponsorEditClient
      sponsor={sponsor}
      bannerPreviewUrl={bannerPreviewUrl}
      logoPreviewUrl={logoPreviewUrl}
      heroPreviewUrl={heroPreviewUrl}
      initialMediaList={paginatedMedia}
      totalMediaCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      totalPages={totalPages}
    />
  );
}

