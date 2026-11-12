/** Filters for the organization search page. Empty strings mean that field is not applied. */
export interface OrganizationSearchFilters {
  organizationName: string;
  domain: string;
  contactEmail: string;
  contactPersonName: string;
  contactPhone: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  websiteUrl: string;
  websiteTenantId: string;
  siteType: string;
  subscriptionStatus: string;
  isActive: '' | 'true' | 'false';
}

export const ORGANIZATION_SEARCH_PAGE_SIZE = 10;

export function emptyOrganizationSearchFilters(): OrganizationSearchFilters {
  return {
    organizationName: '',
    domain: '',
    contactEmail: '',
    contactPersonName: '',
    contactPhone: '',
    city: '',
    stateProvince: '',
    zipCode: '',
    country: '',
    websiteUrl: '',
    websiteTenantId: '',
    siteType: '',
    subscriptionStatus: '',
    isActive: '',
  };
}
