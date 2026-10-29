'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import AdminTenantFilterField from './AdminTenantFilterField';

export type AdminAccessContextValue = {
  tenantId?: string;
  isPlatformSuperAdmin: boolean;
  canQueryAllTenants: boolean;
  allowedTenantIds: string[];
  defaultTenantId?: string;
  limitNavToRetail: boolean;
};

const AdminAccessContext = createContext<AdminAccessContextValue>({
  tenantId: undefined,
  isPlatformSuperAdmin: false,
  canQueryAllTenants: false,
  allowedTenantIds: [],
  limitNavToRetail: false,
});

export function useAdminAccess(): AdminAccessContextValue {
  return useContext(AdminAccessContext);
}

export function useAdminTenantId(): string | undefined {
  return useContext(AdminAccessContext).tenantId;
}

interface AdminTenantLayoutClientProps {
  showTenantSelector: boolean;
  isPlatformSuperAdmin?: boolean;
  canQueryAllTenants?: boolean;
  allowedTenantIds?: string[];
  defaultTenantId?: string;
  limitNavToRetail?: boolean;
  children: React.ReactNode;
}

/**
 * Pages that already render `AdminTenantFilterField` in their search form.
 * Hide the layout top bar there to avoid two identical typeaheads fighting over focus / debounce.
 * (Shared field already searches organizationName + tenantId + domain — see typeahead_search_combobox.mdc.)
 */
function hasInlineTenantFilter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/admin' || pathname === '/admin/') return true;
  return (
    pathname.includes('/manage-usage') ||
    pathname.includes('/gallery/albums') ||
    pathname.includes('/manage-events') ||
    pathname.includes('/executive-committee') ||
    pathname.includes('/team-groups') ||
    pathname.includes('/team-members') ||
    pathname.includes('/roster-catalogs') ||
    pathname.includes('/access-catalogs') ||
    pathname.includes('/homepage-cache') ||
    pathname.includes('/event-sponsors') ||
    pathname.includes('/event-contacts') ||
    pathname.includes('/event-featured-performers') ||
    pathname.includes('/event-program-directors') ||
    pathname.includes('/event-emails') ||
    pathname.includes('/newsletter-emails') ||
    pathname.includes('/promotion-emails') ||
    pathname.includes('/tenant-email-addresses') ||
    pathname.includes('/manual-payments') ||
    pathname.includes('/satellite-domains') ||
    pathname.includes('/tenant-management/settings') ||
    pathname.includes('/membership/plans') ||
    pathname.includes('/membership/subscriptions') ||
    pathname.includes('/polls') ||
    pathname.includes('/focus-groups') ||
    pathname.includes('/tournaments') ||
    pathname.includes('/media/list') ||
    pathname.includes('/official-documents') ||
    pathname.includes('/official-document-categories')
  );
}

function tenantFromSearchParams(
  searchParams: { get: (key: string) => string | null },
  canQueryAllTenants: boolean,
  allowedTenantIds: string[],
  defaultTenantId?: string,
): string | undefined {
  const raw = (searchParams.get('tenant') ?? '').trim();
  if (canQueryAllTenants) {
    return raw || defaultTenantId || undefined;
  }
  if (raw && allowedTenantIds.includes(raw)) {
    return raw;
  }
  return defaultTenantId;
}

/**
 * Provides selected tenant from URL (?tenant=), falling back to the session workspace
 * (`defaultTenantId` = admin_session_tenant cookie), plus an optional tenant selector bar.
 * Tenant ADMIN cannot clear to "all tenants"; spoofed ?tenant= values are clamped client-side
 * (server actions also enforce the allowlist).
 */
export function AdminTenantLayoutClient({
  showTenantSelector,
  isPlatformSuperAdmin = false,
  canQueryAllTenants = false,
  allowedTenantIds = [],
  defaultTenantId,
  limitNavToRetail = false,
  children,
}: AdminTenantLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const showTopTenantBar = showTenantSelector && !hasInlineTenantFilter(pathname);

  const tenantId = tenantFromSearchParams(
    searchParams ?? new URLSearchParams(),
    canQueryAllTenants,
    allowedTenantIds,
    defaultTenantId,
  );

  const urlTenant = (searchParams?.get('tenant') ?? '').trim();
  useEffect(() => {
    if (canQueryAllTenants) return;
    if (pathname === '/admin' || pathname === '/admin/') return;
    const allowed = tenantId ?? defaultTenantId;
    if (!allowed) return;
    if (urlTenant === allowed) return;
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('tenant', allowed);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [canQueryAllTenants, tenantId, defaultTenantId, urlTenant, pathname, router, searchParams]);

  const value = useMemo<AdminAccessContextValue>(
    () => ({
      tenantId,
      isPlatformSuperAdmin,
      canQueryAllTenants,
      allowedTenantIds,
      defaultTenantId,
      limitNavToRetail,
    }),
    [tenantId, isPlatformSuperAdmin, canQueryAllTenants, allowedTenantIds, defaultTenantId, limitNavToRetail],
  );

  return (
    <AdminAccessContext.Provider value={value}>
      {showTopTenantBar && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm">
          <span className="font-medium text-blue-800 whitespace-nowrap">
            {canQueryAllTenants
              ? 'Tenant ID (optional – leave empty for all):'
              : 'Tenant ID (your organizations only):'}
          </span>
          <AdminTenantFilterField
            variant="compact"
            inputId="admin-tenant-id"
            className="flex-1 min-w-0 max-w-md"
          />
          <a
            href="/admin"
            className="whitespace-nowrap font-semibold text-indigo-700 hover:text-indigo-900 underline"
          >
            Change workspace
          </a>
        </div>
      )}
      {children}
    </AdminAccessContext.Provider>
  );
}
