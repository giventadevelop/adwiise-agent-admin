import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import { getCurrentAdminAccess } from '../adminAccessServer';
import RosterCatalogsClient from './RosterCatalogsClient';
import { fetchRosterCatalog } from './ApiServerActions';

export default async function RosterCatalogsPage() {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Roster catalogs</h1>
        <div className="bg-gray-50 border-l-4 border-sky-500 p-4 rounded-r-lg">
          <p className="text-gray-700">
            Add a sport, achievement category, or team type for the selected organization. Shared
            rows are edited by a platform super admin and stay available to every tenant.
          </p>
        </div>
      </div>
      <RosterCatalogsClient
        initialSports={sports}
        initialAchievements={achievements}
        initialTeamTypes={teamTypes}
        canEditGlobal={access.isPlatformSuperAdmin}
      />
    </div>
  );
}
