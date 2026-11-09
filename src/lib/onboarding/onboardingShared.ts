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
  { value: 'RETAIL', label: 'Retail', hint: 'Shop archetype. The pack is gas, liquor, or another retailer type.' },
  { value: 'SCHOOL', label: 'School', hint: 'Schools and campuses' },
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

/** Shared input classes for onboarding admin forms (matches form_validation_styling). */
export const onboardingInputClass = (hasError = false) =>
  `mt-1 block w-full border rounded-xl focus:ring-blue-500 px-4 py-3 text-base disabled:bg-gray-100 disabled:text-gray-600 ${
    hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-400 focus:border-blue-500'
  }`;

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

export type ValidateOnboardingSubmitOptions = {
  /**
   * When true (new org — no existing organization selected), require contact
   * first name, last name, and phone in addition to email.
   */
  requireContactDetails?: boolean;
  /**
   * When true, skip contact email / name / phone / address validation
   * (admin onboarding selects an existing Organization that already has CRM data).
   */
  skipCrmFieldValidation?: boolean;
};

/**
 * Validates and normalizes untrusted submit input (public route + admin manual entry).
 * Returns per-field error messages keyed by field name.
 */
export function validateOnboardingSubmit(
  input: Record<string, unknown>,
  options: ValidateOnboardingSubmitOptions = {}
): {
  payload: TenantOnboardingSubmitDTO;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const { requireContactDetails = false, skipCrmFieldValidation = false } = options;

  const organizationName = trimmed(input.organizationName, 255) ?? '';
  if (!organizationName) errors.organizationName = 'Organization name is required';

  const contactEmail = (trimmed(input.contactEmail, 255) ?? '').toLowerCase();
  if (!skipCrmFieldValidation) {
    if (!contactEmail) errors.contactEmail = 'Contact email is required';
    else if (!isValidOnboardingEmail(contactEmail)) errors.contactEmail = 'Please enter a valid email address';
  } else if (contactEmail && !isValidOnboardingEmail(contactEmail)) {
    errors.contactEmail = 'Please enter a valid email address';
  }

  const contactFirstName = trimmed(input.contactFirstName, 100);
  const contactLastName = trimmed(input.contactLastName, 100);
  const contactPhone = trimmed(input.contactPhone, 50);
  if (requireContactDetails && !skipCrmFieldValidation) {
    if (!contactFirstName) errors.contactFirstName = 'Contact first name is required for a new organization';
    if (!contactLastName) errors.contactLastName = 'Contact last name is required for a new organization';
    if (!contactPhone) errors.contactPhone = 'Contact phone is required for a new organization';
  }

  const requestedHostname = normalizeOnboardingHostname(trimmed(input.requestedHostname, 255));
  if (!requestedHostname) errors.requestedHostname = 'Website domain is required';
  else if (!isValidOnboardingHostname(requestedHostname)) {
    errors.requestedHostname = 'Enter a domain like www.example.org';
  }

  // Site types may come from the access-catalog API (beyond the static fallback list).
  const siteTypeRaw = typeof input.siteType === 'string' ? input.siteType.trim() : '';
  if (!siteTypeRaw) errors.siteType = 'Site type is required';
  const siteType = siteTypeRaw ? (siteTypeRaw as TenantSiteType) : undefined;

  const domainOwnershipRaw =
    typeof input.domainOwnership === 'string' ? input.domainOwnership.trim() : '';
  const domainOwnership = DOMAIN_OWNERSHIP_OPTIONS.some((o) => o.value === domainOwnershipRaw)
    ? (domainOwnershipRaw as DomainOwnership)
    : undefined;
  if (!domainOwnership) errors.domainOwnership = 'Domain ownership is required';

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
    contactFirstName,
    contactLastName,
    contactPhone,
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
  'error.idnotfound': 'The selected portfolio was not found.',
  'error.inactive': 'The selected portfolio is inactive. Choose an active portfolio or none.',
  'error.validation': 'One or more approval fields failed validation.',
};

/** Spring/Problem titles that are too generic to show instead of detail/fieldErrors. */
const GENERIC_PROBLEM_TITLES = new Set([
  'bad request',
  'method argument not valid',
  'constraint violation',
  'validation failed',
]);

function isGenericProblemTitle(title?: string): boolean {
  return !title || GENERIC_PROBLEM_TITLES.has(title.trim().toLowerCase());
}

/** Turns a backend problem+json body into a readable message. */
export function describeOnboardingBackendError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      message?: string;
      title?: string;
      detail?: string;
      fieldErrors?: { field: string; message: string }[];
    };
    if (parsed.fieldErrors?.length) {
      return parsed.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
    }
    const known = parsed.message ? BACKEND_ERROR_MESSAGES[parsed.message] : undefined;
    if (parsed.message === 'error.provisioningFailed' && parsed.title && !isGenericProblemTitle(parsed.title)) {
      return parsed.title;
    }
    if (known) {
      if (parsed.detail && parsed.detail.trim() && known === BACKEND_ERROR_MESSAGES['error.validation']) {
        return `${known} ${parsed.detail.trim()}`;
      }
      return known;
    }
    if (parsed.detail?.trim()) return parsed.detail.trim();
    if (parsed.title?.trim() && !isGenericProblemTitle(parsed.title)) return parsed.title.trim();
    if (parsed.message?.trim()) return parsed.message.trim();
    return fallback;
  } catch {
    return raw?.trim() ? raw.trim().slice(0, 300) : fallback;
  }
}
