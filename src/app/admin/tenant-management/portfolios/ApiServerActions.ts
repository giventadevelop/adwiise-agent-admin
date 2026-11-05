'use server';

import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { getBackendApiUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { OrganizationPortfolioDTO, OrganizationPortfolioMemberDTO } from '@/types';

const unscoped = {
  cache: 'no-store' as const,
  headers: { 'Content-Type': 'application/json' },
};

function apiUrl(path: string): string {
  return `${getBackendApiUrl()}/api/organization-portfolios${path}`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { detail?: string; title?: string; message?: string };
    return parsed.detail || parsed.message || parsed.title || fallback;
  } catch {
    return text.trim() || fallback;
  }
}

function parseList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as { content?: unknown[] };
    if (Array.isArray(obj.content)) return obj.content as T[];
  }
  return [];
}

export async function listOrganizationPortfolios(): Promise<OrganizationPortfolioDTO[]> {
  await assertPlatformSuperAdmin();
  const params = new URLSearchParams();
  params.set('page', '0');
  params.set('size', '200');
  params.set('sort', 'portfolioName,asc');
  const response = await fetchWithJwtRetry(`${apiUrl('')}?${params.toString()}`, unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load portfolios'));
  }
  return parseList<OrganizationPortfolioDTO>(await response.json());
}

export async function listOrganizationPortfolioMembers(portfolioId: number): Promise<OrganizationPortfolioMemberDTO[]> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members`), unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load portfolio members'));
  }
  return parseList<OrganizationPortfolioMemberDTO>(await response.json());
}

export async function createOrganizationPortfolio(input: {
  portfolioName: string;
  description?: string;
  primaryTenantId: string;
  isActive?: boolean;
}): Promise<OrganizationPortfolioDTO> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(''), {
    ...unscoped,
    method: 'POST',
    body: JSON.stringify({
      portfolioName: input.portfolioName.trim(),
      description: input.description?.trim() || null,
      primaryTenantId: input.primaryTenantId.trim(),
      isActive: input.isActive !== false,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create portfolio'));
  }
  return (await response.json()) as OrganizationPortfolioDTO;
}

export async function setOrganizationPortfolioPrimary(portfolio: OrganizationPortfolioDTO, primaryTenantId: string): Promise<OrganizationPortfolioDTO> {
  await assertPlatformSuperAdmin();
  if (!portfolio.id) throw new Error('Portfolio id is required');
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolio.id}`), {
    ...unscoped,
    method: 'PUT',
    body: JSON.stringify({
      id: portfolio.id,
      portfolioName: portfolio.portfolioName,
      description: portfolio.description ?? null,
      primaryTenantId: primaryTenantId.trim(),
      isActive: portfolio.isActive !== false,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to update the primary tenant'));
  }
  return (await response.json()) as OrganizationPortfolioDTO;
}

export async function deleteOrganizationPortfolio(id: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${id}`), { ...unscoped, method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error(await readError(response, 'Failed to delete portfolio'));
  }
}

export async function addOrganizationPortfolioMember(portfolioId: number, tenantId: string): Promise<OrganizationPortfolioMemberDTO> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members`), {
    ...unscoped,
    method: 'POST',
    body: JSON.stringify({ tenantId: tenantId.trim(), isPrimary: false }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to add tenant'));
  }
  return (await response.json()) as OrganizationPortfolioMemberDTO;
}

export async function removeOrganizationPortfolioMember(portfolioId: number, memberId: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${portfolioId}/members/${memberId}`), {
    ...unscoped,
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(await readError(response, 'Failed to remove tenant'));
  }
}
