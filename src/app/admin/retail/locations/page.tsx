'use client';

import React, { useEffect, useState, useTransition } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, IconAction, PageFooter, RetailNav, YellowCheckbox, fieldClass, labelClass } from '@/components/retail/RetailUi';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { RetailLocationDTO, RetailLocationProfileDTO } from '@/types/retail';
import {
  deleteRetailLocationServer,
  fetchRetailLocationsPageServer,
  fetchRetailProfilesServer,
  saveRetailLocationServer,
  saveRetailProfileServer,
} from '../retailServer';

const PAGE_SIZE = 20;
const GAS_PACK = 'GAS_STATION';
const PACKS = [
  { code: 'GAS_STATION', label: 'Gas station' },
  { code: 'LIQUOR_STORE', label: 'Liquor store' },
  { code: 'DUNKIN_DONUTS', label: 'Dunkin' },
  { code: 'SEVEN_ELEVEN', label: '7-Eleven' },
  { code: 'RESTAURANT', label: 'Restaurant' },
  { code: 'CLINIC', label: 'Clinic' },
];

type LocationForm = Omit<RetailLocationDTO, 'id' | 'createdAt' | 'updatedAt'> & {
  profileId?: number;
  fuelDispenserCount?: number;
  hasCarWash?: boolean;
  hasLottery?: boolean;
  hasFoodservice?: boolean;
};

const EMPTY_FORM: LocationForm = {
  tenantId: '',
  locationName: '',
  locationCode: '',
  retailerTypeCode: GAS_PACK,
  brand: '',
  region: '',
  city: '',
  stateProvince: '',
  timezone: 'America/New_York',
  is24Hours: false,
  isActive: true,
  includedInSubscription: true,
  fuelDispenserCount: undefined,
  hasCarWash: false,
  hasLottery: false,
  hasFoodservice: false,
};

