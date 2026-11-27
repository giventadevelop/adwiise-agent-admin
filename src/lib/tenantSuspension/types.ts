/**
 * Manual suspension of a tenant's public website and/or its admin and retail dashboards.
 * A platform super admin sets these, for example when a client misses payments.
 *
 * The flags live on two backend records:
 *   - tenant_settings (one row per website tenant ID): suspends that one site
 *   - tenant_organization (the client company): suspends every tenant ID it owns
 * A tenant ID is suspended when either its own row or its organization says so.
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

/** Field names that only the suspension tools may write. Other forms must not touch them. */
export const SUSPENSION_FIELDS = [
  'websiteSuspended',
  'dashboardSuspended',
  'suspensionReason',
  'suspendedAt',
] as const;

export function notSuspended(tenantId: string): EffectiveTenantSuspension {
  return {
    tenantId,
    website: false,
    dashboard: false,
    websiteSource: null,
    dashboardSource: null,
    reason: null,
  };
}

/** Combine a tenant ID's own flags with its organization's flags. */
export function combineSuspension(
  tenantId: string,
  tenant: TenantSuspensionFlags | null | undefined,
  organization: TenantSuspensionFlags | null | undefined,
): EffectiveTenantSuspension {
  const tenantWebsite = tenant?.websiteSuspended === true;
  const tenantDashboard = tenant?.dashboardSuspended === true;
  const orgWebsite = organization?.websiteSuspended === true;
  const orgDashboard = organization?.dashboardSuspended === true;
  const website = tenantWebsite || orgWebsite;
  const dashboard = tenantDashboard || orgDashboard;
  const reason =
    ((tenantWebsite || tenantDashboard) && tenant?.suspensionReason?.trim()) ||
    ((orgWebsite || orgDashboard) && organization?.suspensionReason?.trim()) ||
    null;
  return {
    tenantId,
    website,
    dashboard,
    websiteSource: tenantWebsite ? 'tenant' : orgWebsite ? 'organization' : null,
    dashboardSource: tenantDashboard ? 'tenant' : orgDashboard ? 'organization' : null,
    reason: reason || null,
  };
}

/** Remove suspension fields from a payload so a regular settings or organization save cannot change them. */
export function stripSuspensionFields<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const field of SUSPENSION_FIELDS) {
    delete (next as Record<string, unknown>)[field];
  }
  return next;
}

/** Copy the stored suspension fields onto a full (PUT) payload so the save keeps them. */
export function keepStoredSuspensionFields<T extends Record<string, unknown>>(
  payload: T,
  stored: TenantSuspensionFlags | null | undefined,
): T {
  const next = stripSuspensionFields(payload) as Record<string, unknown>;
  if (stored) {
    for (const field of SUSPENSION_FIELDS) {
      const value = (stored as Record<string, unknown>)[field];
      if (value !== undefined) next[field] = value;
    }
  }
  return next as T;
}

/** Paths a suspended website still serves: sign-in, admin (it has its own check), and APIs. */
const WEBSITE_SUSPENSION_EXEMPT_PREFIXES = [
  '/admin',
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/auth/',
  '/oauth',
  '/api/',
  '/trpc',
  '/__clerk',
];

export function isExemptFromWebsiteSuspension(pathname: string): boolean {
  const path = pathname.split('?')[0] || '';
  return WEBSITE_SUSPENSION_EXEMPT_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`),
  );
}
