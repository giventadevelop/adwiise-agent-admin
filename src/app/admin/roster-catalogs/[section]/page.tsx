import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import AdminBackButton from '@/components/admin/AdminBackButton';
import type { RosterCatalogResource } from '@/types/rosterCatalog';
import { getCurrentAdminAccess } from '../../adminAccessServer';
import { fetchRosterCatalog } from '../ApiServerActions';
import RosterCatalogsClient from '../RosterCatalogsClient';

const TITLES: Record<string, string> = {
  'sports-categories': 'Sports categories',
  'achievement-categories': 'Achievement categories',
  'team-types': 'Team types',
};

export default async function RosterCatalogSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = TITLES[section];
  if (!title) notFound();

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const access = await getCurrentAdminAccess();
  const [sports, achievements, teamTypes] = await Promise.all([
    fetchRosterCatalog('sports-categories').catch(() => []),
    fetchRosterCatalog('achievement-categories').catch(() => []),
    fetchRosterCatalog('team-types').catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8" style={{ paddingTop: '180px' }}>
      <AdminNavigation currentPage="admin" />
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <AdminBackButton href="/admin/roster-catalogs" label="Back to Roster catalogs" />
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      <RosterCatalogsClient
        initialSports={sports}
        initialAchievements={achievements}
        initialTeamTypes={teamTypes}
        canEditGlobal={access.isPlatformSuperAdmin}
        only={section as RosterCatalogResource}
      />
    </div>
  );
}
