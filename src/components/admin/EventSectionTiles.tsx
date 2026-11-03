'use client';

import FeatureTileGrid, { toneCardClass, toneIconClass, type FeatureTile } from '@/components/admin/FeatureTileGrid';

function Icon({ d }: { d: string }) {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const PATHS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  plus: 'M12 4v16m8-8H4',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  mail: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  percent: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  check: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  mic: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  hand: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  dollar: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tie: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

function tile(
  key: string,
  href: string,
  label: string,
  summary: string,
  hint: string,
  searchTerms: string[],
  tone: string,
  icon: string,
  current?: string,
): FeatureTile {
  return {
    key,
    href,
    label,
    summary,
    hint,
    searchTerms,
    guide: hint,
    icon: <Icon d={PATHS[icon as keyof typeof PATHS]} />,
    cardClassName: toneCardClass(tone),
    iconWrapClassName: toneIconClass(tone),
    active: current === key,
  };
}

export default function EventSectionTiles({
  eventId,
  current,
  showTickets = true,
  showDiscounts = true,
  showCheckIn = false,
  showManual = false,
  showFeatures = false,
  showAgenda = true,
  eventsHref: _eventsHref,
  kind = 'tools',
}: {
  eventId?: string | number;
  current?: string;
  showTickets?: boolean;
  showDiscounts?: boolean;
  showCheckIn?: boolean;
  showManual?: boolean;
  showFeatures?: boolean;
  showAgenda?: boolean;
  /** Kept for call-site compatibility; cross-admin Manage Events tile was removed. */
  eventsHref?: string;
  kind?: 'tools' | 'features' | 'discount-short' | 'manage-quick' | 'new-event';
}) {
  void _eventsHref;
  const id = String(eventId ?? '');
  const at = (path: string) => `/admin/events/${id}${path}`;

  if (kind === 'manage-quick') {
    return (
      <div className="w-full mb-8">
        <FeatureTileGrid
          tiles={[
            tile('create-event', '/admin/events/new', 'Create New Event', 'Start a new event', 'Create and publish an event', ['calendar', 'tickets'], 'blue', 'plus'),
            tile('event-analytics', '/admin/event-analytics', 'Event Analytics Dashboard', 'Attendance across events', 'View event attendance stats', ['stats', 'attendance'], 'teal', 'chart'),
            tile('manage-usage', '/admin/manage-usage', 'Manage Usage', 'People, roles, and approval', 'Edit member user accounts', ['members', 'users'], 'purple', 'users'),
            tile('communication', '/admin/communication', 'Communication Center', 'Announcements and messages', 'Open the communication center', ['email', 'messages'], 'green', 'mail'),
          ]}
        />
      </div>
    );
  }

  if (kind === 'new-event') {
    return (
      <div className="w-full mb-8">
        <FeatureTileGrid
          tiles={[
            tile('admin-home', '/admin', 'Admin Home', 'Return to this dashboard', 'Open the admin dashboard', ['dashboard', 'home'], 'blue', 'home', current),
          ]}
        />
      </div>
    );
  }

  if (kind === 'discount-short') {
    return (
      <div className="w-full mb-8">
        <FeatureTileGrid
          tiles={[
            tile('media', at('/media/list'), 'Manage Media Files', 'Photos and videos for this event', 'Open this event’s media', ['photos', 'videos', 'gallery'], 'blue', 'photo', current),
            tile('ticket-types', at('/ticket-types/list'), 'Manage Ticket Types', 'Names and prices of tickets', 'Edit ticket types', ['prices', 'tickets'], 'green', 'ticket', current),
            tile('discounts', at('/discount-codes/list'), 'Manage Discount Codes', 'Promo codes for this event', 'Edit discount codes', ['promo', 'coupon'], 'yellow', 'tag', current),
          ]}
        />
      </div>
    );
  }

  const tools: FeatureTile[] = [
    tile('admin-home', '/admin', 'Admin Home', 'Return to this dashboard', 'Open the admin dashboard', ['dashboard', 'home'], 'blue', 'home', current),
    tile('media', at('/media/list'), 'Manage Media Files', 'Photos and videos for this event', 'Open this event’s media', ['photos', 'videos', 'gallery'], 'yellow', 'photo', current),
  ];
  if (showTickets) {
    tools.push(
      tile('ticket-types', at('/ticket-types/list'), 'Manage Ticket Types', 'Names and prices of tickets', 'Edit ticket types', ['prices', 'tickets'], 'purple', 'tag', current),
      tile('tickets', at('/tickets/list'), 'Manage Tickets', 'Sold tickets for this event', 'Review ticket sales', ['attendees', 'tickets'], 'teal', 'ticket', current),
    );
  }
  if (showDiscounts) {
    tools.push(
      tile('discounts', at('/discount-codes/list'), 'Manage Discount Codes', 'Promo codes for this event', 'Edit discount codes', ['promo', 'coupon'], 'pink', 'percent', current),
    );
  }
  if (showCheckIn) {
    tools.push(
      tile('check-in', `/admin/check-in-analytics?eventId=${id}`, 'Check-In Analytics', 'Who has arrived', 'See check-in activity', ['attendance', 'door'], 'cyan', 'check', current),
      tile('sales', `/admin/sales-analytics?eventId=${id}`, 'Sales Analytics', 'Ticket sales for this event', 'See sales totals', ['revenue', 'payments'], 'sky', 'chart', current),
    );
  }
  if (showManual) {
    tools.push(
      tile('manual', `/admin/manual-payments?eventId=${id}`, 'Manual Payments', 'Zelle, Venmo, and other offline payments', 'Review offline payments', ['zelle', 'venmo'], 'emerald', 'dollar', current),
    );
  }

  const features: FeatureTile[] = [
    tile('performers', at('/performers'), 'Featured Performers', 'Artists on this event', 'Manage featured performers', ['artists'], 'pink', 'mic', current),
    tile('contacts', at('/contacts'), 'Event Contacts', 'People to reach for this event', 'Manage event contacts', ['phone'], 'emerald', 'book', current),
    tile('sponsors', at('/sponsors'), 'Event Sponsors', 'Sponsor names and logos', 'Manage event sponsors', ['logos'], 'amber', 'hand', current),
    tile('emails', at('/emails'), 'Event Emails', 'Email addresses for this event', 'Manage event emails', ['inbox'], 'blue', 'mail', current),
    tile('directors', at('/program-directors'), 'Program Directors', 'Directors assigned to this event', 'Manage program directors', ['leaders'], 'indigo', 'tie', current),
  ];
  if (showAgenda) {
    features.push(
      tile('agenda', at('/agenda'), 'Event Day Agenda', 'Timed items for the event day', 'Edit the event-day agenda', ['schedule', 'program'], 'cyan', 'clock', current),
    );
  }

  if (kind === 'features') {
    return (
      <div className="w-full mb-8">
        <FeatureTileGrid tiles={features} searchLabel="Search event tools by name, such as performers, sponsors, or agenda." />
      </div>
    );
  }

  return (
    <div className="w-full mb-8 space-y-8">
      <FeatureTileGrid tiles={tools} />
      {showFeatures && (
        <FeatureTileGrid tiles={features} searchLabel="Search event tools by name, such as performers, sponsors, or agenda." />
      )}
    </div>
  );
}
