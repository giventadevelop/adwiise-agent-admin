import type {
  DomainOwnership,
  OnboardingRequestStatus,
  TenantOnboardingSubmitDTO,
  TenantSiteType,
} from '@/types';

/**
 * Client-safe helpers shared by the public /get-started form, the public submit route and the
 * admin onboarding screens. No server-only imports here.
 */

export const ONBOARDING_SITE_TYPE_OPTIONS: { value: TenantSiteType; label: string; hint: string }[] = [
  { value: 'EVENT_ORG', label: 'Events organization', hint: 'Community groups, associations, event organizers' },
  { value: 'CHURCH_ORG', label: 'Church / parish', hint: 'Parish news, services, events and documents' },
  { value: 'SPORTS_TEAM', label: 'Sports team', hint: 'Teams, squads, fixtures' },
  { value: 'MUSIC_BAND', label: 'Music band', hint: 'Bands, choirs, performances' },
  { value: 'PERSONAL_PROFILE', label: 'Personal profile', hint: 'Individual professional or personal site' },
  { value: 'HYBRID', label: 'Hybrid', hint: 'Profile plus events' },
  { value: 'GAS_STATION', label: 'Gas station', hint: 'Fuel station operations' },
  { value: 'GAS_STATION_ENT', label: 'Gas station enterprise', hint: 'Multi-site fuel operations' },
  { value: 'LIQUOR_STORE', label: 'Liquor store', hint: 'Beer, wine, and spirits shop' },
  { value: 'DUNKIN_DONUTS', label: 'Dunkin', hint: 'Dunkin shop' },
  { value: 'SEVEN_ELEVEN', label: 'Seven-Eleven', hint: 'Convenience store' },
];

export const DOMAIN_OWNERSHIP_OPTIONS: { value: DomainOwnership; label: string }[] = [
  { value: 'CUSTOMER_REGISTRAR', label: 'I already own this domain (at my own registrar)' },
  { value: 'PLATFORM_REGISTERS', label: 'Please register the domain for me' },
  { value: 'ALREADY_IN_PLATFORM', label: 'The domain is already managed by your team' },
];

export const ONBOARDING_STATUS_STYLES: Record<OnboardingRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  FAILED: 'bg-orange-100 text-orange-800 border-orange-300',
  CANCELLED: 'bg-blue-100 text-blue-800 border-blue-300',
};

