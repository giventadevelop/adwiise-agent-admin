'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import {
  fetchRecentTenantOrganizationsForSelectServer,
  searchTenantOrganizationsForSelectServer,
} from '@/app/admin/tenant-management/organizations/organizationSelectServerActions';
import { useAdminAccess } from './AdminTenantContext';
import { selectAdminSessionTenant } from '@/app/admin/adminSessionActions';
import { ADMIN_SESSION_ALL_TENANTS } from '@/lib/adminSessionTenant';

const SEARCH_DEBOUNCE_MS = 280;
const MAX_SUGGESTIONS = 20;

function formatOrgLabel(org: TenantOrganizationDTO): string {
  const name = org.organizationName?.trim() || 'Unnamed organization';
  const tenantId = org.tenantId?.trim() || '—';
  return `${name} (${tenantId})`;
}

function filterOrganizationsLocally(
  organizations: TenantOrganizationDTO[],
  query: string,
): TenantOrganizationDTO[] {
  const q = query.trim().toLowerCase();
  if (!q) return organizations;

  return organizations.filter((org) => {
    const name = org.organizationName?.toLowerCase() ?? '';
    const tenantId = org.tenantId?.toLowerCase() ?? '';
    const domain = org.domain?.toLowerCase() ?? '';
    return name.includes(q) || tenantId.includes(q) || domain.includes(q);
  });
}

function mergeOrgs(
  prev: TenantOrganizationDTO[],
  incoming: TenantOrganizationDTO[],
): TenantOrganizationDTO[] {
  const byKey = new Map<string, TenantOrganizationDTO>();
  for (const org of [...incoming, ...prev]) {
    const key = String(org.id ?? org.tenantId ?? '');
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, org);
  }
  return Array.from(byKey.values()).slice(0, MAX_SUGGESTIONS * 2);
}

function SearchLensIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export interface AdminTenantFilterFieldProps {
  /** Visual density — `compact` for the admin top bar, `default` for list filter rows. */
  variant?: 'default' | 'compact';
  /** Override input id (default: admin-filter-tenant-id). */
  inputId?: string;
  className?: string;
}

/**
 * Tenant ID filter with typeahead suggestions (organization name / tenant ID / domain).
 *
 * Critical anti-loop rules:
 * - Do **not** write partial typeahead text into `?tenant=` while typing
 * - Commit URL only on suggestion select, Enter, or clear
 * - Resolve URL tenant → org label at most once per tenant id (ref-guarded)
 */
