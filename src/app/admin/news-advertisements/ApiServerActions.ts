'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import {
  MD_STRIKERS_TENANT_ID,
  newsAdPositionLabel,
  normalizeNewsAdVisibility,
  slotIsShown,
  type NewsAdSlotRow,
  type NewsAdVisibility,
} from './newsAdSlots';

const STORE_PATH = path.join(process.cwd(), 'data', 'md-strikers-10-news-ad-visibility.json');

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

async function requireMdStrikersTenant(requested?: string): Promise<string> {
  const tenant = await resolveAdminMutationTenantId(requested);
  if (tenant !== MD_STRIKERS_TENANT_ID) {
    throw new Error('News advertisement switches are only available for MD Strikers.');
  }
  return tenant;
}

async function readStore(): Promise<NewsAdVisibility> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    return normalizeNewsAdVisibility(JSON.parse(raw));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return normalizeNewsAdVisibility(null);
    throw error;
  }
}

async function writeStore(settings: NewsAdVisibility): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(normalizeNewsAdVisibility(settings), null, 2), 'utf8');
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
  };
}

async function fetchStrapiSlots(): Promise<NewsAdSlotRow[]> {
  const query = `/advertisement-slots?filters[tenant][tenantId][$eq]=${encodeURIComponent(MD_STRIKERS_TENANT_ID)}&pagination[pageSize]=50&sort=priority:asc`;
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

async function publishVisibility(settings: NewsAdVisibility, slots: NewsAdSlotRow[]): Promise<void> {
  for (const slot of slots) {
    const isVisible = slotIsShown(settings, slot.id);
    const result = await strapiJson(`/advertisement-slots/${encodeURIComponent(slot.documentId)}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { isVisible } }),
    });
    if (!result.ok) {
      throw new Error('The switch was saved, but the news page did not accept the change. Restart Strapi if this is the first time the visibility field is used.');
    }
  }
}

export async function fetchNewsAdVisibility(tenantId?: string): Promise<NewsAdVisibilityResult> {
  try {
    await requireMdStrikersTenant(tenantId);
    const [stored, slots] = await Promise.all([readStore(), fetchStrapiSlots()]);
    const settings = normalizeNewsAdVisibility(stored, slots.map((slot) => String(slot.id)));
    return { settings, slots, error: null };
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
    await requireMdStrikersTenant(tenantId);
    const slots = await fetchStrapiSlots();
    const next = normalizeNewsAdVisibility(settings, slots.map((slot) => String(slot.id)));
    await writeStore(next);
    await publishVisibility(next, slots);
    return { settings: next, slots, error: null };
  } catch (error) {
    return {
      settings: null,
      slots: [],
      error: error instanceof Error ? error.message : 'Could not save news advertisement switches.',
    };
  }
}
