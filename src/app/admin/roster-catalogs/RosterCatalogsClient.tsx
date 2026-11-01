'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ErrorDialog from '@/components/ErrorDialog';
import SuccessDialog from '@/components/SuccessDialog';
import AdminTenantFilterField from '../AdminTenantFilterField';
import { useAdminTenantId } from '../AdminTenantContext';
import { CatalogCheck, CatalogHubCard, catalogTone, type CatalogTone } from '../catalogChrome';
import { CatalogTable } from '../CatalogTable';
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
  only?: RosterCatalogResource;
}

const SECTIONS: {
  resource: RosterCatalogResource;
  title: string;
  hint: string;
  tone: CatalogTone;
  href: string;
  manageLabel: string;
  addLabel: string;
  updateLabel: string;
  itemLabel: string;
}[] = [
  {
    resource: 'sports-categories',
    title: 'Sports',
    hint: 'Olympic sports and other widely played sports, including pickleball, padel, cricket, and kabaddi. Shown as checkboxes on a squad member. A shared sport is available to every tenant.',
    tone: 'cyan',
    href: '/admin/roster-catalogs/sports-categories',
    manageLabel: 'Manage sports categories',
    addLabel: 'Add sport',
    updateLabel: 'Update sport',
    itemLabel: 'sports',
  },
  {
    resource: 'achievement-categories',
    title: 'Achievement categories',
    hint: 'Award, honor, trophy, and any category you add for a squad member.',
    tone: 'rose',
    href: '/admin/roster-catalogs/achievement-categories',
    manageLabel: 'Manage achievement categories',
    addLabel: 'Add category',
    updateLabel: 'Update category',
    itemLabel: 'achievement categories',
  },
  {
    resource: 'team-types',
    title: 'Team types',
    hint: 'Used by squad groups. Sports and music stay available to every tenant.',
    tone: 'lime',
    href: '/admin/roster-catalogs/team-types',
    manageLabel: 'Manage team types',
    addLabel: 'Add team type',
    updateLabel: 'Update team type',
    itemLabel: 'team types',
  },
];

const saveTones: Record<CatalogTone, { button: string; iconBox: string; icon: string; label: string }> = {
  indigo: { button: 'bg-indigo-100 hover:bg-indigo-200', iconBox: 'bg-indigo-200', icon: 'text-indigo-600', label: 'text-indigo-700' },
  sky: { button: 'bg-sky-100 hover:bg-sky-200', iconBox: 'bg-sky-200', icon: 'text-sky-600', label: 'text-sky-700' },
  emerald: { button: 'bg-emerald-100 hover:bg-emerald-200', iconBox: 'bg-emerald-200', icon: 'text-emerald-600', label: 'text-emerald-700' },
  amber: { button: 'bg-amber-100 hover:bg-amber-200', iconBox: 'bg-amber-200', icon: 'text-amber-700', label: 'text-amber-800' },
  violet: { button: 'bg-violet-100 hover:bg-violet-200', iconBox: 'bg-violet-200', icon: 'text-violet-600', label: 'text-violet-700' },
  cyan: { button: 'bg-cyan-100 hover:bg-cyan-200', iconBox: 'bg-cyan-200', icon: 'text-cyan-700', label: 'text-cyan-800' },
  rose: { button: 'bg-rose-100 hover:bg-rose-200', iconBox: 'bg-rose-200', icon: 'text-rose-600', label: 'text-rose-700' },
  lime: { button: 'bg-lime-100 hover:bg-lime-200', iconBox: 'bg-lime-200', icon: 'text-lime-700', label: 'text-lime-800' },
};

function blankRow(): RosterCatalogDTO {
  return { code: '', label: '', sortOrder: 0, isActive: true };
}

