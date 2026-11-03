'use client';

import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';

interface AdminNavigationProps {
  currentPage?: string;
  showHome?: boolean;
}

/**
 * Thin chrome for admin feature pages: Admin Home + selected Tenant ID.
 * The full searchable hub lives on `/admin` — do not recreate it here.
 */
export default function AdminNavigation({ showHome = true }: AdminNavigationProps) {
  if (!showHome) return null;

  return (
    <div
      className="w-full mb-6 flex flex-col items-start gap-6 overflow-hidden box-border admin-navigation-container"
      style={{ maxWidth: '100%', width: '100%' }}
    >
      <AdminBackButton href="/admin" label="Admin Home" />
      <AdminTenantIdBanner />
    </div>
  );
}
