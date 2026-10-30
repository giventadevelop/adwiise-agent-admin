'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from "@clerk/nextjs";
import { useAdminAccess } from './AdminTenantContext';
import AdminTenantWorkspacePicker from './AdminTenantWorkspacePicker';
import { fetchTenantSiteTypeServer } from './tournaments/ApiServerActions';

const BUTTON_GUIDES: Record<string, string> = {
  'admin-home': 'Returns to this dashboard so you can open another admin area. It does not edit tenant data.',
  'manage-usage': 'People in the selected organization. Change role, approval, and contact details. This is the member list, not the sports squad.',
  'manage-events': 'Create, edit, and publish events. Set dates, tickets, and whether the event is visible on the public site.',
  'event-analytics': 'Attendance and ticket activity across events. Use it to compare how events performed.',
  'event-registrations': 'Who signed up for events, including guests. Open this for the attendee list rather than sales totals.',
  'poll-management': 'Create polls, answer choices, and the dates they stay open. Responses are collected on the public site.',
  'focus-groups': 'Discussion circles and the events attached to them. Use this for committees, not for sports squads or bands.',
  'membership-plans': 'Plans people can buy: name, price, and benefits. This screen does not list who already subscribed.',
  'membership-subscriptions': 'Who has an active, pending, or canceled membership. Check a person here; create the plan on Membership Plans.',
  'tenant-email-addresses': 'Official email addresses for this organization, used as senders or public contacts. Not a one-off campaign.',
  'bulk-email': 'Send one announcement to many people. Use Email Addresses for the organization inbox, and this screen for the send.',
  'test-stripe': 'Run a test card payment in Stripe. Confirm checkout works before a real ticket sale.',
  'media-management': 'Upload images and files used by events and pages. Public photo albums are managed under Gallery Albums.',
  'gallery-albums': 'Group public photos into albums shown on the gallery page.',
  'executive-committee': 'Officers shown on the public site: name, title, order, and photo. These are leaders, not squad players.',
  'team-groups': 'Containers for a sports club or band, such as First XI, Under-16, or Choir. Create the group here, then add people on Squad roster. Whether the group is sports or music comes from team types in Roster catalogs.',
  'team-members': 'People inside a squad: name, sports, skills, achievements, and portrait. Choose their squad group on this form. Sport and achievement choices come from Roster catalogs.',
  'roster-catalogs': 'Dropdown lists used by squads: sports, achievement categories, and team types. A shared row is offered to every tenant. Only a platform super admin should change shared rows.',
  'access-catalogs': 'Two shared dropdowns on one page: access roles, and site or retailer types. Shared rows apply to every tenant and are edited by a platform super admin.',
  'access-roles': 'Roles such as ADMIN and any custom role you add. They decide who sees the admin menu and which locations a person can open. Change shared roles only as platform super admin.',
  'retailer-types': 'Shop and brand kinds such as liquor store, Dunkin, and Seven-Eleven, plus the module they belong to. These codes are stored as the organization site type and appear in onboarding and organization dropdowns.',
  'site-types': 'Organization kinds such as events, church, sports team, music band, personal profile, hybrid, and gas station. They are stored in the same list as retailer types. Adding a row adds a choice to onboarding and the organization site-type dropdown.',
  'sports-categories': 'Sports such as football or cricket, shown as checkboxes on a squad member. A shared sport is available to every tenant. Edit shared rows only as platform super admin.',
  'tournaments': 'Seasons or cups for a sports-team site. This tile appears only when the organization site type is a sports team.',
  'homepage-cache': 'Refresh stored homepage content after heroes, events, or sections change and the public page still looks old.',
  'event-sponsors': 'Sponsor names and logos that can be attached to events.',
  'tenant-organizations': 'Create and edit tenant organizations: name, domain, and website. Platform super admin only.',
  'satellite-domains': 'Extra public domains that sign in through this hub. Platform super admin only.',
  'onboarding-requests': 'New customer applications. Approve one to create a tenant. The site type chosen here decides which tools that tenant sees.',
  'tenant-settings': 'Homepage sections, hero images, and feature flags for a tenant. Platform super admin only.',
  'profile-site': 'A personal or hybrid profile site: writings, projects, services, and contact blocks.',
  'gas-station': 'Tools for gas-station tenants: locations, daily numbers, and recommendations.',
  'platform-bill': 'What this tenant owes the platform for the software. This is not ticket revenue.',
  'platform-plans': 'The fee catalog used to charge tenants. Platform super admin only.',
  'tenant-test': 'Try create and update calls against tenant records. For checking the API, not for everyday content.',
  'global-performers': 'A shared performer list you can attach to many events.',
  'global-contacts': 'A shared contact list you can attach to events.',
  'global-emails': 'Shared email contacts used on events.',
  'global-directors': 'Shared program directors you can assign to events.',
  'qr-scanner': 'Scan a ticket QR code at the door and mark that person checked in.',
  'check-in-analytics': 'Who has arrived compared with who bought a ticket.',
  'sales-analytics': 'Ticket revenue and sales totals.',
  'manual-payments': 'Payments that skipped the card form, such as Zelle or Venmo.',
  'official-documents': 'Official files such as bylaws or notices for the public documents area.',
  'official-document-categories': 'Folder names those official documents are filed under.',
  'batch-jobs-dashboard': 'Whether scheduled jobs ran, failed, or are still waiting.',
  'homepage-youtube-live': 'The live or featured YouTube video on the homepage.',
  'gallery-youtube-videos': 'YouTube videos that appear in the gallery.',
  'news-advertisements': 'Turn this tenant’s news advertisements on or off. The main switch hides every slot. When it is on, each advertisement on the news page can be shown or hidden on its own.',
};

