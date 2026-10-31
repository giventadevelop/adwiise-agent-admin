'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import AdminNavigation from '@/components/AdminNavigation';
import { useAdminTenantId } from '../../AdminTenantContext';
import TenantSiteTypePicker from '../../TenantSiteTypePicker';
import type { GasStationLocationDTO, GasStationUserStationAssignmentDTO } from '@/types/gasStation';
import type { UserProfileDTO } from '@/types';
import { fetchGasStationLocationsServer } from '../ApiServerActions';
import {
  fetchAllGasStationAssignmentsServer,
  fetchGasStationManagersServer,
} from '../gasStationAccessServer';
import GasStationAccessClient from './GasStationAccessClient';

export default function GasStationAccessPage() {
  const tenantId = useAdminTenantId();
  const [managers, setManagers] = useState<UserProfileDTO[]>([]);
  const [stations, setStations] = useState<GasStationLocationDTO[]>([]);
  const [assignments, setAssignments] = useState<GasStationUserStationAssignmentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  useEffect(() => {
    if (!tenantId) {
      setManagers([]);
      setStations([]);
      setAssignments([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [managersRaw, stationsRaw, assignmentsRaw] = await Promise.all([
          fetchGasStationManagersServer(tenantId),
          fetchGasStationLocationsServer(tenantId),
          fetchAllGasStationAssignmentsServer(tenantId),
        ]);
        if (cancelled) return;
        setManagers(managersRaw);
        setStations(stationsRaw);
        setAssignments(assignmentsRaw);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load location access data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <Link
            href={`/admin/gas-station${tenantQuery}`}
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Gas Station COO
          </Link>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Location access</h1>
          <p className="mt-2 text-sm text-gray-600">
            Map users whose access role has assigned-location scope (for example <strong>GAS_STATION_MANAGER</strong>) to one or more stations for the selected tenant. Platform admins manage assignments here; tenant satellite apps enforce scope on the backend.
          </p>
        </div>

        {!tenantId && (
          <TenantSiteTypePicker siteTypes={['GAS_STATION', 'RETAIL']} title="Gas station tenants" />
        )}

        {tenantId && loading && (
          <p className="text-sm text-gray-500">Loading managers, stations, and assignments…</p>
        )}

        {tenantId && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {tenantId && !loading && !error && (
          <GasStationAccessClient
            tenantId={tenantId}
            managers={managers}
            stations={stations}
            initialAssignments={assignments}
          />
        )}
      </div>
    </div>
  );
}
