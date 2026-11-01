'use client';

import React, { useEffect, useState, useTransition } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, IconAction, RetailNav, YellowCheckbox, fieldClass, labelClass } from '@/components/retail/RetailUi';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { RetailConnectionMode, RetailIntegrationDTO, RetailLocationDTO, RetailSystemType } from '@/types/retail';
import {
  deleteRetailIntegrationServer,
  fetchRetailIntegrationsAdminServer,
  fetchRetailLocationsServer,
  saveRetailIntegrationServer,
} from '../retailServer';

const SYSTEM_TYPES: RetailSystemType[] = [
  'POS',
  'FUEL_CONTROLLER',
  'INVENTORY',
  'PAYROLL_SCHEDULING',
  'ACCOUNTING',
  'LOTTERY',
  'CAR_WASH',
  'FOODSERVICE',
  'OTHER',
];
const CONNECTION_MODES: RetailConnectionMode[] = ['API', 'FILE_UPLOAD', 'SFTP', 'MANUAL'];

const EMPTY: RetailIntegrationDTO = {
  tenantId: '',
  locationId: 0,
  systemType: 'POS',
  providerName: '',
  connectionMode: 'FILE_UPLOAD',
  isEnabled: true,
};

export default function RetailIntegrationsPage() {
  const tenantId = useAdminTenantId();
  const [rows, setRows] = useState<RetailIntegrationDTO[]>([]);
  const [locations, setLocations] = useState<RetailLocationDTO[]>([]);
  const [form, setForm] = useState<RetailIntegrationDTO>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  const reload = async () => {
    const [integrations, stores] = await Promise.all([
      fetchRetailIntegrationsAdminServer(tenantId),
      fetchRetailLocationsServer(tenantId),
    ]);
    setRows(integrations);
    setLocations(stores);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRetailIntegrationsAdminServer(tenantId),
      fetchRetailLocationsServer(tenantId),
    ]).then(([integrations, stores]) => {
      if (cancelled) return;
      setRows(integrations);
      setLocations(stores);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const selected = locations.find(location => location.id === form.locationId);
  const gasStore = selected?.retailerTypeCode === 'GAS_STATION';
  const systemTypes = gasStore ? SYSTEM_TYPES : SYSTEM_TYPES.filter(type => type !== 'FUEL_CONTROLLER');

  const save = () => {
    if (!form.tenantId.trim() || !form.locationId) {
      setError('Choose a store.');
      return;
    }
    startTransition(async () => {
      const saved = await saveRetailIntegrationServer({ ...form, id: editingId ?? undefined });
      if (!saved) {
        setError('The integration was not saved.');
        return;
      }
      setShowForm(false);
      await reload();
    });
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Retail integrations</h1>
          <div className="w-full sm:w-72">
            <ActionButton
              tone="purple"
              icon="plus"
              label="Add integration"
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY, tenantId: tenantId || '', locationId: locations[0]?.id || 0 });
                setShowForm(true);
                setError('');
              }}
            />
          </div>
        </div>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="integrations" />
        </div>
        {showForm && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Store
              <select className={fieldClass} value={form.locationId} onChange={event => setForm({ ...form, locationId: Number(event.target.value) })}>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.locationCode} ({location.retailerTypeCode})</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>System
              <select className={fieldClass} value={form.systemType} onChange={event => setForm({ ...form, systemType: event.target.value as RetailSystemType })}>
                {systemTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className={labelClass}>Provider
              <input className={fieldClass} value={form.providerName || ''} onChange={event => setForm({ ...form, providerName: event.target.value })} />
            </label>
            <label className={labelClass}>Connection
              <select className={fieldClass} value={form.connectionMode} onChange={event => setForm({ ...form, connectionMode: event.target.value as RetailConnectionMode })}>
                {CONNECTION_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <YellowCheckbox checked={form.isEnabled !== false} onChange={checked => setForm({ ...form, isEnabled: checked })} label="Enabled" />
            {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <ActionButton tone="blue" icon="save" label="Save" disabled={isPending} onClick={save} />
              <ActionButton tone="teal" icon="ban" label="Cancel" onClick={() => setShowForm(false)} />
            </div>
          </div>
        )}
        <div className="mt-6 overflow-x-auto user-table-scroll-container bg-white rounded-lg shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-purple-50 text-purple-900 text-left">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">System</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const store = locations.find(location => location.id === row.locationId);
                return (
                  <tr key={row.id} className="border-t hover:bg-purple-50">
                    <td className="px-4 py-3">{store?.locationCode || row.locationId}</td>
                    <td className="px-4 py-3">{row.systemType}</td>
                    <td className="px-4 py-3">{row.providerName}</td>
                    <td className="px-4 py-3">{row.connectionMode}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <IconAction tone="blue" icon="pencil" label="Edit integration" onClick={() => { setEditingId(row.id ?? null); setForm(row); setShowForm(true); }} />
                        <IconAction tone="red" icon="trash" label="Delete integration" onClick={() => { if (row.id == null) return; startTransition(async () => { await deleteRetailIntegrationServer(row.id as number); await reload(); }); }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
