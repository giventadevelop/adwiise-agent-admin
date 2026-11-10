'use server';
import {
  appendAdminTenantFilter,
  assertPlatformSuperAdmin,
  getCurrentAdminAccess,
} from '@/app/admin/adminAccessServer';
import { isTenantIdAllowed } from '@/lib/adminTenantAccess';
import { appendTenantIfPresent, effectiveTenantId, getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { withTenantId } from '@/lib/withTenantId';
import { normalizeTenantDomain } from '@/lib/tenantDomainValidation';
import { normalizeWebsiteUrl } from '@/lib/websiteUrlValidation';
import type {
  TenantOrganizationDTO,
  TenantOrganizationFormDTO,
  TenantOrganizationFilters,
  PaginationParams,
  PaginatedResponse
} from '@/app/admin/tenant-management/types';

const API_BASE_URL = getApiBaseUrl();

const OPTIONAL_STRING_FIELDS = [
  'logoUrl',
  'contactPhone',
  'stripeCustomerId',
  'subscriptionPlan',
  'subscriptionStatus',
  'subscriptionStartDate',
  'subscriptionEndDate',
  'description',
  'addressLine1',
  'addressLine2',
  'city',
  'stateProvince',
  'zipCode',
  'country',
  'websiteUrl',
] as const;

/** Empty optional strings → null; domain is required and normalized (never null). */
function normalizeTenantOrganizationPayload<T extends Partial<TenantOrganizationFormDTO>>(data: T): T {
  const normalized = { ...data };
  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = normalized[field];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      (normalized as Record<string, unknown>)[field] = trimmed === '' ? null : trimmed;
    }
  }
  if (typeof normalized.domain === 'string') {
    normalized.domain = normalizeTenantDomain(normalized.domain);
  }
  if (typeof normalized.websiteUrl === 'string') {
    const trimmed = normalized.websiteUrl.trim();
    normalized.websiteUrl = trimmed === '' ? null : normalizeWebsiteUrl(trimmed);
  }
  return normalized;
}

function parseTenantOrganizationApiError(errorText: string, action: 'create' | 'update'): string {
  const lower = errorText.toLowerCase();
  if (lower.includes('tenant_organization_domain_key') || (lower.includes('duplicate key') && lower.includes('domain'))) {
    return 'An organization with this domain already exists. Use a different domain or leave Domain empty.';
  }
  if (lower.includes('duplicate key')) {
    return 'A record with these values already exists. Check tenant ID and domain for duplicates.';
  }
  try {
    const parsed = JSON.parse(errorText) as { detail?: string; title?: string };
    if (parsed.detail) return parsed.detail;
    if (parsed.title) return parsed.title;
  } catch {
    // not JSON
  }
  return action === 'create' ? 'Failed to create tenant organization' : 'Failed to update tenant organization';
}

/**
 * Fetch paginated list of tenant organizations
 */
export async function fetchTenantOrganizations(
  pagination: PaginationParams,
  filters: TenantOrganizationFilters = {}
): Promise<PaginatedResponse<TenantOrganizationDTO>> {
  try {
    const params = new URLSearchParams();

    // Add pagination parameters
    params.append('page', pagination.page.toString());
    params.append('size', pagination.pageSize.toString());

    // Add filters
    if (filters.search) {
      params.append('organizationName.contains', filters.search);
    }
    // Partial tenant ID match for typeahead (distinct from tenantId.equals scoping)
    const tenantIdContains = filters.tenantIdContains?.trim();
    const nameSearch = filters.search?.trim();
    const access = await getCurrentAdminAccess();
    // A contains search by an all-tenant admin must not also pin tenantId.equals from the
    // session, or the second matching tenant disappears.
    // An organization admin searching by name or tenant id searches every site in their
    // allowlist, not only the site selected for this session.
    const allowlistSearch = !access.canQueryAllTenants && !filters.tenantId && Boolean(tenantIdContains || nameSearch);
    if (tenantIdContains && access.canQueryAllTenants) {
      params.append('tenantId.contains', tenantIdContains);
    } else if (allowlistSearch) {
      if (tenantIdContains) params.append('tenantId.contains', tenantIdContains);
      if (access.allowedTenantIds.length === 1) {
        params.set('tenantId.equals', access.allowedTenantIds[0]);
      } else if (access.allowedTenantIds.length > 1) {
        params.set('tenantId.in', access.allowedTenantIds.join(','));
      } else {
        params.set('tenantId.equals', '__unauthorized__');
      }
    } else {
      if (tenantIdContains) params.append('tenantId.contains', tenantIdContains);
      await appendAdminTenantFilter(params, filters.tenantId);
    }
    if (filters.subscriptionStatus) {
      params.append('subscriptionStatus.equals', filters.subscriptionStatus);
    }
    if (filters.isActive !== undefined) {
      params.append('isActive.equals', filters.isActive.toString());
    }

    // Add sorting
    if (filters.sortBy) {
      const sortDirection = filters.sortOrder || 'asc';
      params.append('sort', `${filters.sortBy},${sortDirection}`);
    }

    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-organizations?${params.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[fetchTenantOrganizations] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.slice(0, 2000),
      });
      throw new Error(
        `Failed to fetch tenant organizations: ${response.statusText}${errorBody ? ` — ${errorBody.slice(0, 500)}` : ''}`,
      );
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get('x-total-count') || '0');

    return {
      data: Array.isArray(data) ? data : [],
      totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize)
    };
  } catch (error) {
    console.error('Error fetching tenant organizations:', error);
    throw new Error('Failed to fetch tenant organizations');
  }
}

