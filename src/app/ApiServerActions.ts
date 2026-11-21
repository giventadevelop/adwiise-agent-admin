'use server';

import type { TenantOrganizationDTO, TenantSettingsDTO } from '@/types';
import { getApiBaseUrl, getTenantId } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { loadOrganizationForTenantId } from '@/app/admin/tenant-management/organizations/websiteTenantIdsServer';
import { resolveTenantOrganizationIdentity } from '@/lib/resolveTenantOrganizationIdentity';
import { formatOrganizationAddress } from '@/lib/formatOrganizationAddress';
import type { FooterContactProps } from '@/lib/footerContactTypes';

export type { FooterContactProps } from '@/lib/footerContactTypes';

/**
 * Fetch tenant settings for the current tenant
 * Used by homepage to determine section visibility
 */
export async function fetchTenantSettingsServer(): Promise<TenantSettingsDTO | null> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    if (!API_BASE_URL) {
      console.error('[fetchTenantSettingsServer] API base URL not configured');
      return null;
    }

    const tenantId = getTenantId();
    console.log('[fetchTenantSettingsServer] 🔍 Fetching tenant settings for:', tenantId);

    const response = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/tenant-settings?tenantId.equals=${encodeURIComponent(tenantId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      console.error('[fetchTenantSettingsServer] ❌ Failed to fetch tenant settings:', response.status);
      return null;
    }

    const data = await response.json();
    const settings = Array.isArray(data) ? data[0] : data;
    
    if (settings) {
      console.log('[fetchTenantSettingsServer] ✅ Tenant settings fetched:', {
        tenantId: settings.tenantId,
        showEvents: settings.showEventsSectionInHomePage,
        showTeam: settings.showTeamMembersSectionInHomePage,
        showSponsors: settings.showSponsorsSectionInHomePage
      });
    } else {
      console.warn('[fetchTenantSettingsServer] ⚠️ No tenant settings found for tenantId:', tenantId);
    }

    return settings || null;
  } catch (error) {
    console.error('[fetchTenantSettingsServer] ❌ Error fetching tenant settings:', error);
    return null;
  }
}

/**
 * Fetch tenant organization for the current tenant (first match by tenantId).
 */
export async function fetchTenantOrganizationByTenantIdServer(
  tenantId?: string,
): Promise<TenantOrganizationDTO | null> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    if (!API_BASE_URL) {
      console.error('[fetchTenantOrganizationByTenantIdServer] API base URL not configured');
      return null;
    }

    const tid = tenantId ?? getTenantId();
    return (await loadOrganizationForTenantId(tid)) as unknown as TenantOrganizationDTO | null;
  } catch (error) {
    console.error('[fetchTenantOrganizationByTenantIdServer] Error:', error);
    return null;
  }
}

/** Resolved org identity + operational contact fields for public footer/contact UI. */
export async function fetchFooterContactPropsServer(
  tenantId?: string,
): Promise<FooterContactProps> {
  const empty: FooterContactProps = {
    formattedAddress: null,
    phoneNumber: null,
    email: null,
    websiteUrl: null,
    description: null,
  };

  try {
    const [settings, organization] = await Promise.all([
      fetchTenantSettingsServer(),
      fetchTenantOrganizationByTenantIdServer(tenantId),
    ]);

    const identity = resolveTenantOrganizationIdentity(organization, settings);

    return {
      formattedAddress: formatOrganizationAddress(identity),
      phoneNumber: settings?.phoneNumber?.trim() || organization?.contactPhone?.trim() || null,
      email: settings?.email?.trim() || organization?.contactEmail?.trim() || null,
      websiteUrl: identity.websiteUrl,
      description: identity.description,
    };
  } catch (error) {
    console.error('[fetchFooterContactPropsServer] Error:', error);
    return empty;
  }
}