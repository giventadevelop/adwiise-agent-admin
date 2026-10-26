'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { TeamMemberDTO } from '@/types/teamMember';
import TeamMemberForm from './TeamMemberForm';
import { Modal } from '@/components/Modal';
import AdminTenantFilterField from '../AdminTenantFilterField';
import { useAdminTenantId } from '../AdminTenantContext';
import { fetchTeamGroups } from '../team-groups/ApiServerActions';
import {
  deleteTeamMember,
  fetchTeamMembersPage,
  type TeamMemberListFilters,
} from './ApiServerActions';
import { sportLabelsForMember } from '@/lib/sportsCategories';

type SearchField = 'firstName' | 'lastName' | 'email' | 'position' | 'instrument' | 'id';

interface TeamMembersClientProps {
  initialMembers: TeamMemberDTO[];
  initialGroups: TeamGroupDTO[];
  initialTotalCount: number;
  initialPageSize: number;
  filterGroupId?: number;
}

function buildListFilters(
  tenantId: string | undefined,
  groupFilter: number | '',
  searchField: SearchField,
  searchQuery: string,
  sort: string,
  filterActive: 'all' | 'active' | 'inactive'
): TeamMemberListFilters {
  const filters: TeamMemberListFilters = {
    tenantId,
    sort: sort.trim() || 'priorityOrder,asc',
  };
  if (typeof groupFilter === 'number') filters.teamGroupId = groupFilter;
  if (filterActive === 'active') filters.isActive = true;
  else if (filterActive === 'inactive') filters.isActive = false;

  const q = searchQuery.trim();
  if (!q) return filters;

  if (searchField === 'id') {
    filters.id = q;
    return filters;
  }
  if (searchField === 'firstName') filters.firstName = q;
  else if (searchField === 'lastName') filters.lastName = q;
  else if (searchField === 'email') filters.email = q;
  else if (searchField === 'position') filters.position = q;
  else if (searchField === 'instrument') filters.instrument = q;

  return filters;
}

