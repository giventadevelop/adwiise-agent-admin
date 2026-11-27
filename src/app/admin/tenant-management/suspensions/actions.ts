'use server';

import { revalidatePath } from 'next/cache';
import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { getApiBaseUrl, getTenantIdOptional } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { withTenantId } from '@/lib/withTenantId';
import { clearTenantSuspensionCache, getTenantSuspension } from '@/lib/tenantSuspension/server';
import {
  combineSuspension,
  type EffectiveTenantSuspension,
  type TenantSuspensionFlags,
} from '@/lib/tenantSuspension/types';

const BACKEND_NOT_READY =
  'The backend did not save the suspension. The tenant_settings and tenant_organization suspension columns have to be deployed on the backend first.';

export interface SuspensionInput {
  websiteSuspended: boolean;
  dashboardSuspended: boolean;
  reason?: string;
}

export interface TenantSuspensionLookup {
  settingsId: number;
  tenantId: string;
  organizationId: number | null;
  organizationName: string | null;
  tenant: TenantSuspensionFlags;
  organization: TenantSuspensionFlags | null;
  effective: EffectiveTenantSuspension;
}

export interface SuspendedTenantRow {
  settingsId: number;
  tenantId: string;
  organizationId: number | null;
  organizationName: string | null;
  flags: TenantSuspensionFlags;
}

export interface SuspendedOrganizationRow {
  organizationId: number;
  organizationName: string;
  flags: TenantSuspensionFlags;
}

type SettingsRow = TenantSuspensionFlags & {
  id?: number;
  tenantId?: string;
  tenantOrganization?: { id?: number; organizationName?: string } | null;
};

type OrganizationRow = TenantSuspensionFlags & { id?: number; organizationName?: string };

function pickFlags(row: TenantSuspensionFlags | null | undefined): TenantSuspensionFlags {
  return {
    websiteSuspended: row?.websiteSuspended === true,
    dashboardSuspended: row?.dashboardSuspended === true,
    suspensionReason: row?.suspensionReason ?? null,
    suspendedAt: row?.suspendedAt ?? null,
  };
}

function cleanReason(reason: string | undefined): string {
  return (reason ?? '').trim().slice(0, 500);
}

/** The tenant ID this deployment serves. Its public site and dashboard stay on so the platform is never locked out. */
function hubTenantId(): string {
  return getTenantIdOptional()?.trim() || '';
}

async function readJson<T>(response: Response, failure: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text && text.length < 300 ? `${failure}: ${text}` : failure);
  }
  return (await response.json()) as T;
}

