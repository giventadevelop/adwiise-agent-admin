'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import {
  fetchRecentTenantOrganizationsForSelectServer,
  searchTenantOrganizationsForSelectServer,
} from '@/app/admin/tenant-management/organizations/organizationSelectServerActions';
import { onboardingInputClass } from '@/lib/onboarding/onboardingShared';

const ORG_SELECT_LIMIT = 20;

function filterOrganizationsLocally(
  organizations: TenantOrganizationDTO[],
  query: string
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

interface Props {
  value: string;
  error?: string;
  disabled?: boolean;
  inputId?: string;
  onChangeName: (organizationName: string) => void;
  onSelectExisting: (org: TenantOrganizationDTO) => void;
  onClearExisting?: () => void;
  registerRef?: (el: HTMLInputElement | null) => void;
  onBlurField?: () => void;
  /**
   * When true, organization must be picked from the list (CRM create happens under
   * Organizations). Free-typed names are search-only and are not treated as a new org.
   */
  selectExistingOnly?: boolean;
}

/**
 * Organization name field: search/select an existing tenant organization.
 * With selectExistingOnly, free text is search-only (no “new organization” path).
 */
export default function OnboardingOrganizationNameCombobox({
  value,
  error,
  disabled,
  inputId = 'onb-organizationName',
  onChangeName,
  onSelectExisting,
  onClearExisting,
  registerRef,
  onBlurField,
  selectExistingOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable id avoids SSR/client useId() hydration mismatches on aria-controls.
  const listboxId = 'onb-organizationName-listbox';
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cachedOrganizations, setCachedOrganizations] = useState<TenantOrganizationDTO[]>([]);
  const [displayOrganizations, setDisplayOrganizations] = useState<TenantOrganizationDTO[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<TenantOrganizationDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRecent() {
      setLoading(true);
      try {
        const recent = await fetchRecentTenantOrganizationsForSelectServer();
        if (cancelled) return;
        setCachedOrganizations(recent);
        setDisplayOrganizations(recent);
      } catch {
        /* empty list is fine — user can still search after create under Organizations */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    if (value.trim().toLowerCase() !== selectedOrg.organizationName?.trim().toLowerCase()) {
      setSelectedOrg(null);
      onClearExisting?.();
    }
  }, [value, selectedOrg, onClearExisting]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) {
        setDisplayOrganizations(cachedOrganizations);
        return;
      }

      const localMatches = filterOrganizationsLocally(cachedOrganizations, trimmed);
      if (localMatches.length > 0) {
        setDisplayOrganizations(localMatches.slice(0, ORG_SELECT_LIMIT));
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await searchTenantOrganizationsForSelectServer(trimmed);
          const byKey = new Map<string, TenantOrganizationDTO>();
          for (const org of [...results, ...localMatches]) {
            const key = String(org.id ?? org.tenantId ?? '');
            if (key && !byKey.has(key)) byKey.set(key, org);
          }
          setDisplayOrganizations(Array.from(byKey.values()).slice(0, ORG_SELECT_LIMIT));
          if (results.length > 0) {
            setCachedOrganizations((prev) => {
              const byId = new Map<number, TenantOrganizationDTO>();
              for (const org of [...results, ...prev]) {
                if (org.id != null) byId.set(org.id, org);
              }
              return Array.from(byId.values()).slice(0, ORG_SELECT_LIMIT * 2);
            });
          }
        } catch {
          setDisplayOrganizations(localMatches.slice(0, ORG_SELECT_LIMIT));
        } finally {
          setLoading(false);
        }
      }, 280);
    },
    [cachedOrganizations]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    onChangeName(term);
    setIsOpen(true);
    if (!term.trim()) {
      setSelectedOrg(null);
      onClearExisting?.();
    }
    runSearch(term);
  };

  const handleSelect = (org: TenantOrganizationDTO) => {
    const name = org.organizationName?.trim() || '';
    setSelectedOrg(org);
    onChangeName(name);
    onSelectExisting(org);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedOrg(null);
    onChangeName('');
    onClearExisting?.();
    setDisplayOrganizations(cachedOrganizations);
    setIsOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (displayOrganizations.length === 1) {
        handleSelect(displayOrganizations[0]);
      } else {
        setIsOpen(false);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative md:col-span-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        Organization *
      </label>
      <p className="text-xs text-gray-500 mt-1 mb-1">
        {selectExistingOnly
          ? 'Search and select an existing company organization (create it under Organizations first if needed). Contact and address stay on that organization record.'
          : 'Search and select an existing organization, or type a new name. Selecting an organization prefills contact and address.'}
      </p>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
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
        <input
          ref={registerRef}
          id={inputId}
          name="organizationName"
          type="text"
          role="combobox"
          value={value}
          onChange={handleSearchChange}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              runSearch(value);
            }
          }}
          onBlur={() => onBlurField?.()}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Search and select an existing organization..."
          className={`${onboardingInputClass(!!error)} pl-10 pr-10`}
          aria-label="Organization"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {(selectedOrg || value) && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear"
            aria-label="Clear organization name"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          id={listboxId}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto"
          role="listbox"
        >
          {loading && displayOrganizations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading organizations...</div>
          ) : displayOrganizations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {value.trim()
                ? selectExistingOnly
                  ? `No match for “${value.trim()}”. Create the company under Organizations, then select it here.`
                  : `No existing match — “${value.trim()}” will be used as a new organization name.`
                : 'Start typing to search existing organizations.'}
            </div>
          ) : (
            <ul className="py-1">
              {displayOrganizations.map((org) => (
                <li key={org.id ?? org.tenantId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(org)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                      selectedOrg?.tenantId === org.tenantId ? 'bg-blue-100' : ''
                    }`}
                    role="option"
                    aria-selected={selectedOrg?.tenantId === org.tenantId}
                  >
                    <div className="font-medium text-gray-900">{org.organizationName}</div>
                    <div className="text-sm text-gray-500">
                      {org.tenantId}
                      {org.domain ? ` · ${org.domain}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedOrg && !isOpen && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="font-medium text-blue-900">Selected: </span>
          <span className="text-blue-800">
            {selectedOrg.organizationName} ({selectedOrg.tenantId})
          </span>
          {selectedOrg.contactEmail ? (
            <span className="block text-blue-700 text-xs mt-1">
              Contact on file: {selectedOrg.contactEmail}
              {selectedOrg.contactPhone ? ` · ${selectedOrg.contactPhone}` : ''}
            </span>
          ) : null}
        </div>
      )}

      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
}