const HOSTNAME_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Lowercase, strip scheme / path / port / trailing dot. Mirrors backend TenantOnboardingSupport.normalizeHostname. */
export function normalizeOnboardingHostname(raw: string | null | undefined): string {
  if (!raw) return '';
  let h = raw.trim().toLowerCase();
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  h = h.split(/[/?#]/)[0];
  h = h.replace(/:\d+$/, '');
  h = h.replace(/\.$/, '');
  return h;
}

export function isValidOnboardingHostname(host: string): boolean {
  return HOSTNAME_PATTERN.test(host);
}

export function isValidOnboardingEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

export function stripWww(host: string): string {
  return host.startsWith('www.') ? host.slice(4) : host;
}

/** Satellite key suggestion from hostname: www.st-mary-church.org -> st-mary-church */
export function suggestSatelliteKey(host: string): string {
  const bare = stripWww(normalizeOnboardingHostname(host));
  const firstLabel = bare.split('.')[0] ?? '';
  return firstLabel
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9_]*[a-z0-9]$/;
export const SATELLITE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function trimmed(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

/**
 * Validates and normalizes untrusted submit input (public route + admin manual entry).
 * Returns per-field error messages keyed by field name.
 */
export function validateOnboardingSubmit(input: Record<string, unknown>): {
  payload: TenantOnboardingSubmitDTO;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const organizationName = trimmed(input.organizationName, 255) ?? '';
  if (!organizationName) errors.organizationName = 'Organization name is required';

  const contactEmail = (trimmed(input.contactEmail, 255) ?? '').toLowerCase();
  if (!contactEmail) errors.contactEmail = 'Contact email is required';
  else if (!isValidOnboardingEmail(contactEmail)) errors.contactEmail = 'Please enter a valid email address';

  const requestedHostname = normalizeOnboardingHostname(trimmed(input.requestedHostname, 255));
  if (!requestedHostname) errors.requestedHostname = 'Website domain is required';
  else if (!isValidOnboardingHostname(requestedHostname)) {
    errors.requestedHostname = 'Enter a domain like www.example.org';
  }

  const siteType = ONBOARDING_SITE_TYPE_OPTIONS.some((o) => o.value === input.siteType)
    ? (input.siteType as TenantSiteType)
    : undefined;
  const domainOwnership = DOMAIN_OWNERSHIP_OPTIONS.some((o) => o.value === input.domainOwnership)
    ? (input.domainOwnership as DomainOwnership)
    : undefined;

  const primaryColor = trimmed(input.primaryColor, 7);
  if (primaryColor && !isValidHexColor(primaryColor)) errors.primaryColor = 'Use a hex color like #1E40AF';
  const secondaryColor = trimmed(input.secondaryColor, 7);
  if (secondaryColor && !isValidHexColor(secondaryColor)) errors.secondaryColor = 'Use a hex color like #F59E0B';

  const logoUrl = trimmed(input.logoUrl, 1024);
  if (logoUrl && !/^https?:\/\//i.test(logoUrl)) errors.logoUrl = 'Logo URL must start with http:// or https://';

  const payload: TenantOnboardingSubmitDTO = {
    organizationName,
    contactEmail,
    requestedHostname,
    siteType,
    domainOwnership,
    description: trimmed(input.description, 4000),
    contactFirstName: trimmed(input.contactFirstName, 100),
    contactLastName: trimmed(input.contactLastName, 100),
    contactPhone: trimmed(input.contactPhone, 50),
    addressLine1: trimmed(input.addressLine1, 255),
    addressLine2: trimmed(input.addressLine2, 255),
    city: trimmed(input.city, 100),
    stateProvince: trimmed(input.stateProvince, 100),
    zipCode: trimmed(input.zipCode, 20),
    country: trimmed(input.country, 100),
    primaryColor,
    secondaryColor,
    logoUrl,
    wantsPayments: typeof input.wantsPayments === 'boolean' ? input.wantsPayments : undefined,
    customerNotes: trimmed(input.customerNotes, 4000),
  };

  return { payload, errors };
}

const BACKEND_ERROR_MESSAGES: Record<string, string> = {
  'error.hostnamepending': 'A request for this domain is already waiting for review.',
  'error.emailpending': 'A request from this email is already waiting for review.',
  'error.hostnametaken': 'This domain is already registered on the platform.',
  'error.hostnameinvalid': 'The domain is not valid.',
  'error.tenantidtaken': 'That tenant ID is already in use.',
  'error.domaintaken': 'That organization domain already belongs to another tenant.',
  'error.satellitekeytaken': 'That satellite key is already in use.',
  'error.invalidTransition': 'This request is no longer pending, so it cannot be changed.',
  'error.notEditable': 'Only PENDING or FAILED requests can be edited.',
  'error.provisioningFailed': 'Provisioning failed and everything was rolled back.',
};

/** Turns a backend problem+json body into a readable message. */
export function describeOnboardingBackendError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string; title?: string; detail?: string; fieldErrors?: { field: string; message: string }[] };
    const known = parsed.message ? BACKEND_ERROR_MESSAGES[parsed.message] : undefined;
    if (parsed.message === 'error.provisioningFailed' && parsed.title) return parsed.title;
    if (known) return known;
    if (parsed.fieldErrors?.length) {
      return parsed.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
    }
    return parsed.title || parsed.detail || fallback;
  } catch {
    return raw?.trim() ? raw.trim().slice(0, 300) : fallback;
  }
}
