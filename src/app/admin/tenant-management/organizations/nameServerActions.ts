'use server';

import { getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

export interface OrganizationNameAvailabilityResult {
  available: boolean;
  normalized: string;
  message?: string;
}

function normalizeOrganizationName(value: string): string {
  return value.trim().toLowerCase();
}

function readOrganizations(data: unknown): TenantOrganizationDTO[] {
  if (Array.isArray(data)) return data as TenantOrganizationDTO[];
  if (data && typeof data === 'object') return [data as TenantOrganizationDTO];
  return [];
}

/** Case-insensitive exact name check used while creating or editing an organization. */
export async function isOrganizationNameAvailableServer(
  rawName: string,
  excludeOrganizationId?: number,
): Promise<OrganizationNameAvailabilityResult> {
  const trimmed = rawName.trim();
  const normalized = normalizeOrganizationName(trimmed);
  if (!normalized) {
    return { available: false, normalized, message: 'Organization name is required' };
  }

  try {
    const pageSize = 100;
    for (let page = 0; page < 50; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
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
          message: 'Could not verify the organization name. Try again.',
        };
      }
      const matches = readOrganizations(await response.json());
      const conflict = matches.find(
        (org) =>
          org.id !== excludeOrganizationId &&
          normalizeOrganizationName(org.organizationName || '') === normalized,
      );
      if (conflict) {
        return {
          available: false,
          normalized,
          message: `An organization named ${conflict.organizationName} already exists.`,
        };
      }
      if (matches.length < pageSize) {
        return { available: true, normalized };
      }
    }
    return { available: true, normalized };
  } catch (error) {
    console.error('[isOrganizationNameAvailableServer]', error);
    return {
      available: false,
      normalized,
      message: 'Could not verify the organization name. Try again.',
    };
  }
}
