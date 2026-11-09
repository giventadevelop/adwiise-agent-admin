'use client';

import { useEffect, useState } from 'react';
import { DOMAIN_OWNERSHIP_OPTIONS } from '@/lib/onboarding/onboardingShared';
import { fetchDomainOwnerships } from '@/app/admin/access-catalogs/ApiServerActions';

export interface DomainOwnershipOption {
  value: string;
  label: string;
  hint: string;
}

function toOptions(rows: { code?: string; label?: string; hint?: string | null; isActive?: boolean | null }[]): DomainOwnershipOption[] {
  return rows
    .filter((row) => row.code && row.isActive !== false)
    .map((row) => ({ value: row.code as string, label: row.label || (row.code as string), hint: row.hint || '' }));
}

/** Keep a saved code visible after it leaves the active catalog. */
export function ownershipOptionsWithCurrent(
  options: DomainOwnershipOption[],
  current: string | null | undefined
): DomainOwnershipOption[] {
  const code = current?.trim();
  if (!code || options.some((option) => option.value === code)) return options;
  return [{ value: code, label: code, hint: 'Saved on this request' }, ...options];
}

/**
 * Active domain ownership rows. Public pages use the same-origin proxy.
 * Admin pages use the server action so a tenant's private rows are included.
 */
export function useDomainOwnershipOptions(
  source: 'proxy' | 'server' = 'server',
  tenantId?: string | null
): DomainOwnershipOption[] {
  const [options, setOptions] = useState<DomainOwnershipOption[]>(DOMAIN_OWNERSHIP_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (source === 'proxy') {
        const response = await fetch('/api/proxy/domain-ownerships?size=500&sort=sortOrder,asc', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const rows = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
        const next = toOptions(rows);
        if (!cancelled && next.length > 0) setOptions(next);
        return;
      }
      const next = toOptions(await fetchDomainOwnerships(tenantId));
      if (!cancelled && next.length > 0) setOptions(next);
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source, tenantId]);

  return options;
}