async function fetchSettingsById(settingsId: number): Promise<SettingsRow> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings/${settingsId}`, {
    cache: 'no-store',
  });
  return readJson<SettingsRow>(response, 'Could not load that tenant ID');
}

async function fetchSettingsByTenantId(tenantId: string): Promise<SettingsRow | null> {
  const params = new URLSearchParams({ 'tenantId.equals': tenantId, size: '1' });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'X-Tenant-ID': tenantId },
  });
  const rows = await readJson<SettingsRow[]>(response, 'Could not look up that tenant ID');
  return (Array.isArray(rows) ? rows : []).find((row) => row.tenantId?.trim() === tenantId) ?? null;
}

async function fetchOrganization(id: number): Promise<OrganizationRow | null> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${id}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  return readJson<OrganizationRow>(response, 'Could not load that organization');
}

/** Tenant IDs that belong to an organization (up to 500), used to clear cached answers. */
async function organizationTenantIds(organizationId: number): Promise<string[]> {
  const params = new URLSearchParams({
    'tenantOrganizationId.equals': String(organizationId),
    size: '500',
  });
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as SettingsRow[];
  return (Array.isArray(rows) ? rows : [])
    .map((row) => row.tenantId?.trim() || '')
    .filter(Boolean);
}

function nextFlags(input: SuspensionInput, stored: TenantSuspensionFlags | null | undefined): TenantSuspensionFlags {
  const anyOn = input.websiteSuspended || input.dashboardSuspended;
  const wasOn = stored?.websiteSuspended === true || stored?.dashboardSuspended === true;
  return {
    websiteSuspended: input.websiteSuspended,
    dashboardSuspended: input.dashboardSuspended,
    // Merge-patch ignores null on this backend, so an empty string clears the note.
    suspensionReason: anyOn ? cleanReason(input.reason) : '',
    suspendedAt: anyOn ? (wasOn && stored?.suspendedAt ? stored.suspendedAt : new Date().toISOString()) : null,
  };
}

function savedAsRequested(saved: TenantSuspensionFlags, wanted: TenantSuspensionFlags): boolean {
  return (
    (saved.websiteSuspended === true) === (wanted.websiteSuspended === true) &&
    (saved.dashboardSuspended === true) === (wanted.dashboardSuspended === true) &&
    'websiteSuspended' in saved
  );
}

/** Look up one tenant ID: its own flags, its organization's flags, and the combined result. */
export async function lookupTenantSuspension(tenantIdInput: string): Promise<TenantSuspensionLookup | null> {
  await assertPlatformSuperAdmin();
  const tenantId = tenantIdInput.trim();
  if (!tenantId) return null;
  const row = await fetchSettingsByTenantId(tenantId);
  if (!row?.id) return null;
  const orgId = row.tenantOrganization?.id ?? null;
  const org = orgId ? await fetchOrganization(orgId).catch(() => null) : null;
  return {
    settingsId: row.id,
    tenantId,
    organizationId: orgId,
    organizationName: org?.organizationName ?? row.tenantOrganization?.organizationName ?? null,
    tenant: pickFlags(row),
    organization: org ? pickFlags(org) : null,
    effective: combineSuspension(tenantId, row, org),
  };
}

/** Suspend or re-enable one tenant ID's website and/or dashboard. */
export async function saveTenantSuspension(settingsId: number, input: SuspensionInput): Promise<TenantSuspensionLookup | null> {
  await assertPlatformSuperAdmin();
  const existing = await fetchSettingsById(settingsId);
  const tenantId = existing.tenantId?.trim() || '';
  if (!tenantId) throw new Error('That settings row has no tenant ID.');
  if (tenantId === hubTenantId() && (input.websiteSuspended || input.dashboardSuspended)) {
    throw new Error('This is the tenant ID of the hub you are signed in to. It cannot be suspended from here.');
  }
  const flags = nextFlags(input, existing);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-settings/${settingsId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json', 'X-Tenant-ID': tenantId },
    body: JSON.stringify({
      id: settingsId,
      tenantId,
      tenantOrganization: existing.tenantOrganization?.id ? { id: existing.tenantOrganization.id } : undefined,
      ...flags,
      updatedAt: new Date().toISOString(),
    }),
  });
  const saved = await readJson<SettingsRow>(response, 'Could not save the suspension');
  if (!savedAsRequested(saved, flags)) throw new Error(BACKEND_NOT_READY);
  clearTenantSuspensionCache([tenantId]);
  revalidatePath('/admin/tenant-management/suspensions');
  return lookupTenantSuspension(tenantId);
}

/** Suspend or re-enable every tenant ID in an organization. */
export async function saveOrganizationSuspension(
  organizationId: number,
  input: SuspensionInput,
): Promise<SuspendedOrganizationRow> {
  await assertPlatformSuperAdmin();
  const existing = await fetchOrganization(organizationId);
  if (!existing?.id) throw new Error('That organization no longer exists.');
  const tenantIds = await organizationTenantIds(organizationId);
  const hub = hubTenantId();
  if (hub && tenantIds.includes(hub) && (input.websiteSuspended || input.dashboardSuspended)) {
    throw new Error('This organization owns the tenant ID of the hub you are signed in to. It cannot be suspended from here.');
  }
  const flags = nextFlags(input, existing);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/tenant-organizations/${organizationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(
      withTenantId({
        id: organizationId,
        ...flags,
        updatedAt: new Date().toISOString(),
      }),
    ),
  });
  const saved = await readJson<OrganizationRow>(response, 'Could not save the suspension');
  if (!savedAsRequested(saved, flags)) throw new Error(BACKEND_NOT_READY);
  clearTenantSuspensionCache(tenantIds);
  revalidatePath('/admin/tenant-management/suspensions');
  revalidatePath(`/admin/tenant-management/organizations/${organizationId}`);
  return {
    organizationId,
    organizationName: saved.organizationName ?? existing.organizationName ?? `Organization #${organizationId}`,
    flags: pickFlags(saved),
  };
}

/** Suspension flags for a page of an organization's tenant IDs (for badges on the organization page). */
export async function fetchTenantSuspensionBadges(tenantIds: string[]): Promise<Record<string, EffectiveTenantSuspension>> {
  await assertPlatformSuperAdmin();
  const unique = [...new Set(tenantIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  const entries = await Promise.all(unique.map(async (id) => [id, await getTenantSuspension(id)] as const));
  return Object.fromEntries(entries);
}

async function listSuspendedRows<T extends TenantSuspensionFlags>(apiPath: string): Promise<T[]> {
  const found = new Map<number, T>();
  for (const field of ['websiteSuspended', 'dashboardSuspended']) {
    const params = new URLSearchParams({ [`${field}.equals`]: 'true', size: '500' });
    const response = await fetchWithJwtRetry(`${getApiBaseUrl()}${apiPath}?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) continue;
    const rows = (await response.json()) as Array<T & { id?: number }>;
    for (const row of Array.isArray(rows) ? rows : []) {
      // Filter here too: an older backend ignores the unknown filter and returns every row.
      if (row.id != null && (row.websiteSuspended === true || row.dashboardSuspended === true)) {
        found.set(row.id, row);
      }
    }
  }
  return [...found.values()];
}

/** Everything that is currently suspended, for the Suspensions page. */
export async function listSuspensions(): Promise<{
  tenants: SuspendedTenantRow[];
  organizations: SuspendedOrganizationRow[];
}> {
  await assertPlatformSuperAdmin();
  const [settingsRows, orgRows] = await Promise.all([
    listSuspendedRows<SettingsRow>('/api/tenant-settings'),
    listSuspendedRows<OrganizationRow>('/api/tenant-organizations'),
  ]);
  return {
    tenants: settingsRows
      .map((row) => ({
        settingsId: row.id as number,
        tenantId: row.tenantId?.trim() || '',
        organizationId: row.tenantOrganization?.id ?? null,
        organizationName: row.tenantOrganization?.organizationName ?? null,
        flags: pickFlags(row),
      }))
      .sort((a, b) => a.tenantId.localeCompare(b.tenantId)),
    organizations: orgRows
      .map((row) => ({
        organizationId: row.id as number,
        organizationName: row.organizationName || `Organization #${row.id}`,
        flags: pickFlags(row),
      }))
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName)),
  };
}
