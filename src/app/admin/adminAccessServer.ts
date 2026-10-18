import { cache } from 'react';
import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getBackendApiUrl, isAllTenantsAdmin } from '@/lib/env';
import { pickAllUserProfiles } from '@/lib/pickFirstUserProfile';
import {
  ADMIN_SESSION_ALL_TENANTS,
  ADMIN_SESSION_TENANT_COOKIE,
  isAdminSessionAllTenants,
  type AdminWorkspaceTenant,
} from '@/lib/adminSessionTenant';
import {
  emptyAdminTenantAccess,
  isTenantIdAllowed,
  resolveAdminAccessFromProfiles,
  resolveAdminTenantFilter,
  type AdminTenantAccess,
} from '@/lib/adminTenantAccess';
import { isAdminRole } from '@/lib/utils';
import type { UserProfileDTO } from '@/types';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

function mergeProfilesById(...lists: UserProfileDTO[][]): UserProfileDTO[] {
  const byKey = new Map<string, UserProfileDTO>();
  for (const list of lists) {
    for (const profile of list) {
      const key =
        profile.id != null
          ? `id:${profile.id}`
          : profile.userId && profile.tenantId
            ? `user:${profile.userId}:${profile.tenantId}`
            : profile.email && profile.tenantId
              ? `email:${profile.email}:${profile.tenantId}`
              : null;
      if (!key || byKey.has(key)) continue;
      byKey.set(key, profile);
    }
  }
  return Array.from(byKey.values());
}

function listHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

/** Hub workspace lookup: never pin to NEXT_PUBLIC_TENANT_ID (that is why prod showed one card). */
const unscopedListOptions = {
  cache: 'no-store' as const,
  headers: listHeaders(),
  omitEnvTenantId: true,
};

async function listUserProfiles(query: URLSearchParams): Promise<UserProfileDTO[]> {
  const url = `${getBackendApiUrl()}/api/user-profiles?${query.toString()}`;
  const res = await fetchWithJwtRetry(url, unscopedListOptions);
  if (!res.ok) {
    console.error('[adminAccessServer] user-profiles lookup failed', res.status, url);
    return [];
  }
  return pickAllUserProfiles(await res.json());
}

/**
 * Only ADMIN / SUPER_ADMIN rows. Unfiltered lists are newest-first, and duplicate
 * MEMBER rows created on sign-in fill the first page and hide the real admin profile.
 */
function adminRoleQuery(field: 'userId.equals' | 'email.equals', value: string): URLSearchParams {
  const query = new URLSearchParams();
  query.set(field, value);
  query.append('userRole.in', 'ADMIN');
  query.append('userRole.in', 'SUPER_ADMIN');
  query.set('size', '200');
  query.set('sort', 'id,asc');
  return query;
}

/**
 * Load every tenant profile for this Clerk user, then derive the admin allowlist.
 * Looks up by Clerk userId and by email so Google login still finds ADMIN rows
 * whose user_id was never updated on other tenants.
 */
export const fetchAdminAccessForClerkUser = cache(
  async (userId: string, email?: string | null): Promise<AdminTenantAccess> => {
    if (!userId) return emptyAdminTenantAccess();

    let profiles = await listUserProfiles(adminRoleQuery('userId.equals', userId));

    if (email?.trim()) {
      profiles = mergeProfilesById(
        profiles,
        await listUserProfiles(adminRoleQuery('email.equals', email.trim())),
      );
    }

    return resolveAdminAccessFromProfiles(profiles, isAllTenantsAdmin());
  },
);

function parseTenantOrganizations(data: unknown): TenantOrganizationDTO[] {
  if (Array.isArray(data)) return data as TenantOrganizationDTO[];
  if (data && typeof data === 'object') {
    const obj = data as { content?: unknown[]; _embedded?: Record<string, unknown> };
    if (Array.isArray(obj.content)) return obj.content as TenantOrganizationDTO[];
    const embedded = obj._embedded;
    if (embedded) {
      const firstArray = Object.values(embedded).find(Array.isArray);
      if (firstArray) return firstArray as TenantOrganizationDTO[];
    }
  }
  return [];
}