function sectionIcon(resource: RosterCatalogResource) {
  if (resource === 'sports-categories') {
    return (
      <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21m0-18C9.5 5.4 8.2 8.5 8.2 12S9.5 18.6 12 21M3.6 9h16.8M3.6 15h16.8" />
      </svg>
    );
  }
  if (resource === 'achievement-categories') {
    return (
      <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3" />
      </svg>
    );
  }
  return (
    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
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
  const buttonClass = 'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110';
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className={`${buttonClass} bg-blue-100 hover:bg-blue-200`} title="Edit" aria-label="Edit" onClick={onEdit}>
        <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button type="button" className={`${buttonClass} bg-amber-100 hover:bg-amber-200`} title="Deactivate" aria-label="Deactivate" onClick={onDeactivate}>
        <svg className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <button type="button" className={`${buttonClass} bg-red-100 hover:bg-red-200`} title="Remove" aria-label="Remove" onClick={onRemove}>
        <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

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
  tone: CatalogTone;
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

function CatalogSection({
  resource,
  title,
  hint,
  tone,
  href,
  manageLabel,
  addLabel,
  updateLabel,
  itemLabel,
  rows,
  tenantId,
  canEditGlobal,
  fullPage,
  onChange,
}: {
  resource: RosterCatalogResource;
  title: string;
  hint: string;
  tone: CatalogTone;
  href: string;
  manageLabel: string;
  addLabel: string;
  updateLabel: string;
  itemLabel: string;
  rows: RosterCatalogDTO[];
  tenantId?: string;
  canEditGlobal: boolean;
  fullPage: boolean;
  onChange: (rows: RosterCatalogDTO[]) => void;
}) {
  const [draft, setDraft] = useState<RosterCatalogDTO>(blankRow());
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const colors = catalogTone(tone);
  const icon: ReactNode = sectionIcon(resource);

  const editable = (row: RosterCatalogDTO) => (row.tenantId ? true : canEditGlobal);

  const startEdit = (row: RosterCatalogDTO) => {
    if (!editable(row)) return;
    setDraft(row);
    setShared(!row.tenantId);
    setError('');
  };

  const persist = async (row: RosterCatalogDTO, asShared: boolean, announce = false) => {
    setSaving(true);
    setError('');
    try {
      await saveRosterCatalog(resource, row, asShared, tenantId);
      onChange(await fetchRosterCatalog(resource, tenantId));
      setDraft(blankRow());
      setShared(false);
      if (announce) setSaved(row.id != null ? `${title} was updated.` : `${title} was added.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fullPage) {
    return (
      <CatalogHubCard
        id={resource}
        title={title}
        hint={hint}
        count={rows.length}
        href={href}
        manageLabel={manageLabel}
        tone={tone}
        icon={icon}
      />
    );
  }

  return (
    <section id={resource} className={colors.shell}>
      <div className={colors.header}>
        <div className={colors.iconBox}>{icon}</div>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <div className="p-6">
        <p className={colors.intro}>{hint}</p>
        <CatalogTable
          rows={rows}
          itemLabel={itemLabel}
          searchText={(row) =>
            `${row.code} ${row.label} ${row.tenantId ? 'this tenant' : 'shared'} ${row.isActive === false ? 'inactive' : 'active'}`
          }
        >
          {(pageRows) => (
        <div className="overflow-x-auto">
          <table className="min-w-full text-base">
            <thead>
              <tr className="text-left font-semibold">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Label</th>
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Scope</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((row) => (
                <tr key={row.id ?? row.code}>
                  <td className="py-2 pr-4 font-mono text-sm">{row.code}</td>
                  <td className="py-2 pr-4">{row.label}</td>
                  <td className="py-2 pr-4">{row.sortOrder ?? 0}</td>
                  <td className="py-2 pr-4">{row.tenantId ? 'This tenant' : 'Shared'}</td>
                  <td className="py-2 pr-4">{row.isActive === false ? 'No' : 'Yes'}</td>
                  <td className="py-2 text-right">
                    {editable(row) ? (
                      <CatalogActions
                        onEdit={() => startEdit(row)}
                        onDeactivate={() => persist({ ...row, isActive: false }, !row.tenantId)}
                        onRemove={async () => {
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
                      />
                    ) : (
                      <span className="font-medium">Shared</span>
                    )}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-base font-medium">
                    No rows on this page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          )}
        </CatalogTable>

        <form
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.code.trim() || !draft.label.trim()) {
              setError('Code and label are required');
              return;
            }
            void persist(draft, shared && canEditGlobal, true);
          }}
        >
          <div>
            <label className="block text-base font-medium">Code</label>
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-400 px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-base font-medium">Label</label>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-400 px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-base font-medium">Sort order</label>
            <input
              type="number"
              value={draft.sortOrder ?? 0}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
              className="mt-1 w-full rounded-xl border border-gray-400 px-4 py-3"
            />
          </div>
          <div className="flex items-end gap-4">
            <CatalogCheck
              checked={draft.isActive !== false}
              onChange={(checked) => setDraft({ ...draft, isActive: checked })}
              label="Active"
            />
            {canEditGlobal && (
              <CatalogCheck
                checked={shared}
                disabled={draft.id != null}
                onChange={setShared}
                label="Shared with every tenant"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <SaveButton saving={saving} editing={draft.id != null} addLabel={addLabel} updateLabel={updateLabel} tone={tone} />
            {draft.id != null && (
              <button
                type="button"
                title="Cancel edit"
                aria-label="Cancel edit"
                className="flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl bg-gray-100 px-6 transition-all duration-300 hover:scale-105 hover:bg-gray-200"
                onClick={() => {
                  setDraft(blankRow());
                  setShared(false);
                }}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200">
                  <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-700">Cancel edit</span>
              </button>
            )}
          </div>
        </form>
      </div>
      <SuccessDialog isOpen={saved != null} onClose={() => setSaved(null)} title="Saved" message={saved || ''} buttonText="OK" />
      <ErrorDialog isOpen={error.length > 0} onClose={() => setError('')} title="Could not save" message={error} />
    </section>
  );
}

export default function RosterCatalogsClient({
  initialSports,
  initialAchievements,
  initialTeamTypes,
  canEditGlobal,
  only,
}: RosterCatalogsClientProps) {
  const tenantId = useAdminTenantId();
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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

  const visible = SECTIONS.filter((section) => !only || section.resource === only);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-l-4 border-sky-700 bg-sky-200 p-6 text-sky-950 shadow-lg">
        <AdminTenantFilterField />
        <p className="mt-3 text-base font-medium">
          Shared rows apply to every organization. A row saved for the selected tenant is visible only there.
        </p>
      </div>
      {visible.map((section) => (
        <CatalogSection
          key={section.resource}
          {...section}
          rows={rowsFor(section.resource)}
          tenantId={tenantId}
          canEditGlobal={canEditGlobal}
          fullPage={Boolean(only)}
          onChange={(rows) => setRows(section.resource, rows)}
        />
      ))}
    </div>
  );
}
