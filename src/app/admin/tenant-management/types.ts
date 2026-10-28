import type { TenantSiteType } from '@/types/profileSite';

/**
 * DTO for tenant organization details.
 * Matches backend OpenAPI schema.
 */
export interface TenantOrganizationDTO {
  id?: number;
  tenantId: string;
  organizationName: string;
  /** Website hostname; required on create and unique across all tenant organizations. */
  domain?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: string; // YYYY-MM-DD
  subscriptionEndDate?: string;   // YYYY-MM-DD
  monthlyFeeUsd?: number;
  stripeCustomerId?: string;
  /** Stripe subscription id for the tenant platform subscription (gas station billing) */
  stripeSubscriptionId?: string;
  isActive?: boolean;
  description?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipCode?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
  /** Product archetype. Shops use RETAIL. The pack is retailerTypeCode. */
  siteType?: TenantSiteType;
  /** Shop pack when siteType is RETAIL: GAS_STATION, GAS_STATION_ENT, LIQUOR_STORE, DUNKIN_DONUTS, SEVEN_ELEVEN, RESTAURANT, or CLINIC. */
  retailerTypeCode?: string;
  /** Optional theme/template variant within a siteType */
  siteTemplateVersion?: string;
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}

/**
 * DTO for tenant settings.
 * Matches backend OpenAPI schema.
 */
export interface TenantSettingsDTO {
  id?: number;
  tenantId: string;
  /** Git repository URL for the project that belongs to this tenant. Empty when no dedicated repo exists. */
  repositoryUrl?: string | null;
  allowUserRegistration?: boolean;
  requireAdminApproval?: boolean;
  enableWhatsappIntegration?: boolean;
  enableEmailMarketing?: boolean;
  whatsappApiKey?: string;
  emailProviderConfig?: string;
  maxEventsPerMonth?: number;
  maxAttendeesPerEvent?: number;
  enableGuestRegistration?: boolean;
  maxGuestsPerAttendee?: number;
  defaultEventCapacity?: number;
  platformFeePercentage?: number;
  customCss?: string;
  customJs?: string;
  showEventsSectionInHomePage?: boolean;
  showTeamMembersSectionInHomePage?: boolean;
  showSponsorsSectionInHomePage?: boolean;
  showLeagueStandingsSectionInHomePage?: boolean;
  showHeaderLeagues?: boolean;
  isMembershipSubscriptionEnabled?: boolean;
  // Enhanced WhatsApp Integration Fields
  whatsappPhoneNumber?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  enableWhatsappNotifications?: boolean;
  enableWhatsappMarketing?: boolean;
  whatsappDefaultTemplate?: string;
  whatsappMaxMessagesPerDay?: number;
  whatsappRateLimit?: number;
  whatsappWebhookUrl?: string;
  whatsappWebhookToken?: string;
  emailFooterHtmlUrl?: string; // S3 URL for email footer HTML file
  emailHeaderImageUrl?: string; // S3 URL for email header image
  logoImageUrl?: string; // S3 URL for tenant logo image
  /** Ordered tenant default hero image URLs (parsed from JSON when returned by API). */
  defaultHeroImageUrls?: string[];
  /** JSON array string of default hero URLs (backend column). */
  defaultHeroImageUrlsJson?: string;
  defaultHeroDisplayMode?: 'slideshow' | 'random' | 'single';
  /** When true, tenant default slides append after event hero images in the homepage carousel. */
  defaultHeroIncludeWithEvents?: boolean;
  /** Max tenant default slides on homepage when slides are marked active (1-6). */
  defaultHeroMaxDisplayCount?: number;
  /** When true, upcoming events with hero media appear in the homepage hero slideshow. */
  displayEventHeroImages?: boolean;
  /**
   * Homepage edge-cache busting counter. Admin "Refresh cache records" bumps this
   * so clients refetch homepage payloads (see homepageCacheKeys helpers).
   */
  homepageCacheVersion?: number;
  /** When true, render Google AdSense ad regions on this tenant's public site */
  enableGoogleAdsense?: boolean;
  /** AdSense publisher ID (ca-pub-...) */
  googleAdsensePublisherId?: string;
  /** JSON map of layout region id → ad slot id */
  googleAdsensePlacementsJson?: string;
  // Personal profile homepage section flags (PERSONAL_PROFILE / HYBRID site types)
  showPublicProfileHeroSection?: boolean;
  showProfileWritingsSection?: boolean;
  showProfileAchievementsSection?: boolean;
  showProfileAffiliationsSection?: boolean;
  showProfileMediaDownloadsSection?: boolean;
  showProfileContactSection?: boolean;
  showProfileProjectsSection?: boolean;
  showProfileServicesSection?: boolean;
  showProfileFamilySection?: boolean;
  // Header menu visibility (null = app default: legacy items ON; news/downloads/links/services/catalogs OFF)
  showHeaderHome?: boolean | null;
  showHeaderAbout?: boolean | null;
  showHeaderEvents?: boolean | null;
  showHeaderFeatures?: boolean | null;
  showHeaderCalendar?: boolean | null;
  showHeaderGallery?: boolean | null;
  showHeaderContact?: boolean | null;
  showHeaderNews?: boolean | null;
  showHeaderDownloads?: boolean | null;
  showHeaderLinks?: boolean | null;
  showHeaderServices?: boolean | null;
  showHeaderAchievements?: boolean | null;
  showHeaderAffiliations?: boolean | null;
  showHeaderProjects?: boolean | null;
  showHeaderFamily?: boolean | null;
  /** When true, public header may show the featured published tournament. Sports tenants. */
  showHeaderTournament?: boolean | null;
  // Gas station COO module (GAS_STATION site type)
  /** Master on/off for the gas station admin module for this tenant */
  enableGasStationModule?: boolean;
  /** Base URL of the external AI engine deployment (invoked server-side only) */
  gasAiEngineBaseUrl?: string;
  /** Secrets-manager reference to the AI engine API key (never the raw key) */
  gasAiEngineApiKeyRef?: string;
  /** Token the AI engine presents on write-back callbacks */
  gasAiEngineWebhookToken?: string;
  /** Local hour (0-23) the morning brief is expected/delivered */
  gasDailyBriefHourLocal?: number;
  enableRetailModule?: boolean;
  retailAiEngineBaseUrl?: string;
  retailAiEngineApiKeyRef?: string;
  retailAiEngineWebhookToken?: string;
  retailDailyBriefHourLocal?: number;
  // Contact and operational fields (email, phone remain on settings)
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  description?: string | null;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  addressLine1?: string;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  addressLine2?: string;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  city?: string | null;
  phoneNumber?: string;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  zipCode?: string;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  country?: string;
  /** @deprecated v2.0 — canonical source is tenant_organization; read fallback only */
  stateProvince?: string;
  email?: string;
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
  tenantOrganization?: TenantOrganizationDTO;
}

