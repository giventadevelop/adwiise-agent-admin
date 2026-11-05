import { isAdminRole } from '@/lib/utils';
import type { UserProfileDTO } from '@/types';

/**
 * Per-user admin tenant authorization (hub + satellites).
 *
 * - SUPER_ADMIN on the all-tenants hub may query every tenant (empty filter = all).
 * - ADMIN (and SUPER_ADMIN on a single-tenant satellite) may only use tenant IDs
 *   from their own admin `user_profile` rows, plus every member tenant of a portfolio
 *   whose primary tenant is one of those rows. Member-site admins are not expanded.
 */

export type AdminTenantAccess = {
  isAdmin: boolean;
  /** Explicit SUPER_ADMIN role — all tenants on the hub. */
  isPlatformSuperAdmin: boolean;
  /** True when this user may omit tenant filter (wildcard / all tenants). */
  canQueryAllTenants: boolean;
  /**
   * Tenant IDs mapped to this Clerk user via ADMIN/SUPER_ADMIN profiles.
   * Always populated from those rows (including platform SUPER_ADMIN) so the
   * workspace dashboard can list every organization they administer.
   */
  allowedTenantIds: string[];
  /** First mapped tenant when the user has exactly one; otherwise undefined until session pick. */
  defaultTenantId?: string;
};

export type ResolvedAdminTenantFilter =
  | { kind: 'all' }
  | { kind: 'equals'; tenantId: string }
  | { kind: 'in'; tenantIds: string[] };

export function emptyAdminTenantAccess(): AdminTenantAccess {
  return {
    isAdmin: false,
    isPlatformSuperAdmin: false,
    canQueryAllTenants: false,
    allowedTenantIds: [],
  };
}

function uniqueTenantIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Build access from every profile belonging to this Clerk user (any tenant).
 * @param allTenantsHub when true (NEXT_PUBLIC_ALL_TENANTS_ADMIN), SUPER_ADMIN may query all tenants.
 */
export function resolveAdminAccessFromProfiles(
  profiles: UserProfileDTO[],
  allTenantsHub: boolean,
): AdminTenantAccess {
  const adminProfiles = profiles.filter((p) => isAdminRole(p.userRole));
  if (adminProfiles.length === 0) {
    return emptyAdminTenantAccess();
  }

  const isPlatformSuperAdmin = adminProfiles.some((p) => p.userRole === 'SUPER_ADMIN');
  const allowedTenantIds = uniqueTenantIds(adminProfiles.map((p) => p.tenantId));
  const canQueryAllTenants = isPlatformSuperAdmin && allTenantsHub;

  return {
    isAdmin: true,
    isPlatformSuperAdmin,
    canQueryAllTenants,
    allowedTenantIds,
    defaultTenantId: canQueryAllTenants || allowedTenantIds.length !== 1 ? undefined : allowedTenantIds[0],
  };
}

export function isTenantIdAllowed(access: AdminTenantAccess, tenantId: string | undefined): boolean {
  if (!access.isAdmin) return false;
  if (access.canQueryAllTenants) return true;
  const tid = tenantId?.trim();
  if (!tid) return false;
  return access.allowedTenantIds.includes(tid);
}

/**
 * Map `?tenant=` (or an explicit server-action tenant) onto a backend filter.
 * Spoofed IDs are clamped to the allowlist — never treated as all-tenants for tenant ADMIN.
 */
export function resolveAdminTenantFilter(
  access: AdminTenantAccess,
  requested?: string | null,
): ResolvedAdminTenantFilter {
  if (!access.isAdmin) {
    return { kind: 'in', tenantIds: [] };
  }

  const requestedId = requested?.trim() || '';

  if (access.canQueryAllTenants) {
    return requestedId ? { kind: 'equals', tenantId: requestedId } : { kind: 'all' };
  }

  if (requestedId && access.allowedTenantIds.includes(requestedId)) {
    return { kind: 'equals', tenantId: requestedId };
  }

  if (requestedId && !access.allowedTenantIds.includes(requestedId)) {
    console.warn('[AdminTenantAccess] Rejected tenant not in allowlist:', requestedId);
  }

  if (access.allowedTenantIds.length === 1) {
    return { kind: 'equals', tenantId: access.allowedTenantIds[0] };
  }

  if (access.allowedTenantIds.length > 1) {
    return { kind: 'in', tenantIds: access.allowedTenantIds };
  }

  return { kind: 'in', tenantIds: [] };
}

export const PLATFORM_ONLY_ADMIN_PATH_PREFIXES = [
  '/admin/tenant-management',
  '/admin/satellite-domains',
  '/admin/gas-station',
  '/admin/onboarding-requests',
  '/admin/platform-billing',
] as const;

export function isPlatformOnlyAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PLATFORM_ONLY_ADMIN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
