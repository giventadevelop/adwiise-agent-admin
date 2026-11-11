import {
  DOMAIN_OWNERSHIP_OPTIONS,
  ONBOARDING_SITE_TYPE_OPTIONS,
  stripWww,
} from '@/lib/onboarding/onboardingShared';
import { extractTenantIdSequence, getTenantIdPrefix } from '@/lib/tenantIdGeneration';
import type { DomainOwnership, TenantOnboardingRequestDTO, TenantSiteType } from '@/types';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

export function siteTypeLabel(value: string | null | undefined): string {
  const match = ONBOARDING_SITE_TYPE_OPTIONS.find((o) => o.value === value);
  if (match) return `${match.label} (${match.value})`;
  return value || 'Not set';
}

export function domainOwnershipLabel(value: string | null | undefined): string {
  const match = DOMAIN_OWNERSHIP_OPTIONS.find((o) => o.value === value);
  if (match) return `${match.label} (${match.value})`;
  return value || 'Not set';
}

function domainOwnershipGuidance(ownership: DomainOwnership | string | null | undefined): string {
  switch (ownership) {
    case 'PLATFORM_REGISTERS':
      return (
        'Domain ownership: PLATFORM_REGISTERS — register the apex domain in Route 53, ' +
        'create a hosted zone, then attach the Amplify custom domain to that zone.'
      );
    case 'CUSTOMER_REGISTRAR':
      return (
        'Domain ownership: CUSTOMER_REGISTRAR — DNS-only handoff at the customer’s registrar ' +
        '(NS to Route 53, or CNAME/ALIAS to Amplify). Do not assume a hosted zone already exists ' +
        'unless the platform owns DNS; create or receive NS records as needed.'
      );
    case 'ALREADY_IN_PLATFORM':
      return (
        'Domain ownership: ALREADY_IN_PLATFORM — confirm the existing Route 53 hosted zone ' +
        'and Amplify custom-domain mapping before changing DNS.'
      );
    default:
      return `Domain ownership: ${ownership || 'not specified'}.`;
  }
}

export type HubDatabase = 'local' | 'dev' | 'prod';

export type OrganizationDetailRow = { label: string; value: string };

function isLoopback(value: string): boolean {
  const host = value.toLowerCase();
  return host.includes('localhost') || host.includes('127.0.0.1') || host.includes('[::1]');
}

/** Which database the open hub is reading: loopback is local, a dev/staging host is dev, otherwise prod. */
export function hubDatabaseLabel(pageHost?: string | null, apiBase?: string | null): HubDatabase {
  const host = (pageHost || '').trim();
  const api = (apiBase || '').trim();
  if (isLoopback(host) || isLoopback(api)) return 'local';
  const combined = `${host} ${api}`.toLowerCase();
  if (combined.includes('dev') || combined.includes('staging')) return 'dev';
  return 'prod';
}

function filled(value: string | null | undefined, missing = 'Not provided'): string {
  const trimmed = (value ?? '').trim();
  return trimmed || missing;
}

function stripeAtLaunch(wantsPayments: boolean | null | undefined): string {
  if (wantsPayments === true) return 'yes';
  if (wantsPayments === false) return 'no';
  return 'Not provided';
}

