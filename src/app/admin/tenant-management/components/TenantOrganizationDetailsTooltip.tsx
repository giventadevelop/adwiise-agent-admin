'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
type DetailRow =
  | { kind: 'field'; key: keyof TenantOrganizationDTO; label: string }
  | { kind: 'computed'; label: string; render: (org: TenantOrganizationDTO) => ReactNode };

const DETAIL_ROWS: DetailRow[] = [
  { kind: 'field', key: 'id', label: 'Database ID (PK)' },
  { kind: 'field', key: 'websiteTenantIds', label: 'Website tenant IDs' },
  { kind: 'field', key: 'organizationName', label: 'Organization Name' },
  { kind: 'field', key: 'domain', label: 'Website / Domain' },
  { kind: 'field', key: 'websiteUrl', label: 'Website URL' },
  { kind: 'field', key: 'description', label: 'Description' },
  { kind: 'field', key: 'addressLine1', label: 'Address Line 1' },
  { kind: 'field', key: 'addressLine2', label: 'Address Line 2' },
  { kind: 'field', key: 'city', label: 'City' },
  { kind: 'field', key: 'stateProvince', label: 'State / Province' },
  { kind: 'field', key: 'zipCode', label: 'ZIP Code' },
  { kind: 'field', key: 'country', label: 'Country' },
  { kind: 'field', key: 'contactEmail', label: 'Contact Email' },
  { kind: 'field', key: 'contactPhone', label: 'Contact Phone' },
  { kind: 'field', key: 'contactPersonName', label: 'Contact person name' },
  { kind: 'field', key: 'subscriptionPlan', label: 'Subscription Plan' },
  { kind: 'field', key: 'subscriptionStatus', label: 'Subscription Status' },
  { kind: 'field', key: 'subscriptionStartDate', label: 'Subscription Start' },
  { kind: 'field', key: 'subscriptionEndDate', label: 'Subscription End' },
  { kind: 'field', key: 'monthlyFeeUsd', label: 'Monthly Fee (USD)' },
  { kind: 'field', key: 'stripeCustomerId', label: 'Stripe Customer ID' },
  { kind: 'field', key: 'primaryColor', label: 'Primary Color' },
  { kind: 'field', key: 'secondaryColor', label: 'Secondary Color' },
  { kind: 'field', key: 'logoUrl', label: 'Logo URL' },
  { kind: 'field', key: 'isActive', label: 'Active' },
  { kind: 'field', key: 'createdAt', label: 'Created At' },
  { kind: 'field', key: 'updatedAt', label: 'Updated At' },
];
function formatTooltipValue(key: keyof TenantOrganizationDTO, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">(empty)</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (key === 'websiteUrl' && typeof value === 'string') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-500 break-all"
      >
        {value}
      </a>
    );
  }
  if (key === 'description' && typeof value === 'string') {
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  if (key === 'monthlyFeeUsd' && typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  }
  if (key === 'tenantId' && typeof value === 'string') {
    return (
      <span className="font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 break-all">
        {value}
      </span>
    );
  }
  if (key === 'id' && typeof value === 'number') {
    return (
      <span className="font-mono font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
        {value}
      </span>
    );
  }
  return String(value);
}

function renderDetailRow(row: DetailRow, organization: TenantOrganizationDTO): ReactNode {
  if (row.kind === 'computed') {
    return row.render(organization);
  }
  return formatTooltipValue(row.key, organization[row.key]);
}

interface TenantOrganizationDetailsTooltipProps {
  organization: TenantOrganizationDTO | null;
  anchorRect: DOMRect | null;
  serialNumber?: number;
  onClose: () => void;
  onTooltipMouseEnter: () => void;
  onTooltipMouseLeave: () => void;
}

export default function TenantOrganizationDetailsTooltip({
  organization,
  anchorRect,
  serialNumber,
  onClose,
  onTooltipMouseEnter,
  onTooltipMouseLeave,
}: TenantOrganizationDetailsTooltipProps) {
  if (!organization || !anchorRect || typeof document === 'undefined') return null;

  const websiteTenantLabel = (organization.websiteTenantIds || []).join(', ') || '(none)';

  const tooltipWidth = 600;
  const thWidth = 200;
  const spacing = 16;
  const isMobile = window.innerWidth <= 768;

  let top = anchorRect.top;
  let left = anchorRect.right + spacing;

  if (isMobile) {
    left = Math.max(spacing, (window.innerWidth - tooltipWidth) / 2);
    top = Math.max(spacing, anchorRect.top - 50);
  } else if (left + tooltipWidth > window.innerWidth) {
    left = anchorRect.left - tooltipWidth - spacing;
  }

  const estimatedHeight = 420;
  if (top + estimatedHeight > window.innerHeight) {
    top = window.innerHeight - estimatedHeight - spacing;
  }
  if (top < spacing) top = spacing;
  if (left < spacing) left = spacing;
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - spacing;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    zIndex: 9999,
    width: isMobile ? Math.min(tooltipWidth, window.innerWidth - 32) : tooltipWidth,
    maxWidth: isMobile ? '90vw' : 600,
    maxHeight: isMobile ? '70vh' : 500,
    overflowY: 'auto',
    pointerEvents: 'auto',
    background: '#fff',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#3b82f6',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    fontSize: 16,
    padding: 20,
  };

  return createPortal(
    <div
      className="admin-tooltip"
      style={style}
      tabIndex={-1}
      onMouseEnter={onTooltipMouseEnter}
      onMouseLeave={onTooltipMouseLeave}
      role="dialog"
      aria-label={`Details for ${organization.organizationName}`}
    >
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {serialNumber !== undefined && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
              #{serialNumber}
            </div>
          )}
          <span className="text-sm text-gray-600 font-medium">
            Click the × button to close this dialog
          </span>
        </div>
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

      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Database ID</div>
          <div className="font-mono font-bold text-indigo-800">
            {organization.id != null ? `#${organization.id}` : '(none)'}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Website tenant IDs</div>
          <div className="font-mono font-bold text-blue-800 break-all">
            {websiteTenantLabel}
          </div>
        </div>
      </div>

      <table className="admin-tooltip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {DETAIL_ROWS.map((row) => {
            const rowKey = row.kind === 'field' ? row.key : row.label;
            return (
            <tr key={rowKey} className="border-b border-gray-100">
              <th
                style={{
                  textAlign: 'left',
                  width: thWidth,
                  minWidth: thWidth,
                  maxWidth: thWidth,
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  boxSizing: 'border-box',
                  padding: '12px 16px 12px 0',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                {row.label}
              </th>
              <td
                style={{
                  textAlign: 'left',
                  width: 'auto',
                  padding: '12px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                  wordBreak: 'break-word',
                }}
              >
                {renderDetailRow(row, organization)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>,
    document.body,
  );
}
