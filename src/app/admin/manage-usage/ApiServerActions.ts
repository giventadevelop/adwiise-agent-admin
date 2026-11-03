'use server';
// This file was renamed from actions.ts to ApiServerActions.ts as a standard for server-side API calls in this module.
import {
  appendAdminTenantFilter,
  getCurrentAdminAccess,
  headersForAdminTenantScope,
  resolveAdminMutationTenantId,
} from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { effectiveTenantId, appendTenantIfPresent, getDefaultPageSize, getBackendApiUrl, getTenantIdOptional } from '@/lib/env';
import { pickFirstUserProfile } from '@/lib/pickFirstUserProfile';
import { UserProfileDTO } from '@/types';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

function isSuperAdminRole(role: string | null | undefined): boolean {
  return String(role || '').trim().toUpperCase() === SUPER_ADMIN_ROLE;
}

/**
 * Only a platform SUPER_ADMIN may assign SUPER_ADMIN or change an existing SUPER_ADMIN profile.
 * Tenant ADMIN (and lower) must not promote others to SUPER_ADMIN.
 */
async function assertSuperAdminRoleChangeAllowed(
  nextRole: string | null | undefined,
  existingRole?: string | null,
): Promise<void> {
  const elevatingToSuperAdmin = isSuperAdminRole(nextRole);
  const touchingExistingSuperAdmin = isSuperAdminRole(existingRole);
  if (!elevatingToSuperAdmin && !touchingExistingSuperAdmin) return;

  const access = await getCurrentAdminAccess();
  if (access.isPlatformSuperAdmin) return;

  if (elevatingToSuperAdmin) {
    throw new Error('Only a Super Admin can promote a user to SUPER_ADMIN.');
  }
  throw new Error('Only a Super Admin can change a SUPER_ADMIN user.');
}