/**
 * Fetch a single tenant organization by ID
 */
export async function fetchTenantOrganization(id: number): Promise<TenantOrganizationDTO | null> {
  try {
    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-organizations/${id}`,
      { cache: 'no-store' }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant organization: ${response.statusText}`);
    }

    const organization = (await response.json()) as TenantOrganizationDTO;
    const access = await getCurrentAdminAccess();
    if (!access.isPlatformSuperAdmin && !isTenantIdAllowed(access, organization.tenantId)) {
      return null;
    }
    return organization;
  } catch (error) {
    console.error('Error fetching tenant organization:', error);
    throw new Error('Failed to fetch tenant organization');
  }
}

/**
 * Create a new tenant organization
 */
export async function createTenantOrganization(data: TenantOrganizationFormDTO): Promise<TenantOrganizationDTO> {
  await assertPlatformSuperAdmin();
  try {
    const payload = withTenantId({
      ...normalizeTenantOrganizationPayload(data),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseTenantOrganizationApiError(errorText, 'create'));
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating tenant organization:', error);
    if (error instanceof Error && error.message !== 'Failed to create tenant organization') {
      throw error;
    }
    throw new Error('Failed to create tenant organization');
  }
}

const TENANT_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

async function tenantIdForUpdate(
  existingTenantId: string,
  requestedTenantId: string | undefined,
): Promise<string> {
  const access = await getCurrentAdminAccess();
  const requested = requestedTenantId?.trim();
  if (!access.isPlatformSuperAdmin) {
    return existingTenantId;
  }
  if (!requested || requested === existingTenantId) {
    return existingTenantId;
  }
  if (requested.length > 255 || !TENANT_ID_PATTERN.test(requested)) {
    throw new Error('Tenant ID must use lowercase letters, numbers, and underscores.');
  }
  return requested;
}

/**
 * Update an existing tenant organization.
 * Tenant ID changes are applied only for a platform super admin.
 */
export async function updateTenantOrganization(
  id: number,
  data: Partial<TenantOrganizationFormDTO>
): Promise<TenantOrganizationDTO> {
  await assertPlatformSuperAdmin();
  try {
    // First fetch the existing tenant organization to get the original createdAt
    const existingOrganization = await fetchTenantOrganization(id);
    const tenantId = await tenantIdForUpdate(existingOrganization.tenantId, data.tenantId);

    const payload = withTenantId({
      ...normalizeTenantOrganizationPayload(data),
      tenantId,
      id,
      createdAt: existingOrganization.createdAt, // Preserve original createdAt
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseTenantOrganizationApiError(errorText, 'update'));
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating tenant organization:', error);
    if (error instanceof Error && error.message !== 'Failed to update tenant organization') {
      throw error;
    }
    throw new Error('Failed to update tenant organization');
  }
}

/**
 * Partially update an existing tenant organization
 */
const ORGANIZATION_SUBSCRIPTION_FIELDS = [
  'subscriptionPlan',
  'subscriptionStatus',
  'subscriptionStartDate',
  'subscriptionEndDate',
  'monthlyFeeUsd',
  'stripeCustomerId',
] as const;

export async function patchTenantOrganization(
  id: number,
  data: Partial<TenantOrganizationFormDTO>
): Promise<TenantOrganizationDTO> {
  const access = await getCurrentAdminAccess();
  if (!access.isPlatformSuperAdmin) {
    const existing = await fetchTenantOrganization(id);
    if (!existing?.tenantId || !isTenantIdAllowed(access, existing.tenantId)) {
      throw new Error('That tenant is not in your organization.');
    }
    const limited: Partial<TenantOrganizationFormDTO> = {};
    for (const field of ORGANIZATION_SUBSCRIPTION_FIELDS) {
      if (field in data) limited[field] = data[field];
    }
    data = limited;
  }
  try {
    const existingOrganization = await fetchTenantOrganization(id);
    if (!existingOrganization) {
      throw new Error('Organization not found');
    }
    const tenantId = data.tenantId
      ? await tenantIdForUpdate(existingOrganization.tenantId, data.tenantId)
      : undefined;
    const payload = withTenantId({
      ...normalizeTenantOrganizationPayload(data),
      ...(tenantId ? { tenantId } : {}),
      id,
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-organizations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseTenantOrganizationApiError(errorText, 'update'));
    }

    return await response.json();
  } catch (error) {
    console.error('Error patching tenant organization:', error);
    if (error instanceof Error && error.message !== 'Failed to update tenant organization') {
      throw error;
    }
    throw new Error('Failed to update tenant organization');
  }
}

function explainOrganizationDeleteFailure(status: number, body: string): string {
  let detail = body.trim();
  try {
    const parsed = JSON.parse(body) as { detail?: string; title?: string; message?: string };
    detail = (parsed.detail || parsed.message || parsed.title || detail).trim();
  } catch {
    // Response was plain text.
  }
  const combined = `${body} ${detail}`.toLowerCase();
  if (
    combined.includes('organization_portfolio') ||
    combined.includes('fk_organization_portfolio') ||
    combined.includes('primary_tenant')
  ) {
    return 'This tenant ID is the access tenant for an organization portfolio. The portfolio is the organization group, and this tenant ID is the one whose admins can open the other sites. Choose another tenant ID in that portfolio for that access, or remove the portfolio, then delete this organization.';
  }
  if (detail && detail.length > 0 && detail.length < 500 && !detail.startsWith('{') && !detail.startsWith('[')) {
    return detail;
  }
  if (status === 400 || status === 409) {
    return 'This organization could not be deleted because other records still reference this tenant ID.';
  }
  return 'Failed to delete tenant organization';
}

/**
 * Delete a tenant organization
 */
export async function deleteTenantOrganization(id: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-organizations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text().catch(() => '');
    console.error('Error deleting tenant organization:', response.status, errorText);
    throw new Error(explainOrganizationDeleteFailure(response.status, errorText));
  }
}

export type CascadeDeleteStepResult = {
  resource: string;
  id: number | string;
  ok: boolean;
  detail?: string;
};

export type CascadeDeleteTenantOrganizationResult = {
  ok: boolean;
  tenantId: string;
  organizationId: number;
  steps: CascadeDeleteStepResult[];
  error?: string;
};

function parseIdList(data: unknown): { id?: number }[] {
  if (Array.isArray(data)) return data as { id?: number }[];
  if (data && typeof data === 'object') {
    const obj = data as { content?: unknown[]; _embedded?: Record<string, unknown[]> };
    if (Array.isArray(obj.content)) return obj.content as { id?: number }[];
    if (obj._embedded) {
      const first = Object.values(obj._embedded).find(Array.isArray);
      if (Array.isArray(first)) return first as { id?: number }[];
    }
  }
  return [];
}

async function listIdsByTenantEquals(apiPath: string, tenantId: string): Promise<number[]> {
  const params = new URLSearchParams();
  params.set('tenantId.equals', tenantId);
  params.set('page', '0');
  params.set('size', '200');
  const response = await fetchWithJwtRetry(`${API_BASE_URL}${apiPath}?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to list ${apiPath} for tenant ${tenantId}: ${response.status} ${text}`);
  }
  return parseIdList(await response.json())
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
}

