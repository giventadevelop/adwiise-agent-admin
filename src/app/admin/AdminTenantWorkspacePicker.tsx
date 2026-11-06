'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  loadAdminWorkspaceTenants,
  selectAdminSessionTenant,
} from '@/app/admin/adminSessionActions';
import { searchTenantOrganizationsForSelectServer } from '@/app/admin/tenant-management/organizations/organizationSelectServerActions';
import { ADMIN_SESSION_ALL_TENANTS, type AdminWorkspaceTenant } from '@/lib/adminSessionTenant';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

const CARD_COLORS = [
  { card: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800', icon: 'bg-indigo-100', iconText: 'text-indigo-500', ring: 'ring-indigo-400' },
  { card: 'bg-teal-50 hover:bg-teal-100 text-teal-800', icon: 'bg-teal-100', iconText: 'text-teal-500', ring: 'ring-teal-400' },
  { card: 'bg-violet-50 hover:bg-violet-100 text-violet-800', icon: 'bg-violet-100', iconText: 'text-violet-500', ring: 'ring-violet-400' },
  { card: 'bg-amber-50 hover:bg-amber-100 text-amber-800', icon: 'bg-amber-100', iconText: 'text-amber-500', ring: 'ring-amber-400' },
  { card: 'bg-rose-50 hover:bg-rose-100 text-rose-800', icon: 'bg-rose-100', iconText: 'text-rose-500', ring: 'ring-rose-400' },
  { card: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800', icon: 'bg-cyan-100', iconText: 'text-cyan-500', ring: 'ring-cyan-400' },
  { card: 'bg-lime-50 hover:bg-lime-100 text-lime-800', icon: 'bg-lime-100', iconText: 'text-lime-500', ring: 'ring-lime-400' },
  { card: 'bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800', icon: 'bg-fuchsia-100', iconText: 'text-fuchsia-500', ring: 'ring-fuchsia-400' },
] as const;

const SEARCH_DEBOUNCE_MS = 280;
const PAGE_SIZE = 8;

function tenantMatchesQuery(tenant: AdminWorkspaceTenant, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    tenant.organizationName.toLowerCase().includes(q) ||
    tenant.tenantId.toLowerCase().includes(q) ||
    (tenant.domain?.toLowerCase().includes(q) ?? false) ||
    tenant.role.toLowerCase().includes(q)
  );
}

function orgToWorkspaceTenant(
  org: TenantOrganizationDTO,
  mapped?: AdminWorkspaceTenant,
): AdminWorkspaceTenant | null {
  const tenantId = org.tenantId?.trim();
  if (!tenantId) return null;
  return {
    tenantId,
    organizationName: org.organizationName?.trim() || tenantId,
    domain: org.domain?.trim() || mapped?.domain,
    isActive: org.isActive ?? mapped?.isActive,
    role: mapped?.role ?? 'SUPER_ADMIN',
    mappedToUser: Boolean(mapped),
  };
}

export default function AdminTenantWorkspacePicker({
  onSelectionChange,
}: {
  onSelectionChange?: (hasSelection: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<AdminWorkspaceTenant[]>([]);
  const [searchHits, setSearchHits] = useState<AdminWorkspaceTenant[]>([]);
  const [canQueryAllTenants, setCanQueryAllTenants] = useState(false);
  const [sessionTenantId, setSessionTenantId] = useState<string | null>(null);
  const [sessionAllTenants, setSessionAllTenants] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const didAutoSelectRef = useRef(false);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const hasSelection = sessionAllTenants || Boolean(sessionTenantId);

  const applyUrlTenant = useCallback(
    (tenantId: string | null) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      if (tenantId) {
        next.set('tenant', tenantId);
      } else {
        next.delete('tenant');
      }
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
      router.refresh();
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await loadAdminWorkspaceTenants();
        if (cancelled) return;
        const mapped = data.canQueryAllTenants
          ? data.tenants
          : data.tenants.filter((t) => t.mappedToUser);
        setTenants(mapped);
        setCanQueryAllTenants(data.canQueryAllTenants);
        setSessionTenantId(data.sessionTenantId);
        setSessionAllTenants(data.sessionAllTenants);
        onSelectionChangeRef.current?.(data.sessionAllTenants || Boolean(data.sessionTenantId));

        if (!didAutoSelectRef.current && !data.sessionAllTenants && !data.sessionTenantId) {
          if (data.canQueryAllTenants) {
            didAutoSelectRef.current = true;
            const result = await selectAdminSessionTenant(ADMIN_SESSION_ALL_TENANTS);
            if (cancelled) return;
            if (result.ok) {
              setSessionTenantId(result.tenantId);
              setSessionAllTenants(result.allTenants);
              onSelectionChangeRef.current?.(true);
              applyUrlTenant(null);
            }
          } else if (mapped.length === 1) {
            didAutoSelectRef.current = true;
            const only = mapped[0].tenantId;
            const result = await selectAdminSessionTenant(only);
            if (cancelled) return;
            if (result.ok) {
              setSessionTenantId(result.tenantId);
              setSessionAllTenants(result.allTenants);
              onSelectionChangeRef.current?.(true);
              applyUrlTenant(result.tenantId);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your organizations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Load once on mount — URL updates after auto-select must not re-fetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const orgs = await searchTenantOrganizationsForSelectServer(trimmed);
        const mappedById = new Map(tenants.map((t) => [t.tenantId, t]));
        // Re-check locally so a loose backend contains-match cannot surface unrelated tenants.
        setSearchHits(
          orgs
            .map((org) => orgToWorkspaceTenant(org, mappedById.get(org.tenantId?.trim() || '')))
            .filter((t): t is AdminWorkspaceTenant => t != null && tenantMatchesQuery(t, trimmed)),
        );
      } catch {
        setSearchHits([]);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, tenants]);

  const filteredTenants = useMemo(() => {
    const localHits = tenants.filter((t) => tenantMatchesQuery(t, query));
    if (!query.trim()) return localHits;
    const byId = new Map<string, AdminWorkspaceTenant>();
    for (const tenant of [...searchHits, ...localHits]) {
      const existing = byId.get(tenant.tenantId);
      if (!existing || tenant.mappedToUser) byId.set(tenant.tenantId, tenant);
    }
    return Array.from(byId.values());
  }, [tenants, searchHits, query]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const totalCount = filteredTenants.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startItem = totalCount > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  const endItem =
    totalCount > 0 ? currentPage * PAGE_SIZE + Math.min(PAGE_SIZE, totalCount - currentPage * PAGE_SIZE) : 0;
  const pageTenants = filteredTenants.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const showPagination = totalCount > PAGE_SIZE;
  const isPrevDisabled = currentPage === 0 || saving !== null;
  const isNextDisabled = currentPage >= totalPages - 1 || saving !== null;
  const searchNormalized = query.trim().toLowerCase();
  const showAllTenantsCard =
    canQueryAllTenants &&
    currentPage === 0 &&
    (!searchNormalized ||
      'all tenants'.startsWith(searchNormalized) ||
      searchNormalized.includes('all tenant') ||
      'super admin'.startsWith(searchNormalized) ||
      searchNormalized.includes('super admin'));

  const handleSelect = async (tenantId: string) => {
    setSaving(tenantId);
    setError(null);
    try {
      const result = await selectAdminSessionTenant(tenantId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSessionTenantId(result.tenantId);
      setSessionAllTenants(result.allTenants);
      onSelectionChange?.(true);
      applyUrlTenant(result.tenantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select tenant');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-6 text-center text-indigo-800">
        Loading the organizations mapped to your account…
      </div>
    );
  }

  return (
    <section className="mb-10" aria-labelledby="admin-workspace-heading">
      <div className="mb-4 text-center">
        <h2 id="admin-workspace-heading" className="text-lg sm:text-xl font-bold text-indigo-900">
          Choose an organization for this session
        </h2>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl mx-auto">
          These are the tenant IDs mapped to your login. You can administer more than one organization;
          pick the tenant you want to work on now. You can switch at any time from this page.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSelection && (
        <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border-2 border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              Working on{' '}
              <span className="font-semibold">
                {sessionAllTenants
                  ? 'all tenants'
                  : tenants.find((t) => t.tenantId === sessionTenantId)?.organizationName ||
                    filteredTenants.find((t) => t.tenantId === sessionTenantId)?.organizationName ||
                    sessionTenantId}
              </span>
              {!sessionAllTenants && sessionTenantId ? (
                <span className="font-mono text-green-700"> ({sessionTenantId})</span>
              ) : null}
            </span>
          </div>
          {!sessionAllTenants && canQueryAllTenants ? (
            <button
              type="button"
              onClick={() => void handleSelect(ADMIN_SESSION_ALL_TENANTS)}
              disabled={saving !== null}
              className="flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Clear this tenant and work across all tenants"
              aria-label="Return to all tenants"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-indigo-700">
                {saving === ADMIN_SESSION_ALL_TENANTS ? 'Returning…' : 'Return to all tenants'}
              </span>
            </button>
          ) : null}
        </div>
      )}

      {(tenants.length >= 2 || canQueryAllTenants) && (
        <div ref={searchBoxRef} className="relative max-w-xl mx-auto mb-6">
          <div className="mb-3 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 text-center shadow-sm">
            <p className="text-sm sm:text-base font-bold text-indigo-900 leading-snug">
              Type to search by organization name, Tenant ID, or domain
            </p>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-indigo-800 leading-snug">
              The same lookup as Tenant Settings
            </p>
          </div>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="admin-workspace-tenant-search"
              type="text"
              role="combobox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredTenants.length === 1) {
                  e.preventDefault();
                  void handleSelect(filteredTenants[0].tenantId);
                  setSearchOpen(false);
                } else if (e.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
              placeholder="Search by Tenant ID or organization name…"
              title="Type to search organizations by name, Tenant ID, or domain"
              aria-label="Search by Tenant ID or organization name"
              aria-expanded={searchOpen}
              aria-controls="admin-workspace-tenant-listbox"
              aria-autocomplete="list"
              className={`box-border block w-full h-12 border rounded-xl focus:ring-blue-500 focus:border-blue-500 pl-10 pr-10 text-base ${
                query.trim() ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-white'
              }`}
              autoComplete="off"
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-gray-400 hover:text-gray-700"
                title="Clear search"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
            {searchOpen && query.trim() && (
              <div
                id="admin-workspace-tenant-listbox"
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto"
                role="listbox"
              >
                {filteredTenants.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No matching organizations.</div>
                ) : (
                  <ul className="py-1">
                    {filteredTenants.slice(0, 20).map((tenant) => (
                      <li key={tenant.tenantId}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            void handleSelect(tenant.tenantId);
                            setSearchOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                            sessionTenantId === tenant.tenantId ? 'bg-blue-100' : ''
                          }`}
                          role="option"
                          aria-selected={sessionTenantId === tenant.tenantId}
                        >
                          <div className="font-medium text-gray-900">{tenant.organizationName}</div>
                          <div className="text-sm text-gray-500">
                            {tenant.tenantId}
                            {tenant.domain ? ` · ${tenant.domain}` : ''}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {showAllTenantsCard && (
          <button
            type="button"
            onClick={() => handleSelect(ADMIN_SESSION_ALL_TENANTS)}
            disabled={saving !== null}
            className={`flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-md p-4 text-xs transition-all group ${
              sessionAllTenants ? 'ring-4 ring-blue-400' : ''
            }`}
            title="Work across all tenants"
            aria-label="Work across all tenants"
            aria-pressed={sessionAllTenants}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-center leading-tight">All tenants</span>
            <span className="mt-1 text-center opacity-80">Platform super admin</span>
          </button>
        )}

        {pageTenants.map((tenant, index) => {
          const colors = CARD_COLORS[(currentPage * PAGE_SIZE + index) % CARD_COLORS.length];
          const selected = !sessionAllTenants && sessionTenantId === tenant.tenantId;
          return (
            <button
              key={tenant.tenantId}
              type="button"
              onClick={() => handleSelect(tenant.tenantId)}
              disabled={saving !== null}
              className={`flex flex-col items-center justify-center ${colors.card} rounded-lg shadow-md p-4 text-xs transition-all group ${
                selected ? `ring-4 ${colors.ring}` : ''
              }`}
              title={`Work on ${tenant.organizationName} (${tenant.tenantId})`}
              aria-label={`Work on ${tenant.organizationName} (${tenant.tenantId})`}
              aria-pressed={selected}
            >
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <svg className={`w-10 h-10 ${colors.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="font-semibold text-center leading-tight">{tenant.organizationName}</span>
              <span className="mt-1 font-mono text-center break-all">{tenant.tenantId}</span>
              {tenant.domain ? (
                <span className="mt-0.5 text-center opacity-80">{tenant.domain}</span>
              ) : null}
              <span className="mt-1 font-medium">{tenant.role}</span>
              {saving === tenant.tenantId ? <span className="mt-1">Selecting…</span> : null}
            </button>
          );
        })}
      </div>

      {showPagination && (
        <div className="mt-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={isPrevDisabled}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
              title="Previous Page"
              aria-label="Previous Page"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm font-bold text-blue-700">
                Page <span className="text-blue-600">{currentPage + 1}</span> of{' '}
                <span className="text-blue-600">{totalPages}</span>
              </span>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={isNextDisabled}
              className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
              title="Next Page"
              aria-label="Next Page"
              type="button"
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="text-center mt-3">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <span className="text-sm text-gray-700">
                Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                <span className="font-bold text-blue-600">{totalCount}</span> organizations
              </span>
            </div>
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="mt-4 rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800 text-center">
          {query.trim()
            ? 'No organizations match your search.'
            : canQueryAllTenants
              ? 'No tenant IDs are mapped to this login. Use All tenants, or ask for ADMIN on a tenant.'
              : 'No tenant IDs are mapped to this login. Ask a platform admin to grant you ADMIN on a tenant.'}
        </div>
      )}
    </section>
  );
}
