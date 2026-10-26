'use client';

import { useState } from 'react';
import { useAdminTenantId } from '@/app/admin/AdminTenantContext';
import type { AccessRoleDTO, RetailerTypeDTO } from '@/types/accessCatalog';
import {
  deleteAccessRole,
  deleteRetailerType,
  fetchAccessRoles,
  fetchRetailerTypes,
  saveAccessRole,
  saveRetailerType,
} from './ApiServerActions';

const inputClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base';

function editable(row: { tenantId?: string | null }, canEditGlobal: boolean): boolean {
  return Boolean(row.tenantId) || canEditGlobal;
}

function AccessRoleSection({
  rows,
  canEditGlobal,
  onChange,
}: {
  rows: AccessRoleDTO[];
  canEditGlobal: boolean;
  onChange: (rows: AccessRoleDTO[]) => void;
}) {
  const tenantId = useAdminTenantId();
  const [draft, setDraft] = useState<AccessRoleDTO>({
    code: '',
    label: '',
    sortOrder: rows.length,
    isActive: true,
    grantsAdmin: false,
    platformSuper: false,
    locationScope: 'NONE',
  });
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = draft.code === 'SUPER_ADMIN' || draft.code === 'ADMIN';

  const reload = async () => onChange(await fetchAccessRoles(tenantId));

  const persist = async (row: AccessRoleDTO, asShared: boolean) => {
    setSaving(true);
    setError('');
    try {
      await saveAccessRole(row, asShared, tenantId);
      await reload();
      setDraft({
        code: '',
        label: '',
        sortOrder: 0,
        isActive: true,
        grantsAdmin: false,
        platformSuper: false,
        locationScope: 'NONE',
      });
      setShared(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900">Access roles</h2>
      <p className="mt-1 mb-4 text-sm text-gray-600">
        A new role can open the admin menu or a location scope from here. Platform super stays limited to the shared catalog.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Admin menu</th>
              <th className="py-2 pr-4">Locations</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-xs">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.grantsAdmin ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{row.locationScope || 'NONE'}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 text-right space-x-3">
                  {editable(row, canEditGlobal) ? (
                    <>
                      <button type="button" className="text-blue-700" onClick={() => { setDraft(row); setShared(!row.tenantId); }}>
                        Edit
                      </button>
                      <button type="button" className="text-amber-700" onClick={() => persist({ ...row, isActive: false }, !row.tenantId)}>
                        Deactivate
                      </button>
                      <button
                        type="button"
                        className="text-red-700"
                        onClick={async () => {
                          setSaving(true);
                          setError('');
                          try {
                            await deleteAccessRole(row);
                            await reload();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Remove failed');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          persist(draft, shared);
        }}
      >
        <label className="block text-sm font-medium text-gray-700">
          Code
          <input className={inputClass} value={draft.code} disabled={locked || draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Label
          <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Sort order
          <input className={inputClass} type="number" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Location scope
          <select className={inputClass} value={draft.locationScope || 'NONE'} onChange={(e) => setDraft({ ...draft, locationScope: e.target.value })}>
            <option value="NONE">None</option>
            <option value="ASSIGNED">Assigned locations</option>
            <option value="ALL">All locations</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={draft.grantsAdmin === true} onChange={(e) => setDraft({ ...draft, grantsAdmin: e.target.checked })} />
          Opens the admin menu
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.platformSuper === true}
            disabled={!canEditGlobal || !shared}
            onChange={(e) => setDraft({ ...draft, platformSuper: e.target.checked })}
          />
          Platform super admin
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={shared} disabled={!canEditGlobal || draft.id != null} onChange={(e) => setShared(e.target.checked)} />
          Shared with every tenant
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50">
            {draft.id != null ? 'Update role' : 'Add role'}
          </button>
        </div>
      </form>
    </section>
  );
}

function RetailerSection({
  rows,
  canEditGlobal,
  onChange,
}: {
  rows: RetailerTypeDTO[];
  canEditGlobal: boolean;
  onChange: (rows: RetailerTypeDTO[]) => void;
}) {
  const tenantId = useAdminTenantId();
  const [draft, setDraft] = useState<RetailerTypeDTO>({
    code: '',
    label: '',
    hint: '',
    moduleKey: 'EVENT',
    sortOrder: rows.length,
    isActive: true,
  });
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async () => onChange(await fetchRetailerTypes(tenantId));
  const persist = async (row: RetailerTypeDTO, asShared: boolean) => {
    setSaving(true);
    setError('');
    try {
      await saveRetailerType(row, asShared, tenantId);
      await reload();
      setDraft({ code: '', label: '', hint: '', moduleKey: 'EVENT', sortOrder: 0, isActive: true });
      setShared(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900">Site and retailer types</h2>
      <p className="mt-1 mb-4 text-sm text-gray-600">
        These values are stored as the organization site type. Gas station enterprise, liquor, Dunkin, and Seven-Eleven are already seeded. Add the next kind here.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Module</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-xs">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.moduleKey || 'EVENT'}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 text-right space-x-3">
                  {editable(row, canEditGlobal) ? (
                    <>
                      <button type="button" className="text-blue-700" onClick={() => { setDraft(row); setShared(!row.tenantId); }}>
                        Edit
                      </button>
                      <button type="button" className="text-amber-700" onClick={() => persist({ ...row, isActive: false }, !row.tenantId)}>
                        Deactivate
                      </button>
                      <button
                        type="button"
                        className="text-red-700"
                        onClick={async () => {
                          setSaving(true);
                          setError('');
                          try {
                            await deleteRetailerType(row);
                            await reload();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Remove failed');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          persist(draft, shared);
        }}
      >
        <label className="block text-sm font-medium text-gray-700">
          Code
          <input className={inputClass} value={draft.code} disabled={draft.code === 'EVENT_ORG' || draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Label
          <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Hint
          <input className={inputClass} value={draft.hint || ''} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Module
          <input className={inputClass} list="retailer-modules" value={draft.moduleKey || 'EVENT'} onChange={(e) => setDraft({ ...draft, moduleKey: e.target.value })} />
          <datalist id="retailer-modules">
            {['EVENT', 'SPORTS', 'MUSIC', 'CHURCH', 'PROFILE', 'HYBRID', 'GAS_STATION', 'RETAIL'].map((module) => (
              <option key={module} value={module} />
            ))}
          </datalist>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={shared} disabled={!canEditGlobal || draft.id != null} onChange={(e) => setShared(e.target.checked)} />
          Shared with every tenant
        </label>
        <div>
          <button type="submit" disabled={saving} className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50">
            {draft.id != null ? 'Update type' : 'Add type'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AccessCatalogsClient({
  initialRoles,
  initialRetailers,
  canEditGlobal,
}: {
  initialRoles: AccessRoleDTO[];
  initialRetailers: RetailerTypeDTO[];
  canEditGlobal: boolean;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [retailers, setRetailers] = useState(initialRetailers);
  return (
    <div className="space-y-8">
      <AccessRoleSection rows={roles} canEditGlobal={canEditGlobal} onChange={setRoles} />
      <RetailerSection rows={retailers} canEditGlobal={canEditGlobal} onChange={setRetailers} />
    </div>
  );
}
