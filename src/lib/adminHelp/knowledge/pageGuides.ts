import type { AdminHelpChunk, AdminHelpPageGuide } from '../types';

/**
 * Page guides: a full, section-by-section manual for one admin page.
 *
 * When the user asks from a page that has a guide, the whole guide is sent to the
 * model (not just the top keyword hits), so "how do I do X here?" questions can be
 * answered from what is actually on the page. Each section is also exposed as a
 * retrievable chunk so questions asked from other pages can still find it.
 *
 * Facts here are taken from the page code. Keep them in sync when the page changes:
 * - Tenant Settings: src/app/admin/tenant-management/components/TenantSettingsForm.tsx,
 *   SocialUrlFields.tsx, TenantDefaultHeroManager.tsx
 */
export const PAGE_GUIDES: AdminHelpPageGuide[] = [
  {
    featureKey: 'tenant-settings',
    title: 'Tenant Settings',
    pathPrefixes: ['/admin/tenant-management/settings'],
    sourceFiles: [
      'src/app/admin/tenant-management/components/TenantSettingsForm.tsx',
      'src/app/admin/tenant-management/components/SocialUrlFields.tsx',
      'src/app/admin/tenant-management/components/TenantDefaultHeroManager.tsx',
    ],
    sections: [
      {
        slug: 'overview',
        heading: 'Where things are on Tenant Settings',
        body: [
          'Tenant Settings holds one settings record per website tenant ID.',
          'The list is at /admin/tenant-management/settings; use the Edit settings action on a row to open /admin/tenant-management/settings/{id}/edit. New records are created at /admin/tenant-management/settings/new.',
          'The edit form has five tabs: General, Integrations, Limits, Customization, and Homepage Hero. A tab can be opened directly with ?tab=integrations, ?tab=limits, ?tab=customization, or ?tab=homepageHero.',
          'General: Organization, Website tenant ID, Repository URL, Registrar details, Contact Information (email, phone number, tenant name), Social links, User Registration, Guest Registration, Homepage Display Settings, Header Menu, Personal Profile Sections.',
          'Integrations: Gas Station AI Engine, Retail AI Engine, WhatsApp Integration, Email Marketing, Google AdSense.',
          'Limits: Max Events Per Month, Max Attendees Per Event, Default Event Capacity, Platform Fee Percentage.',
          'Customization: Custom CSS, Custom JavaScript, Email Header Image, Email Footer HTML, Brand colors, Tenant Logo.',
          'Homepage Hero: default homepage hero images for the tenant.',
          'Text and toggle fields are stored when you click Save at the bottom of the form. Image and file uploads (logo, email header image, email footer HTML, hero images) save immediately and need an already saved settings record.',
          'Organization admins can edit the settings of sites in their own organization; platform super admins can open every tenant.',
        ].join(' '),
        keywords: ['tenant settings', 'tabs', 'where', 'edit settings', 'save', 'general', 'customization', 'integrations', 'limits'],
      },
      {
        slug: 'logo',
        heading: 'Upload, replace, or remove the tenant logo',
        body: [
          'The logo is on the Customization tab, in the Tenant Logo section at the bottom (just below Brand colors).',
          'Steps to upload: 1) Open the settings record with Edit settings (the record must already be saved; on a brand-new unsaved record the upload box is disabled). 2) Go to the Customization tab. 3) In Tenant Logo, click the dashed box "Click to upload or drag and drop tenant logo image", or drag an image file onto it. 4) Use PNG, JPG, or GIF up to 5MB (any image file type is accepted by the picker).',
          'The logo is uploaded and saved to the settings record right away; you see "Logo image uploaded and saved successfully!". You do not need to click Save for the logo itself.',
          'To replace a logo: the upload box only shows when there is no logo, so first click the red X on the current logo preview (Remove logo), wait for "Logo image removed successfully!", then upload the new image.',
          'Copy URL: the read-only field above the image shows the current logo URL. Click Copy URL to copy it for satellite domain branding or other apps. It changes whenever the logo is uploaded or removed.',
          'If the upload fails, the error message is shown under the box; check the file is an image and under 5MB, then try again.',
        ].join(' '),
        keywords: ['logo', 'tenant logo', 'upload logo', 'update logo', 'change logo', 'replace logo', 'remove logo', 'delete logo', 'logo url', 'copy url', 'branding', 'image'],
      },
      {
        slug: 'brand-colors',
        heading: 'Brand colors',
        body: [
          'Customization tab → Brand colors: set Primary color and Secondary color for this tenant ID. They sit with the logo and are stored when you click Save.',
        ].join(' '),
        keywords: ['brand colors', 'primary color', 'secondary color', 'colour', 'theme'],
      },
      {
        slug: 'social-links',
        heading: 'Social media links (Facebook, Instagram, X, LinkedIn, YouTube, TikTok, WhatsApp)',
        body: [
          'Social links are on the General tab, under Contact Information.',
          'There is one URL field each for Facebook, Instagram, X, LinkedIn, YouTube, TikTok, and WhatsApp. Enter the full link, for example https://www.facebook.com/yourpage or https://www.instagram.com/yourhandle. For WhatsApp use a click-to-chat link such as https://api.whatsapp.com/send?phone=15551234567 (country code and number, digits only).',
          'Each URL can be up to 1024 characters. Leave a field empty to hide that network.',
          'Click Save at the bottom of the form to store the links.',
          'To show the social links in the public site header, turn on Links under General → Header Menu ("Show Links (social URLs + external-link writings)").',
        ].join(' '),
        keywords: ['social', 'social links', 'social url', 'facebook', 'instagram', 'twitter', 'x.com', 'linkedin', 'youtube', 'tiktok', 'whatsapp'],
      },
      {
        slug: 'general-contact',
        heading: 'Organization, tenant ID, and contact details',
        body: [
          'General tab: Organization (required) links the settings to a tenant organization; organization details are edited under Tenant Organizations → Edit.',
          'Website tenant ID (required) identifies the website these settings belong to.',
          'Repository URL and Registrar details are optional reference fields.',
          'Contact Information holds the contact email, Phone Number, and Tenant name shown for this tenant. Click Save to store changes.',
        ].join(' '),
        keywords: ['organization', 'tenant id', 'contact', 'email', 'phone', 'tenant name', 'repository', 'registrar'],
      },
      {
        slug: 'registration',
        heading: 'User and guest registration',
        body: [
          'General tab → User Registration: Allow User Registration lets people register themselves; Require Admin Approval makes new registrations wait for an admin.',
          'Guest Registration: Enable Guest Registration lets attendees bring guests to events, and Max Guests Per Attendee caps how many. Click Save.',
        ].join(' '),
        keywords: ['registration', 'sign up', 'approval', 'guest', 'guests', 'attendee'],
      },
      {
        slug: 'homepage-sections',
        heading: 'Homepage sections',
        body: [
          'General tab → Homepage Display Settings controls which sections show on the public homepage: Show Events Section, Show Team Members Section, Show Sponsors Section, League standings on homepage, and Enable Membership Subscription.',
          'Personal Profile Sections (for Personal Profile and Hybrid site types) toggles profile blocks such as Show Profile Hero Section. These are preset by the organization site type.',
          'Click Save. If the public homepage still looks old afterwards, use Homepage Cache to refresh it.',
        ].join(' '),
        keywords: ['homepage', 'sections', 'show events', 'team members', 'sponsors', 'league standings', 'membership', 'profile sections'],
      },
      {
        slug: 'header-menu',
        heading: 'Header menu items',
        body: [
          'General tab → Header Menu has one switch per public header item: Home, About, Events, Features, Calendar, Gallery, Contact, News, Downloads, Services, Achievements, Affiliations, Projects, Family, Tournament, Leagues, News advertisements, and Links.',
          'Links shows social URLs plus external-link writings. News advertisements off hides every ad slot for this tenant. Click Save.',
        ].join(' '),
        keywords: ['header', 'menu', 'navigation', 'links', 'news', 'gallery', 'calendar', 'advertisements'],
      },
      {
        slug: 'integrations',
        heading: 'Integrations (AI engines, WhatsApp, email marketing, AdSense)',
        body: [
          'Integrations tab: Gas Station AI Engine and Retail AI Engine take a base URL, an API Key Reference (a secrets-manager reference only, never the raw key), a Webhook Token, and Daily Brief Hour (local).',
          'WhatsApp Integration: WhatsApp Business Phone Number, Twilio Account SID, Twilio Auth Token, Default Message Template, Maximum Messages Per Day, a per-minute rate limit, Webhook URL, and Webhook Token; buttons let you test the configuration or open Advanced Settings.',
          'Email Marketing holds the email provider configuration. Google AdSense needs a Publisher ID and ad placements.',
          'Click Save to store integration fields.',
        ].join(' '),
        keywords: ['integration', 'whatsapp', 'twilio', 'ai engine', 'retail', 'gas', 'webhook', 'email marketing', 'adsense', 'advertising', 'api key'],
      },
      {
        slug: 'limits',
        heading: 'Usage limits and platform fee',
        body: [
          'Limits tab: Max Events Per Month and Max Attendees Per Event (leave empty for unlimited), Default Event Capacity, and Platform Fee Percentage (for example 2.5 for 2.5%). Click Save.',
        ].join(' '),
        keywords: ['limits', 'max events', 'attendees', 'capacity', 'platform fee', 'percentage'],
      },
      {
        slug: 'custom-css-js',
        heading: 'Custom CSS and JavaScript',
        body: [
          'Customization tab: Custom CSS is applied to all public pages; Custom JavaScript is loaded on all pages. Use with caution, then click Save.',
        ].join(' '),
        keywords: ['css', 'javascript', 'custom code', 'styling'],
      },
      {
        slug: 'email-branding',
        heading: 'Email header image and footer HTML',
        body: [
          'Customization tab → Email Header Image: upload an image file used at the top of emails; it saves immediately and can be removed from the current image preview.',
          'Email Footer HTML: upload a custom HTML footer file, or use Add site footer to generate the homepage-style footer and save it. The saved footer can be reused for Contact Us and other transactional emails.',
          'Both need a saved settings record (save the tenant settings first).',
        ].join(' '),
        keywords: ['email', 'header image', 'footer', 'html', 'email branding', 'transactional'],
      },
      {
        slug: 'homepage-hero',
        heading: 'Default homepage hero images',
        body: [
          'Homepage Hero tab: upload default hero slides shown when there is no upcoming event hero media. PNG, JPG, JPEG, WEBP, or GIF up to 10 MB, about 2000×800 landscape, up to 20 images.',
          'New uploads start Inactive; mark slides Active and drag to reorder. Homepage display count (1–20, default 6) caps how many show. Include with events appends these after event heroes.',
        ].join(' '),
        keywords: ['hero', 'hero images', 'slideshow', 'banner', 'homepage hero'],
      },
    ],
  },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Longest-prefix page guide for a pathname, or null. */
export function resolvePageGuide(pathname: string | null | undefined): AdminHelpPageGuide | null {
  const path = (pathname || '').split('?')[0] || '';
  let best: { guide: AdminHelpPageGuide; length: number } | null = null;
  for (const guide of PAGE_GUIDES) {
    for (const prefix of guide.pathPrefixes) {
      if (matchesPrefix(path, prefix) && (!best || prefix.length > best.length)) {
        best = { guide, length: prefix.length };
      }
    }
  }
  return best?.guide ?? null;
}

export function pageGuideChunkId(guide: AdminHelpPageGuide, slug: string): string {
  return `page:${guide.featureKey}:${slug}`;
}

/** Every page-guide section as a retrievable chunk. */
export const PAGE_GUIDE_CHUNKS: AdminHelpChunk[] = PAGE_GUIDES.flatMap((guide) =>
  guide.sections.map((section) => ({
    id: pageGuideChunkId(guide, section.slug),
    featureKey: guide.featureKey,
    title: `${guide.title}: ${section.heading}`,
    body: section.body,
    keywords: section.keywords,
    platformOnly: guide.platformOnly,
    pathPrefixes: guide.pathPrefixes,
  })),
);
