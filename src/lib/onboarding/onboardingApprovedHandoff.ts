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

export function buildManualStepsText(request: TenantOnboardingRequestDTO, tenantId?: string | null): string {
  const host = request.requestedHostname || '<hostname>';
  const bare = stripWww(host) || '<apex>';
  const tid = tenantId || request.assignedTenantId || '<tenant_id>';
  const noreply = request.noreplyEmail || 'the no-reply address';
  const site = siteTypeLabel(request.siteType as TenantSiteType | undefined);
  const ownership = domainOwnershipLabel(request.domainOwnership as DomainOwnership | undefined);

  return [
    `Remaining manual steps for ${request.organizationName || 'organization'}`,
    `Request code: ${request.requestCode || '—'}`,
    `Site type: ${site}`,
    `Domain ownership: ${ownership}`,
    '',
    domainOwnershipGuidance(request.domainOwnership),
    ...(request.registrarNotes?.trim() ? ['', 'Registrar notes:', request.registrarNotes.trim()] : []),
    '',
    `1. DNS: point ${host} (and bare domain ${bare}) at the satellite Amplify app.`,
    `2. Amplify: add the custom domain, then set NEXT_PUBLIC_TENANT_ID=${tid} and the site env vars on the satellite app.`,
    `3. Clerk: add ${host} as a satellite domain on the production instance and verify its DNS records.`,
    `4. Email: verify the sending domain for ${noreply} in SES.`,
    `5. Payments (if requested): set up Stripe keys in Tenant Settings.`,
  ].join('\n');
}

export function buildOrganizationDetailsText(org: TenantOrganizationDTO): string {
  const sequence = org.tenantId ? extractTenantIdSequence(org.tenantId) : null;
  return [
    'Organization Details',
    `Organization Name: ${org.organizationName || '—'}`,
    `Website Tenant ID: ${org.tenantId || '—'}`,
    `Tenant ID Sequence: ${sequence != null ? sequence : 'Not parsed'}`,
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
