import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import OrganizationPortfoliosClient from './OrganizationPortfoliosClient';

export const dynamic = 'force-dynamic';

export default async function OrganizationPortfoliosPage() {
  await assertPlatformSuperAdmin();
  return <OrganizationPortfoliosClient />;
}