export default function TeamMembersClient({
  initialMembers,
  initialGroups,
  initialTotalCount,
  initialPageSize,
  filterGroupId,
}: TeamMembersClientProps) {
  const tenantId = useAdminTenantId();
  const [members, setMembers] = useState(initialMembers);
  const [groups, setGroups] = useState(initialGroups);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const [groupFilter, setGroupFilter] = useState<number | ''>(filterGroupId ?? '');
  const [searchField, setSearchField] = useState<SearchField>('firstName');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('priorityOrder,asc');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamMemberDTO | null>(null);
  const [deleting, setDeleting] = useState<TeamMemberDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadListAt = useCallback(
    async (targetPage: number) => {
      setListLoading(true);
      try {
        const filters = buildListFilters(
          tenantId,
          groupFilter,
          searchField,
          searchQuery,
          sort,
          filterActive
        );
        const [{ members: rows, totalCount: tc }, nextGroups] = await Promise.all([
          fetchTeamMembersPage(targetPage, pageSize, filters),
          fetchTeamGroups(tenantId),
        ]);
        setMembers(rows);
        setTotalCount(tc);
        setGroups(nextGroups);
      } catch (e) {
        console.error('[TeamMembersClient] loadListAt failed:', e);
      } finally {
        setListLoading(false);
      }
    },
    [tenantId, groupFilter, searchField, searchQuery, sort, filterActive, pageSize]
  );

  useEffect(() => {
    void loadListAt(page);
  }, [page, loadListAt]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const isPrevDisabled = page === 0 || listLoading;
  const isNextDisabled = page >= totalPages - 1 || listLoading;
  const startItem = totalCount > 0 ? page * pageSize + 1 : 0;
  const endItem =
    totalCount > 0 ? page * pageSize + Math.min(pageSize, totalCount - page * pageSize) : 0;

  const groupName = (id: number) => groups.find((g) => g.id === id)?.name ?? String(id);

  const handleApplySearch = () => {
    if (page === 0) void loadListAt(0);
    else setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="text-lg font-semibold text-blue-800 mb-4">Search roster members</div>
          <div className="flex flex-wrap gap-4 items-end">
            <AdminTenantFilterField />
            <div>
              <label className="block text-xs font-semibold mb-1">Team group</label>
              <select
                className="border px-3 py-2 rounded w-48"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id ?? ''}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Search by</label>
              <select
                className="border px-3 py-2 rounded w-44"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
              >
                <option value="firstName">First name</option>
                <option value="lastName">Last name</option>
                <option value="email">Email</option>
                <option value="position">Position</option>
                <option value="instrument">Instrument</option>
                <option value="id">Member ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {searchField === 'id' ? 'Member ID' : 'Contains'}
              </label>
              <input
                type={searchField === 'id' ? 'number' : 'text'}
                className="border px-3 py-2 rounded w-48 min-w-[12rem]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplySearch();
                }}
                placeholder={searchField === 'id' ? 'Numeric id' : `Search ${searchField}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select
                className="border px-3 py-2 rounded w-36"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Sort</label>
              <select
                className="border px-3 py-2 rounded w-48"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="priorityOrder,asc">Priority (low first)</option>
                <option value="priorityOrder,desc">Priority (high first)</option>
                <option value="lastName,asc">Last name (A–Z)</option>
                <option value="firstName,asc">First name (A–Z)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleApplySearch}
              disabled={listLoading}
              className="h-10 px-4 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold border-2 border-blue-400 disabled:opacity-50"
            >
              {listLoading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Roster members ({totalCount})
            {listLoading && <span className="ml-2 text-sm text-gray-500 font-normal">Refreshing…</span>}
          </h2>
          <Link href="/admin/team-groups" className="text-violet-600 text-sm hover:underline">
            Manage groups
          </Link>
        </div>
        <button
          type="button"
          disabled={groups.length === 0}
          onClick={() => setCreating(true)}
          className="flex-shrink-0 h-14 rounded-xl bg-rose-100 hover:bg-rose-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
          title="Add member"
          aria-label="Add member"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="font-semibold text-rose-700">Add member</span>
        </button>
      </div>

      {groups.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Create a{' '}
          <Link href="/admin/team-groups" className="underline font-semibold">
            team group
          </Link>{' '}
          before adding roster members.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Group</th>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div>
                    {m.firstName} {m.lastName}
                  </div>
                  {sportLabelsForMember(m).length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {sportLabelsForMember(m).join(' · ')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{groupName(m.teamGroupId)}</td>
                <td className="px-4 py-3">{m.jerseyNumber ?? '—'}</td>
                <td className="px-4 py-3">{m.position || m.instrument || m.title || '—'}</td>
                <td className="px-4 py-3">{m.priorityOrder ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.tenantId || '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="text-violet-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(m)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {listLoading ? 'Loading…' : 'No members found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                <span className="font-bold text-blue-600">{totalCount}</span> members
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
              <span className="text-sm font-medium text-orange-700">No members found</span>
            </div>
          )}
        </div>
      </div>

      {(creating || editing) && groups.length > 0 && (
        <Modal
          open
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          title={editing ? 'Edit roster member' : 'New roster member'}
        >
          <TeamMemberForm
            key={editing?.id ?? 'new'}
            member={editing}
            groups={groups}
            defaultGroupId={
              typeof groupFilter === 'number'
                ? groupFilter
                : filterGroupId ?? groups[0]?.id ?? undefined
            }
            onSuccess={() => {
              setCreating(false);
              setEditing(null);
              if (page === 0) void loadListAt(0);
              else setPage(0);
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {deleting?.id && (
        <Modal open onClose={() => setDeleting(null)} title="Delete member?">
          <p className="mb-4 text-gray-700">
            Remove {deleting.firstName} {deleting.lastName} from the roster?
          </p>
          <div className="flex flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Cancel</span>
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
              onClick={async () => {
                setDeleteLoading(true);
                try {
                  const ok = await deleteTeamMember(deleting.id!);
                  if (ok) {
                    setDeleting(null);
                    const nextPage = members.length <= 1 && page > 0 ? page - 1 : page;
                    if (nextPage !== page) setPage(nextPage);
                    else void loadListAt(page);
                  }
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <span className="font-semibold text-red-700">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
