/**
 * Super admin suspension of a tenant's public website and/or its admin and retail dashboards.
 * Backend fields live on tenant_settings (one tenant ID) and tenant_organization (every tenant ID
 * it owns). See src/lib/tenantSuspension for the logic.
 */
export interface TenantSuspensionFlags {
  websiteSuspended?: boolean | null;
  dashboardSuspended?: boolean | null;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
}

export type SuspensionSource = 'tenant' | 'organization' | null;

export interface EffectiveTenantSuspension {
  tenantId: string;
  website: boolean;
  dashboard: boolean;
  websiteSource: SuspensionSource;
  dashboardSource: SuspensionSource;
  /** Internal note for super admins. Never shown on the public site. */
  reason: string | null;
}

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

/** One tenant ID under an organization, with its own flags and the combined result. */
export interface OrganizationTenantSuspensionRow {
  settingsId: number;
  tenantId: string;
  tenant: TenantSuspensionFlags;
  effective: EffectiveTenantSuspension;
}

/** One organization in the Suspend Sites organization picker. */
export interface SuspensionOrganizationOption {
  organizationId: number;
  organizationName: string;
  flags: TenantSuspensionFlags;
}

/** One row of the Suspend Sites tenant ID list. */
export interface TenantSuspensionListRow {
  settingsId: number;
  tenantId: string;
  organizationId: number | null;
  organizationName: string | null;
  tenant: TenantSuspensionFlags;
  effective: EffectiveTenantSuspension;
}

export interface TenantSuspensionListPage {
  rows: TenantSuspensionListRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}