/**
 * Form DTO for tenant organization creation/editing.
 * Omits fields that are auto-generated or supplied by the system.
 */
export type TenantOrganizationFormDTO = Omit<TenantOrganizationDTO, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Form DTO for tenant settings creation/editing.
 * Omits fields that are auto-generated or supplied by the system.
 */
export type TenantSettingsFormDTO = Omit<TenantSettingsDTO, 'id' | 'createdAt' | 'updatedAt' | 'tenantOrganization'>;

/**
 * Filter options for tenant organization list
 */
export interface TenantOrganizationFilters {
  search?: string;
  /** Partial match on tenantId (tenantId.contains) — used by typeahead. */
  tenantIdContains?: string;
  /** When set, scopes list to this tenant (tenantId.equals). */
  tenantId?: string;
  subscriptionStatus?: string;
  isActive?: boolean;
  sortBy?: 'organizationName' | 'createdAt' | 'subscriptionStatus';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter options for tenant settings list (JHipster-style criteria on /api/tenant-settings).
 * `tenantId` scopes with `tenantId.equals` only when non-empty (e.g. from ?tenant=).
 */
export interface TenantSettingsFilters {
  /** @deprecated use tenantIdContains */
  search?: string;
  tenantId?: string;
  tenantIdContains?: string;
  idEquals?: number;
  emailContains?: string;
  phoneNumberContains?: string;
  countryContains?: string;
  stateProvinceContains?: string;
  addressLine1Contains?: string;
  /** Resolved via /api/tenant-organizations then tenantId.in on settings (nested org criteria not used). */
  organizationNameContains?: string;
  allowUserRegistration?: boolean;
  requireAdminApproval?: boolean;
  enableWhatsappIntegration?: boolean;
  enableEmailMarketing?: boolean;
  enableGuestRegistration?: boolean;
  isMembershipSubscriptionEnabled?: boolean;
  sortBy?: 'tenantId' | 'createdAt' | 'updatedAt' | 'id' | 'maxEventsPerMonth';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * API response for paginated lists
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