export async function readAdminSessionTenantCookie(): Promise<string | undefined> {
  try {
    const store = await cookies();
    const raw = store.get(ADMIN_SESSION_TENANT_COOKIE)?.value?.trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}

export async function resolveSessionTenantForAccess(
  access: AdminTenantAccess,
): Promise<{ tenantId?: string; allTenants: boolean }> {
  const raw = await readAdminSessionTenantCookie();
  if (isAdminSessionAllTenants(raw)) {
    return { allTenants: !!access.canQueryAllTenants };
  }
  if (raw && isTenantIdAllowed(access, raw)) {
    return { tenantId: raw, allTenants: false };
  }
  if (access.defaultTenantId) {
    return { tenantId: access.defaultTenantId, allTenants: false };
  }
  // Hub SUPER_ADMIN with no cookie yet: treat as all tenants (every org is in scope).
  if (access.canQueryAllTenants) {
    return { allTenants: true };
  }
  return { allTenants: false };
}

export const fetchAdminWorkspaceTenants = cache(async (): Promise<{
  tenants: AdminWorkspaceTenant[];
  canQueryAllTenants: boolean;
  isPlatformSuperAdmin: boolean;
  sessionTenantId: string | null;
  sessionAllTenants: boolean;
}> => {
  const access = await getCurrentAdminAccess();
  const session = await resolveSessionTenantForAccess(access);

  if (!access.isAdmin) {
    return {
      tenants: [],
      canQueryAllTenants: false,
      isPlatformSuperAdmin: false,
      sessionTenantId: null,
      sessionAllTenants: false,
    };
  }

  const authResult = await auth();
  const userId = authResult?.userId || null;
  let email: string | undefined;
  try {
    email = (await currentUser())?.emailAddresses?.[0]?.emailAddress;
  } catch {
    email = undefined;
  }

  let profiles: UserProfileDTO[] = [];
  if (userId) {
    profiles = await listUserProfiles(adminRoleQuery('userId.equals', userId));
    if (email?.trim()) {
      profiles = mergeProfilesById(
        profiles,
        await listUserProfiles(adminRoleQuery('email.equals', email.trim())),
      );
    }
  }

  const roleByTenant = new Map<string, string>();
  for (const profile of profiles) {
    const tid = profile.tenantId?.trim();
    if (!tid || !isAdminRole(profile.userRole)) continue;
    const existing = roleByTenant.get(tid);
    if (!existing || profile.userRole === 'SUPER_ADMIN') {
      roleByTenant.set(tid, profile.userRole || 'ADMIN');
    }
  }

  const orgParams = new URLSearchParams();
  orgParams.set('page', '0');
  orgParams.set('size', '200');
  orgParams.set('sort', 'organizationName,asc');
  if (!access.canQueryAllTenants) {
    if (access.allowedTenantIds.length === 1) {
      orgParams.set('tenantId.equals', access.allowedTenantIds[0]);
    } else if (access.allowedTenantIds.length > 1) {
      orgParams.set('tenantId.in', access.allowedTenantIds.join(','));
    } else {
      orgParams.set('tenantId.equals', '__unauthorized__');
    }
  }

  let orgs: TenantOrganizationDTO[] = [];
  try {
    const orgRes = await fetchWithJwtRetry(
      `${getBackendApiUrl()}/api/tenant-organizations?${orgParams.toString()}`,
      unscopedListOptions,
    );
    if (orgRes.ok) {
      orgs = parseTenantOrganizations(await orgRes.json());
    }
  } catch (error) {
    console.error('[adminAccessServer] tenant-organizations for workspace failed', error);
  }

  const byTenant = new Map<string, AdminWorkspaceTenant>();
  for (const org of orgs) {
    const tenantId = org.tenantId?.trim();
    if (!tenantId) continue;
    if (!access.canQueryAllTenants && !access.allowedTenantIds.includes(tenantId)) continue;
    byTenant.set(tenantId, {
      tenantId,
      organizationName: org.organizationName?.trim() || tenantId,
      domain: org.domain?.trim() || undefined,
      isActive: org.isActive,
      role: roleByTenant.get(tenantId) || (access.isPlatformSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'),
      mappedToUser: roleByTenant.has(tenantId),
    });
  }

  for (const tenantId of access.allowedTenantIds) {
    if (byTenant.has(tenantId)) continue;
    byTenant.set(tenantId, {
      tenantId,
      organizationName: tenantId,
      role: roleByTenant.get(tenantId) || 'ADMIN',
      mappedToUser: true,
    });
  }

  const tenants = Array.from(byTenant.values()).sort((a, b) => {
    if (a.mappedToUser !== b.mappedToUser) return a.mappedToUser ? -1 : 1;
    return a.organizationName.localeCompare(b.organizationName);
  });

  return {
    tenants,
    canQueryAllTenants: access.canQueryAllTenants,
    isPlatformSuperAdmin: access.isPlatformSuperAdmin,
    sessionTenantId: session.tenantId ?? null,
    sessionAllTenants: session.allTenants,
  };
});

/** Request-memoized access for the signed-in Clerk user. */
export const getCurrentAdminAccess = cache(async (): Promise<AdminTenantAccess> => {
  try {
    const authResult = await auth();
    const userId = authResult?.userId || null;
    if (!userId) return emptyAdminTenantAccess();

    let email: string | undefined;
    try {
      const u = await currentUser();
      email = u?.emailAddresses?.[0]?.emailAddress;
    } catch {
      email = undefined;
    }

    return fetchAdminAccessForClerkUser(userId, email);
  } catch (error) {
    console.error('[adminAccessServer] getCurrentAdminAccess failed', error);
    return emptyAdminTenantAccess();
  }
});

export async function resolveAdminTenantFilterForRequest(
  requested?: string | null,
): Promise<ReturnType<typeof resolveAdminTenantFilter>> {
  const access = await getCurrentAdminAccess();
  const explicit = requested?.trim();
  if (explicit) {
    return resolveAdminTenantFilter(access, explicit);
  }
  const session = await resolveSessionTenantForAccess(access);
  if (session.allTenants) {
    return { kind: 'all' };
  }
  return resolveAdminTenantFilter(access, session.tenantId);
}

/**
 * Append tenantId.equals or tenantId.in based on the current user's allowlist.
 * Never leaves the filter empty for a tenant ADMIN (that would mean all tenants).
 * Returns the single tenant id for X-Tenant-ID, or undefined for all / in-list.
 */
export async function appendAdminTenantFilter(
  params: URLSearchParams,
  requested?: string | null,
): Promise<string | undefined> {
  const resolved = await resolveAdminTenantFilterForRequest(requested);
  if (resolved.kind === 'equals') {
    params.set('tenantId.equals', resolved.tenantId);
    return resolved.tenantId;
  }
  if (resolved.kind === 'in') {
    if (resolved.tenantIds.length > 0) {
      params.set('tenantId.in', resolved.tenantIds.join(','));
    } else {
      params.set('tenantId.equals', '__unauthorized__');
    }
    return undefined;
  }
  return undefined;
}

export async function headersForAdminTenantScope(
  requested?: string | null,
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const resolved = await resolveAdminTenantFilterForRequest(requested);
  if (resolved.kind === 'equals') {
    return { ...extra, 'X-Tenant-ID': resolved.tenantId };
  }
  return { ...extra };
}

/**
 * Single tenant id for mutations. Super-admin on the hub must pass an explicit tenant
 * (URL or argument); tenant ADMIN always gets an allowlisted id.
 */
export async function resolveAdminMutationTenantId(explicit?: string | null): Promise<string> {
  const access = await getCurrentAdminAccess();
  const resolved = await resolveAdminTenantFilterForRequest(explicit);

  if (resolved.kind === 'equals') {
    return resolved.tenantId;
  }

  const requested = explicit?.trim();
  if (requested && isTenantIdAllowed(access, requested)) {
    return requested;
  }

  if (resolved.kind === 'in' && resolved.tenantIds[0]) {
    return resolved.tenantIds[0];
  }

  if (access.canQueryAllTenants) {
    throw new Error('Select a tenant in the admin bar before saving.');
  }

  throw new Error('No allowed tenant for this admin user.');
}

export async function scopedAdminTenantId(requested?: string | null): Promise<string | undefined> {
  const resolved = await resolveAdminTenantFilterForRequest(requested);
  if (resolved.kind === 'equals') return resolved.tenantId;
  return undefined;
}

export async function assertAdminCanAccessTenant(tenantId: string | undefined): Promise<void> {
  const access = await getCurrentAdminAccess();
  if (!access.isAdmin) {
    throw new Error('Admin access required');
  }
  if (!isTenantIdAllowed(access, tenantId)) {
    throw new Error('Tenant is not in the current admin allowlist');
  }
}

export async function assertPlatformSuperAdmin(): Promise<AdminTenantAccess> {
  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin) {
    redirect('/admin');
  }
  return access;
}