export default function AdminTenantFilterField({
  variant = 'default',
  inputId = 'admin-filter-tenant-id',
  className = '',
}: AdminTenantFilterFieldProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    canQueryAllTenants,
    allowedTenantIds,
    defaultTenantId,
    tenantId: contextTenantId,
  } = useAdminAccess();
  const selectedTenantId = (searchParams?.get('tenant') ?? '').trim() || contextTenantId || '';

  const filterToAllowlist = useCallback(
    (orgs: TenantOrganizationDTO[]) => {
      if (canQueryAllTenants) return orgs;
      if (allowedTenantIds.length === 0) return [];
      const allowed = new Set(allowedTenantIds);
      return orgs.filter((org) => org.tenantId && allowed.has(org.tenantId));
    },
    [canQueryAllTenants, allowedTenantIds],
  );
  // Stable id avoids SSR/client useId() hydration mismatches on aria-controls.
  const listboxId = 'admin-tenant-id-listbox';

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(selectedTenantId);
  /** Prevents repeated server searches for the same URL tenant id. */
  const resolveAttemptedRef = useRef<string | null>(null);
  const cachedOrgsRef = useRef<TenantOrganizationDTO[]>([]);
  const isTypingRef = useRef(false);
  /** Keep latest allowlist filter without re-running mount effects (server actions refresh RSC). */
  const filterToAllowlistRef = useRef(filterToAllowlist);
  filterToAllowlistRef.current = filterToAllowlist;

  const [inputValue, setInputValue] = useState(selectedTenantId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedOrgs, setCachedOrgs] = useState<TenantOrganizationDTO[]>([]);
  const [displayOrgs, setDisplayOrgs] = useState<TenantOrganizationDTO[]>([]);

  cachedOrgsRef.current = cachedOrgs;

  const selectedOrg = useMemo(
    () => cachedOrgs.find((org) => org.tenantId === selectedTenantId.trim()) ?? null,
    [cachedOrgs, selectedTenantId],
  );

  const commitToUrl = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (v === (searchParams?.get('tenant') ?? '').trim()) {
        lastCommittedRef.current = v;
        return;
      }
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      if (v) {
        next.set('tenant', v);
      } else {
        next.delete('tenant');
      }
      const qs = next.toString();
      const url = pathname + (qs ? `?${qs}` : '');
      lastCommittedRef.current = v;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Load recent orgs once on mount. Do NOT depend on filterToAllowlist — layout
  // rebuilds a new allowedTenantIds array after every server-action refresh, which
  // would re-fire this effect forever (user-profiles + tenant-organizations spam).
  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      setLoading(true);
      try {
        const recent = filterToAllowlistRef.current(await fetchRecentTenantOrganizationsForSelectServer());
        if (cancelled) return;
        setCachedOrgs(recent);
        setDisplayOrgs(recent.slice(0, MAX_SUGGESTIONS));
      } catch {
        if (!cancelled) {
          setCachedOrgs([]);
          setDisplayOrgs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  // URL → input label (skip while user is actively typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    if (selectedTenantId === lastCommittedRef.current && selectedOrg) {
      const label = formatOrgLabel(selectedOrg);
      setInputValue((prev) => (prev === label ? prev : label));
      return;
    }
    if (selectedTenantId !== lastCommittedRef.current) {
      lastCommittedRef.current = selectedTenantId;
    }
    if (selectedOrg) {
      setInputValue(formatOrgLabel(selectedOrg));
    } else if (!isTypingRef.current) {
      setInputValue(selectedTenantId);
    }
  }, [selectedTenantId, selectedOrg]);

  // Resolve exact URL tenant id → org label at most once per id (no cachedOrgs dep → no loop)
  useEffect(() => {
    const tid = selectedTenantId.trim();
    if (!tid) {
      resolveAttemptedRef.current = null;
      return;
    }
    if (cachedOrgsRef.current.some((org) => org.tenantId === tid)) {
      resolveAttemptedRef.current = tid;
      return;
    }
    if (resolveAttemptedRef.current === tid) return;

    resolveAttemptedRef.current = tid;
    let cancelled = false;

    async function resolveSelected() {
      try {
        const results = filterToAllowlistRef.current(await searchTenantOrganizationsForSelectServer(tid));
        if (cancelled) return;
        // Only accept an exact tenantId match — never results[0] (that caused infinite loops for partial queries like "fa")
        const match = results.find((org) => org.tenantId === tid);
        if (!match) return;
        setCachedOrgs((prev) => mergeOrgs(prev, [match]));
        if (!isTypingRef.current) {
          setInputValue(formatOrgLabel(match));
        }
      } catch {
        // keep free-text tenant id in the input
      }
    }

    void resolveSelected();
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  const runSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    const cache = cachedOrgsRef.current;
    const filter = filterToAllowlistRef.current;

    if (!trimmed) {
      setDisplayOrgs(cache.slice(0, MAX_SUGGESTIONS));
      return;
    }

    const localMatches = filterOrganizationsLocally(cache, trimmed);
    setDisplayOrgs(localMatches.slice(0, MAX_SUGGESTIONS));

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = filter(await searchTenantOrganizationsForSelectServer(trimmed));
        // Prefer server hits; keep local matches so a slow/empty name-only API never blanks ID matches
        const merged = mergeOrgs(results, filter(localMatches)).slice(0, MAX_SUGGESTIONS);
        setDisplayOrgs(merged);
        if (results.length > 0) {
          setCachedOrgs((prev) => mergeOrgs(prev, results));
        }
      } catch {
        setDisplayOrgs(localMatches.slice(0, MAX_SUGGESTIONS));
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        isTypingRef.current = false;
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const applyTenant = (tenantId: string | null, org?: TenantOrganizationDTO | null) => {
    let next = (tenantId ?? '').trim();
    if (!canQueryAllTenants) {
      if (!next || !allowedTenantIds.includes(next)) {
        next = defaultTenantId || allowedTenantIds[0] || '';
      }
    }
    isTypingRef.current = false;
    setOpen(false);
    if (!next) {
      setInputValue('');
      resolveAttemptedRef.current = null;
      if (canQueryAllTenants) {
        void selectAdminSessionTenant(ADMIN_SESSION_ALL_TENANTS);
      }
      commitToUrl('');
      return;
    }
    void selectAdminSessionTenant(next);
    if (org) {
      setCachedOrgs((prev) => mergeOrgs(prev, [org]));
      setInputValue(formatOrgLabel(org));
      resolveAttemptedRef.current = next;
    } else {
      setInputValue(next);
      resolveAttemptedRef.current = null;
    }
    commitToUrl(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    isTypingRef.current = true;
    setInputValue(raw);
    setOpen(true);
    runSearch(raw);
    // Intentionally do NOT commit partial typeahead text to ?tenant=
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        isTypingRef.current = false;
        if (selectedOrg) {
          setInputValue(formatOrgLabel(selectedOrg));
        } else if (selectedTenantId.trim()) {
          setInputValue(selectedTenantId);
        }
      }
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (displayOrgs.length === 1 && displayOrgs[0].tenantId) {
        applyTenant(displayOrgs[0].tenantId, displayOrgs[0]);
        return;
      }
      const typed = inputValue.trim();
      const parenMatch = typed.match(/\(([^)]+)\)\s*$/);
      const tenantId = parenMatch?.[1]?.trim() || typed;
      const orgMatch =
        displayOrgs.find((o) => o.tenantId === tenantId) ||
        cachedOrgsRef.current.find((o) => o.tenantId === tenantId) ||
        null;
      applyTenant(tenantId || null, orgMatch);
    } else if (event.key === 'Escape') {
      setOpen(false);
      isTypingRef.current = false;
    } else if (event.key === 'ArrowDown') {
      setOpen(true);
    }
  };

  const comboboxActive = Boolean(selectedTenantId.trim()) || inputValue.trim().length > 0;
  const isCompact = variant === 'compact';

  return (
    <div ref={containerRef} className={`relative flex flex-col min-w-0 ${className}`}>
      {!isCompact && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap leading-5"
        >
          Tenant ID
        </label>
      )}
      <div className="relative">
        <SearchLensIcon />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-label="Filter by Tenant ID (type to search organizations)"
          title="Type to search organizations. Select a suggestion or press Enter to apply Tenant ID."
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            setOpen(true);
            runSearch(inputValue);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={
            isCompact
              ? 'Search Tenant ID or organization name…'
              : 'Search by Tenant ID or organization name…'
          }
          className={
            isCompact
              ? `w-full min-w-0 max-w-md border rounded-lg py-1.5 pl-9 pr-8 text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  comboboxActive ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-white'
                }`
              : `box-border block w-full h-12 border rounded-xl focus:ring-blue-500 focus:border-blue-500 pl-10 pr-10 text-base ${
                  comboboxActive ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-white'
                }`
          }
          autoComplete="off"
          spellCheck={false}
        />
        {inputValue && canQueryAllTenants ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTenant(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-gray-400 hover:text-gray-700"
            title="Clear tenant filter"
            aria-label="Clear tenant filter"
          >
            ×
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-300 bg-white py-1 shadow-lg ${
            isCompact ? 'top-full' : 'top-[calc(100%-0.25rem)]'
          }`}
        >
          {loading && displayOrgs.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">Loading organizations…</li>
          ) : displayOrgs.length > 0 ? (
            displayOrgs.map((org) => {
              const tid = org.tenantId ?? '';
              const selected = tid === selectedTenantId.trim();
              return (
                <li key={org.id ?? tid} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTenant(tid, org)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      selected ? 'bg-blue-50 text-blue-800' : 'text-gray-900'
                    }`}
                    title={formatOrgLabel(org)}
                  >
                    <span className="font-medium line-clamp-1">{org.organizationName || 'Unnamed'}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {tid}
                      {org.domain ? ` · ${org.domain}` : ''}
                      {selected ? ' (selected)' : ''}
                    </span>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-sm text-gray-500">
              {inputValue.trim()
                ? 'No matching organizations — press Enter to use typed Tenant ID'
                : 'No organizations found'}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
