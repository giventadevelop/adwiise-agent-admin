'use server';
import { resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl, getTenantId } from '@/lib/env';
import { revalidatePath } from 'next/cache';

/**
 * Fetch focus group by id (direct backend call per nextjs_api_routes.mdc).
 */
export async function fetchFocusGroupByIdServer(id: string): Promise<Record<string, unknown> | null> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) return null;
  try {
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/focus-groups/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id != null ? data : null;
  } catch {
    return null;
  }
}

/**
 * Tenant for focus-group member reads and writes: the focus group's own tenant.
 * A super admin working across all tenants has no workspace tenant, so without
 * this resolveAdminMutationTenantId() throws "Select a tenant in the admin bar".
 */
async function resolveFocusGroupTenantId(focusGroupId: string | number): Promise<string> {
  const group = await fetchFocusGroupByIdServer(String(focusGroupId));
  const groupTenantId = typeof group?.tenantId === 'string' ? group.tenantId : undefined;
  return resolveAdminMutationTenantId(groupTenantId);
}

export interface FocusGroupMembersResult {
  members: Record<string, unknown>[];
  totalCount: number;
}

/**
 * Fetch focus group members with pagination (direct backend call per nextjs_api_routes.mdc).
 * Returns members and totalCount (from x-total-count header).
 */
export async function fetchFocusGroupMembersServer(
  focusGroupId: string,
  page: number,
  pageSize: number
): Promise<FocusGroupMembersResult> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) return { members: [], totalCount: 0 };
  const tenantId = await resolveFocusGroupTenantId(focusGroupId);
  const params = new URLSearchParams({
    'focusGroupId.equals': focusGroupId,
    'tenantId.equals': tenantId,
    sort: 'createdAt,desc',
    page: String(page),
    size: String(pageSize),
  });
  const url = `${API_BASE_URL}/api/focus-group-members?${params.toString()}`;
  try {
    const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
    const totalCount = parseInt(res.headers.get('x-total-count') || res.headers.get('X-Total-Count') || '0', 10);
    if (!res.ok) return { members: [], totalCount: 0 };
    const data = await res.json();
    const members = Array.isArray(data) ? data : [];
    return { members, totalCount: totalCount > 0 ? totalCount : members.length };
  } catch {
    return { members: [], totalCount: 0 };
  }
}

export interface UserProfileSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Fetch user profile by id for display (direct backend call per nextjs_api_routes.mdc).
 */
export async function fetchUserProfileByIdServer(profileId: number): Promise<UserProfileSummary | null> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) return null;
  try {
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles/${profileId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.id == null) return null;
    return {
      id: Number(data.id),
      firstName: String(data.firstName ?? ''),
      lastName: String(data.lastName ?? ''),
      email: String(data.email ?? ''),
    };
  } catch {
    return null;
  }
}

function revalidateMembersPage(focusGroupId: number | string) {
  revalidatePath(`/admin/focus-groups/${focusGroupId}/members`);
}

/**
 * Admin: add a member to a focus group (JSON POST — do not use HTML form posts to the proxy).
 */
export async function addFocusGroupMemberServer(input: {
  focusGroupId: number;
  userProfileId: number;
  role: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) return { ok: false, error: 'API base URL not configured' };

  const focusGroupId = Number(input.focusGroupId);
  const userProfileId = Number(input.userProfileId);
  if (!focusGroupId || !userProfileId) {
    return { ok: false, error: 'Focus group ID and user profile ID are required' };
  }

  const role = (input.role || 'MEMBER').trim().toUpperCase() || 'MEMBER';
  const status = (input.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE';
  const now = new Date().toISOString();
  const payload = {
    focusGroupId,
    userProfileId,
    tenantId: await resolveFocusGroupTenantId(focusGroupId),
    role,
    status,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/focus-group-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || res.statusText || `HTTP ${res.status}` };
    }
    revalidateMembersPage(focusGroupId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Admin: update member role/status via merge-patch JSON.
 */
export async function updateFocusGroupMemberServer(input: {
  memberId: number;
  focusGroupId: number;
  role: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) return { ok: false, error: 'API base URL not configured' };

  const memberId = Number(input.memberId);
  if (!memberId) return { ok: false, error: 'Member ID is required' };

  const role = (input.role || 'MEMBER').trim().toUpperCase() || 'MEMBER';
  const status = (input.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE';
  const payload = {
    id: memberId,
    role,
    status,
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetchWithJwtRetry(`${API_BASE_URL}/api/focus-group-members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || res.statusText || `HTTP ${res.status}` };
    }
    revalidateMembersPage(input.focusGroupId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
