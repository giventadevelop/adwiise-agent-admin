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
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import type { PlatformProduct, TenantProductBillingDTO } from '@/types/platformBilling';
import { fetchTenantOrganization, fetchTenantOrganizationByTenantId, patchTenantOrganization } from './ApiServerActions';
import { createTenantSetting } from '@/app/admin/tenant-management/settings/ApiServerActions';

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
  isChildOrganization?: boolean;
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
    settingsWebsites?: Array<{ settingsId?: number; tenantId?: string; organizationId?: number }>;
    viewedIsClient: boolean;
  };
  const client = body.client;
  if (!client?.id) {
    throw new Error('Client organization was not found');
  }
  const websites: OrganizationWebsiteRow[] = [];
  for (const site of body.settingsWebsites || []) {
    if (!site.tenantId || site.settingsId == null) continue;
    websites.push({
      id: site.organizationId || client.id,
      tenantId: site.tenantId,
      organizationName: client.organizationName,
      isHome: false,
      settingsId: site.settingsId,
    });
  }
  for (const site of body.websites || []) {
    const tenantId = site.websiteTenantIds?.[0] || site.tenantId;
    if (!site.id || !tenantId) continue;
    websites.push({
      id: site.id,
      tenantId,
      organizationName: site.organizationName,
      isHome: false,
      isChildOrganization: true,
      settingsId: await settingsIdFor(tenantId),
    });
  }
  return {
    clientId: client.id,
    clientName: client.organizationName,
    homeTenantId: websites[0]?.tenantId || '',
    viewedIsClient: body.viewedIsClient !== false,
    websites,
  };
}

export async function createWebsiteForOrganization(organizationId: number, tenantId: string): Promise<void> {
  await assertPlatformSuperAdmin();
  const websiteTenantId = tenantId.trim();
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(websiteTenantId)) {
    throw new Error('Website tenant id must use lowercase letters, numbers, and underscores.');
  }
  await createTenantSetting({
    tenantId: websiteTenantId,
    organizationId,
    allowUserRegistration: true,
    requireAdminApproval: false,
    enableEmailMarketing: false,
    isMembershipSubscriptionEnabled: false,
    enableGuestRegistration: true,
    showEventsSectionInHomePage: true,
    showTeamMembersSectionInHomePage: true,
    showSponsorsSectionInHomePage: true,
    homepageCacheVersion: 0,
    displayEventHeroImages: true,
    enableGoogleAdsense: false,
    showPublicProfileHeroSection: false,
    showProfileWritingsSection: false,
    showProfileAchievementsSection: false,
    showProfileAffiliationsSection: false,
    showProfileMediaDownloadsSection: false,
    showProfileContactSection: false,
    showProfileFamilySection: false,
    showProfileProjectsSection: false,
    showProfileServicesSection: false,
    showLeagueStandingsSectionInHomePage: false,
    showHeaderLeagues: false,
    showNewsAdvertisements: true,
    enableGasStationModule: false,
    enableRetailModule: false,
  });
}

async function organizationIdForTenant(tenantId: string): Promise<number> {
  const match = await fetchTenantOrganizationByTenantId(tenantId);
  if (!match?.id) throw new Error(`Organization for tenant ${tenantId} was not found.`);
  return match.id;
}

export async function resolveClientOrganizationId(organizationIdOrTenant: string): Promise<number> {
  await assertPlatformSuperAdmin();
  const trimmed = organizationIdOrTenant.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return organizationIdForTenant(trimmed);
}

export async function attachWebsiteToClient(clientOrganizationId: number, tenantId: string): Promise<void> {
  await assertPlatformSuperAdmin();
  const websiteId = /^\d+$/.test(tenantId.trim())
    ? Number(tenantId.trim())
    : await organizationIdForTenant(tenantId.trim());
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
  const tenantId = current.websiteTenantIds?.[0]?.trim() || current.tenantId?.trim();
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

export async function loadOrganizationFlatFee(organizationId: number, _homeTenantId: string): Promise<OrganizationFlatFee> {
  await assertPlatformSuperAdmin();
  const organization = await fetchTenantOrganization(organizationId);
  const monthlyUsd = organization?.monthlyFeeUsd != null ? Number(organization.monthlyFeeUsd) : null;
  return {
    billingId: null,
    monthlyUsd,
    chargeEnabled: monthlyUsd != null && monthlyUsd > 0,
    status: monthlyUsd != null && monthlyUsd > 0 ? 'PAYMENT_DUE' : null,
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
  await patchTenantOrganization(input.organizationId, {
    monthlyFeeUsd: amount <= 0 ? null : amount,
  });
  if (amount <= 0) {
    return { billingId: null, monthlyUsd: null, chargeEnabled: false, status: 'COMPLIMENTARY' };
  }
  return { billingId: null, monthlyUsd: amount, chargeEnabled: true, status: 'PAYMENT_DUE' };
}

export type TenantMovePreview = {
  settingsId: number;
  tenantId: string;
  organizationId: number;
  organizationName: string;
};

export async function lookupTenantForMove(tenantId: string): Promise<TenantMovePreview> {
  await assertPlatformSuperAdmin();
  const trimmed = tenantId.trim();
  if (!trimmed) throw new Error('Enter a tenant ID.');
  const params = new URLSearchParams();
  params.set('tenantId.equals', trimmed);
  const response = await fetchWithJwtRetry(`${getBackendApiUrl()}/api/tenant-settings?${params.toString()}`, unscoped);
  if (!response.ok) {
    throw new Error(await readError(response, 'Could not look up that tenant ID'));
  }
  const data = (await response.json()) as Array<{ id?: number; tenantId?: string; tenantOrganization?: { id?: number } }>;
  const row = Array.isArray(data) ? data[0] : null;
  const organizationId = row?.tenantOrganization?.id;
  if (!row?.id || !row.tenantId || organizationId == null) {
    throw new Error(`No tenant settings row was found for ${trimmed}.`);
  }
  const organization = await fetchTenantOrganization(organizationId);
  return {
    settingsId: row.id,
    tenantId: row.tenantId,
    organizationId,
    organizationName: organization?.organizationName || `Organization #${organizationId}`,
  };
}

export async function reassignTenantToOrganization(tenantId: string, destinationOrganizationId: number): Promise<void> {
  await assertPlatformSuperAdmin();
  const current = await lookupTenantForMove(tenantId);
  if (current.organizationId === destinationOrganizationId) {
    throw new Error('That tenant ID is already on this organization.');
  }
  const response = await fetchWithJwtRetry(
    `${getBackendApiUrl()}/api/tenant-settings/${current.settingsId}/organization`,
    {
      ...unscoped,
      method: 'PUT',
      body: JSON.stringify({ organizationId: destinationOrganizationId }),
    },
  );
  if (!response.ok) {
    throw new Error(await readError(response, 'Could not move the tenant ID'));
  }
  await uncoverTenant(current.tenantId, current.organizationId).catch((error) => {
    console.error('[organization-billing] previous cover note was not removed', error);
  });
  await coverTenantWhenOrganizationIsCharged(destinationOrganizationId, current.tenantId).catch((error) => {
    console.error('[organization-billing] moved tenant was not marked covered', error);
  });
}
