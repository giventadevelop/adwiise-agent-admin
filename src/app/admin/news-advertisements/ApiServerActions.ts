'use server';

import { resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';
import {
  newsAdPositionLabel,
  normalizeNewsAdVisibility,
  type NewsAdSlotRow,
  type NewsAdVisibility,
} from './newsAdSlots';

export type NewsAdVisibilityResult = {
  settings: NewsAdVisibility | null;
  slots: NewsAdSlotRow[];
  error: string | null;
};

function strapiBase(): string {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.AMPLIFY_NEXT_PUBLIC_STRAPI_URL || '';
  return url.replace(/\/$/, '').replace(/\/api$/, '');
}

function strapiToken(): string {
  return process.env.STRAPI_API_TOKEN || process.env.AMPLIFY_STRAPI_API_TOKEN || '';
}

async function strapiJson(pathAndQuery: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base = strapiBase();
  const token = strapiToken();
  if (!base || !token) {
    throw new Error('Strapi is not configured, so the news page cannot be updated.');
  }
  const response = await fetch(`${base}/api${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

function mapSlot(raw: Record<string, unknown>): NewsAdSlotRow | null {
  const attrs = (raw.attributes as Record<string, unknown> | undefined) ?? raw;
  const id = Number(raw.id ?? attrs.id ?? 0);
  const documentId = `${raw.documentId || attrs.documentId || ''}`.trim();
  const position = `${attrs.position || ''}`.trim().toLowerCase().replace(/-/g, '_');
  if (!id || !documentId || !position) return null;
  return {
    id,
    documentId,
    position,
    label: newsAdPositionLabel(position),
    priority: Number(attrs.priority ?? 0),
    isVisible: attrs.isVisible !== false,
  };
}

function listRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: Array<Record<string, unknown>> }).content;
  }
  return [];
}

async function fetchStrapiSlots(tenantId: string): Promise<NewsAdSlotRow[]> {
  const query = `/advertisement-slots?filters[tenant][tenantId][$eq]=${encodeURIComponent(tenantId)}&pagination[pageSize]=50&sort=priority:asc`;
  const result = await strapiJson(query);
  if (!result.ok) {
    throw new Error('Could not load the advertisements from the news page.');
  }
  const data = (result.body as { data?: unknown[] } | null)?.data;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => mapSlot(row as Record<string, unknown>))
    .filter((row): row is NewsAdSlotRow => row !== null)
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
}

async function fetchTenantAdFlag(tenantId: string): Promise<{ id: number; adsEnabled: boolean }> {
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/tenant-settings?tenantId.equals=${encodeURIComponent(tenantId)}&size=1`,
    {
      cache: 'no-store',
      headers: { 'X-Tenant-ID': tenantId },
    }
  );
  if (!response.ok) {
    throw new Error('Could not load news advertisement settings for this tenant.');
  }
  const row = listRows(await response.json())[0];
  const id = Number(row?.id);
  if (!id) {
    throw new Error('This tenant has no settings row for news advertisements.');
  }
  return { id, adsEnabled: row.showNewsAdvertisements !== false };
}

async function saveTenantAdFlag(tenantId: string, settingsId: number, adsEnabled: boolean): Promise<void> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings/${settingsId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'X-Tenant-ID': tenantId,
    },
    body: JSON.stringify({
      id: settingsId,
      tenantId,
      showNewsAdvertisements: adsEnabled,
      updatedAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error('Could not save the news advertisement switch for this tenant.');
  }
}

async function publishSlot(slot: NewsAdSlotRow, isVisible: boolean): Promise<void> {
  if (slot.isVisible === isVisible) return;
  const result = await strapiJson(`/advertisement-slots/${encodeURIComponent(slot.documentId)}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { isVisible } }),
  });
  if (!result.ok) {
    throw new Error('The switch was saved, but the news page did not accept the change. Restart Strapi if this is the first time the visibility field is used.');
  }
}

function visibilityFrom(adsEnabled: boolean, slots: NewsAdSlotRow[]): NewsAdVisibility {
  return normalizeNewsAdVisibility(
    {
      adsEnabled,
      slots: Object.fromEntries(slots.map((slot) => [String(slot.id), slot.isVisible])),
    },
    slots.map((slot) => String(slot.id))
  );
}

export async function fetchNewsAdVisibility(tenantId?: string): Promise<NewsAdVisibilityResult> {
  try {
    const tenant = await resolveAdminMutationTenantId(tenantId);
    const [flag, slots] = await Promise.all([fetchTenantAdFlag(tenant), fetchStrapiSlots(tenant)]);
    return { settings: visibilityFrom(flag.adsEnabled, slots), slots, error: null };
  } catch (error) {
    return {
      settings: null,
      slots: [],
      error: error instanceof Error ? error.message : 'Could not load news advertisement switches.',
    };
  }
}

export async function saveNewsAdVisibility(
  tenantId: string | undefined,
  settings: NewsAdVisibility
): Promise<NewsAdVisibilityResult> {
  try {
    const tenant = await resolveAdminMutationTenantId(tenantId);
    const [flag, slots] = await Promise.all([fetchTenantAdFlag(tenant), fetchStrapiSlots(tenant)]);
    const next = normalizeNewsAdVisibility(settings, slots.map((slot) => String(slot.id)));
    await saveTenantAdFlag(tenant, flag.id, next.adsEnabled);
    for (const slot of slots) {
      await publishSlot(slot, next.slots[String(slot.id)] !== false);
    }
    const savedSlots = slots.map((slot) => ({
      ...slot,
      isVisible: next.slots[String(slot.id)] !== false,
    }));
    return { settings: visibilityFrom(next.adsEnabled, savedSlots), slots: savedSlots, error: null };
  } catch (error) {
    return {
      settings: null,
      slots: [],
      error: error instanceof Error ? error.message : 'Could not save news advertisement switches.',
    };
  }
}
