'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import type { OrganizationPortfolioDTO, OrganizationPortfolioMemberDTO } from '@/types';
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

export default function OrganizationPortfoliosClient() {
  const [portfolios, setPortfolios] = useState<OrganizationPortfolioDTO[]>([]);
  const [members, setMembers] = useState<MemberState>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryTenantId, setPrimaryTenantId] = useState('');
  const [memberTenantId, setMemberTenantId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listOrganizationPortfolios();
      setPortfolios(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      await load();
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

  const removePortfolio = async (id: number) => {
    setBusy(`delete-${id}`);
    setError(null);
    try {
      await deleteOrganizationPortfolio(id);
      if (openId === id) setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={adminPageTopStyle}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation />
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
              <input id="portfolioName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base" />
            </div>
            <div>
              <label htmlFor="primaryTenantId" className="block text-sm font-medium text-gray-700">Primary tenant ID</label>
              <input id="primaryTenantId" value={primaryTenantId} onChange={(e) => setPrimaryTenantId(e.target.value.trim())} className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base font-mono" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="portfolioDescription" className="block text-sm font-medium text-gray-700">Description</label>
              <input id="portfolioDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base" />
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolios</h2>
          {loading ? (
            <p className="text-sm text-gray-600">Loading portfolios...</p>
          ) : portfolios.length === 0 ? (
            <p className="text-sm text-gray-600">No portfolios yet. Existing tenants stay separate until you group them here.</p>
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
                        {portfolio.description ? <p className="text-sm text-gray-600 mt-1">{portfolio.description}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void toggle(id)} className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm">
                          {open ? 'Hide tenants' : 'Tenants'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removePortfolio(id)}
                          disabled={busy !== null}
                          className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-sm disabled:opacity-50"
                        >
                          {busy === `delete-${id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    {open && (
                      <div className="mt-4 space-y-3">
                        <ul className="space-y-2">
                          {rows.map((member) => (
                            <li key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={memberTenantId}
                            onChange={(e) => setMemberTenantId(e.target.value.trim())}
                            placeholder="Existing tenant ID"
                            className="flex-1 border border-gray-400 rounded-xl px-4 py-2 font-mono"
                          />
                          <button
                            type="button"
                            disabled={busy !== null || !memberTenantId.trim()}
                            onClick={() => void addMember(id)}
                            className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
}
