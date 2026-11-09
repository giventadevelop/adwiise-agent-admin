import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';

export const dynamic = 'force-dynamic';

/**
 * Organization portfolios are platform SUPER_ADMIN only
 * (same gate as Organizations and the admin hub cards).
 */
export default async function OrganizationPortfoliosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformSuperAdmin();
  return children;
}
