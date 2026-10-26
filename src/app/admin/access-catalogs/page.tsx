import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import { getCurrentAdminAccess } from '../adminAccessServer';
import AccessCatalogsClient from './AccessCatalogsClient';
import { fetchAccessRoles, fetchRetailerTypes } from './ApiServerActions';

export default async function AccessCatalogsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const access = await getCurrentAdminAccess();
  const [roles, retailers] = await Promise.all([
    fetchAccessRoles().catch(() => []),
    fetchRetailerTypes().catch(() => []),
  ]);

  return (
    <div className="container mx-auto px-4 py-8" style={{ paddingTop: '180px' }}>
      <AdminNavigation currentPage="admin" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access and retailer catalogs</h1>
        <div className="bg-gray-50 border-l-4 border-emerald-600 p-4 rounded-r-lg">
          <p className="text-gray-700">
            Add an access role or a site type for the selected organization. Shared rows are edited by a platform super admin and stay available to every tenant.
          </p>
        </div>
      </div>
      <AccessCatalogsClient initialRoles={roles} initialRetailers={retailers} canEditGlobal={access.isPlatformSuperAdmin} />
    </div>
  );
}
