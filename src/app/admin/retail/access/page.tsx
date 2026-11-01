'use client';

import { useEffect, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, RetailNav, YellowCheckbox, fieldClass, labelClass } from '@/components/retail/RetailUi';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { UserProfileDTO } from '@/types';
import type { RetailLocationDTO, RetailUserLocationAssignmentDTO, RetailUserRegionAssignmentDTO } from '@/types/retail';
import { RETAIL_REGIONAL_MANAGER_ROLE, RETAIL_STORE_MANAGER_ROLE } from '@/lib/retailAccess';
import {
  fetchRetailLocationAssignmentsServer,
  fetchRetailLocationsServer,
  fetchRetailPeopleServer,
  fetchRetailRegionAssignmentsServer,
  getRetailMorningAccess,
  replaceRetailLocationAssignmentsServer,
  replaceRetailRegionAssignmentsServer,
} from '../retailServer';

export default function RetailAccessPage() {
  const tenantId = useAdminTenantId();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stores, setStores] = useState<RetailLocationDTO[]>([]);
  const [storeManagers, setStoreManagers] = useState<UserProfileDTO[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<UserProfileDTO[]>([]);
  const [locationAssignments, setLocationAssignments] = useState<RetailUserLocationAssignmentDTO[]>([]);
  const [regionAssignments, setRegionAssignments] = useState<RetailUserRegionAssignmentDTO[]>([]);
  const [storeManagerId, setStoreManagerId] = useState<number | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [regionalManagerId, setRegionalManagerId] = useState<number | null>(null);
  const [regionText, setRegionText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setAllowed(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const access = await getRetailMorningAccess(tenantId);
      if (cancelled) return;
      if (!access.canAssign) {
        setAllowed(false);
        return;
      }
      const [loadedStores, loadedStoreManagers, loadedRegional, loadedLocations, loadedRegions] = await Promise.all([
        fetchRetailLocationsServer(tenantId),
        fetchRetailPeopleServer(tenantId, RETAIL_STORE_MANAGER_ROLE),
        fetchRetailPeopleServer(tenantId, RETAIL_REGIONAL_MANAGER_ROLE),
        fetchRetailLocationAssignmentsServer(tenantId),
        fetchRetailRegionAssignmentsServer(tenantId),
      ]);
      if (cancelled) return;
      setStores(loadedStores);
      setStoreManagers(loadedStoreManagers);
      setRegionalManagers(loadedRegional);
      setLocationAssignments(loadedLocations);
      setRegionAssignments(loadedRegions);
      setStoreManagerId(loadedStoreManagers[0]?.id ?? null);
      setRegionalManagerId(loadedRegional[0]?.id ?? null);
      setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (storeManagerId == null) return;
    setSelectedLocations(
      locationAssignments.filter(row => row.userProfileId === storeManagerId).map(row => row.locationId)
    );
  }, [storeManagerId, locationAssignments]);

  useEffect(() => {
    if (regionalManagerId == null) return;
    setRegionText(
      regionAssignments
        .filter(row => row.userProfileId === regionalManagerId)
        .map(row => row.region)
        .join(', ')
    );
  }, [regionalManagerId, regionAssignments]);

  const saveStores = async () => {
    if (!tenantId || storeManagerId == null) return;
    const ok = await replaceRetailLocationAssignmentsServer(storeManagerId, selectedLocations, tenantId);
    setMessage(ok ? 'Store assignments saved.' : 'Store assignments were not saved.');
    if (ok) {
      const rows = await fetchRetailLocationAssignmentsServer(tenantId);
      setLocationAssignments(rows);
    }
  };

  const saveRegions = async () => {
    if (!tenantId || regionalManagerId == null) return;
    const regions = regionText.split(',').map(region => region.trim()).filter(Boolean);
    const ok = await replaceRetailRegionAssignmentsServer(regionalManagerId, regions, tenantId);
    setMessage(ok ? 'Region assignments saved.' : 'Region assignments were not saved.');
    if (ok) {
      const rows = await fetchRetailRegionAssignmentsServer(tenantId);
      setRegionAssignments(rows);
    }
  };

  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation currentPage="retail-access" />
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retail assignments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Owners assign a store manager to stores and a regional manager to region names. A store with a blank region stays off the regional list.
          </p>
        </div>
        <RetailNav tenantQuery={tenantQuery} current="access" showAccess />
        {allowed === false && <p className="text-gray-700">Only an owner or admin can assign retail managers.</p>}
        {allowed && (
          <>
            {message && <p className="text-sm text-gray-800">{message}</p>}
            <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Store manager</h2>
              <select
                className={fieldClass}
                value={storeManagerId ?? ''}
                onChange={event => setStoreManagerId(event.target.value ? Number(event.target.value) : null)}
              >
                {storeManagers.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.email || person.userId}
                  </option>
                ))}
              </select>
              {storeManagers.length === 0 && (
                <p className="text-sm text-gray-600">No profile with role RETAIL_STORE_MANAGER for this tenant.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {stores.map(store => (
                  <YellowCheckbox
                    key={store.id}
                    checked={store.id != null && selectedLocations.includes(store.id)}
                    onChange={() => {
                      if (store.id == null) return;
                      setSelectedLocations(current =>
                        current.includes(store.id as number)
                          ? current.filter(id => id !== store.id)
                          : [...current, store.id as number]
                      );
                    }}
                    label={`${store.locationCode} ${store.region ? `(${store.region})` : '(no region)'}`}
                  />
                ))}
              </div>
              <ActionButton tone="emerald" icon="save" label="Save stores" onClick={saveStores} />
            </section>
            <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Regional manager</h2>
              <select
                className={fieldClass}
                value={regionalManagerId ?? ''}
                onChange={event => setRegionalManagerId(event.target.value ? Number(event.target.value) : null)}
              >
                {regionalManagers.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.email || person.userId}
                  </option>
                ))}
              </select>
              {regionalManagers.length === 0 && (
                <p className="text-sm text-gray-600">No profile with role RETAIL_REGIONAL_MANAGER for this tenant.</p>
              )}
              <label className={labelClass}>
                Regions, separated by commas
                <input
                  className={fieldClass}
                  value={regionText}
                  onChange={event => setRegionText(event.target.value)}
                />
              </label>
              <ActionButton tone="purple" icon="save" label="Save regions" onClick={saveRegions} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
