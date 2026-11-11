'use server';

import {
  findNextFreeTenantId,
  getNextTenantIdSequence,
  isValidTenantIdPrefix,
  normalizeTenantIdPrefix,
} from '@/lib/tenantIdGeneration';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';

export interface NextTenantIdPreview {
  prefix: string;
  sequenceNumber: number;
  formattedSequence: string;
  tenantId: string;
}

function tenantIdsFromPayload(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  return ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '').map((id) => id.trim());
}

/** Tenant IDs stored on tenant_settings. Organizations no longer own tenant_id. */
async function fetchAllTenantSettingsIds(): Promise<string[]> {
  try {
    const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/tenant-ids`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const ids = tenantIdsFromPayload(await res.json());
      if (ids) return ids;
    }
  } catch (error) {
    console.error('[tenantIdServerActions] tenant-ids endpoint failed; reading tenant-settings pages.', error);
  }

  const tenantIds: string[] = [];
  let page = 0;
  const pageSize = 200;

  try {
    while (page < 50) {
      const res = await fetchWithJwtRetry(
        `${getApiBaseUrl()}/api/tenant-settings?page=${page}&size=${pageSize}&sort=id,asc`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        console.error('[tenantIdServerActions] tenant-settings page failed', res.status);
        break;
      }
      const rows = (await res.json()) as unknown;
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const row of rows) {
        const tenantId = (row as { tenantId?: unknown })?.tenantId;
        if (typeof tenantId === 'string' && tenantId.trim()) tenantIds.push(tenantId.trim());
      }
      if (rows.length < pageSize) break;
      page += 1;
    }
  } catch (error) {
    console.error(
      '[tenantIdServerActions] Could not load existing tenant IDs from tenant_settings. ' +
        'Tenant ID preview will assume no prior tenant IDs (sequence starts at 1).',
      error,
    );
  }

  return tenantIds;
}

/** Returns the next global sequence number based on existing tenant_settings.tenant_id values. */
export async function getNextTenantSequenceNumberServer(): Promise<number> {
  const existingIds = await fetchAllTenantSettingsIds();
  return getNextTenantIdSequence(existingIds);
}

/** Builds `{prefix}_{sequence}` using the next global sequence that is not already stored. */
export async function previewNextTenantIdServer(rawPrefix: string): Promise<NextTenantIdPreview | null> {
  const prefix = normalizeTenantIdPrefix(rawPrefix);
  if (!isValidTenantIdPrefix(prefix)) {
    return null;
  }

  const existingIds = await fetchAllTenantSettingsIds();
  let tenantId: string;
  try {
    tenantId = findNextFreeTenantId(prefix, existingIds);
  } catch (error) {
    console.error('[tenantIdServerActions] no free tenant ID for prefix', prefix, error);
    return null;
  }
  const sequenceMatch = tenantId.match(/_(\d+)$/);
  const sequenceNumber = sequenceMatch ? Number.parseInt(sequenceMatch[1], 10) : getNextTenantIdSequence(existingIds);

  return {
    prefix,
    sequenceNumber,
    formattedSequence: String(sequenceNumber),
    tenantId,
  };
}