export async function fetchAllUsersServer(tenantId?: string): Promise<UserProfileDTO[]> {
  const params = new URLSearchParams();
  params.set('page', '0');
  params.set('size', String(getDefaultPageSize()));
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/user-profiles?${params.toString()}`;
  const res = await fetchWithJwtRetry(url, {
    cache: 'no-store',
    headers: await headersForAdminTenantScope(tenantId),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAdminProfileServer(userId: string, tenantId?: string): Promise<UserProfileDTO | null> {
  if (!userId) return null;
  try {
    // Prefer explicit tenant override (admin UI), else active env tenant — matches Header/layout admin checks
    const scopedTenantId = effectiveTenantId(tenantId) ?? getTenantIdOptional();
    const params = new URLSearchParams();
    params.append('userId.equals', userId);
    params.append('size', '1');
    appendTenantIfPresent(params, scopedTenantId);
    const url = `${getBackendApiUrl()}/api/user-profiles?${params.toString()}`;

    const res = await fetchWithJwtRetry(url, {
      cache: 'no-store',
      headers: await headersForAdminTenantScope(scopedTenantId),
    });

    if (!res.ok) return null;
    // CRITICAL: Do not treat Spring Page / HAL wrappers as a profile — that drops userRole and
    // causes /admin layout to redirect admins to the homepage while the Header still shows Admin.
    return pickFirstUserProfile(await res.json());
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return null;
  }
}

export async function fetchUsersServer({ search, searchField, status, role, page, pageSize, tenantId }: {
  search: string;
  searchField: string;
  status: string;
  role: string;
  page: number;
  pageSize: number;
  tenantId?: string;
}) {
  const params = new URLSearchParams();
  if (search && searchField) {
    params.append(`${searchField}.contains`, search);
  }
  if (status) params.append('userStatus.equals', status);
  if (role) params.append('userRole.equals', role);
  params.append('page', String((page ?? 1) - 1));
  params.append('size', String(pageSize ?? getDefaultPageSize()));
  await appendAdminTenantFilter(params, tenantId);
  const url = `${getBackendApiUrl()}/api/user-profiles?${params.toString()}`;
  const tid = await resolveAdminMutationTenantId(tenantId);
  const res = await fetchWithJwtRetry(url, {
    cache: 'no-store',
    headers: await headersForAdminTenantScope(tenantId),
  });
  const totalCount = res.headers.get('X-Total-Count');
  const data = await res.json();
  const parsedTotal = totalCount ? parseInt(totalCount, 10) : (Array.isArray(data) ? data.length : 0);
  console.log('[ManageUsage fetchUsersServer]', {
    url,
    scopedTenantId: tid ?? null,
    status: res.status,
    totalCount: parsedTotal,
    rowCount: Array.isArray(data) ? data.length : null,
  });
  return { data, totalCount: parsedTotal };
}

const TYPEAHEAD_FIELDS = ['firstName', 'lastName', 'email', 'userId', 'phone'] as const;
const TYPEAHEAD_LIMIT = 20;

function mergeUsersById(...lists: UserProfileDTO[][]): UserProfileDTO[] {
  const byId = new Map<string, UserProfileDTO>();
  for (const list of lists) {
    for (const user of list) {
      const key =
        user.id != null
          ? `id:${user.id}`
          : user.userId
            ? `userId:${user.userId}`
            : user.email
              ? `email:${user.email}`
              : null;
      if (!key || byId.has(key)) continue;
      byId.set(key, user);
    }
  }
  return Array.from(byId.values());
}

function normalizeUserList(data: unknown): UserProfileDTO[] {
  if (Array.isArray(data)) return data as UserProfileDTO[];
  if (
    data &&
    typeof data === 'object' &&
    'content' in data &&
    Array.isArray((data as { content: unknown }).content)
  ) {
    return (data as { content: UserProfileDTO[] }).content;
  }
  return [];
}

/**
 * Multi-field typeahead for focus-group member add / Manage Usage.
 * Uses fetchWithJwtRetry + backend base URL per nextjs_api_routes.mdc.
 */
export async function searchUsersForTypeaheadServer(
  query: string,
  options?: { status?: string; role?: string; tenantId?: string },
): Promise<UserProfileDTO[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = await Promise.all(
    TYPEAHEAD_FIELDS.map(async (field) => {
      const params = new URLSearchParams();
      params.append(`${field}.contains`, trimmed);
      if (options?.status) params.append('userStatus.equals', options.status);
      if (options?.role) params.append('userRole.equals', options.role);
      await appendAdminTenantFilter(params, options?.tenantId);
      params.append('page', '0');
      params.append('size', String(TYPEAHEAD_LIMIT));
      const res = await fetchWithJwtRetry(
        `${getBackendApiUrl()}/api/user-profiles?${params.toString()}`,
        {
          cache: 'no-store',
          headers: await headersForAdminTenantScope(options?.tenantId),
        },
      );
      if (!res.ok) return [] as UserProfileDTO[];
      return normalizeUserList(await res.json());
    }),
  );

  return mergeUsersById(...results).slice(0, TYPEAHEAD_LIMIT);
}

export async function patchUserProfileServer(userId: number, payload: Partial<UserProfileDTO>, tenantId?: string) {
  const url = `${getBackendApiUrl()}/api/user-profiles/${userId}`;
  const tid = await resolveAdminMutationTenantId(tenantId);

  // Load current role so non-super admins cannot elevate to or alter SUPER_ADMIN.
  let existingRole: string | null | undefined;
  let loadedExisting = false;
  try {
    const existingRes = await fetchWithJwtRetry(url, {
      method: 'GET',
      headers: await headersForAdminTenantScope(tenantId),
      cache: 'no-store',
    });
    if (existingRes.ok) {
      const existing = (await existingRes.json()) as UserProfileDTO;
      existingRole = existing?.userRole;
      loadedExisting = true;
    }
  } catch (error) {
    console.warn('[patchUserProfileServer] Could not load existing profile for role check:', error);
  }

  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin && !loadedExisting && payload.userRole !== undefined) {
    // Fail closed: without the current role we cannot prove this is not a SUPER_ADMIN change.
    throw new Error('Unable to verify current user role before update. Please try again.');
  }

  const nextRole =
    payload.userRole !== undefined ? payload.userRole : existingRole;
  await assertSuperAdminRoleChangeAllowed(nextRole, existingRole);

  const finalPayload = {
    ...payload,
    id: userId,
    ...(tid != null ? { tenantId: tid } : {}),
  };

  const res = await fetchWithJwtRetry(url, {
    method: 'PATCH',
    headers: await headersForAdminTenantScope(tenantId, {
      'Content-Type': 'application/merge-patch+json',
    }),
    body: JSON.stringify(finalPayload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Failed to update user profile ${userId}:`, errorBody);
    throw new Error('Failed to update user profile');
  }
  return res.json();
}

export async function bulkUploadUsersServer(users: any[], tenantId?: string) {
  const tid = await resolveAdminMutationTenantId(tenantId);
  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin) {
    const attemptedSuperAdmin = users.some((u) => isSuperAdminRole(u?.userRole));
    if (attemptedSuperAdmin) {
      throw new Error('Only a Super Admin can create or assign SUPER_ADMIN via bulk upload.');
    }
  }
  const res = await fetchWithJwtRetry(`${getBackendApiUrl()}/api/user-profiles/bulk`, {
    method: 'POST',
    headers: await headersForAdminTenantScope(tenantId, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(users.map(u => ({ ...u, ...(tid != null ? { tenantId: tid } : {}) }))),
  });
  return await res.json();
}