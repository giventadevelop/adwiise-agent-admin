'use client';

import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { FaTimes } from 'react-icons/fa';
import type { TenantSettingsDTO } from '@/app/admin/tenant-management/types';

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const DETAIL_FIELDS: { key: keyof TenantSettingsDTO | 'organizationName'; label: string }[] = [
  { key: 'id', label: 'Settings ID' },
  { key: 'tenantId', label: 'Tenant ID' },
  { key: 'organizationName', label: 'Organization' },
  { key: 'allowUserRegistration', label: 'User Registration' },
  { key: 'requireAdminApproval', label: 'Require Admin Approval' },
  { key: 'enableWhatsappIntegration', label: 'WhatsApp Integration' },
  { key: 'enableEmailMarketing', label: 'Email Marketing' },
  { key: 'enableGuestRegistration', label: 'Guest Registration' },
  { key: 'isMembershipSubscriptionEnabled', label: 'Membership Subscriptions' },
  { key: 'displayEventHeroImages', label: 'Show Event Hero Images' },
  { key: 'defaultHeroIncludeWithEvents', label: 'Include Default Hero With Events' },
  { key: 'defaultHeroDisplayMode', label: 'Default Hero Display Mode' },
  { key: 'defaultHeroMaxDisplayCount', label: 'Default Hero Max Count' },
  { key: 'enableGoogleAdsense', label: 'Google AdSense' },
  { key: 'maxEventsPerMonth', label: 'Max Events / Month' },
  { key: 'maxAttendeesPerEvent', label: 'Max Attendees / Event' },
  { key: 'platformFeePercentage', label: 'Platform Fee %' },
  { key: 'email', label: 'Contact Email' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'showEventsSectionInHomePage', label: 'Show Events Section' },
  { key: 'showTeamMembersSectionInHomePage', label: 'Show Team Section' },
  { key: 'showSponsorsSectionInHomePage', label: 'Show Sponsors Section' },
  { key: 'showLeagueStandingsSectionInHomePage', label: 'League standings on homepage' },
  { key: 'showHeaderLeagues', label: 'Leagues in header' },
  { key: 'showNewsAdvertisements', label: 'News advertisements' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

interface TenantSettingsDetailsTooltipProps {
  setting: TenantSettingsDTO;
  organizationName?: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onTooltipMouseEnter: () => void;
  onTooltipMouseLeave: () => void;
}

export default function TenantSettingsDetailsTooltip({
  setting,
  organizationName,
  anchorRect,
  onClose,
  onTooltipMouseEnter,
  onTooltipMouseLeave,
}: TenantSettingsDetailsTooltipProps) {
  if (!anchorRect || typeof document === 'undefined') return null;

  const tooltipWidth = 480;
  const spacing = 12;
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;

  const estimatedHeight = 360;
  if (top + estimatedHeight > window.innerHeight) {
    top = Math.max(spacing, window.innerHeight - estimatedHeight - spacing);
  }
  if (top < spacing) top = spacing;
  if (left + tooltipWidth > window.innerWidth - spacing) {
    left = Math.max(spacing, anchorRect.left - tooltipWidth - spacing);
  }

  const style: CSSProperties = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 9999,
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: 16,
    width: `${tooltipWidth}px`,
    fontSize: 14,
    maxHeight: 400,
    overflowY: 'auto',
  };

  const getFieldValue = (key: keyof TenantSettingsDTO | 'organizationName') => {
    if (key === 'organizationName') {
      return organizationName || setting.tenantOrganization?.organizationName || '(empty)';
    }
    return formatValue(setting[key as keyof TenantSettingsDTO]);
  };

  return createPortal(
    <div
      style={style}
      tabIndex={-1}
      className="admin-tooltip"
      onMouseEnter={onTooltipMouseEnter}
      onMouseLeave={onTooltipMouseLeave}
      role="dialog"
      aria-label={`Tenant settings details for ${setting.tenantId}`}
    >
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-end mb-2">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Close tooltip"
          title="Close"
        >
          <FaTimes />
        </button>
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-3">
        Tenant settings — {setting.tenantId}
      </p>
      <table className="admin-tooltip-table">
        <tbody>
          {DETAIL_FIELDS.map(({ key, label }) => (
            <tr key={key}>
              <th>{label}</th>
              <td>{getFieldValue(key)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}