function withScheme(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function mailingAddress(source: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipCode?: string | null;
  country?: string | null;
}): string {
  const cityLine = [source.city, source.stateProvince, source.zipCode]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
  return [source.addressLine1, source.addressLine2, cityLine, source.country]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

export function organizationDetailRows(
  org: TenantOrganizationDTO,
  request: TenantOnboardingRequestDTO,
  hubDatabase: HubDatabase
): OrganizationDetailRow[] {
  const tenantId = (org.tenantId || '').trim();
  const sequence = tenantId ? extractTenantIdSequence(tenantId) : null;
  const prefix = tenantId ? getTenantIdPrefix(tenantId) : null;
  const website = (org.websiteUrl || request.requestedHostname || '').trim();
  const address = mailingAddress(org) || mailingAddress(request);
  const requestContactName = [request.contactFirstName, request.contactLastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const storedContactName = (org.contactPersonName || '').trim();
  const contactName =
    storedContactName && storedContactName.toLowerCase() !== 'pending'
      ? storedContactName
      : requestContactName;

  return [
    { label: 'Database ID (PK)', value: org.id != null ? String(org.id) : 'Not available' },
    { label: 'Tenant ID', value: filled(tenantId) },
    { label: 'Tenant ID Sequence', value: sequence != null ? String(sequence) : 'Not parsed' },
    { label: 'Tenant ID Prefix', value: prefix || 'Not parsed' },
    { label: 'Organization Name', value: filled(org.organizationName) },
    { label: 'Contact Email', value: filled(org.contactEmail || request.contactEmail) },
    { label: 'Contact Phone', value: filled(org.contactPhone || request.contactPhone) },
    { label: 'Contact person name', value: contactName || 'Pending' },
    { label: 'Website URL', value: website ? withScheme(website) : 'Not provided' },
    { label: 'Site type', value: filled(request.siteType || org.siteType) },
    { label: 'Domain ownership', value: filled(request.domainOwnership) },
    { label: 'Mailing address', value: filled(address) },
    { label: 'Stripe at launch', value: stripeAtLaunch(request.wantsPayments) },
    { label: 'Hub database', value: hubDatabase },
    { label: 'Request code', value: filled(request.requestCode) },
    { label: 'Satellite key', value: filled(request.satelliteKey) },
  ];
}

export function buildOrganizationDetailsText(
  org: TenantOrganizationDTO,
  request: TenantOnboardingRequestDTO,
  hubDatabase: HubDatabase
): string {
  const lines = organizationDetailRows(org, request, hubDatabase).flatMap((row) => [row.label, row.value]);
  return ['Organization Details', ...lines].join('\n');
}

export function manualReminderSteps(
  request: TenantOnboardingRequestDTO,
  tenantId: string | null | undefined,
  hubDatabase: HubDatabase
): string[] {
  const host = request.requestedHostname || '<hostname>';
  const bare = stripWww(host) || '<apex>';
  const tid = tenantId || request.assignedTenantId || '<tenant_id>';
  const noreply = request.noreplyEmail || 'the no-reply address';
  const stripe = stripeAtLaunch(request.wantsPayments);
  return [
    `DNS: point ${host} (and the bare domain ${bare}) at the satellite Amplify app.`,
    `Amplify: add the custom domain, then set NEXT_PUBLIC_TENANT_ID=${tid} and the site env vars on the satellite app.`,
    `Clerk: add ${host} as a satellite domain on the ${hubDatabase} Clerk instance and verify its DNS records. Production Clerk waits until the dev path has succeeded.`,
    `Email: verify the sending domain for ${noreply} in SES.`,
    `Payments: Stripe at launch is ${stripe}. Set up Stripe keys in Tenant Settings when the answer is yes.`,
  ];
}

export function buildManualStepsText(
  request: TenantOnboardingRequestDTO,
  tenantId?: string | null,
  hubDatabase: HubDatabase = 'local'
): string {
  const site = siteTypeLabel(request.siteType as TenantSiteType | undefined);
  const ownership = domainOwnershipLabel(request.domainOwnership as DomainOwnership | undefined);
  const steps = manualReminderSteps(request, tenantId, hubDatabase).map((step, index) => `${index + 1}. ${step}`);

  return [
    `Remaining manual steps for ${request.organizationName || 'organization'}`,
    `Request code: ${request.requestCode || '—'}`,
    `Site type: ${site}`,
    `Domain ownership: ${ownership}`,
    '',
    domainOwnershipGuidance(request.domainOwnership),
    ...(request.registrarNotes?.trim() ? ['', 'Registrar notes:', request.registrarNotes.trim()] : []),
    '',
    ...steps,
  ].join('\n');
}

export function suggestFolderFromHostname(hostname: string | null | undefined): string {
  const bare = stripWww((hostname || '').trim().toLowerCase());
  const first = bare.split('.')[0] || 'new-org';
  return first.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'new-org';
}

export function buildCursorEnvHandoffText(
  request: TenantOnboardingRequestDTO,
  tenantId?: string | null
): string {
  const host = request.requestedHostname || 'www.example.com';
  const tid = tenantId || request.assignedTenantId || '<tenant_id>';
  const folder = suggestFolderFromHostname(host);
  const httpsHost = host.startsWith('http') ? host : `https://${host}`;

  return [
    'Cursor rule handoff — Copy_FrontendProjectFrom_Template.mdc',
    'Rule path: F:\\project_workspace\\application-deployments\\.cursor\\rules\\Copy_FrontendProjectFrom_Template.mdc',
    'Pattern env reference (do not paste secrets): F:\\project_workspace\\kcnj-prod\\.env.local',
    '',
    '--- Copy-paste user prompt ---',
    `Copy F:\\project_workspace\\kcnj-temp to F:\\project_workspace\\${folder}.`,
    `Include .env.local. Change the domain to ${host}.`,
    `Optional: tenant id ${tid}, local port 3003.`,
    'Follow .cursor/rules/Copy_FrontendProjectFrom_Template.mdc',
    '',
    '--- .env.local / .env.production values to customize for this satellite ---',
    `NEXT_PUBLIC_APP_URL=${httpsHost}`,
    'NEXT_PUBLIC_CLERK_IS_SATELLITE=true',
    `NEXT_PUBLIC_CLERK_DOMAIN=${host}`,
    `NEXT_PUBLIC_TENANT_ID=${tid}`,
    'NEXT_PUBLIC_API_BASE_URL=<leave as template / set per environment>',
  ].join('\n');
}
