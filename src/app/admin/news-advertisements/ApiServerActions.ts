'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import {
  MD_STRIKERS_TENANT_ID,
  defaultNewsAdVisibility,
  normalizeNewsAdVisibility,
  type NewsAdVisibility,
} from './newsAdSlots';

const STORE_PATH = path.join(process.cwd(), 'data', 'md-strikers-10-news-ad-visibility.json');

export type NewsAdVisibilityResult = {
  settings: NewsAdVisibility | null;
  error: string | null;
};

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
    if (code === 'ENOENT') return defaultNewsAdVisibility();
    throw error;
  }
}

async function writeStore(settings: NewsAdVisibility): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const payload = normalizeNewsAdVisibility(settings);
  await fs.writeFile(STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

export async function fetchNewsAdVisibility(tenantId?: string): Promise<NewsAdVisibilityResult> {
  try {
    await requireMdStrikersTenant(tenantId);
    return { settings: await readStore(), error: null };
  } catch (error) {
    return {
      settings: null,
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
    const next = normalizeNewsAdVisibility(settings);
    await writeStore(next);
    return { settings: next, error: null };
  } catch (error) {
    return {
      settings: null,
      error: error instanceof Error ? error.message : 'Could not save news advertisement switches.',
    };
  }
}
