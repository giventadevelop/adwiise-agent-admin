'use client';

import { useEffect, useState } from 'react';
import { useAdminTenantId } from '@/app/admin/AdminTenantContext';
import { searchTenantOrganizationsForSelectServer } from '@/app/admin/tenant-management/organizations/organizationSelectServerActions';

type AdminTenantIdBannerProps = {
  /** Explicit record tenant (edit/create forms). When omitted with no entityLabel, uses workspace context. */
  tenantId?: string | null;
  /** Used in the empty-state message, e.g. "album", "sponsor". Presence selects entity (sky) mode. */
  entityLabel?: string;
  className?: string;
};

/**
 * Tenant ID banner.
 * - Workspace mode (AdminNavigation): indigo retail-style card from AdminTenantContext.
 * - Entity mode (edit forms): sky card for the record’s tenantId when the top filter bar is hidden.
 */
export default function AdminTenantIdBanner({
  tenantId: tenantIdProp,
  entityLabel,
  className = '',
}: AdminTenantIdBannerProps) {
  const workspaceTenantId = useAdminTenantId();
  const isEntityMode = entityLabel !== undefined;

  if (isEntityMode) {
    return <EntityTenantIdBanner tenantId={tenantIdProp} entityLabel={entityLabel} className={className} />;
  }

  return <WorkspaceTenantIdBanner tenantId={workspaceTenantId} className={className} />;
}

function EntityTenantIdBanner({
  tenantId,
  entityLabel = 'record',
  className = '',
}: {
  tenantId?: string | null;
  entityLabel?: string;
  className?: string;
}) {
  const tid = tenantId?.trim() || '';

  if (tid) {
    return (
      <div
        className={`mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3 shadow-sm ${className}`}
        title={`Tenant that owns this ${entityLabel}`}
        aria-label={`Tenant ID ${tid}`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">Tenant ID</span>
        <code className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-sky-900 border border-sky-200 break-all">
          {tid}
        </code>
      </div>
    );
  }

  return (
    <div
      className={`mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-sm ${className}`}
    >
      <span className="text-sm font-medium text-amber-800">Tenant ID is not set on this {entityLabel}.</span>
    </div>
  );
}

function WorkspaceTenantIdBanner({
  tenantId,
  className = '',
}: {
  tenantId?: string;
  className?: string;
}) {
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    setOrganizationName(null);
    if (!tenantId) return;
    let cancelled = false;
    searchTenantOrganizationsForSelectServer(tenantId)
      .then(orgs => {
        if (cancelled) return;
        const match = orgs.find(org => org.tenantId === tenantId);
        setOrganizationName(match?.organizationName?.trim() || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenantId) return null;

  return (
    <div
      className={`inline-flex items-center gap-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-6 py-4 shadow-sm ${className}`.trim()}
      aria-label={`Tenant ID ${tenantId}`}
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100">
        <svg className="h-10 w-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <div>
        <span className="block text-sm font-semibold text-indigo-700">Tenant ID</span>
        <span className="mt-1 block text-2xl font-bold text-indigo-900">{tenantId}</span>
        {organizationName ? (
          <span className="mt-1 block text-sm font-medium text-indigo-600">{organizationName}</span>
        ) : null}
      </div>
    </div>
  );
}
