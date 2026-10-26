'use client';

import { useEffect, useState } from 'react';
import AdminTenantFilterField from '../AdminTenantFilterField';
import { useAdminTenantId } from '../AdminTenantContext';
import {
  deleteRosterCatalog,
  fetchRosterCatalog,
  saveRosterCatalog,
} from './ApiServerActions';
import type { RosterCatalogDTO, RosterCatalogResource } from '@/types/rosterCatalog';

interface RosterCatalogsClientProps {
  initialSports: RosterCatalogDTO[];
  initialAchievements: RosterCatalogDTO[];
  initialTeamTypes: RosterCatalogDTO[];
  canEditGlobal: boolean;
}

const SECTIONS: { resource: RosterCatalogResource; title: string; hint: string }[] = [
  {
    resource: 'sports-categories',
    title: 'Sports',
    hint: 'Shown as checkboxes on a squad member. A shared sport is available to every tenant.',
  },
  {
    resource: 'achievement-categories',
    title: 'Achievement categories',
    hint: 'Award, honor, trophy, and any category you add for a squad member.',
  },
  {
    resource: 'team-types',
    title: 'Team types',
    hint: 'Used by squad groups. Sports and music stay available to every tenant.',
  },
];

function blankRow(): RosterCatalogDTO {
  return { code: '', label: '', sortOrder: 0, isActive: true };
}

function CatalogSection({
  resource,
  title,
  hint,
  rows,
  tenantId,
  canEditGlobal,
  onChange,
}: {
  resource: RosterCatalogResource;
  title: string;
  hint: string;
  rows: RosterCatalogDTO[];
  tenantId?: string;
  canEditGlobal: boolean;
  onChange: (rows: RosterCatalogDTO[]) => void;
}) {
  const [draft, setDraft] = useState<RosterCatalogDTO>(blankRow());
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const editable = (row: RosterCatalogDTO) => (row.tenantId ? true : canEditGlobal);

  const startEdit = (row: RosterCatalogDTO) => {
    if (!editable(row)) return;
    setDraft(row);
    setShared(!row.tenantId);
    setError('');
  };

  const persist = async (row: RosterCatalogDTO, asShared: boolean) => {
    setSaving(true);
    setError('');
    try {
      await saveRosterCatalog(resource, row, asShared, tenantId);
      onChange(await fetchRosterCatalog(resource, tenantId));
      setDraft(blankRow());
      setShared(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-gray-600">{hint}</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id ?? row.code}>
                <td className="py-2 pr-4 font-mono text-xs">{row.code}</td>
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.sortOrder ?? 0}</td>
                <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                <td className="py-2 pr-4">{row.isActive === false ? 'No' : 'Yes'}</td>
                <td className="py-2 text-right space-x-3">
                  {editable(row) ? (
                    <>
                      <button type="button" className="text-blue-700" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-amber-700"
                        onClick={() => persist({ ...row, isActive: false }, !row.tenantId)}
                      >
                        Deactivate
                      </button>
                      <button
                        type="button"
                        className="text-red-700"
                        onClick={async () => {
                          setSaving(true);
                          setError('');
                          try {
                            await deleteRosterCatalog(resource, row);
                            onChange(await fetchRosterCatalog(resource, tenantId));
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  No rows for this tenant yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.code.trim() || !draft.label.trim()) {
            setError('Code and label are required');
            return;
          }
          void persist(draft, shared && canEditGlobal);
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Code</label>
          <input
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Label</label>
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sort order</label>
          <input
            type="number"
            value={draft.sortOrder ?? 0}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.isActive !== false}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active
          </label>
          {canEditGlobal && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={shared}
                disabled={draft.id != null}
                onChange={(e) => setShared(e.target.checked)}
              />
              Shared with every tenant
            </label>
          )}
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 font-semibold disabled:opacity-50"
          >
            {draft.id != null ? 'Save changes' : 'Add row'}
          </button>
          {draft.id != null && (
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700"
              onClick={() => {
                setDraft(blankRow());
                setShared(false);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default function RosterCatalogsClient({
  initialSports,
  initialAchievements,
  initialTeamTypes,
  canEditGlobal,
}: RosterCatalogsClientProps) {
  const tenantId = useAdminTenantId();
  const [sports, setSports] = useState(initialSports);
  const [achievements, setAchievements] = useState(initialAchievements);
  const [teamTypes, setTeamTypes] = useState(initialTeamTypes);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRosterCatalog('sports-categories', tenantId),
      fetchRosterCatalog('achievement-categories', tenantId),
      fetchRosterCatalog('team-types', tenantId),
    ])
      .then(([nextSports, nextAchievements, nextTypes]) => {
        if (cancelled) return;
        setSports(nextSports);
        setAchievements(nextAchievements);
        setTeamTypes(nextTypes);
      })
      .catch((e) => console.error('[RosterCatalogs] reload failed', e));
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const rowsFor = (resource: RosterCatalogResource) => {
    if (resource === 'sports-categories') return sports;
    if (resource === 'achievement-categories') return achievements;
    return teamTypes;
  };

  const setRows = (resource: RosterCatalogResource, rows: RosterCatalogDTO[]) => {
    if (resource === 'sports-categories') setSports(rows);
    else if (resource === 'achievement-categories') setAchievements(rows);
    else setTeamTypes(rows);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <AdminTenantFilterField />
        <p className="mt-3 text-sm text-gray-600">
          Shared rows apply to every organization. A row saved for the selected tenant is visible only there.
        </p>
      </div>
      {SECTIONS.map((section) => (
        <CatalogSection
          key={section.resource}
          {...section}
          rows={rowsFor(section.resource)}
          tenantId={tenantId}
          canEditGlobal={canEditGlobal}
          onChange={(rows) => setRows(section.resource, rows)}
        />
      ))}
    </div>
  );
}
