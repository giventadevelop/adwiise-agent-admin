import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';

export const dynamic = 'force-dynamic';

/**
 * Tenant organization CRUD is platform SUPER_ADMIN only
 * (same gate as Organization portfolios and the admin hub cards).
 */
export default async function TenantOrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformSuperAdmin();
  return children;
}
