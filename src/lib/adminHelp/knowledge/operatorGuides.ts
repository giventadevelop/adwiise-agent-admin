import type { AdminHelpChunk } from '../types';

/**
 * Tier 2 — operator guides distilled from public/documentation HTML manuals.
 */
export const OPERATOR_GUIDE_CHUNKS: AdminHelpChunk[] = [
  {
    id: 'op:promote-admin',
    featureKey: 'manage-usage',
    title: 'Organization admin registration and promotion',
    body: [
      'A person who will run one organization must register or sign in on that organization’s satellite site first.',
      'That visit creates a user_profile with that satellite’s tenant_id, role MEMBER, and status PENDING_APPROVAL.',
      'Do not register only on the hub (adwiiseagent.ai) — promoting a hub-tenant row does not make them admin of a satellite.',
      'Platform SUPER_ADMIN then opens Manage Users on the hub, selects the organization, finds the person by email, sets Role to ADMIN, optionally Status to ACTIVE or APPROVED, and Saves.',
      'Leave user_id, email, and names unchanged for a normal Google or email signup.',
      'Tell them to sign out and sign back in, then open adwiiseagent.ai/admin and pick their organization.',
      'Satellites do not serve /admin; that URL redirects to the hub. The satellite is only where they first authenticate.',
      'Roles: MEMBER default; ADMIN for one organization; SUPER_ADMIN for platform-wide hub access (use sparingly).',
      'If they registered on the wrong site, they must sign in once on the correct satellite — do not retarget tenant_id on an existing hub profile.',
    ].join(' '),
    keywords: ['promote', 'admin', 'register', 'satellite', 'manage usage', 'SUPER_ADMIN', 'role'],
    pathPrefixes: ['/admin/manage-usage'],
  },
  {
    id: 'op:satellite-domains',
    featureKey: 'satellite-domains',
    title: 'Satellite domains setup',
    body: [
      'A satellite domain is a tenant’s custom public URL that runs the same app as the primary hub domain.',
      'Each satellite is linked to a Tenant ID so the site loads the correct organization, settings, events, and branding.',
      'Login and sign-up require a satellite domain record. If the hostname is not registered under Admin → Satellite Domains, sign-in on that custom URL will not work correctly.',
      'Recommended order: create company Organization (CRM) → Onboarding → Add Request (Tenant ID, hostname, branding, portfolio) → approve onboarding → register Satellite Domains (Satellite Key, Domain URL with scheme, Hostname, Tenant ID, Enabled) → configure DNS → configure Clerk satellite domain on the primary.',
      'tenantId must match Tenant Settings and Organization. hostname detects satellite vs primary at runtime.',
      'Platform SUPER_ADMIN only.',
    ].join(' '),
    keywords: ['satellite', 'domain', 'hostname', 'custom domain', 'clerk', 'dns'],
    platformOnly: true,
    pathPrefixes: ['/admin/satellite-domains'],
  },
  {
    id: 'op:hero-images',
    featureKey: 'tenant-settings',
    title: 'Default homepage hero images',
    body: [
      'Tenant default homepage hero images appear when no upcoming event hero media exists.',
      'When Include with events is on, these slides append after event hero images.',
      'Save tenant settings first, then open Edit to enable uploads (same pattern as logo upload).',
      'Upload PNG, JPG, JPEG, WEBP, or GIF up to 10 MB; recommended about 2000×800 landscape; library max 20 images.',
      'Only slides marked Active participate; new uploads default to Inactive. Drag to reorder active slides.',
      'Homepage display count (1–20, default 6) caps how many active slides show.',
      'If none are active but the library is not empty, the homepage shows 3 random library images per load.',
      'Display modes: slideshow, random one per visit, or single (first URL). Fallback chain: event heroes → tenant defaults → bundled default-hero.webp.',
      'Platform SUPER_ADMIN edits these under Tenant Settings.',
    ].join(' '),
    keywords: ['hero', 'homepage', 'images', 'slideshow', 'tenant settings'],
    platformOnly: true,
    pathPrefixes: ['/admin/tenant-management/settings'],
  },
  {
    id: 'op:events-public-filter',
    featureKey: 'manage-events',
    title: 'Public events page filtering rules',
    body: [
      'The public /events page only lists events with isActive true.',
      'Default view shows future events where startDate is today or later, sorted ascending by startDate.',
      'Past view shows events whose endDate is before today, sorted descending.',
      'A date-range search overrides the Future/Past toggle.',
      'Title search filters by title contains (case-insensitive) and combines with date filters.',
      'Recurring events use series identifiers and next-occurrence logic so the listing shows the right occurrence.',
      'Buy Tickets visibility and payment routing depend on the event’s payment configuration in admin.',
    ].join(' '),
    keywords: ['events page', 'filter', 'future', 'past', 'active', 'public', 'buy tickets'],
    pathPrefixes: ['/admin/manage-events', '/admin/events'],
  },
];