export default function RetailLocationsPage() {
  const tenantId = useAdminTenantId();
  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [profiles, setProfiles] = useState<RetailLocationProfileDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';
  const gasPack = form.retailerTypeCode === GAS_PACK;

  const reload = async (targetPage: number = page) => {
    setLoading(true);
    const [result, profileRows] = await Promise.all([
      fetchRetailLocationsPageServer(targetPage, PAGE_SIZE, tenantId),
      fetchRetailProfilesServer(tenantId),
    ]);
    setLocations(result.content);
    setTotalCount(result.totalElements);
    setTotalPages(result.totalPages);
    setProfiles(profileRows);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchRetailLocationsPageServer(page, PAGE_SIZE, tenantId),
      fetchRetailProfilesServer(tenantId),
    ]).then(([result, profileRows]) => {
      if (cancelled) return;
      setLocations(result.content);
      setTotalCount(result.totalElements);
      setTotalPages(result.totalPages);
      setProfiles(profileRows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, tenantId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, tenantId: tenantId || '' });
    setShowForm(true);
    setError('');
  };

  const openEdit = (location: RetailLocationDTO) => {
    const profile = profiles.find(row => row.locationId === location.id);
    setEditingId(location.id ?? null);
    setForm({
      tenantId: location.tenantId,
      locationName: location.locationName,
      locationCode: location.locationCode,
      retailerTypeCode: location.retailerTypeCode || GAS_PACK,
      brand: location.brand || '',
      region: location.region || '',
      city: location.city || '',
      stateProvince: location.stateProvince || '',
      timezone: location.timezone || 'America/New_York',
      is24Hours: location.is24Hours === true,
      isActive: location.isActive !== false,
      includedInSubscription: location.includedInSubscription !== false,
      profileId: profile?.id,
      fuelDispenserCount: profile?.fuelDispenserCount,
      hasCarWash: profile?.hasCarWash === true,
      hasLottery: profile?.hasLottery === true,
      hasFoodservice: profile?.hasFoodservice === true,
    });
    setShowForm(true);
    setError('');
  };

  const save = () => {
    if (!form.locationName.trim() || !form.locationCode.trim() || !form.tenantId.trim()) {
      setError('Name, code, and tenant are required.');
      return;
    }
    startTransition(async () => {
      const saved = await saveRetailLocationServer({
        id: editingId ?? undefined,
        tenantId: form.tenantId.trim(),
        locationName: form.locationName.trim(),
        locationCode: form.locationCode.trim(),
        retailerTypeCode: form.retailerTypeCode,
        brand: form.brand,
        region: form.region,
        city: form.city,
        stateProvince: form.stateProvince,
        timezone: form.timezone,
        is24Hours: form.is24Hours,
        isActive: form.isActive,
        includedInSubscription: form.includedInSubscription,
      });
      if (!saved?.id) {
        setError('The location was not saved.');
        return;
      }
      if (form.retailerTypeCode === GAS_PACK) {
        await saveRetailProfileServer({
          id: form.profileId,
          tenantId: saved.tenantId,
          locationId: saved.id,
          fuelDispenserCount: form.fuelDispenserCount,
          hasCarWash: form.hasCarWash,
          hasLottery: form.hasLottery,
          hasFoodservice: form.hasFoodservice,
        });
      }
      setShowForm(false);
      await reload(page);
    });
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retail locations</h1>
            <p className="mt-1 text-sm text-gray-600">{totalCount} stores. Dispenser and amenity fields show for a gas station.</p>
          </div>
          <div className="w-full sm:w-64">
            <ActionButton tone="blue" icon="plus" label="Add location" onClick={openCreate} />
          </div>
        </div>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="locations" />
        </div>

        {showForm && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Tenant
              <input className={fieldClass} value={form.tenantId} onChange={event => setForm({ ...form, tenantId: event.target.value })} />
            </label>
            <label className={labelClass}>Pack
              <select className={fieldClass} value={form.retailerTypeCode} onChange={event => setForm({ ...form, retailerTypeCode: event.target.value })}>
                {PACKS.map(pack => <option key={pack.code} value={pack.code}>{pack.label}</option>)}
              </select>
            </label>
            <label className={labelClass}>Name
              <input className={fieldClass} value={form.locationName} onChange={event => setForm({ ...form, locationName: event.target.value })} />
            </label>
            <label className={labelClass}>Code
              <input className={fieldClass} value={form.locationCode} onChange={event => setForm({ ...form, locationCode: event.target.value })} />
            </label>
            <label className={labelClass}>Brand
              <input className={fieldClass} value={form.brand || ''} onChange={event => setForm({ ...form, brand: event.target.value })} />
            </label>
            <label className={labelClass}>Region
              <input className={fieldClass} value={form.region || ''} onChange={event => setForm({ ...form, region: event.target.value })} />
            </label>
            <label className={labelClass}>City
              <input className={fieldClass} value={form.city || ''} onChange={event => setForm({ ...form, city: event.target.value })} />
            </label>
            <label className={labelClass}>State
              <input className={fieldClass} value={form.stateProvince || ''} onChange={event => setForm({ ...form, stateProvince: event.target.value })} />
            </label>
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <YellowCheckbox checked={form.is24Hours === true} onChange={checked => setForm({ ...form, is24Hours: checked })} label="Open 24 hours" />
              <YellowCheckbox checked={form.isActive !== false} onChange={checked => setForm({ ...form, isActive: checked })} label="Active" />
              <YellowCheckbox checked={form.includedInSubscription !== false} onChange={checked => setForm({ ...form, includedInSubscription: checked })} label="Counted in the location fee" />
            </div>
            {gasPack && (
              <>
                <label className={labelClass}>Dispensers
                  <input type="number" className={fieldClass} value={form.fuelDispenserCount ?? ''} onChange={event => setForm({ ...form, fuelDispenserCount: event.target.value ? Number(event.target.value) : undefined })} />
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <YellowCheckbox checked={form.hasCarWash === true} onChange={checked => setForm({ ...form, hasCarWash: checked })} label="Car wash" />
                  <YellowCheckbox checked={form.hasLottery === true} onChange={checked => setForm({ ...form, hasLottery: checked })} label="Lottery" />
                  <YellowCheckbox checked={form.hasFoodservice === true} onChange={checked => setForm({ ...form, hasFoodservice: checked })} label="Food service" />
                </div>
              </>
            )}
            {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <ActionButton tone="blue" icon="save" label="Save" disabled={isPending} onClick={save} />
              <ActionButton tone="teal" icon="ban" label="Cancel" onClick={() => setShowForm(false)} />
            </div>
          </div>
        )}

        <div className="mt-6 overflow-x-auto user-table-scroll-container bg-white rounded-lg shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50 text-blue-900 text-left">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {locations.map(location => (
                <tr key={location.id} className="border-t hover:bg-blue-50">
                  <td className="px-4 py-3">{location.locationCode}</td>
                  <td className="px-4 py-3">{location.locationName}</td>
                  <td className="px-4 py-3">{location.retailerTypeCode}</td>
                  <td className="px-4 py-3">{location.isActive === false ? 'No' : 'Yes'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconAction tone="blue" icon="pencil" label="Edit location" onClick={() => openEdit(location)} />
                      <IconAction
                        tone="red"
                        icon="trash"
                        label="Delete location"
                        onClick={() => {
                          if (location.id == null) return;
                          startTransition(async () => {
                            await deleteRetailLocationServer(location.id as number);
                            await reload(page);
                          });
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && locations.length === 0 && (
                <tr><td className="px-4 py-4 text-gray-600" colSpan={5}>No locations for this tenant.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PageFooter
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPrev={() => setPage(current => current - 1)}
          onNext={() => setPage(current => current + 1)}
        />
      </div>
    </div>
  );
}
