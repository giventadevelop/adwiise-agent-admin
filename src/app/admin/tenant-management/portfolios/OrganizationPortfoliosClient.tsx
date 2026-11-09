'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import type { OrganizationPortfolioDTO, OrganizationPortfolioMemberDTO } from '@/types';
import TenantOrganizationSearchSelect from '@/app/admin/tenant-management/components/TenantOrganizationSearchSelect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  addOrganizationPortfolioMember,
  createOrganizationPortfolio,
  deleteOrganizationPortfolio,
  listOrganizationPortfolioMembers,
  listOrganizationPortfolios,
  removeOrganizationPortfolioMember,
  setOrganizationPortfolioPrimary,
} from './ApiServerActions';

type MemberState = Record<number, OrganizationPortfolioMemberDTO[]>;

const PAGE_SIZE = 10;

export default function OrganizationPortfoliosClient() {
  const [portfolios, setPortfolios] = useState<OrganizationPortfolioDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberState>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryTenantId, setPrimaryTenantId] = useState('');
  const [memberTenantId, setMemberTenantId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<OrganizationPortfolioDTO | null>(null);

  const load = useCallback(async (pageZeroBased: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listOrganizationPortfolios({
        page: pageZeroBased,
        size: PAGE_SIZE,
        search: searchTerm,
      });
      setPortfolios(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, search);
  }, [load, page, search]);

  const loadMembers = async (portfolioId: number) => {
    const rows = await listOrganizationPortfolioMembers(portfolioId);
    setMembers((prev) => ({ ...prev, [portfolioId]: rows }));
  };

  const toggle = async (portfolioId: number) => {
    if (openId === portfolioId) {
      setOpenId(null);
      return;
    }
    setOpenId(portfolioId);
    setError(null);
    try {
      await loadMembers(portfolioId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    }
  };

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      await createOrganizationPortfolio({
        portfolioName: name,
        description,
        primaryTenantId,
        isActive: true,
      });
      setName('');
      setDescription('');
      setPrimaryTenantId('');
      setPage(0);
      await load(0, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setBusy(null);
    }
  };

  const addMember = async (portfolioId: number) => {
    setBusy(`add-${portfolioId}`);
    setError(null);
    try {
      await addOrganizationPortfolioMember(portfolioId, memberTenantId);
      setMemberTenantId('');
      await loadMembers(portfolioId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setBusy(null);
    }
  };

  const makePrimary = async (portfolio: OrganizationPortfolioDTO, tenantId: string) => {
    setBusy(`primary-${portfolio.id}`);
    setError(null);
    try {
      const updated = await setOrganizationPortfolioPrimary(portfolio, tenantId);
      setPortfolios((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      if (portfolio.id) await loadMembers(portfolio.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change the primary tenant');
    } finally {
      setBusy(null);
    }
  };

  const removeMember = async (portfolioId: number, memberId: number) => {
    setBusy(`remove-${memberId}`);
    setError(null);
    try {
      await removeOrganizationPortfolioMember(portfolioId, memberId);
      await loadMembers(portfolioId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tenant');
    } finally {
      setBusy(null);
    }
  };

  const confirmDeletePortfolio = async () => {
    if (!deleteTarget?.id) return;
    const id = deleteTarget.id;
    setBusy(`delete-${id}`);
    setError(null);
    try {
      await deleteOrganizationPortfolio(id);
      if (openId === id) setOpenId(null);
      setDeleteTarget(null);
      await load(page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
    } finally {
      setBusy(null);
    }
  };

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const isPrevDisabled = page === 0 || loading;
  const isNextDisabled = page >= totalPages - 1 || loading;
  const startItem = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const endItem =
    totalCount > 0 ? page * PAGE_SIZE + Math.min(PAGE_SIZE, totalCount - page * PAGE_SIZE) : 0;

  return (
    <div className="w-full overflow-x-hidden box-border" style={adminPageTopStyle}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation contextLine="Organization portfolios — primary tenants and the sites grouped under them." />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Organization portfolios</h1>
          <p className="text-sm text-gray-600 mt-2">
            Group existing tenant IDs under one primary tenant. Each site keeps its own settings, Clerk satellite, and domain.
            An admin of the primary tenant can open every tenant in the group. Platform super admin still sees every tenant.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">New portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="portfolioName" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="portfolioName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base"
              />
            </div>
            <div>
              <label htmlFor="primaryTenantId" className="block text-sm font-medium text-gray-700">
                Primary tenant ID *
              </label>
              <div className="mt-1">
                <TenantOrganizationSearchSelect
                  value={primaryTenantId}
                  onChange={setPrimaryTenantId}
                  required
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="portfolioDescription" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                id="portfolioDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy !== null || !name.trim() || !primaryTenantId.trim()}
            className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'create' ? 'Creating...' : 'Create portfolio'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Portfolios</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Search name or primary tenant ID"
                className="border border-gray-400 rounded-xl px-4 py-2 text-sm font-mono min-w-[16rem]"
                aria-label="Search portfolios by name or primary tenant ID"
              />
              <button
                type="button"
                onClick={applySearch}
                className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm"
              >
                Search
              </button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-gray-600">Loading portfolios...</p>
          ) : portfolios.length === 0 ? (
            <p className="text-sm text-gray-600">
              {search
                ? 'No portfolios match your search.'
                : 'No portfolios yet. Existing tenants stay separate until you group them here.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {portfolios.map((portfolio) => {
                const id = portfolio.id!;
                const open = openId === id;
                const rows = members[id] || [];
                return (
                  <li key={id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{portfolio.portfolioName}</p>
                        <p className="text-sm text-gray-600 font-mono">Primary: {portfolio.primaryTenantId}</p>
                        {portfolio.description ? (
                          <p className="text-sm text-gray-600 mt-1">{portfolio.description}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void toggle(id)}
                          className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm"
                        >
                          {open ? 'Hide tenants' : 'Tenants'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(portfolio)}
                          disabled={busy !== null}
                          className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {open && (
                      <div className="mt-4 space-y-3">
                        <ul className="space-y-2">
                          {rows.map((member) => (
                            <li
                              key={member.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <span className="font-mono text-sm text-gray-800">
                                {member.tenantId}
                                {member.isPrimary ? ' (primary)' : ''}
                              </span>
                              <div className="flex gap-2">
                                {!member.isPrimary && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy !== null}
                                      onClick={() => void makePrimary(portfolio, member.tenantId)}
                                      className="px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold disabled:opacity-50"
                                    >
                                      Make primary
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy !== null}
                                      onClick={() => member.id && void removeMember(id, member.id)}
                                      className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Add tenant ID
                            </label>
                            <TenantOrganizationSearchSelect
                              value={memberTenantId}
                              onChange={setMemberTenantId}
                              required={false}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={busy !== null || !memberTenantId.trim()}
                            onClick={() => void addMember(id)}
                            className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm disabled:opacity-50 h-14"
                          >
                            {busy === `add-${id}` ? 'Adding...' : 'Add tenant'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

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
                  Page <span className="text-blue-600">{page + 1}</span> of{' '}
                  <span className="text-blue-600">{totalPages}</span>
                </span>
              </div>
              <button
                onClick={() => setPage((p) => p + 1)}
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
              {totalCount > 0 ? (
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                  <span className="text-sm text-gray-700">
                    Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
                    <span className="font-bold text-blue-600">{endItem}</span> of{' '}
                    <span className="font-bold text-blue-600">{totalCount}</span> portfolios
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-orange-700">No portfolios found</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete portfolio?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to delete portfolio{' '}
                  <span className="font-semibold text-foreground">{deleteTarget?.portfolioName}</span>.
                </p>
                <p>
                  Primary tenant ID:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {deleteTarget?.primaryTenantId || '—'}
                  </span>
                </p>
                <p>
                  The primary tenant and any grouped member tenants will lose this portfolio grouping.
                  Individual tenant organizations and settings are not deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Keep portfolio</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeletePortfolio()}
              disabled={busy !== null}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                {busy?.startsWith('delete-') ? (
                  <svg className="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-red-700">
                {busy?.startsWith('delete-') ? 'Deleting...' : 'Delete portfolio'}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