export default function AdminPage() {
  const { userId } = useAuth();
  const { isPlatformSuperAdmin, tenantId } = useAdminAccess();
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [isSportsTeam, setIsSportsTeam] = useState(false);
  const [cursorTip, setCursorTip] = useState<{ text: string; x: number; y: number } | null>(null);

  function moveCursorTip(text: string, event: React.MouseEvent) {
    const offset = 16;
    const width = 320;
    const height = Math.min(240, 56 + Math.ceil(text.length / 48) * 20);
    let x = event.clientX + offset;
    let y = event.clientY + offset;
    if (x + width > window.innerWidth - 8) x = Math.max(8, event.clientX - width - 8);
    if (y + height > window.innerHeight - 8) y = Math.max(8, event.clientY - height - 8);
    setCursorTip({ text, x, y });
  }

  useEffect(() => {
    if (!tenantId) {
      setIsSportsTeam(false);
      return;
    }
    let cancelled = false;
    fetchTenantSiteTypeServer(tenantId).then((siteType) => {
      if (!cancelled) setIsSportsTeam(siteType === 'SPORTS_TEAM');
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // CRITICAL: Each button must have a UNIQUE color - no duplicates allowed
  // All gray colors (gray, slate, stone, zinc, neutral) are avoided
  // Using all available Tailwind colors + custom colors for 24 unique buttons
  const adminButtons = [
    {
      href: '/admin',
      icon: 'home',
      label: 'Admin Home',
      hint: 'Open the admin dashboard',
      color: 'blue',
      key: 'admin-home'
    },
    {
      href: '/admin/manage-usage',
      icon: 'users',
      label: 'Manage Users',
      hint: 'Edit member user accounts',
      color: 'indigo',
      key: 'manage-usage'
    },
    {
      href: '/admin/manage-events',
      icon: 'calendar',
      label: 'Manage Events',
      hint: 'Create and edit events',
      color: 'green',
      key: 'manage-events'
    },
    {
      href: '/admin/events/dashboard',
      icon: 'chart',
      label: 'Event Analytics',
      hint: 'View event attendance stats',
      color: 'teal',
      key: 'event-analytics'
    },
    {
      href: '/admin/events/registrations',
      icon: 'users',
      label: 'Registrations',
      hint: 'Review event signup lists',
      color: 'purple',
      key: 'event-registrations'
    },
    {
      href: '/admin/polls',
      icon: 'chartBar',
      label: 'Poll Management',
      hint: 'Create and manage polls',
      color: 'violet',
      key: 'poll-management'
    },
    {
      href: '/admin/focus-groups',
      icon: 'userFriends',
      label: 'Focus Groups',
      hint: 'Manage discussion focus groups',
      color: 'orange',
      key: 'focus-groups'
    },
    {
      href: '/admin/membership/plans',
      icon: 'addressCard',
      label: 'Membership Plans',
      hint: 'Set membership plan prices',
      color: 'pink',
      key: 'membership-plans'
    },
    {
      href: '/admin/membership/subscriptions',
      icon: 'fileInvoice',
      label: 'Membership Subscriptions',
      hint: 'View active member subscriptions',
      color: 'rose',
      key: 'membership-subscriptions'
    },
    {
      href: '/admin/tenant-email-addresses',
      icon: 'mailBulk',
      label: 'Email Addresses',
      hint: 'Manage tenant email addresses',
      sublabel: '[tenant email ids]',
      color: 'lime',
      key: 'tenant-email-addresses'
    },
    {
      href: '/admin/bulk-email',
      icon: 'envelope',
      label: 'Bulk Email',
      hint: 'Send bulk email campaigns',
      color: 'yellow',
      key: 'bulk-email'
    },
    {
      href: '/admin/test-stripe',
      icon: 'creditCard',
      label: 'Test Stripe',
      hint: 'Test Stripe payment flows',
      color: 'fuchsia',
      key: 'test-stripe'
    },
    {
      href: '/admin/media',
      icon: 'image',
      label: 'Media Management',
      hint: 'Upload and organize media',
      color: 'cyan',
      key: 'media-management'
    },
    {
      href: '/admin/gallery/albums',
      icon: 'photoAlbum',
      label: 'Gallery Albums',
      hint: 'Manage public photo albums',
      color: 'deepTeal',
      key: 'gallery-albums'
    },
    {
      href: '/admin/executive-committee',
      icon: 'userTie',
      label: 'Executive Committee',
      hint: 'Edit leadership team roster',
      color: 'amber',
      key: 'executive-committee'
    },
    {
      href: '/admin/team-groups',
      icon: 'userFriends',
      label: 'Squad groups',
      hint: 'Create squads for a team or band',
      sublabel: 'Sports / bands',
      color: 'squadGroups',
      key: 'team-groups'
    },
    {
      href: '/admin/team-members',
      icon: 'addressCard',
      label: 'Squad roster',
      hint: 'Add players and their profiles',
      sublabel: 'Members',
      color: 'squadRoster',
      key: 'team-members'
    },
    {
      href: '/admin/roster-catalogs',
      icon: 'listChecks',
      label: 'Roster catalogs',
      hint: 'Sports, awards, and team types',
      sublabel: 'Sports and types',
      color: 'sky',
      key: 'roster-catalogs'
    },
    {
      href: '/admin/access-catalogs',
      icon: 'keyRound',
      label: 'Access catalogs',
      hint: 'Roles plus site and shop types',
      sublabel: 'Roles and retailers',
      color: 'accessCatalog',
      key: 'access-catalogs'
    },
    {
      href: '/admin/access-catalogs#access-roles',
      icon: 'keyRound',
      label: 'Access roles',
      hint: 'Add roles for the admin menu',
      color: 'accessRolesBtn',
      key: 'access-roles',
      platformOnly: true,
    },
    {
      href: '/admin/access-catalogs#retailer-types',
      icon: 'building',
      label: 'Retailer types',
      hint: 'Add shop and brand kinds',
      color: 'retailerTypesBtn',
      key: 'retailer-types',
      platformOnly: true,
    },
    {
      href: '/admin/access-catalogs#retailer-types',
      icon: 'globe',
      label: 'Site types',
      hint: 'Add organization site kinds',
      color: 'siteTypesBtn',
      key: 'site-types',
      platformOnly: true,
    },
    {
      href: '/admin/roster-catalogs#sports-categories',
      icon: 'listChecks',
      label: 'Sports categories',
      hint: 'Add sports for squad members',
      color: 'sportsCategoryBtn',
      key: 'sports-categories',
      platformOnly: true,
    },
    {
      href: '/admin/tournaments',
      icon: 'trophy',
      label: 'Tournaments',
      hint: 'Manage sports tournament editions',
      sublabel: 'Sports editions',
      color: 'tournamentCup',
      key: 'tournaments',
      sportsOnly: true,
    },
    {
      href: '/admin/homepage-cache',
      icon: 'refresh',
      label: 'Cache records',
      hint: 'Refresh cached homepage content',
      color: 'cacheRecords',
      key: 'homepage-cache'
    },
    {
      href: '/admin/event-sponsors',
      icon: 'handshake',
      label: 'Event Sponsors',
      hint: 'Manage event sponsor listings',
      color: 'emerald',
      key: 'event-sponsors'
    },
    {
      href: '/admin/tenant-management/organizations',
      icon: 'building',
      label: 'Organizations',
      hint: 'Manage tenant organizations',
      color: 'sky',
      key: 'tenant-organizations',
      platformOnly: true,
    },
    {
      href: '/admin/satellite-domains',
      icon: 'globe',
      label: 'Satellite Domains',
      hint: 'Configure extra site domains',
      color: 'sky',
      key: 'satellite-domains',
      platformOnly: true,
    },
    {
      href: '/admin/onboarding-requests',
      icon: 'userPlus',
      label: 'Onboarding Requests',
      hint: 'Review new customer signups',
      sublabel: 'New customers',
      color: 'onboardingRequests',
      key: 'onboarding-requests',
      platformOnly: true,
    },
    {
      href: '/admin/tenant-management/settings',
      icon: 'cog',
      label: 'Tenant Settings',
      hint: 'Configure tenant site settings',
      color: 'red',
      key: 'tenant-settings',
      platformOnly: true,
    },
    {
      href: '/admin/profile-site',
      icon: 'users',
      label: 'Personal Profile',
      hint: 'Edit public profile pages',
      color: 'violet',
      key: 'profile-site'
    },
    {
      href: '/admin/gas-station',
      icon: 'chart',
      label: 'Gas Stations',
      hint: 'Open gas station tools',
      color: 'orange',
      key: 'gas-station',
      platformOnly: true,
    },
    {
      href: '/admin/billing',
      icon: 'creditCard',
      label: 'Platform Bill',
      hint: 'View tenant platform invoice',
      color: 'platformBill',
      key: 'platform-bill',
    },
    {
      href: '/admin/platform-billing/plans',
      icon: 'fileInvoice',
      label: 'Billing Plans',
      hint: 'Manage platform fee plans',
      color: 'platformPlans',
      key: 'platform-plans',
      platformOnly: true,
    },
    {
      href: '/admin/tenant-management/test',
      icon: 'chart',
      label: 'Test CRUD',
      hint: 'Test tenant record APIs',
      color: 'warmOrange',
      key: 'tenant-test',
      platformOnly: true,
    },
    {
      href: '/admin/event-featured-performers',
      icon: 'microphone',
      label: 'Global Performers',
      hint: 'Manage shared event performers',
      color: 'coolBlue',
      key: 'global-performers'
    },
    {
      href: '/admin/event-contacts',
      icon: 'phone',
      label: 'Global Contacts',
      hint: 'Manage shared event contacts',
      color: 'vibrantPurple',
      key: 'global-contacts'
    },
    {
      href: '/admin/event-emails',
      icon: 'mailBulk',
      label: 'Global Emails',
      hint: 'Manage shared event emails',
      color: 'softPink',
      key: 'global-emails'
    },
    {
      href: '/admin/event-program-directors',
      icon: 'userCheck',
      label: 'Global Directors',
      hint: 'Manage shared program directors',
      color: 'brightYellow',
      key: 'global-directors'
    },
    {
      href: '/admin/qr-scanner',
      icon: 'qrcode',
      label: 'QR Scanner',
      hint: 'Scan tickets at check-in',
      color: 'lightCyan',
      key: 'qr-scanner'
    },
    {
      href: '/admin/check-in-analytics',
      icon: 'clipboardCheck',
      label: 'Check-In Analytics',
      hint: 'Review ticket arrival stats',
      color: 'cyan',
      key: 'check-in-analytics'
    },
    {
      href: '/admin/sales-analytics',
      icon: 'chartLine',
      label: 'Sales Analytics',
      hint: 'Review ticket sales revenue',
      color: 'sky',
      key: 'sales-analytics'
    },
    {
      href: '/admin/manual-payments',
      icon: 'moneyBill',
      label: 'Manual Payments [Zelle, Venmo…]',
      hint: 'Record offline manual payments',
      color: 'mintGreen',
      key: 'manual-payments'
    },
    {
      href: '/admin/leagues',
      icon: 'chartBar',
      label: 'Leagues',
      hint: 'Clubs, results, and standings',
      color: 'leagueTables',
      key: 'leagues'
    },
    {
      href: '/admin/squads',
      icon: 'userFriends',
      label: 'Squad membership',
      hint: 'Put a player on more than one squad',
      color: 'squadMembership',
      key: 'squad-membership'
    },
    {
      href: '/admin/official-documents',
      icon: 'folderOpen',
      label: 'Official Documents',
      hint: 'Manage official document files',
      color: 'documentOfficial',
      key: 'official-documents'
    },
    {
      href: '/admin/official-document-categories',
      icon: 'listBullet',
      label: 'Document categories',
      hint: 'Organize official document types',
      sublabel: 'Official library',
      color: 'docCategories',
      key: 'official-document-categories'
    },
    {
      href: '/admin/batch-jobs',
      icon: 'chartBar',
      label: 'Batch Job Dashboard',
      hint: 'Monitor scheduled batch jobs',
      color: 'indigo',
      key: 'batch-jobs-dashboard'
    },
    {
      href: '/admin/homepage-youtube-live',
      icon: 'youtube',
      label: 'Homepage YouTube',
      hint: 'Set homepage live stream',
      color: 'youtubeLive',
      key: 'homepage-youtube-live'
    },
    {
      href: '/admin/gallery-youtube-videos',
      icon: 'youtube',
      label: 'Gallery YouTube',
      hint: 'Manage gallery video links',
      color: 'galleryVideos',
      key: 'gallery-youtube-videos'
    },
    {
      href: '/admin/news-advertisements',
      icon: 'newspaper',
      label: 'News ads',
      hint: 'Show or hide news page ads',
      color: 'newsAdsBtn',
      key: 'news-advertisements',
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
      green: 'bg-green-50 hover:bg-green-100 text-green-800',
      yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800',
      purple: 'bg-purple-50 hover:bg-purple-100 text-purple-800',
      orange: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
      teal: 'bg-teal-50 hover:bg-teal-100 text-teal-800',
      indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
      cyan: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800',
      red: 'bg-red-50 hover:bg-red-100 text-red-800',
      pink: 'bg-pink-50 hover:bg-pink-100 text-pink-800',
      emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
      amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
      rose: 'bg-rose-50 hover:bg-rose-100 text-rose-800',
      lime: 'bg-lime-50 hover:bg-lime-100 text-lime-800',
      violet: 'bg-violet-50 hover:bg-violet-100 text-violet-800',
      fuchsia: 'bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800',
      sky: 'bg-sky-50 hover:bg-sky-100 text-sky-800',
      accessCatalog: 'bg-[#eefbf3] hover:bg-[#d3f9e0] text-[#0b6e4f]',
      // Custom colors for additional unique buttons (using Tailwind color shades)
      warmOrange: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
      coolBlue: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
      vibrantPurple: 'bg-purple-50 hover:bg-purple-100 text-purple-800',
      softPink: 'bg-pink-50 hover:bg-pink-100 text-pink-800',
      brightYellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800',
      deepTeal: 'bg-teal-50 hover:bg-teal-100 text-teal-800',
      lightCyan: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800',
      mintGreen: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
      documentOfficial: 'bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#5b21b6]',
      docCategories: 'bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#9d174d]',
      squadGroups: 'bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#6b21a8]',
      leagueTables: 'bg-[#fff7ed] hover:bg-[#ffedd5] text-[#9a3412]',
      squadMembership: 'bg-[#f0fdfa] hover:bg-[#ccfbf1] text-[#115e59]',
      tournamentCup: 'bg-[#ecfeff] hover:bg-[#cffafe] text-[#155e75]',
      squadRoster: 'bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#9f1239]',
      cacheRecords: 'bg-[#ecfeff] hover:bg-[#cffafe] text-[#0e7490]',
      youtubeLive: 'bg-[#f4f7e8] hover:bg-[#e7efc8] text-[#3f6212]',
      galleryVideos: 'bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#9f1239]',
      onboardingRequests: 'bg-[#eaf6fb] hover:bg-[#d3ecf7] text-[#075985]',
      platformBill: 'bg-[#ffd8a8] hover:bg-[#ffc078] text-[#d9480f]',
      platformPlans: 'bg-[#d0ebff] hover:bg-[#a5d8ff] text-[#1864ab]',
      accessRolesBtn: 'bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0c4a6e]',
      retailerTypesBtn: 'bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e]',
      siteTypesBtn: 'bg-[#fae8ff] hover:bg-[#f5d0fe] text-[#86198f]',
      sportsCategoryBtn: 'bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#065f46]',
      newsAdsBtn: 'bg-[#e0f7fa] hover:bg-[#b2ebf2] text-[#006064]'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      yellow: 'bg-yellow-100',
      purple: 'bg-purple-100',
      orange: 'bg-orange-100',
      teal: 'bg-teal-100',
      indigo: 'bg-indigo-100',
      cyan: 'bg-cyan-100',
      red: 'bg-red-100',
      pink: 'bg-pink-100',
      emerald: 'bg-emerald-100',
      amber: 'bg-amber-100',
      rose: 'bg-rose-100',
      lime: 'bg-lime-100',
      violet: 'bg-violet-100',
      fuchsia: 'bg-fuchsia-100',
      sky: 'bg-sky-100',
      // Custom colors for additional unique buttons
      warmOrange: 'bg-orange-100',
      coolBlue: 'bg-blue-100',
      vibrantPurple: 'bg-purple-100',
      softPink: 'bg-pink-100',
      brightYellow: 'bg-yellow-100',
      deepTeal: 'bg-teal-100',
      lightCyan: 'bg-cyan-100',
      mintGreen: 'bg-emerald-100',
      documentOfficial: 'bg-[#ddd6fe]',
      docCategories: 'bg-[#fbcfe8]',
      squadGroups: 'bg-[#e9d5ff]',
      leagueTables: 'bg-[#ffedd5]',
      squadMembership: 'bg-[#ccfbf1]',
      tournamentCup: 'bg-[#a5f3fc]',
      squadRoster: 'bg-[#fecdd3]',
      cacheRecords: 'bg-[#a5f3fc]',
      youtubeLive: 'bg-[#d9e8a8]',
      galleryVideos: 'bg-[#fecdd3]',
      onboardingRequests: 'bg-[#bfe3f3]',
      platformBill: 'bg-[#ffc078]',
      platformPlans: 'bg-[#a5d8ff]',
      accessRolesBtn: 'bg-[#bae6fd]',
      retailerTypesBtn: 'bg-[#fde68a]',
      siteTypesBtn: 'bg-[#f5d0fe]',
      sportsCategoryBtn: 'bg-[#a7f3d0]',
      newsAdsBtn: 'bg-[#b2ebf2]'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconTextColor = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      yellow: 'text-yellow-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
      teal: 'text-teal-500',
      indigo: 'text-indigo-500',
      cyan: 'text-cyan-500',
      red: 'text-red-500',
      pink: 'text-pink-500',
      emerald: 'text-emerald-500',
      amber: 'text-amber-500',
      rose: 'text-rose-500',
      lime: 'text-lime-500',
      violet: 'text-violet-500',
      fuchsia: 'text-fuchsia-500',
      sky: 'text-sky-500',
      // Custom colors for additional unique buttons
      warmOrange: 'text-orange-500',
      coolBlue: 'text-blue-500',
      vibrantPurple: 'text-purple-500',
      softPink: 'text-pink-500',
      brightYellow: 'text-yellow-500',
      deepTeal: 'text-teal-500',
      lightCyan: 'text-cyan-500',
      mintGreen: 'text-emerald-500',
      documentOfficial: 'text-violet-600',
      docCategories: 'text-pink-600',
      squadGroups: 'text-[#7c3aed]',
      leagueTables: 'text-[#c2410c]',
      squadMembership: 'text-[#0f766e]',
      tournamentCup: 'text-[#0e7490]',
      squadRoster: 'text-[#e11d48]',
      cacheRecords: 'text-[#0891b2]',
      youtubeLive: 'text-[#4d7c0f]',
      galleryVideos: 'text-[#be123c]',
      onboardingRequests: 'text-[#0369a1]',
      platformBill: 'text-[#d9480f]',
      platformPlans: 'text-[#1864ab]',
      accessRolesBtn: 'text-[#0369a1]',
      retailerTypesBtn: 'text-[#b45309]',
      siteTypesBtn: 'text-[#a21caf]',
      sportsCategoryBtn: 'text-[#047857]',
      newsAdsBtn: 'text-[#00838f]'
    };
    return colorMap[color] || colorMap.blue;
  };

  const renderIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'trophy':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8m-4-4v4M6 4h12v5a6 6 0 01-12 0V4zM6 6H4a2 2 0 000 4h2M18 6h2a2 2 0 010 4h-2" /></svg>;
      case 'home':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
      case 'users':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
      case 'calendar':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case 'chart':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'chartBar':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'userFriends':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'addressCard':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
      case 'listChecks':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'keyRound':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
      case 'fileInvoice':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'mailBulk':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'envelope':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'creditCard':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'image':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case 'photoAlbum':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V17a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M8 14h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01" /></svg>;
      case 'userTie':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'refresh':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
      case 'handshake':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>;
      case 'building':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
      case 'cog':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      case 'microphone':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
      case 'phone':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
      case 'userCheck':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'qrcode':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>;
      case 'clipboardCheck':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'chartLine':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>;
      case 'moneyBill':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'folderOpen':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h12a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>;
      case 'listBullet':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7m0 0l3-3m-3 3l3 3" /></svg>;
      case 'globe':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9 0 01-9-9m9 9c0 01.53.053 0 019 9m-9-9a9 9 0 019-9m-9 9a9 9 0 019 9m0 0a9 9 0 01-9 9m9-9a9 9 0 009 9" /></svg>;
      case 'youtube':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'userPlus':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
      case 'newspaper':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2h-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h6M7 12h6M7 16h4" /></svg>;
      default:
        return null;
    }
  };

  // Render page content even if userId is not yet available (client-side auth loading)
  // This prevents the page from hanging during Playwright tests
  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ paddingTop: '120px' }}>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-800 mb-4 sm:mb-8 flex flex-wrap items-center justify-center gap-2 text-center">
          Admin [
          <span className="flex items-center gap-1 text-blue-600">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </span>
          ] Event Management
        </h1>
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="text-center py-8">
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ paddingTop: '120px' }}>
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-800 mb-4 sm:mb-8 flex flex-wrap items-center justify-center gap-2 text-center">
        Admin [
        <span className="flex items-center gap-1 text-blue-600">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </span>
        ] Event Management
      </h1>

      <AdminTenantWorkspacePicker onSelectionChange={setWorkspaceReady} />

      {!workspaceReady && (
        <p className="text-center text-sm text-gray-600 mb-6">
          Select a tenant ID above to open admin tools for that organization.
        </p>
      )}

      {/* Responsive Button Group */}
      <div className={`w-full mb-8 ${workspaceReady ? '' : 'pointer-events-none opacity-40'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {adminButtons.filter((button) => {
            if ('platformOnly' in button && button.platformOnly && !isPlatformSuperAdmin) return false;
            if ('sportsOnly' in button && button.sportsOnly && !isSportsTeam) return false;
            return true;
          }).map((button) => {
            const colorClasses = getColorClasses(button.color);
            const iconBgColor = getIconBgColor(button.color);
            const iconTextColor = getIconTextColor(button.color);
            const guide = BUTTON_GUIDES[button.key] || button.hint;

            return (
              <Link
                key={button.key}
                href={button.href}
                className={`relative flex flex-col items-center justify-center ${colorClasses} rounded-lg shadow-md p-4 text-xs transition-all group`}
                aria-label={`${button.label}: ${button.hint}`}
                onMouseEnter={(event) => moveCursorTip(button.hint, event)}
                onMouseMove={(event) => moveCursorTip(button.hint, event)}
                onMouseLeave={() => setCursorTip(null)}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  moveCursorTip(button.hint, {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                  } as React.MouseEvent);
                }}
                onBlur={() => setCursorTip(null)}
              >
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Guide for ${button.label}`}
                  className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-sky-400 text-sm font-bold text-sky-500 hover:border-sky-500 hover:text-sky-600"
                  onMouseEnter={(event) => {
                    event.stopPropagation();
                    moveCursorTip(guide, event);
                  }}
                  onMouseMove={(event) => {
                    event.stopPropagation();
                    moveCursorTip(guide, event);
                  }}
                  onMouseLeave={(event) => {
                    event.stopPropagation();
                    setCursorTip(null);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  ?
                </span>
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${iconBgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {renderIcon(button.icon, `w-10 h-10 ${iconTextColor}`)}
                </div>
                <span className="font-semibold text-center leading-tight">
                  {button.label}
                  {'sublabel' in button && button.sublabel ? (
                    <>
                      <br />
                      <span className="font-medium opacity-80">{button.sublabel}</span>
                    </>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {cursorTip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[80] max-w-[320px] rounded-xl border border-white/20 bg-gradient-to-b from-indigo-800 to-indigo-950 px-3 py-2 text-left text-xs font-semibold leading-snug tracking-wide text-indigo-50 shadow-[0_10px_24px_rgba(49,46,129,0.32)]"
          style={{ left: cursorTip.x, top: cursorTip.y }}
        >
          {cursorTip.text}
        </div>
      )}
    </div>
  );
}
