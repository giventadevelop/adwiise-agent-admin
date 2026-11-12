'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TenantOrganizationSearchSelect from '@/app/admin/tenant-management/components/TenantOrganizationSearchSelect';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { organizationMoveLabel } from '@/app/admin/tenant-management/organizations/organizationMoveLabel';
import {
  fetchOrganizationTenantIdsPage,
  type OrganizationTenantIdRow,
} from '@/app/admin/tenant-management/organizations/tenantIdListActions';
import { reassignTenantToOrganization } from '@/app/admin/tenant-management/organizations/websiteActions';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';

const PAGE_SIZE = 50;

type ColumnList = {
  rows: OrganizationTenantIdRow[];
  totalCount: number;
  loading: boolean;
  error: string;
};

const emptyList = (): ColumnList => ({ rows: [], totalCount: 0, loading: false, error: '' });

export default function MoveBetweenOrganizationsClient({
  initialLeft,
  initialRight,
}: {
  initialLeft: TenantOrganizationDTO | null;
  initialRight: TenantOrganizationDTO | null;
}) {
  const router = useRouter();
  const [left, setLeft] = useState<TenantOrganizationDTO | null>(initialLeft);
  const [right, setRight] = useState<TenantOrganizationDTO | null>(initialRight);
  const [leftList, setLeftList] = useState<ColumnList>(emptyList);
  const [rightList, setRightList] = useState<ColumnList>(emptyList);
  const [movingTenantId, setMovingTenantId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null);

  const sameOrganization = left?.id != null && right?.id != null && left.id === right.id;

  const loadList = useCallback(async (organizationId: number, side: 'left' | 'right') => {
    const setList = side === 'left' ? setLeftList : setRightList;
    setList((current) => ({ ...current, loading: true, error: '' }));
    try {
      const page = await fetchOrganizationTenantIdsPage(organizationId, 0, PAGE_SIZE);
      setList({ rows: page.rows, totalCount: page.totalCount, loading: false, error: '' });
    } catch (err) {
      setList({
        rows: [],
        totalCount: 0,
        loading: false,
        error: err instanceof Error ? err.message : 'Could not load the tenant IDs for this organization.',
      });
    }
  }, []);

  useEffect(() => {
    if (!left?.id) {
      setLeftList(emptyList());
      return;
    }
    void loadList(left.id, 'left');
  }, [left?.id, loadList]);

  useEffect(() => {
    if (!right?.id) {
      setRightList(emptyList());
      return;
    }
    void loadList(right.id, 'right');
  }, [right?.id, loadList]);

  const writeUrl = (nextLeft: TenantOrganizationDTO | null, nextRight: TenantOrganizationDTO | null) => {
    const params = new URLSearchParams();
    if (nextLeft?.id) params.set('left', String(nextLeft.id));
    if (nextRight?.id) params.set('right', String(nextRight.id));
    const query = params.toString();
    router.replace(query ? `/admin/tenant-management/organizations/move-between?${query}` : '/admin/tenant-management/organizations/move-between');
  };

  const chooseOrganization = async (side: 'left' | 'right', organizationId: string) => {
    const numeric = Number.parseInt(organizationId, 10);
    const setOrganization = side === 'left' ? setLeft : setRight;
    if (!organizationId || !Number.isFinite(numeric)) {
      setOrganization(null);
      writeUrl(side === 'left' ? null : left, side === 'right' ? null : right);
      return;
    }
    const organization = await fetchTenantOrganization(numeric).catch(() => null);
    const next = organization?.id ? organization : null;
    setOrganization(next);
    writeUrl(side === 'left' ? next : left, side === 'right' ? next : right);
  };

  const moveTenant = async (
    tenantId: string,
    destination: TenantOrganizationDTO | null,
    destinationSide: 'left' | 'right',
    source: TenantOrganizationDTO | null,
    sourceSide: 'left' | 'right',
  ) => {
    if (!destination?.id || !source?.id || destination.id === source.id || movingTenantId) return;
    setMovingTenantId(tenantId);
    setError('');
    try {
      await reassignTenantToOrganization(tenantId, destination.id);
      await Promise.all([loadList(source.id, sourceSide), loadList(destination.id, destinationSide)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the tenant ID.');
    } finally {
      setMovingTenantId(null);
      setDropSide(null);
    }
  };

  return (
    <div className="space-y-4">
      {sameOrganization ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Choose two different organizations. A tenant ID stays where it is when both columns are the same organization.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrganizationColumn
          organization={left}
          list={leftList}
          other={right}
          side="left"
          dropActive={dropSide === 'left'}
          movingTenantId={movingTenantId}
          sameOrganization={sameOrganization}
          onChoose={(organizationId) => void chooseOrganization('left', organizationId)}
          onMove={(tenantId) => void moveTenant(tenantId, right, 'right', left, 'left')}
          onDragEnter={() => setDropSide('left')}
          onDragLeave={() => setDropSide((current) => (current === 'left' ? null : current))}
          onDrop={(tenantId) => {
            setDropSide(null);
            void moveTenant(tenantId, left, 'left', right, 'right');
          }}
        />
        <OrganizationColumn
          organization={right}
          list={rightList}
          other={left}
          side="right"
          dropActive={dropSide === 'right'}
          movingTenantId={movingTenantId}
          sameOrganization={sameOrganization}
          onChoose={(organizationId) => void chooseOrganization('right', organizationId)}
          onMove={(tenantId) => void moveTenant(tenantId, left, 'left', right, 'right')}
          onDragEnter={() => setDropSide('right')}
          onDragLeave={() => setDropSide((current) => (current === 'right' ? null : current))}
          onDrop={(tenantId) => {
            setDropSide(null);
            void moveTenant(tenantId, right, 'right', left, 'left');
          }}
        />
      </div>
    </div>
  );
}

function OrganizationColumn({
  organization,
  list,
  other,
  side,
  dropActive,
  movingTenantId,
  sameOrganization,
  onChoose,
  onMove,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  organization: TenantOrganizationDTO | null;
  list: ColumnList;
  other: TenantOrganizationDTO | null;
  side: 'left' | 'right';
  dropActive: boolean;
  movingTenantId: string | null;
  sameOrganization: boolean;
  onChoose: (organizationId: string) => void;
  onMove: (tenantId: string) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (tenantId: string) => void;
}) {
  const canReceive = Boolean(organization?.id && other?.id && !sameOrganization && !movingTenantId);
  const title = organization?.id ? organizationMoveLabel(organization.organizationName, organization.id) : 'Choose an organization';

  return (
    <section className="bg-white shadow rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <TenantOrganizationSearchSelect
        value={organization?.id ? String(organization.id) : ''}
        onChange={onChoose}
        initialOrganizations={organization ? [organization] : []}
        required={false}
      />
      <div
        onDragOver={(event) => {
          if (!canReceive) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDragEnter={(event) => {
          if (!canReceive) return;
          event.preventDefault();
          onDragEnter();
        }}
        onDragLeave={onDragLeave}
        onDrop={(event) => {
          if (!canReceive) return;
          event.preventDefault();
          const tenantId = event.dataTransfer.getData('text/plain').trim();
          if (!tenantId) return;
          if (list.rows.some((row) => row.tenantId === tenantId)) return;
          onDrop(tenantId);
        }}
        className={`rounded-xl border-2 border-dashed p-4 min-h-40 space-y-3 ${
          dropActive && canReceive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        {!organization ? <p className="text-sm text-gray-600">Pick an organization to list its tenant IDs.</p> : null}
        {organization && list.loading ? <p className="text-sm text-gray-600">Loading tenant IDs...</p> : null}
        {organization && list.error ? <p className="text-sm text-red-600">{list.error}</p> : null}
        {organization && !list.loading && !list.error && list.rows.length === 0 ? (
          <p className="text-sm text-gray-600">This organization has no tenant IDs yet.</p>
        ) : null}
        {list.rows.map((row) => {
          const moving = movingTenantId === row.tenantId;
          const moveDisabled = !other?.id || sameOrganization || movingTenantId != null;
          return (
            <div
              key={`${side}-${row.settingsId}`}
              draggable={!moveDisabled}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', row.tenantId);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
            >
              <span className="font-mono text-sm break-all cursor-grab">{row.tenantId}</span>
              <button
                type="button"
                draggable={false}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onMove(row.tenantId)}
                disabled={moveDisabled}
                className="flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Move to the other organization"
                aria-label={`Move ${row.tenantId} to the other organization`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="font-semibold text-indigo-700">{moving ? 'Moving...' : 'Move to the other organization'}</span>
              </button>
            </div>
          );
        })}
        {organization?.id && list.totalCount > PAGE_SIZE ? (
          <p className="text-sm text-gray-700">
            Showing the first {PAGE_SIZE} of {list.totalCount} tenant IDs.{' '}
            <Link
              href={`/admin/tenant-management/organizations/${organization.id}#tenant-ids`}
              className="font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Open this organization
            </Link>{' '}
            to see the rest.
          </p>
        ) : null}
      </div>
    </section>
  );
}
