'use client';

import { useEffect, useState } from 'react';
import ErrorDialog from '@/components/ErrorDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { useAdminTenantId } from '@/app/admin/AdminTenantContext';
import { CatalogCheck, CatalogHubCard } from '@/app/admin/catalogChrome';
import { CatalogTable } from '@/app/admin/CatalogTable';
import type { AccessRoleDTO, RecommendationCategoryDTO, RetailerSizeBandDTO, RetailerTypeDTO, SiteTypeCatalogDTO } from '@/types/accessCatalog';
import {
  deleteAccessRole,
  deleteRecommendationCategory,
  deleteRetailerSizeBand,
  deleteRetailerType,
  deleteSiteType,
  fetchAccessRoles,
  fetchRecommendationCategories,
  fetchRetailerSizeBands,
  fetchRetailerTypes,
  fetchSiteTypes,
  saveAccessRole,
  saveRecommendationCategory,
  saveRetailerSizeBand,
  saveRetailerType,
  saveSiteType,
} from './ApiServerActions';

const inputClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base';

function editable(row: { tenantId?: string | null }, canEditGlobal: boolean): boolean {
  return Boolean(row.tenantId) || canEditGlobal;
}

function CatalogActions({
  onEdit,
  onDeactivate,
  onRemove,
}: {
  onEdit: () => void;
  onDeactivate: () => void;
  onRemove: () => void;
}) {
  const buttonClass =
    'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110';
  return (
    <div className="flex justify-end gap-2">
      <button type="button" title="Edit" aria-label="Edit" onClick={onEdit} className={`${buttonClass} bg-blue-100 hover:bg-blue-200`}>
        <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button type="button" title="Deactivate" aria-label="Deactivate" onClick={onDeactivate} className={`${buttonClass} bg-amber-100 hover:bg-amber-200`}>
        <svg className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <button type="button" title="Remove" aria-label="Remove" onClick={onRemove} className={`${buttonClass} bg-red-100 hover:bg-red-200`}>
        <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

const saveTones = {
  indigo: {
    button: 'bg-indigo-100 hover:bg-indigo-200',
    iconBox: 'bg-indigo-200',
    icon: 'text-indigo-600',
    label: 'text-indigo-700',
  },
  sky: {
    button: 'bg-sky-100 hover:bg-sky-200',
    iconBox: 'bg-sky-200',
    icon: 'text-sky-600',
    label: 'text-sky-700',
  },
  emerald: {
    button: 'bg-emerald-100 hover:bg-emerald-200',
    iconBox: 'bg-emerald-200',
    icon: 'text-emerald-600',
    label: 'text-emerald-700',
  },
  amber: {
    button: 'bg-amber-100 hover:bg-amber-200',
    iconBox: 'bg-amber-200',
    icon: 'text-amber-600',
    label: 'text-amber-700',
  },
  violet: {
    button: 'bg-violet-100 hover:bg-violet-200',
    iconBox: 'bg-violet-200',
    icon: 'text-violet-600',
    label: 'text-violet-700',
  },
} as const;

function SaveButton({
  saving,
  editing,
  addLabel,
  updateLabel,
  tone,
}: {
  saving: boolean;
  editing: boolean;
  addLabel: string;
  updateLabel: string;
  tone: keyof typeof saveTones;
}) {
  const label = editing ? updateLabel : addLabel;
  const colors = saveTones[tone];
  return (
    <button
      type="submit"
      disabled={saving}
      title={label}
      aria-label={label}
      className={`flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl px-6 transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${colors.button}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors.iconBox}`}>
        {editing ? (
          <svg className={`h-6 w-6 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ) : (
          <svg className={`h-6 w-6 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
      <span className={`font-semibold ${colors.label}`}>{label}</span>
    </button>
  );
}

function SavedNotice({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <SuccessDialog
      isOpen={message != null}
      onClose={onClose}
      title="Saved"
      message={message || ''}
      buttonText="OK"
    />
  );
}

function AccessRoleSection({
  rows,
  canEditGlobal,
  fullPage = false,
  onChange,
}: {
  rows: AccessRoleDTO[];
  canEditGlobal: boolean;
  fullPage?: boolean;
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
  const [saved, setSaved] = useState<string | null>(null);
  const locked = draft.code === 'SUPER_ADMIN' || draft.code === 'ADMIN';

  const reload = async () => onChange(await fetchAccessRoles(tenantId));

  const persist = async (row: AccessRoleDTO, asShared: boolean, announce = false) => {
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
      if (announce) setSaved(row.id != null ? 'The access role was updated.' : 'The access role was added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id="access-roles"
        title="Access roles"
        hint="A new role can open the admin menu or a location scope from here. Platform super stays limited to the shared catalog."
        count={rows.length}
        href="/admin/access-catalogs/access-roles"
        manageLabel="Manage access roles"
        tone="indigo"
        icon={
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />
    );
  }

  return (
    <section id="access-roles" className="scroll-mt-44 overflow-hidden rounded-xl border-2 border-indigo-700 bg-indigo-200 text-indigo-950 shadow-lg">
      <div className="flex items-center gap-3 bg-indigo-700 px-6 py-4 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-800 text-white">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Access roles</h2>
      </div>
      <div className="p-6">
      <p className="mb-4 rounded-lg border-2 border-indigo-700 bg-indigo-200 px-4 py-3 text-base text-indigo-950">
        A new role can open the admin menu or a location scope from here. Platform super stays limited to the shared catalog.
      </p>
      <CatalogTable
        rows={rows}
        itemLabel="access roles"
        searchText={(row) => `${row.code} ${row.label} ${row.locationScope || ''} ${row.tenantId ? 'this tenant' : 'shared'} ${row.grantsAdmin ? 'admin' : ''}`}
      >
        {(pageRows) => (
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="text-left font-semibold">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Admin menu</th>
              <th className="py-2 pr-4">Locations</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.grantsAdmin ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{row.locationScope || 'NONE'}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 text-right">
                  {editable(row, canEditGlobal) ? (
                    <CatalogActions
                      onEdit={() => { setDraft(row); setShared(!row.tenantId); }}
                      onDeactivate={() => persist({ ...row, isActive: false }, !row.tenantId)}
                      onRemove={async () => {
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
                    />
                  ) : (
                    <span className="font-medium">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </CatalogTable>
      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          persist(draft, shared, true);
        }}
      >
        <label className="block text-base font-medium">
          Code
          <input className={inputClass} value={draft.code} disabled={locked || draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Label
          <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Sort order
          <input className={inputClass} type="number" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
        </label>
        <label className="block text-base font-medium">
          Location scope
          <select className={inputClass} value={draft.locationScope || 'NONE'} onChange={(e) => setDraft({ ...draft, locationScope: e.target.value })}>
            <option value="NONE">None</option>
            <option value="ASSIGNED">Assigned locations</option>
            <option value="ALL">All locations</option>
          </select>
        </label>
        <CatalogCheck checked={draft.grantsAdmin === true} onChange={(checked) => setDraft({ ...draft, grantsAdmin: checked })} label="Opens the admin menu" />
        <CatalogCheck
          checked={draft.platformSuper === true}
          disabled={!canEditGlobal || !shared}
          onChange={(checked) => setDraft({ ...draft, platformSuper: checked })}
          label="Platform super admin"
        />
        <CatalogCheck checked={shared} disabled={!canEditGlobal || draft.id != null} onChange={setShared} label="Shared with every tenant" />
        <div className="md:col-span-2">
          <SaveButton saving={saving} editing={draft.id != null} addLabel="Add role" updateLabel="Update role" tone="indigo" />
        </div>
      </form>
      </div>
      <SavedNotice message={saved} onClose={() => setSaved(null)} />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

function RetailerSection({
  rows,
  siteTypes,
  canEditGlobal,
  fullPage = false,
  onChange,
}: {
  rows: RetailerTypeDTO[];
  siteTypes: SiteTypeCatalogDTO[];
  canEditGlobal: boolean;
  fullPage?: boolean;
  onChange: (rows: RetailerTypeDTO[]) => void;
}) {
  const tenantId = useAdminTenantId();
  const parents = siteTypes.filter((row) => row.isActive !== false);
  const [draft, setDraft] = useState<RetailerTypeDTO>({
    code: '',
    label: '',
    hint: '',
    moduleKey: 'RETAIL',
    siteTypeCode: 'RETAIL',
    sortOrder: rows.length,
    isActive: true,
  });
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const reload = async () => onChange(await fetchRetailerTypes(tenantId));
  const persist = async (row: RetailerTypeDTO, asShared: boolean, announce = false) => {
    setSaving(true);
    setError('');
    try {
      await saveRetailerType(row, asShared, tenantId);
      await reload();
      setDraft({ code: '', label: '', hint: '', moduleKey: 'RETAIL', siteTypeCode: 'RETAIL', sortOrder: 0, isActive: true });
      setShared(false);
      if (announce) setSaved(row.id != null ? 'The retailer pack was updated.' : 'The retailer pack was added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id="retailer-types"
        title="Retailer packs"
        hint="A pack belongs to a site type. Shops use RETAIL, then a pack such as gas station or liquor store. Size bands are the next section."
        count={rows.length}
        href="/admin/access-catalogs/retailer-types"
        manageLabel="Manage retailer packs"
        tone="emerald"
        icon={
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
          </svg>
        }
      />
    );
  }

  return (
    <section id="retailer-types" className="scroll-mt-44 overflow-hidden rounded-xl border-2 border-emerald-700 bg-emerald-200 text-emerald-950 shadow-lg">
      <div className="flex items-center gap-3 bg-emerald-700 px-6 py-4 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Retailer types</h2>
      </div>
      <div className="p-6">
      <p className="mb-4 rounded-lg border-2 border-emerald-700 bg-emerald-200 px-4 py-3 text-base text-emerald-950">
        A pack belongs to a site type. Shops use RETAIL, then a pack such as gas station or liquor store. Size bands are the next section.
      </p>
      <CatalogTable
        rows={rows}
        itemLabel="retailer packs"
        searchText={(row) => `${row.code} ${row.label} ${row.siteTypeCode || ''} ${row.tenantId ? 'this tenant' : 'shared'}`}
      >
        {(pageRows) => (
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="text-left font-semibold">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Site type</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.siteTypeCode || 'RETAIL'}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 text-right">
                  {editable(row, canEditGlobal) ? (
                    <CatalogActions
                      onEdit={() => { setDraft(row); setShared(!row.tenantId); }}
                      onDeactivate={() => persist({ ...row, isActive: false }, !row.tenantId)}
                      onRemove={async () => {
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
                    />
                  ) : (
                    <span className="font-medium">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </CatalogTable>
      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          persist(draft, shared, true);
        }}
      >
        <label className="block text-base font-medium">
          Code
          <input className={inputClass} value={draft.code} disabled={draft.code === 'GAS_STATION' || draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Label
          <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Hint
          <input className={inputClass} value={draft.hint || ''} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
        </label>
        <label className="block text-base font-medium">
          Site type
          <select className={inputClass} value={draft.siteTypeCode || 'RETAIL'} onChange={(e) => setDraft({ ...draft, siteTypeCode: e.target.value })}>
            {(parents.length > 0 ? parents : [{ code: 'RETAIL', label: 'Retail' }]).map((site) => (
              <option key={site.code} value={site.code}>{site.label}</option>
            ))}
          </select>
        </label>
        <CatalogCheck checked={shared} disabled={!canEditGlobal || draft.id != null} onChange={setShared} label="Shared with every tenant" />
        <div>
          <SaveButton saving={saving} editing={draft.id != null} addLabel="Add type" updateLabel="Update type" tone="emerald" />
        </div>
      </form>
      </div>
      <SavedNotice message={saved} onClose={() => setSaved(null)} />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

function SizeBandSection({
  rows,
  retailers,
  canEditGlobal,
  fullPage = false,
  onChange,
}: {
  rows: RetailerSizeBandDTO[];
  retailers: RetailerTypeDTO[];
  canEditGlobal: boolean;
  fullPage?: boolean;
  onChange: (rows: RetailerSizeBandDTO[]) => void;
}) {
  const packs = retailers.filter((row) => row.isActive !== false && row.code !== 'RETAIL' && row.code !== 'GAS_STATION_ENT' && (row.siteTypeCode || 'RETAIL') === 'RETAIL');
  const [draft, setDraft] = useState<RetailerSizeBandDTO>({
    retailerTypeCode: packs[0]?.code || 'GAS_STATION',
    code: '',
    label: '',
    minLocations: 1,
    maxLocations: null,
    sortOrder: rows.length,
    isActive: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const reload = async () => onChange(await fetchRetailerSizeBands());

  const persist = async (row: RetailerSizeBandDTO, announce = false) => {
    setSaving(true);
    setError('');
    try {
      await saveRetailerSizeBand(row);
      await reload();
      setDraft({
        retailerTypeCode: packs[0]?.code || 'GAS_STATION',
        code: '',
        label: '',
        minLocations: 1,
        maxLocations: null,
        sortOrder: 0,
        isActive: true,
      });
      if (announce) setSaved(row.id != null ? 'The size band was updated.' : 'The size band was added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id="retailer-size-bands"
        title="Size bands"
        hint="Each band belongs to one retailer type. Gas uses single, mid, and enterprise. Other packs start with one standard band. A blank upper limit means no maximum."
        count={rows.length}
        href="/admin/access-catalogs/retailer-size-bands"
        manageLabel="Manage size bands"
        tone="amber"
        icon={
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        }
      />
    );
  }

  return (
    <section id="retailer-size-bands" className="scroll-mt-44 overflow-hidden rounded-xl border-2 border-amber-700 bg-amber-200 text-amber-950 shadow-lg">
      <div className="flex items-center gap-3 bg-amber-700 px-6 py-4 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-800 text-white">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M9 4v16M15 4v16" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Size bands</h2>
      </div>
      <div className="p-6">
      <p className="mb-4 rounded-lg border-2 border-amber-700 bg-amber-200 px-4 py-3 text-base text-amber-950">
        Each band belongs to one retailer type. Gas uses single, mid, and enterprise. Other packs start with one standard band. A blank upper limit means no maximum.
      </p>
      <CatalogTable
        rows={rows}
        itemLabel="size bands"
        searchText={(row) => `${row.retailerTypeCode} ${row.code} ${row.label} ${row.minLocations} ${row.maxLocations ?? ''}`}
      >
        {(pageRows) => (
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="text-left font-semibold">
              <th className="py-2 pr-4">Retailer</th>
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Locations</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id ?? `${row.retailerTypeCode}-${row.code}`}>
                <td className="py-2 pr-4 font-mono text-sm">{row.retailerTypeCode}</td>
                <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.minLocations}–{row.maxLocations ?? 'no limit'}</td>
                <td className="py-2 text-right">
                  {canEditGlobal ? (
                    <CatalogActions
                      onEdit={() => setDraft(row)}
                      onDeactivate={() => persist({ ...row, isActive: false })}
                      onRemove={async () => {
                        setSaving(true);
                        setError('');
                        try {
                          await deleteRetailerSizeBand(row);
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Remove failed');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-medium">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </CatalogTable>
      {canEditGlobal && (
        <form
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            persist(draft, true);
          }}
        >
          <label className="block text-base font-medium">
            Retailer type
            <select className={inputClass} value={draft.retailerTypeCode} onChange={(e) => setDraft({ ...draft, retailerTypeCode: e.target.value })}>
              {packs.map((pack) => (
                <option key={pack.code} value={pack.code}>{pack.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-base font-medium">
            Code
            <input className={inputClass} value={draft.code} disabled={draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
          </label>
          <label className="block text-base font-medium">
            Label
            <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
          </label>
          <label className="block text-base font-medium">
            Minimum locations
            <input className={inputClass} type="number" min={1} value={draft.minLocations ?? 1} onChange={(e) => setDraft({ ...draft, minLocations: Number(e.target.value) })} required />
          </label>
          <label className="block text-base font-medium">
            Maximum locations
            <input className={inputClass} type="number" min={1} value={draft.maxLocations ?? ''} placeholder="No limit" onChange={(e) => setDraft({ ...draft, maxLocations: e.target.value === '' ? null : Number(e.target.value) })} />
          </label>
          <div className="md:col-span-2">
            <SaveButton saving={saving} editing={draft.id != null} addLabel="Add band" updateLabel="Update band" tone="amber" />
          </div>
        </form>
      )}
      </div>
      <SavedNotice message={saved} onClose={() => setSaved(null)} />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

function CategorySection({
  rows,
  canEditGlobal,
  fullPage = false,
  onChange,
}: {
  rows: RecommendationCategoryDTO[];
  canEditGlobal: boolean;
  fullPage?: boolean;
  onChange: (rows: RecommendationCategoryDTO[]) => void;
}) {
  const [draft, setDraft] = useState<RecommendationCategoryDTO>({
    code: '',
    label: '',
    sortOrder: rows.length,
    isActive: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const reload = async () => onChange(await fetchRecommendationCategories());

  const persist = async (row: RecommendationCategoryDTO, announce = false) => {
    setSaving(true);
    setError('');
    try {
      await saveRecommendationCategory(row);
      await reload();
      setDraft({ code: '', label: '', sortOrder: 0, isActive: true });
      if (announce) setSaved(row.id != null ? 'The recommendation category was updated.' : 'The recommendation category was added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id="recommendation-categories"
        title="Recommendation categories"
        hint="Card kinds for the morning list. A new kind is a row here. The card status list stays fixed."
        count={rows.length}
        href="/admin/access-catalogs/recommendation-categories"
        manageLabel="Manage recommendation categories"
        tone="violet"
        icon={
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        }
      />
    );
  }

  return (
    <section id="recommendation-categories" className="scroll-mt-44 overflow-hidden rounded-xl border-2 border-violet-800 bg-violet-200 text-violet-950 shadow-lg">
      <div className="flex items-center gap-3 bg-violet-800 px-6 py-4 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-violet-900 text-white">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Recommendation categories</h2>
      </div>
      <div className="p-6">
      <p className="mb-4 rounded-lg border-2 border-violet-800 bg-violet-200 px-4 py-3 text-base text-violet-950">
        Card kinds for the morning list. A new kind is a row here. The card status list stays fixed.
      </p>
      <CatalogTable
        rows={rows}
        itemLabel="recommendation categories"
        searchText={(row) => `${row.code} ${row.label} ${row.isActive === false ? 'inactive' : 'active'}`}
      >
        {(pageRows) => (
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="text-left font-semibold">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.isActive === false ? 'No' : 'Yes'}</td>
                <td className="py-2 text-right">
                  {canEditGlobal ? (
                    <CatalogActions
                      onEdit={() => setDraft(row)}
                      onDeactivate={() => persist({ ...row, isActive: false })}
                      onRemove={async () => {
                        setSaving(true);
                        setError('');
                        try {
                          await deleteRecommendationCategory(row);
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Remove failed');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-medium">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </CatalogTable>
      {canEditGlobal && (
        <form
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            persist(draft, true);
          }}
        >
          <label className="block text-base font-medium">
            Code
            <input className={inputClass} value={draft.code} disabled={draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
          </label>
          <label className="block text-base font-medium">
            Label
            <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
          </label>
          <div className="md:col-span-2">
            <SaveButton saving={saving} editing={draft.id != null} addLabel="Add category" updateLabel="Update category" tone="violet" />
          </div>
        </form>
      )}
      </div>
      <SavedNotice message={saved} onClose={() => setSaved(null)} />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

function SiteTypeSection({
  rows,
  canEditGlobal,
  fullPage = false,
  onChange,
}: {
  rows: SiteTypeCatalogDTO[];
  canEditGlobal: boolean;
  fullPage?: boolean;
  onChange: (rows: SiteTypeCatalogDTO[]) => void;
}) {
  const tenantId = useAdminTenantId();
  const [draft, setDraft] = useState<SiteTypeCatalogDTO>({
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
  const [saved, setSaved] = useState<string | null>(null);
  const locked = draft.code === 'EVENT_ORG' || draft.code === 'RETAIL';

  const reload = async () => onChange(await fetchSiteTypes(tenantId));
  const persist = async (row: SiteTypeCatalogDTO, asShared: boolean, announce = false) => {
    setSaving(true);
    setError('');
    try {
      await saveSiteType(row, asShared, tenantId);
      await reload();
      setDraft({ code: '', label: '', hint: '', moduleKey: 'EVENT', sortOrder: 0, isActive: true });
      setShared(false);
      if (announce) setSaved(row.id != null ? 'The site type was updated.' : 'The site type was added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id="site-types"
        title="Site types"
        hint="The organization site type. A shop is RETAIL. The pack, such as gas station, is a retailer type under that site type."
        count={rows.length}
        href="/admin/access-catalogs/site-types"
        manageLabel="Manage site types"
        tone="sky"
        icon={
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        }
      />
    );
  }

  return (
    <section id="site-types" className="scroll-mt-44 overflow-hidden rounded-xl border-2 border-sky-700 bg-sky-200 text-sky-950 shadow-lg">
      <div className="flex items-center gap-3 bg-sky-700 px-6 py-4 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-sky-800 text-white">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Site types</h2>
      </div>
      <div className="p-6">
      <p className="mb-4 rounded-lg border-2 border-sky-700 bg-sky-200 px-4 py-3 text-base text-sky-950">
        The organization site type. A shop is RETAIL. The pack, such as gas station, is a retailer type under that site type.
      </p>
      <CatalogTable
        rows={rows}
        itemLabel="site types"
        searchText={(row) => `${row.code} ${row.label} ${row.moduleKey || ''} ${row.hint || ''} ${row.tenantId ? 'this tenant' : 'shared'}`}
      >
        {(pageRows) => (
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="text-left font-semibold">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Module</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.moduleKey || 'EVENT'}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 text-right">
                  {editable(row, canEditGlobal) ? (
                    <CatalogActions
                      onEdit={() => { setDraft(row); setShared(!row.tenantId); }}
                      onDeactivate={() => persist({ ...row, isActive: false }, !row.tenantId)}
                      onRemove={async () => {
                        setSaving(true);
                        setError('');
                        try {
                          await deleteSiteType(row);
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Remove failed');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-medium">Shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </CatalogTable>
      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          persist(draft, shared, true);
        }}
      >
        <label className="block text-base font-medium">
          Code
          <input className={inputClass} value={draft.code} disabled={locked || draft.id != null} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Label
          <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
        </label>
        <label className="block text-base font-medium">
          Hint
          <input className={inputClass} value={draft.hint || ''} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
        </label>
        <label className="block text-base font-medium">
          Module
          <input className={inputClass} value={draft.moduleKey || 'EVENT'} onChange={(e) => setDraft({ ...draft, moduleKey: e.target.value })} />
        </label>
        <CatalogCheck checked={shared} disabled={!canEditGlobal || draft.id != null} onChange={setShared} label="Shared with every tenant" />
        <div>
          <SaveButton saving={saving} editing={draft.id != null} addLabel="Add site type" updateLabel="Update site type" tone="sky" />
        </div>
      </form>
      </div>
      <SavedNotice message={saved} onClose={() => setSaved(null)} />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

export type AccessCatalogSection =
  | 'access-roles'
  | 'site-types'
  | 'retailer-types'
  | 'retailer-size-bands'
  | 'recommendation-categories';

export default function AccessCatalogsClient({
  initialRoles,
  initialRetailers,
  initialSiteTypes,
  initialSizeBands,
  initialCategories,
  canEditGlobal,
  only,
}: {
  initialRoles: AccessRoleDTO[];
  initialRetailers: RetailerTypeDTO[];
  initialSiteTypes: SiteTypeCatalogDTO[];
  initialSizeBands: RetailerSizeBandDTO[];
  initialCategories: RecommendationCategoryDTO[];
  canEditGlobal: boolean;
  only?: AccessCatalogSection;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [retailers, setRetailers] = useState(initialRetailers);
  const [siteTypes, setSiteTypes] = useState(initialSiteTypes);
  const [sizeBands, setSizeBands] = useState(initialSizeBands);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  return (
    <div className="space-y-8">
      {(!only || only === 'access-roles') && (
        <AccessRoleSection rows={roles} canEditGlobal={canEditGlobal} fullPage={only === 'access-roles'} onChange={setRoles} />
      )}
      {(!only || only === 'site-types') && (
        <SiteTypeSection rows={siteTypes} canEditGlobal={canEditGlobal} fullPage={only === 'site-types'} onChange={setSiteTypes} />
      )}
      {(!only || only === 'retailer-types') && (
        <RetailerSection rows={retailers} siteTypes={siteTypes} canEditGlobal={canEditGlobal} fullPage={only === 'retailer-types'} onChange={setRetailers} />
      )}
      {(!only || only === 'retailer-size-bands') && (
        <SizeBandSection rows={sizeBands} retailers={retailers} canEditGlobal={canEditGlobal} fullPage={only === 'retailer-size-bands'} onChange={setSizeBands} />
      )}
      {(!only || only === 'recommendation-categories') && (
        <CategorySection rows={categories} canEditGlobal={canEditGlobal} fullPage={only === 'recommendation-categories'} onChange={setCategories} />
      )}
    </div>
  );
}
