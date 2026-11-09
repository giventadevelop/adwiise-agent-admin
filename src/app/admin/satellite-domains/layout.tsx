import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';

export const dynamic = 'force-dynamic';

/**
 * Satellite Domains admin is platform SUPER_ADMIN only
 * (same gate as Organizations, portfolios, and the admin hub card).
 */
export default async function SatelliteDomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformSuperAdmin();
  return children;
}
