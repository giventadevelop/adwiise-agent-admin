'use server';

import {
  buildTenantId,
  formatTenantIdSequence,
  getNextTenantIdSequence,
  isValidTenantIdPrefix,
  normalizeTenantIdPrefix,
} from '@/lib/tenantIdGeneration';
import { fetchTenantOrganizations } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';

export interface NextTenantIdPreview {
  prefix: string;
  sequenceNumber: number;
  formattedSequence: string;
  tenantId: string;
}

async function fetchAllTenantOrganizationIds(): Promise<string[]> {
  const tenantIds: string[] = [];

  // Preferred: lightweight GET /tenant-organizations/tenant-ids (strings only, one request).
  // Falls back to enumerating organization pages when the backend predates the endpoint (404).
  try {
    const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/tenant-ids`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const ids = (await res.json()) as unknown;
      if (Array.isArray(ids)) {
        return ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '').map((id) => id.trim());
      }
    }
  } catch (error) {
    console.error('[tenantIdServerActions] tenant-ids endpoint failed; falling back to page enumeration.', error);
  }

  let page = 0;
  const pageSize = 200;

  try {
    while (true) {
      const result = await fetchTenantOrganizations({ page, pageSize }, { sortBy: 'createdAt', sortOrder: 'asc' });
      for (const org of result.data) {
        for (const websiteTenantId of org.websiteTenantIds || []) {
          if (websiteTenantId.trim()) tenantIds.push(websiteTenantId.trim());
        }
      }
      if (result.data.length < pageSize || page + 1 >= result.totalPages) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    console.error(
      '[tenantIdServerActions] Could not load existing tenant IDs from the API. ' +
        'Tenant ID preview will assume no prior organizations (sequence starts at 1). ' +
        'If the backend returns 500, apply Liquibase migrations 20260620120000 / 20260620120001 and restart the API.',
      error,
    );
  }

  return tenantIds;
}

/** Returns the next global sequence number based on existing tenant_organization.tenant_id values. */
export async function getNextTenantSequenceNumberServer(): Promise<number> {
  const existingIds = await fetchAllTenantOrganizationIds();
  return getNextTenantIdSequence(existingIds);
}

/** Builds `{prefix}_{paddedSequence}` using the next available global sequence. */
export async function previewNextTenantIdServer(rawPrefix: string): Promise<NextTenantIdPreview | null> {
  const prefix = normalizeTenantIdPrefix(rawPrefix);
  if (!isValidTenantIdPrefix(prefix)) {
    return null;
  }

  const existingIds = await fetchAllTenantOrganizationIds();
  const sequenceNumber = getNextTenantIdSequence(existingIds);
  const formattedSequence = formatTenantIdSequence(sequenceNumber);
  const tenantId = buildTenantId(prefix, sequenceNumber);

  return {
    prefix,
    sequenceNumber,
    formattedSequence,
    tenantId,
  };
}
