import type { AdminHelpRouteInfo } from '../types';

/** Longest-prefix wins when resolving pathname → feature. */
const ROUTE_ENTRIES: Array<{ prefix: string; info: AdminHelpRouteInfo }> = [
  {
    prefix: '/admin/manage-usage',
    info: {
      featureKey: 'manage-usage',
      label: 'Manage Users',
      summary: 'Edit people, roles, and approval for the selected organization.',
      commonTasks: [
        'Search for a member by email',
        'Change role to ADMIN after they registered on the satellite',
        'Approve a pending member',
      ],
      relatedRoutes: ['/admin/manage-usage'],
      suggestedChips: [
        'How do I promote someone to ADMIN?',
        'Why must they register on the satellite first?',
        'What roles can I assign?',
      ],
    },
  },
  {
    prefix: '/admin/manage-events',
    info: {
      featureKey: 'manage-events',
      label: 'Manage Events',
      summary: 'Create, edit, and publish events for the public site.',
      commonTasks: ['Create an event', 'Set tickets and dates', 'Make the event visible'],
      relatedRoutes: ['/admin/manage-events', '/admin/media', '/admin/events/registrations'],
      suggestedChips: [
        'How do I create a new event?',
        'How do I upload images for an event?',
        'Why is my event not on the public page?',
      ],
    },
  },
  {
    prefix: '/admin/events/new',
    info: {
      featureKey: 'manage-events',
      label: 'New Event',
      summary: 'Form to create a new event.',
      commonTasks: ['Fill title and dates', 'Configure tickets', 'Save and publish'],
      relatedRoutes: ['/admin/manage-events', '/admin/media'],
      suggestedChips: ['What fields are required for an event?', 'How do I attach media later?'],
    },
  },
  {
    prefix: '/admin/events/dashboard',
    info: {
      featureKey: 'event-analytics',
      label: 'Event Analytics',
      summary: 'Attendance and ticket activity across events.',
      commonTasks: ['Compare event performance', 'Review attendance'],
      relatedRoutes: ['/admin/events/dashboard', '/admin/sales-analytics'],
      suggestedChips: ['What does Event Analytics show?', 'Where do I see ticket sales?'],
    },
  },
  {
    prefix: '/admin/events/registrations',
    info: {
      featureKey: 'event-registrations',
      label: 'Registrations',
      summary: 'Attendee and guest signup lists.',
      commonTasks: ['Find who signed up', 'Open an attendee list'],
      relatedRoutes: ['/admin/events/registrations', '/admin/qr-scanner'],
      suggestedChips: ['Where is the attendee list?', 'How is this different from sales analytics?'],
    },
  },
  {
    prefix: '/admin/events',
    info: {
      featureKey: 'manage-events',
      label: 'Events',
      summary: 'Event admin screens including media and analytics under an event.',
      commonTasks: ['Edit an event', 'Manage event media'],
      relatedRoutes: ['/admin/manage-events', '/admin/media'],
      suggestedChips: ['How do I edit an event?', 'How do I add event media?'],
    },
  },
  {
    prefix: '/admin/media',
    info: {
      featureKey: 'media-management',
      label: 'Media Management',
      summary: 'Upload images and files used by events and pages.',
      commonTasks: ['Upload an image', 'Find a file for an event'],
      relatedRoutes: ['/admin/media', '/admin/gallery/albums'],
      suggestedChips: [
        'How do I upload media for an event?',
        'What is the difference between Media and Gallery Albums?',
      ],
    },
  },
  {
    prefix: '/admin/gallery/albums',
    info: {
      featureKey: 'gallery-albums',
      label: 'Gallery Albums',
      summary: 'Public photo albums on the gallery page.',
      commonTasks: ['Create an album', 'Add photos to an album'],
      relatedRoutes: ['/admin/gallery/albums', '/admin/media'],
      suggestedChips: ['How do I create a public photo album?'],
    },
  },
  {
    prefix: '/admin/membership/plans',
    info: {
      featureKey: 'membership-plans',
      label: 'Membership Plans',
      summary: 'Define membership products people can buy.',
      commonTasks: ['Create a plan', 'Set price and benefits'],
      relatedRoutes: ['/admin/membership/plans', '/admin/membership/subscriptions'],
      suggestedChips: ['How do I create a membership plan?', 'Where do I see who subscribed?'],
    },
  },
  {
    prefix: '/admin/membership/subscriptions',
    info: {
      featureKey: 'membership-subscriptions',
      label: 'Membership Subscriptions',
      summary: 'Who has active, pending, or canceled memberships.',
      commonTasks: ['Find a subscriber', 'Check subscription status'],
      relatedRoutes: ['/admin/membership/subscriptions', '/admin/membership/plans'],
      suggestedChips: ['How do I find who has an active membership?'],
    },
  },
  {
    prefix: '/admin/membership',
    info: {
      featureKey: 'membership-plans',
      label: 'Membership',
      summary: 'Membership plans and subscriptions.',
      commonTasks: ['Manage plans', 'Review subscriptions'],
      relatedRoutes: ['/admin/membership/plans', '/admin/membership/subscriptions'],
      suggestedChips: ['Difference between plans and subscriptions?'],
    },
  },
  {
    prefix: '/admin/bulk-email',
    info: {
      featureKey: 'bulk-email',
      label: 'Bulk Email',
      summary: 'Send one announcement to many people.',
      commonTasks: ['Compose a campaign', 'Choose recipients'],
      relatedRoutes: ['/admin/bulk-email', '/admin/tenant-email-addresses'],
      suggestedChips: ['How do I send a bulk email?', 'Where do I set the sender address?'],
    },
  },
  {
    prefix: '/admin/tenant-email-addresses',
    info: {
      featureKey: 'tenant-email-addresses',
      label: 'Email Addresses',
      summary: 'Official sender and contact emails for the organization.',
      commonTasks: ['Add a sender address'],
      relatedRoutes: ['/admin/tenant-email-addresses', '/admin/bulk-email'],
      suggestedChips: ['How do I add an organization email address?'],
    },
  },
  {
    prefix: '/admin/qr-scanner',
    info: {
      featureKey: 'qr-scanner',
      label: 'QR Scanner',
      summary: 'Scan ticket QR codes at the door.',
      commonTasks: ['Check in a guest'],
      relatedRoutes: ['/admin/qr-scanner', '/admin/check-in-analytics'],
      suggestedChips: ['How do I check in a ticket at the door?'],
    },
  },
  {
    prefix: '/admin/check-in-analytics',
    info: {
      featureKey: 'check-in-analytics',
      label: 'Check-in Analytics',
      summary: 'Arrivals compared with ticket buyers.',
      commonTasks: ['Review door stats'],
      relatedRoutes: ['/admin/check-in-analytics', '/admin/qr-scanner'],
      suggestedChips: ['What does check-in analytics show?'],
    },
  },
  {
    prefix: '/admin/sales-analytics',
    info: {
      featureKey: 'sales-analytics',
      label: 'Sales Analytics',
      summary: 'Ticket revenue and sales totals.',
      commonTasks: ['Review ticket revenue'],
      relatedRoutes: ['/admin/sales-analytics'],
      suggestedChips: ['Where do I see ticket revenue?'],
    },
  },
  {
    prefix: '/admin/retail',
    info: {
      featureKey: 'retail',
      label: 'Retail',
      summary: 'Morning brief, uploads, locations, and integrations for retail shops.',
      commonTasks: ['Open morning brief', 'Upload a day file', 'Ask about the brief on that page'],
      relatedRoutes: ['/admin/retail', '/admin/retail/upload', '/admin/retail/locations'],
      suggestedChips: [
        'What is the morning brief?',
        'Where do I upload store files?',
        'Is retail Ask the same as this help chat?',
      ],
    },
  },
  {
    prefix: '/admin/billing',
    info: {
      featureKey: 'platform-bill',
      label: 'Billing',
      summary: 'Platform software fees for this organization.',
      commonTasks: ['View what is owed'],
      relatedRoutes: ['/admin/billing'],
      suggestedChips: ['Is this ticket revenue or platform fees?'],
    },
  },
  {
    prefix: '/admin/platform-billing/plans',
    info: {
      featureKey: 'platform-plans',
      label: 'Billing Plans',
      summary: 'Fee catalog used to charge tenants for the software.',
      commonTasks: ['Edit a platform fee plan'],
      relatedRoutes: ['/admin/platform-billing/plans', '/admin/platform-billing'],
      suggestedChips: ['Where is the platform fee catalog?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/platform-billing',
    info: {
      featureKey: 'billing-area',
      label: 'Billing Area',
      summary: 'Who pays, what the subscription covers, and the charge ledger.',
      commonTasks: ['Open the charge ledger', 'See which organization pays'],
      relatedRoutes: ['/admin/platform-billing', '/admin/platform-billing/plans'],
      suggestedChips: ['What is the billing area?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/satellite-domains',
    info: {
      featureKey: 'satellite-domains',
      label: 'Satellite Domains',
      summary: 'Register custom public domains that authenticate through the hub.',
      commonTasks: ['Add a hostname', 'Link tenantId', 'Enable when DNS and Clerk are ready'],
      relatedRoutes: ['/admin/satellite-domains', '/admin/tenant-management/organizations'],
      suggestedChips: ['How do I add a satellite domain?', 'Why must tenantId match?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/onboarding-requests',
    info: {
      featureKey: 'onboarding-requests',
      label: 'Onboarding Requests',
      summary: 'Approve new customer applications and create tenants.',
      commonTasks: ['Review a request', 'Approve and set site type'],
      relatedRoutes: ['/admin/onboarding-requests'],
      suggestedChips: ['How do I approve an onboarding request?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/tenant-management/organizations',
    info: {
      featureKey: 'tenant-organizations',
      label: 'Organizations',
      summary: 'Create and edit tenant organizations.',
      commonTasks: ['Create an organization', 'Note the tenantId'],
      relatedRoutes: ['/admin/tenant-management/organizations', '/admin/tenant-management/settings'],
      suggestedChips: ['How do I create a new organization?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/tenant-management/settings',
    info: {
      featureKey: 'tenant-settings',
      label: 'Tenant Settings',
      summary: 'Homepage sections, hero images, and feature flags.',
      commonTasks: ['Edit hero images', 'Toggle feature flags'],
      relatedRoutes: ['/admin/tenant-management/settings'],
      suggestedChips: ['How do I set default hero images?', 'Where are feature flags?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/tenant-management',
    info: {
      featureKey: 'tenant-organizations',
      label: 'Tenant Management',
      summary: 'Platform tools for organizations and settings.',
      commonTasks: ['Manage organizations', 'Open settings'],
      relatedRoutes: [
        '/admin/tenant-management/organizations',
        '/admin/tenant-management/settings',
      ],
      suggestedChips: ['What can I do under Tenant Management?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/polls',
    info: {
      featureKey: 'poll-management',
      label: 'Poll Management',
      summary: 'Create polls and collect responses on the public site.',
      commonTasks: ['Create a poll', 'Set open dates'],
      relatedRoutes: ['/admin/polls'],
      suggestedChips: ['How do I create a poll?'],
    },
  },
  {
    prefix: '/admin/focus-groups',
    info: {
      featureKey: 'focus-groups',
      label: 'Focus Groups',
      summary: 'Discussion circles and attached events.',
      commonTasks: ['Create a focus group', 'Attach events'],
      relatedRoutes: ['/admin/focus-groups'],
      suggestedChips: ['What are focus groups for?'],
    },
  },
  {
    prefix: '/admin/team-groups',
    info: {
      featureKey: 'team-groups',
      label: 'Squad groups',
      summary: 'Containers for sports clubs or bands.',
      commonTasks: ['Create a squad group'],
      relatedRoutes: ['/admin/team-groups', '/admin/team-members'],
      suggestedChips: ['How do I create a squad?'],
    },
  },
  {
    prefix: '/admin/team-members',
    info: {
      featureKey: 'team-members',
      label: 'Squad roster',
      summary: 'People inside a squad and their profiles.',
      commonTasks: ['Add a player or member', 'Assign a squad group'],
      relatedRoutes: ['/admin/team-members', '/admin/team-groups'],
      suggestedChips: ['How do I add someone to a squad?'],
    },
  },
  {
    prefix: '/admin/tournaments',
    info: {
      featureKey: 'tournaments',
      label: 'Tournaments',
      summary: 'Seasons or cups for sports-team sites.',
      commonTasks: ['Create a tournament'],
      relatedRoutes: ['/admin/tournaments'],
      suggestedChips: ['How do I create a tournament?'],
    },
  },
  {
    prefix: '/admin/manual-payments',
    info: {
      featureKey: 'manual-payments',
      label: 'Manual Payments',
      summary: 'Record payments that skipped the card form (Zelle, Venmo, etc.).',
      commonTasks: ['Record a manual payment'],
      relatedRoutes: ['/admin/manual-payments'],
      suggestedChips: ['When do I use Manual Payments?'],
    },
  },
  {
    prefix: '/admin/official-documents',
    info: {
      featureKey: 'official-documents',
      label: 'Official Documents',
      summary: 'Bylaws and notices for the public documents area.',
      commonTasks: ['Upload a document', 'Pick a category'],
      relatedRoutes: ['/admin/official-documents', '/admin/official-document-categories'],
      suggestedChips: ['How do I publish an official document?'],
    },
  },
  {
    prefix: '/admin/homepage-cache',
    info: {
      featureKey: 'homepage-cache',
      label: 'Homepage Cache',
      summary: 'Refresh cached homepage content when the public page looks stale.',
      commonTasks: ['Refresh cache after content changes'],
      relatedRoutes: ['/admin/homepage-cache'],
      suggestedChips: ['When should I refresh homepage cache?'],
    },
  },
  {
    prefix: '/admin/school',
    info: {
      featureKey: 'school-site',
      label: 'School site',
      summary: 'Teachers, departments, facilities, campus pages, highlights, and fee invoices.',
      commonTasks: ['Add a teacher with email and phone', 'Create a fee invoice', 'Publish a campus page'],
      relatedRoutes: ['/admin/school'],
      suggestedChips: ['How do I add a teacher?', 'Where do school fee contacts go?'],
    },
  },
  {
    prefix: '/admin/leagues',
    info: {
      featureKey: 'leagues',
      label: 'Leagues',
      summary: 'Clubs, match results, and standings.',
      commonTasks: ['Record a result', 'Review standings'],
      relatedRoutes: ['/admin/leagues', '/admin/squads'],
      suggestedChips: ['Where do I enter league results?'],
    },
  },
  {
    prefix: '/admin/squads',
    info: {
      featureKey: 'squad-membership',
      label: 'Squad membership',
      summary: 'Put one player on more than one squad.',
      commonTasks: ['Add a player to another squad'],
      relatedRoutes: ['/admin/squads', '/admin/team-members', '/admin/team-groups'],
      suggestedChips: ['How do I put a player on two squads?'],
    },
  },
  {
    prefix: '/admin/event-featured-performers',
    info: {
      featureKey: 'global-performers',
      label: 'Global Performers',
      summary: 'Shared performers that can be attached to many events.',
      commonTasks: ['Add a performer', 'Search by name or stage name'],
      relatedRoutes: ['/admin/event-featured-performers'],
      suggestedChips: ['Where do shared performers live?'],
    },
  },
  {
    prefix: '/admin/event-contacts',
    info: {
      featureKey: 'global-contacts',
      label: 'Global Contacts',
      summary: 'Shared event contacts with name, phone, and email.',
      commonTasks: ['Add a contact', 'Search contacts'],
      relatedRoutes: ['/admin/event-contacts'],
      suggestedChips: ['Where do I store an event contact phone number?'],
    },
  },
  {
    prefix: '/admin/event-emails',
    info: {
      featureKey: 'global-emails',
      label: 'Global Emails',
      summary: 'Shared email addresses reused on events.',
      commonTasks: ['Add a shared email'],
      relatedRoutes: ['/admin/event-emails', '/admin/tenant-email-addresses'],
      suggestedChips: ['Is Global Emails the same as Bulk Email?'],
    },
  },
  {
    prefix: '/admin/event-program-directors',
    info: {
      featureKey: 'global-directors',
      label: 'Global Directors',
      summary: 'Shared program directors that can be attached to many events.',
      commonTasks: ['Add a program director'],
      relatedRoutes: ['/admin/event-program-directors'],
      suggestedChips: ['Where do program directors live?'],
    },
  },
  {
    prefix: '/admin/access-catalogs/access-roles',
    info: {
      featureKey: 'access-roles',
      label: 'Access roles',
      summary: 'Shared role names that can open the admin menu.',
      commonTasks: ['Add an access role'],
      relatedRoutes: ['/admin/access-catalogs/access-roles'],
      suggestedChips: ['Where are admin access roles defined?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/access-catalogs/site-types',
    info: {
      featureKey: 'site-types',
      label: 'Site types',
      summary: 'Event, church, sports, school, retail, and other organization site kinds.',
      commonTasks: ['Add a site type'],
      relatedRoutes: ['/admin/access-catalogs/site-types'],
      suggestedChips: ['What does site type control?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/access-catalogs/retailer-size-bands',
    info: {
      featureKey: 'retailer-size-bands',
      label: 'Size bands',
      summary: 'Single, mid, and enterprise sizes for each shop kind.',
      commonTasks: ['Add a size band'],
      relatedRoutes: ['/admin/access-catalogs/retailer-size-bands'],
      suggestedChips: ['What is a retailer size band?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/access-catalogs/recommendation-categories',
    info: {
      featureKey: 'recommendation-categories',
      label: 'Recommendation categories',
      summary: 'Kinds of cards on the retail morning list.',
      commonTasks: ['Add a recommendation category'],
      relatedRoutes: ['/admin/access-catalogs/recommendation-categories'],
      suggestedChips: ['Where are morning-brief card kinds defined?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/roster-catalogs/sports-categories',
    info: {
      featureKey: 'sports-categories',
      label: 'Sports categories',
      summary: 'Sports that can be shown on a squad member.',
      commonTasks: ['Add a sport'],
      relatedRoutes: ['/admin/roster-catalogs/sports-categories', '/admin/team-members'],
      suggestedChips: ['Where do I add a sport for squad members?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/access-catalogs',
    info: {
      featureKey: 'access-catalogs',
      label: 'Access catalogs',
      summary: 'Shared dropdown lists for roles, site types, shop packs, and related catalogs. Retailer types are on this page.',
      commonTasks: ['Open a catalog', 'Edit retailer types'],
      relatedRoutes: ['/admin/access-catalogs', '/admin/access-catalogs/site-types', '/admin/access-catalogs/access-roles'],
      suggestedChips: ['Where are site types and shop packs?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin/tenant-management/test',
    info: {
      featureKey: 'tenant-test',
      label: 'Test CRUD',
      summary: 'Try tenant record API calls. Not a customer workflow.',
      commonTasks: ['Run a test record call'],
      relatedRoutes: ['/admin/tenant-management/test'],
      suggestedChips: ['What is Test CRUD for?'],
      platformOnly: true,
    },
  },
  {
    prefix: '/admin',
    info: {
      featureKey: 'admin-home',
      label: 'Admin Home',
      summary: 'Dashboard of admin tools for the selected organization.',
      commonTasks: ['Open a tool tile', 'Search features', 'Change workspace'],
      relatedRoutes: ['/admin'],
      suggestedChips: [
        'How do I upload media for an event?',
        'How do I promote a user to ADMIN?',
        'Where do I create an event?',
        'What is Retail morning brief?',
      ],
    },
  },
];

/** Resolve the best route info for a pathname (longest matching prefix). */
export function resolveRouteInfo(pathname: string | null | undefined): AdminHelpRouteInfo | null {
  const path = (pathname || '').split('?')[0] || '';
  if (!path.startsWith('/admin')) return null;

  let best: { prefix: string; info: AdminHelpRouteInfo } | null = null;
  for (const entry of ROUTE_ENTRIES) {
    const matches =
      path === entry.prefix ||
      path.startsWith(`${entry.prefix}/`) ||
      (entry.prefix === '/admin' && (path === '/admin' || path === '/admin/'));
    if (!matches) continue;
    if (!best || entry.prefix.length > best.prefix.length) {
      best = entry;
    }
  }
  return best?.info ?? null;
}

export function suggestedChipsForPath(
  pathname: string | null | undefined,
  isPlatformSuperAdmin: boolean,
): string[] {
  const route = resolveRouteInfo(pathname);
  if (!route) {
    return ['How do I find the right admin tool?', 'How do I create an event?'];
  }
  if (route.platformOnly && !isPlatformSuperAdmin) {
    return [
      'How do I upload media for an event?',
      'How do I promote a user to ADMIN?',
      'Where do I create an event?',
    ];
  }
  return route.suggestedChips;
}
