import type { AdminHelpChunk } from '../types';

/**
 * Core concepts: organization (client), tenant (website), site type, locations, billing scope.
 * Checked against the data model (2026-11-27):
 * - TenantOrganizationDTO: parentOrganizationId empty = client row; siteType, retailerTypeCode,
 *   billingScope ORGANIZATION | PER_TENANT live on the organization row.
 * - New website tenant IDs are created through onboarding ("Create Tenant ID via onboarding" /
 *   "Onboard a tenant ID"), which applies site-type presets to that tenant's settings.
 * - Admin tiles read the site type from the organization that owns the tenant
 *   (fetchTenantSiteTypeServer → loadOrganizationForTenantId).
 * - OrganizationWebsitesPanel (child organizations) exists in code but is not mounted anywhere,
 *   so the help does not describe it.
 * - adminAccessServer.ts: an organization admin may open every website owned by the same client.
 * - retail/locations: each location row belongs to a tenant; "Counted in the location fee".
 * Not tied to one page, so no pathPrefixes; visible to every admin.
 */
export const CONCEPT_CHUNKS: AdminHelpChunk[] = [
  {
    id: 'concept:organization-tenant',
    featureKey: 'concepts',
    title: 'Organization vs tenant (website): how Adwiise Agent is organized',
    body: [
      'An organization is the client: the company, institution, or person that signs up with Adwiise Agent, for example a church, a school, a sports club, or the owner of several gas stations or liquor stores.',
      'A tenant is one website of that client. Each tenant has its own website tenant ID (lowercase letters, numbers, and underscores, such as stmarys_church), its own Tenant Settings, and its own data: events, members, media, stores, and so on.',
      'One organization can have many tenants. For example, one owner can run a church website and a school website, or one retail owner can have a separate tenant per brand or business.',
      'Organization is not another word for tenant: the organization owns the tenants. Most admin screens work on one tenant at a time; organization-level details (name, contact, address, billing) are on Tenant Organizations.',
      'Hierarchy: Organization (client) → tenants (websites) → for retail tenants, locations (stores).',
    ].join(' '),
    keywords: [
      'organization', 'organisation', 'what is an organization', 'tenant', 'what is a tenant', 'client', 'company',
      'customer', 'website', 'websites', 'difference', 'hierarchy', 'multiple tenants', 'tenant id', 'concept',
    ],
  },
  {
    id: 'concept:site-types',
    featureKey: 'concepts',
    title: 'Site types: what kind of website a tenant is',
    body: [
      'A site type says what kind of website a tenant is: for example event, church, school, sports team, personal profile, or retail. Retail also has a shop pack: gas station, liquor store, Dunkin, 7-Eleven, restaurant, or clinic.',
      'The site type is chosen for each new website when its onboarding request is approved, and it presets that website’s homepage sections and Tenant Settings.',
      'The admin tiles you see follow the site type on the organization record that owns the website. Site types themselves are managed on Site types (platform super admin only).',
      'One client can have websites of different kinds, such as a church site and a school site. Each is its own tenant with its own settings and data; ask a platform super admin to onboard each one.',
    ].join(' '),
    keywords: ['site type', 'church', 'school', 'sports', 'retail', 'gas station', 'liquor store', 'profile site', 'type of website', 'tiles', 'different types'],
  },
  {
    id: 'concept:add-website',
    featureKey: 'concepts',
    title: 'Adding a website (tenant) to an organization',
    body: [
      'Platform super admin only. The organization (the client company) must exist first under Tenant Organizations, where its contact and address live.',
      'Then create the website through onboarding: click "Create Tenant ID via onboarding" on the organization list, or "Onboard a tenant ID" on the organization page. In Onboarding → Add Request, select that organization, enter the new website tenant ID (lowercase letters, numbers, and underscores) and hostname, and choose the site type. Approving the request creates the tenant and adds it to that organization.',
      'To move an existing tenant ID to another organization, use "Move a tenant ID to this organization" on the organization page, or "Move tenant IDs between two organizations".',
      'An organization admin cannot create tenants; ask a platform super admin.',
    ].join(' '),
    keywords: ['add tenant', 'add website', 'new website', 'create website', 'create tenant', 'onboard', 'tenant id', 'move tenant', 'another website'],
    platformOnly: true,
  },
  {
    id: 'concept:locations',
    featureKey: 'concepts',
    title: 'Locations and stores (retail tenants)',
    body: [
      'A retail tenant, such as a gas station or liquor store business, can have many locations (stores). Each location belongs to one tenant and is listed on Retail → Locations with its name, code, brand, region, city, and state.',
      'The morning brief, uploads, and Compare stores work per location. Retail managers can be limited to the stores they are assigned on Assign managers.',
      '"Counted in the location fee" controls whether a store counts toward the per-location fee, and the retail size band is computed from the location count unless overridden.',
      'So a retail owner is one organization; each business or brand can be a tenant; each shop is a location under that tenant.',
    ].join(' '),
    keywords: ['location', 'locations', 'store', 'stores', 'shop', 'branch', 'gas station', 'liquor store', 'multiple stores', 'retail'],
  },
  {
    id: 'concept:access-and-billing',
    featureKey: 'concepts',
    title: 'Who sees which tenants, and how billing is scoped',
    body: [
      'An organization admin can open every website (tenant) owned by their client organization, and picks which one to work on with the workspace picker on Admin Home. A platform super admin can open every tenant and can choose All tenants.',
      'Billing scope is set per organization: "Bill the organization once" charges one monthly amount for all its websites; "Bill each website separately" charges each tenant on its own.',
    ].join(' '),
    keywords: ['access', 'which tenants', 'switch tenant', 'workspace', 'billing', 'bill', 'per website', 'organization admin', 'all tenants'],
  },
];
