'use client';

import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';

interface AdminNavigationProps {
  currentPage?: string;
  showHome?: boolean;
  /** One-line description of the table/form on this page (shown under Tenant ID). */
  contextLine?: string;
  /** Optional explicit tenant when workspace context is empty but the page has a record tenant. */
  tenantId?: string | null;
}

/**
 * Thin chrome for admin feature pages: Admin Home + selected Tenant ID.
 * The full searchable hub lives on `/admin` — do not recreate it here.
 */
export default function AdminNavigation({
  showHome = true,
  contextLine,
  tenantId,
}: AdminNavigationProps) {
  if (!showHome) return null;

  return (
    <div
      className="w-full mb-6 flex flex-col items-start gap-6 overflow-hidden box-border admin-navigation-container"
      style={{ maxWidth: '100%', width: '100%' }}
    >
      <AdminBackButton href="/admin" label="Admin Home" />
      <AdminTenantIdBanner tenantId={tenantId} contextLine={contextLine} />
    </div>
  );
}
