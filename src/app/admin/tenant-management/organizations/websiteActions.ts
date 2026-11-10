'use server';

import { assertPlatformSuperAdmin } from '@/app/admin/adminAccessServer';
import { fetchTenantProductBillings, saveTenantProductBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { fetchTenantSettingsByTenantId } from '@/app/admin/tenant-management/settings/ApiServerActions';
import { getBackendApiUrl } from '@/lib/env';
import {
  coveredByOrganizationNote,
  organizationChargeNote,
  withNoteLine,
  withoutNoteLine,
} from '@/lib/platformBilling/complimentaryPlan';
import { cancelPlatformSubscription } from '@/lib/platformBilling/stripeCheckout';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import type { TenantOrganizationDTO } from '@/types';
import type { PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';
import { fetchTenantOrganizations } from './ApiServerActions';

const unscoped = {
  cache: 'no-store' as const,
  headers: { 'Content-Type': 'application/json' },
};

const SITE_PRODUCTS: PlatformProduct[] = ['EVENT_SITE', 'GAS_STATION'];

export type OrganizationWebsiteRow = {
  id: number;
  tenantId: string;
  organizationName: string;
  isHome: boolean;
  settingsId: number | null;
};

export type OrganizationWebsitesView = {
  clientId: number;
  clientName: string;
  homeTenantId: string;
  viewedIsClient: boolean;
  websites: OrganizationWebsiteRow[];
};

export type OrganizationFlatFee = {
  billingId: number | null;
  monthlyUsd: number | null;
  chargeEnabled: boolean;
  status: string | null;
};

function apiUrl(path: string): string {
  return `${getBackendApiUrl()}/api/tenant-organizations${path}`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { detail?: string | null; title?: string; message?: string };
    const detail = typeof parsed.detail === 'string' && parsed.detail !== 'null' ? parsed.detail.trim() : '';
    if (detail) return detail;
    if (parsed.title && parsed.title !== 'Bad Request') return parsed.title;
  } catch {
    if (text.trim()) return text.trim();
  }
  return fallback;
}

async function settingsIdFor(tenantId: string): Promise<number | null> {
  const settings = await fetchTenantSettingsByTenantId(tenantId).catch(() => null);
  return settings?.id ?? null;
}

export async function loadOrganizationWebsites(organizationId: number): Promise<OrganizationWebsitesView> {
  await assertPlatformSuperAdmin();
  const response = await fetchWithJwtRetry(apiUrl(`/${organizationId}/websites`), unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load websites'));
  }
  const body = (await response.json()) as {
    client: TenantOrganizationDTO;
    websites: TenantOrganizationDTO[];
    viewedIsClient: boolean;
  };
  const client = body.client;
  if (!client?.id || !client.tenantId) {
    throw new Error('Client organization was not found');
  }
  const homeSettingsId = await settingsIdFor(client.tenantId);
  const websites: OrganizationWebsiteRow[] = [
    {
      id: client.id,
      tenantId: client.tenantId,
      organizationName: client.organizationName,
      isHome: true,
      settingsId: homeSettingsId,
    },
  ];
  for (const site of body.websites || []) {
    if (!site.id || !site.tenantId) continue;
    websites.push({
      id: site.id,
      tenantId: site.tenantId,
      organizationName: site.organizationName,
      isHome: false,
      settingsId: await settingsIdFor(site.tenantId),
    });
  }
  return {
    clientId: client.id,
    clientName: client.organizationName,
    homeTenantId: client.tenantId,
    viewedIsClient: body.viewedIsClient !== false,
    websites,
  };
}

async function organizationIdForTenant(tenantId: string): Promise<number> {
  const listed = await fetchTenantOrganizations({ page: 0, pageSize: 5 }, { tenantId });
  const match = listed.data.find((org) => org.tenantId === tenantId && org.id != null);
  if (!match?.id) throw new Error(`Organization for tenant ${tenantId} was not found.`);
  return match.id;
}

export async function resolveClientOrganizationId(tenantId: string): Promise<number> {
  await assertPlatformSuperAdmin();
  const id = await organizationIdForTenant(tenantId.trim());
  const listed = await fetchTenantOrganizations({ page: 0, pageSize: 5 }, { tenantId: tenantId.trim() });
  const match = listed.data.find((org) => org.id === id);
  return match?.parentOrganizationId ?? id;
}

export async function attachWebsiteToClient(clientOrganizationId: number, tenantId: string): Promise<void> {
  await assertPlatformSuperAdmin();
  const websiteId = await organizationIdForTenant(tenantId.trim());
  if (websiteId === clientOrganizationId) {
    throw new Error('The home tenant is already part of this organization.');
  }
  const response = await fetchWithJwtRetry(apiUrl(`/${websiteId}/parent`), {
    ...unscoped,
    method: 'PUT',
    body: JSON.stringify({ parentOrganizationId: clientOrganizationId }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to add website'));
  }
  try {
    await coverTenantWhenOrganizationIsCharged(clientOrganizationId, tenantId.trim());
  } catch (error) {
    console.error('[organization-billing] new website was not marked covered', error);
  }
}

export async function moveWebsiteToClient(websiteOrganizationId: number, clientOrganizationId: number | null): Promise<void> {
  await assertPlatformSuperAdmin();
  const currentResponse = await fetchWithJwtRetry(apiUrl(`/${websiteOrganizationId}`), unscoped);
  if (!currentResponse.ok) {
    throw new Error(await readError(currentResponse, 'Website was not found'));
  }
  const current = (await currentResponse.json()) as TenantOrganizationDTO;
  const previousClientId = current.parentOrganizationId ?? null;
  const response = await fetchWithJwtRetry(apiUrl(`/${websiteOrganizationId}/parent`), {
    ...unscoped,
    method: 'PUT',
    body: JSON.stringify({ parentOrganizationId: clientOrganizationId }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to move website'));
  }
  const tenantId = current.tenantId?.trim();
  if (!tenantId) return;
  if (previousClientId != null && previousClientId !== clientOrganizationId) {
    await uncoverTenant(tenantId, previousClientId).catch((error) => {
      console.error('[organization-billing] previous cover note was not removed', error);
    });
  }
  if (clientOrganizationId != null) {
    await coverTenantWhenOrganizationIsCharged(clientOrganizationId, tenantId).catch((error) => {
      console.error('[organization-billing] moved website was not marked covered', error);
    });
  }
}

function findOrganizationCharge(rows: TenantProductBillingDTO[], organizationId: number): TenantProductBillingDTO | null {
  const note = organizationChargeNote(organizationId);
  return rows.find((row) => row.product === 'RETAIL' && (row.notes || '').includes(note)) ?? null;
}

async function organizationTenantIds(clientId: number, homeTenantId: string): Promise<string[]> {
  const view = await loadOrganizationWebsites(clientId);
  const ids = new Set<string>();
  if (homeTenantId.trim()) ids.add(homeTenantId.trim());
  for (const site of view.websites) ids.add(site.tenantId);
  return [...ids];
}

async function markTenantCovered(tenantId: string, organizationId: number): Promise<void> {
  const note = coveredByOrganizationNote(organizationId);
  const rows = await fetchTenantProductBillings(tenantId);
  for (const product of SITE_PRODUCTS) {
    const row = rows.find((entry) => entry.product === product);
    if (row?.stripeSubscriptionId && row.chargeEnabled) {
      try {
        await cancelPlatformSubscription(row, false);
      } catch (error) {
        console.error('[organization-billing] website subscription cancel skipped', error);
      }
    }
    await saveTenantProductBilling({
      ...(row || { tenantId, product, graceDays: 14, billingMode: 'RECURRING' }),
      tenantId,
      product,
      chargeEnabled: false,
      status: row?.status === 'LOCKED' ? 'LOCKED' : 'COMPLIMENTARY',
      notes: withNoteLine(row?.notes, note),
    });
  }
}

async function uncoverTenant(tenantId: string, organizationId: number): Promise<void> {
  const note = coveredByOrganizationNote(organizationId);
  const rows = await fetchTenantProductBillings(tenantId);
  for (const product of SITE_PRODUCTS) {
    const row = rows.find((entry) => entry.product === product);
    if (!row?.id || !(row.notes || '').includes(note)) continue;
    await saveTenantProductBilling({
      ...row,
      notes: withoutNoteLine(row.notes, note),
    });
  }
}

async function coverTenantWhenOrganizationIsCharged(organizationId: number, tenantId: string): Promise<void> {
  const view = await loadOrganizationWebsites(organizationId);
  const fee = await loadOrganizationFlatFee(view.clientId, view.homeTenantId);
  if (!fee.chargeEnabled || fee.monthlyUsd == null || fee.monthlyUsd <= 0) return;
  await markTenantCovered(tenantId, view.clientId);
}

export async function loadOrganizationFlatFee(organizationId: number, homeTenantId: string): Promise<OrganizationFlatFee> {
  await assertPlatformSuperAdmin();
  const rows = await fetchTenantProductBillings(homeTenantId);
  const row = findOrganizationCharge(rows, organizationId);
  return {
    billingId: row?.id ?? null,
    monthlyUsd: row?.customFeeUsd != null ? Number(row.customFeeUsd) : null,
    chargeEnabled: !!row?.chargeEnabled,
    status: row?.status ?? null,
  };
}

export async function saveOrganizationFlatFee(input: {
  organizationId: number;
  homeTenantId: string;
  monthlyUsd: number;
}): Promise<OrganizationFlatFee> {
  await assertPlatformSuperAdmin();
  const amount = Math.round(Number(input.monthlyUsd) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a monthly amount of zero or more.');
  }
  const homeTenantId = input.homeTenantId.trim();
  const note = organizationChargeNote(input.organizationId);
  const tenantIds = await organizationTenantIds(input.organizationId, homeTenantId);
  const primaryRows = await fetchTenantProductBillings(homeTenantId);
  const existing = findOrganizationCharge(primaryRows, input.organizationId);

  if (amount <= 0) {
    if (existing?.id) {
      await saveTenantProductBilling({
        ...existing,
        chargeEnabled: false,
        status: 'COMPLIMENTARY',
        customFeeUsd: null,
        clearCustomFee: true,
      });
    }
    for (const tenantId of tenantIds) {
      await uncoverTenant(tenantId, input.organizationId);
    }
    return { billingId: existing?.id ?? null, monthlyUsd: null, chargeEnabled: false, status: 'COMPLIMENTARY' };
  }

  for (const tenantId of tenantIds) {
    if (tenantId === homeTenantId) continue;
    const otherRows = await fetchTenantProductBillings(tenantId);
    const stale = findOrganizationCharge(otherRows, input.organizationId);
    if (!stale?.id) continue;
    if (stale.stripeSubscriptionId) {
      try {
        await cancelPlatformSubscription(stale, false);
      } catch (error) {
        console.error('[organization-billing] previous home subscription cancel skipped', error);
      }
    }
    await saveTenantProductBilling({
      ...stale,
      chargeEnabled: false,
      status: 'COMPLIMENTARY',
    });
  }

  const saved = await saveTenantProductBilling({
    ...(existing || { tenantId: homeTenantId, product: 'RETAIL', graceDays: 14 }),
    tenantId: homeTenantId,
    product: 'RETAIL',
    customFeeUsd: amount,
    chargeEnabled: true,
    billingMode: 'RECURRING',
    status: existing?.status === 'ACTIVE' || existing?.status === 'PAST_DUE' ? existing.status : 'PAYMENT_DUE',
    notes: withNoteLine(existing?.notes, note),
    clearCustomFee: false,
  });

  for (const tenantId of tenantIds) {
    await markTenantCovered(tenantId, input.organizationId);
  }

  return {
    billingId: saved.id ?? null,
    monthlyUsd: amount,
    chargeEnabled: true,
    status: saved.status ?? 'PAYMENT_DUE',
  };
}
