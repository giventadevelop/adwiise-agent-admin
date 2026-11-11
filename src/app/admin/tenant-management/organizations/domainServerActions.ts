'use server';

import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import {
  getTenantDomainFormatError,
  normalizeTenantDomain,
} from '@/lib/tenantDomainValidation';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

export interface TenantDomainAvailabilityResult {
  available: boolean;
  normalized: string;
  message?: string;
}

const PAGE_SIZE = 200;
const MAX_PAGES = 25;

function asOrganizationList(data: unknown): TenantOrganizationDTO[] {
  if (Array.isArray(data)) return data as TenantOrganizationDTO[];
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: TenantOrganizationDTO[] }).content;
  }
  return [];
}

function sameOrganization(orgId: number | undefined, excludeOrganizationId?: number): boolean {
  if (excludeOrganizationId == null || orgId == null) return false;
  return Number(orgId) === Number(excludeOrganizationId);
}

/** Returns whether the domain is free for create/update (case-insensitive exact match). */
export async function isTenantOrganizationDomainAvailableServer(
  rawDomain: string,
  excludeOrganizationId?: number,
): Promise<TenantDomainAvailabilityResult> {
  const normalized = normalizeTenantDomain(rawDomain || '');
  if (!normalized) {
    return { available: true, normalized: '' };
  }

  const formatError = getTenantDomainFormatError(normalized);
  if (formatError) {
    return { available: false, normalized, message: formatError };
  }

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        sort: 'id,asc',
      });
      const response = await fetchWithJwtRetry(
        `${getApiBaseUrl()}/api/tenant-organizations?${params.toString()}`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        return {
          available: false,
          normalized,
          message: 'Could not verify domain availability. Try again.',
        };
      }

      const matches = asOrganizationList(await response.json());
      const conflict = matches.find(
        (org) =>
          !sameOrganization(org.id, excludeOrganizationId) &&
          normalizeTenantDomain(org.domain || '') === normalized,
      );

      if (conflict) {
        return {
          available: false,
          normalized,
          message: `This domain is already registered to "${conflict.organizationName}".`,
        };
      }

      if (matches.length < PAGE_SIZE) {
        return { available: true, normalized };
      }
    }

    return {
      available: false,
      normalized,
      message: 'Could not verify domain availability. Try again.',
    };
  } catch (error) {
    console.error('[isTenantOrganizationDomainAvailableServer]', error);
    return {
      available: false,
      normalized,
      message: 'Could not verify domain availability. Try again.',
    };
  }
}