async function deleteById(
  apiPath: string,
  id: number,
  resourceLabel: string,
  steps: CascadeDeleteStepResult[]
): Promise<void> {
  const response = await fetchWithJwtRetry(`${API_BASE_URL}${apiPath}/${id}`, {
    method: 'DELETE',
  });
  if (response.ok || response.status === 204 || response.status === 404) {
    steps.push({
      resource: resourceLabel,
      id,
      ok: true,
      detail: response.status === 404 ? 'already absent' : undefined,
    });
    return;
  }
  const text = await response.text().catch(() => '');
  steps.push({ resource: resourceLabel, id, ok: false, detail: text || response.statusText });
  throw new Error(`Failed to delete ${resourceLabel} #${id}: ${text || response.statusText}`);
}

/**
 * Cascade-delete a tenant organization and related tenant-scoped rows so the
 * tenant can be re-provisioned. Deletes (in order): satellite domains, tenant
 * email addresses, tenant settings, then the organization itself.
 * Does not delete user profiles, events, or onboarding request history.
 */
export async function cascadeDeleteTenantOrganizationServer(
  organizationId: number,
  expectedTenantId?: string
): Promise<CascadeDeleteTenantOrganizationResult> {
  const steps: CascadeDeleteStepResult[] = [];
  await assertPlatformSuperAdmin();

  const org = await fetchTenantOrganization(organizationId);
  if (!org) {
    return {
      ok: false,
      tenantId: expectedTenantId || '',
      organizationId,
      steps,
      error: `Organization #${organizationId} was not found`,
    };
  }

  const tenantId = org.tenantId?.trim();
  if (!tenantId) {
    return {
      ok: false,
      tenantId: '',
      organizationId,
      steps,
      error: 'Organization has no tenantId',
    };
  }

  if (expectedTenantId && expectedTenantId.trim() !== tenantId) {
    return {
      ok: false,
      tenantId,
      organizationId,
      steps,
      error: `Tenant ID mismatch: expected ${expectedTenantId.trim()}, found ${tenantId}`,
    };
  }

  try {
    const satelliteIds = await listIdsByTenantEquals('/api/satellite-domains', tenantId);
    for (const id of satelliteIds) {
      await deleteById('/api/satellite-domains', id, 'satellite-domain', steps);
    }

    const emailIds = await listIdsByTenantEquals('/api/tenant-email-addresses', tenantId);
    for (const id of emailIds) {
      await deleteById('/api/tenant-email-addresses', id, 'tenant-email-address', steps);
    }

    const settingsIds = await listIdsByTenantEquals('/api/tenant-settings', tenantId);
    for (const id of settingsIds) {
      await deleteById('/api/tenant-settings', id, 'tenant-settings', steps);
    }

    await deleteById('/api/tenant-organizations', organizationId, 'tenant-organization', steps);

    return { ok: true, tenantId, organizationId, steps };
  } catch (error) {
    console.error('[cascadeDeleteTenantOrganization]', error);
    return {
      ok: false,
      tenantId,
      organizationId,
      steps,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Toggle the active status of a tenant organization
 */
export async function toggleTenantOrganizationStatus(id: number, isActive: boolean): Promise<TenantOrganizationDTO> {
  await assertPlatformSuperAdmin();
  try {
    const payload = withTenantId({
      id,
      isActive,
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwtRetry(`${API_BASE_URL}/api/tenant-organizations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to toggle tenant organization status: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling tenant organization status:', error);
    throw new Error('Failed to toggle tenant organization status');
  }
}


/**
 * List tenant organizations whose site type is one of the given archetypes
 * (e.g. ['GAS_STATION'] or ['PERSONAL_PROFILE', 'HYBRID']).
 * Used by module dashboards to offer a tenant picker for their category.
 */
export async function fetchTenantOrganizationsBySiteTypes(
  siteTypes: string[]
): Promise<TenantOrganizationDTO[]> {
  try {
    const params = new URLSearchParams({
      sort: 'organizationName,asc',
      size: '200',
    });
    for (const siteType of siteTypes) {
      params.append('siteType.in', siteType);
    }

    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-organizations?${params.toString()}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching tenant organizations by site type:', error);
    return [];
  }
}
