'use client';

import { useEffect, useState } from 'react';
import { ONBOARDING_SITE_TYPE_OPTIONS } from '@/lib/onboarding/onboardingShared';
import { fetchRetailerTypes } from '@/app/admin/access-catalogs/ApiServerActions';

export interface RetailerTypeOption {
  value: string;
  label: string;
  hint: string;
}

function toOptions(rows: { code?: string; label?: string; hint?: string | null; isActive?: boolean | null }[]): RetailerTypeOption[] {
  return rows
    .filter((row) => row.code && row.isActive !== false)
    .map((row) => ({ value: row.code as string, label: row.label || (row.code as string), hint: row.hint || '' }));
}

/**
 * Active site and retailer types. Public pages use the same-origin proxy.
 * Admin pages use the server action so the selected tenant's private rows are included.
 */
export function useRetailerTypeOptions(
  source: 'proxy' | 'server' = 'server',
  tenantId?: string | null
): RetailerTypeOption[] {
  const [options, setOptions] = useState<RetailerTypeOption[]>(ONBOARDING_SITE_TYPE_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (source === 'proxy') {
        const response = await fetch('/api/proxy/retailer-types?size=500&sort=sortOrder,asc', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const rows = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
        const next = toOptions(rows);
        if (!cancelled && next.length > 0) setOptions(next);
        return;
      }
      const next = toOptions(await fetchRetailerTypes(tenantId));
      if (!cancelled && next.length > 0) setOptions(next);
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source, tenantId]);

  return options;
}
