'use client';

import { useEffect, useState } from 'react';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { RosterCatalogDTO } from '@/types/rosterCatalog';
import { createTeamGroup, updateTeamGroup } from './ApiServerActions';
import { fetchRosterCatalog } from '../roster-catalogs/ApiServerActions';
import { useAdminTenantId } from '../AdminTenantContext';

interface TeamGroupFormProps {
  group?: TeamGroupDTO | null;
  onSuccess: (group: TeamGroupDTO) => void;
  onCancel: () => void;
}

export default function TeamGroupForm({ group, onSuccess, onCancel }: TeamGroupFormProps) {
  const tenantId = useAdminTenantId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teamTypes, setTeamTypes] = useState<RosterCatalogDTO[]>([]);
  const [form, setForm] = useState({
    teamType: (group?.teamType as string) || 'SPORTS',
    name: group?.name || '',
    categoryLabel: group?.categoryLabel || '',
    slug: group?.slug || '',
    sectionLabel: group?.sectionLabel || 'SQUAD',
    headline: group?.headline || '',
    description: group?.description || '',
    ctaLabel: group?.ctaLabel || 'View all players',
    ctaHref: group?.ctaHref || '',
    displayOrder: group?.displayOrder ?? 0,
    isActive: group?.isActive ?? true,
  });

  useEffect(() => {
    let cancelled = false;
    fetchRosterCatalog('team-types', tenantId)
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((row) => row.isActive !== false && row.code);
        if (form.teamType && !active.some((row) => row.code === form.teamType)) {
          active.unshift({ code: form.teamType, label: form.teamType, isActive: false });
        }
        setTeamTypes(active);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load team types');
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, form.teamType]);

  const set = (key: keyof typeof form, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        categoryLabel: form.categoryLabel.trim() || undefined,
        slug: form.slug.trim() || undefined,
        sectionLabel: form.sectionLabel.trim() || undefined,
        headline: form.headline.trim() || undefined,
        description: form.description.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaHref: form.ctaHref.trim() || undefined,
      };
      const result = group?.id
        ? await updateTeamGroup(group.id, payload, tenantId)
        : await createTeamGroup(payload as Omit<TeamGroupDTO, 'id'>, tenantId);
      if (!result) throw new Error('Save failed');
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Team type *</label>
          <select
            value={form.teamType}
            onChange={(e) => set('teamType', e.target.value)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          >
            {teamTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Display order</label>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) => set('displayOrder', Number(e.target.value) || 0)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category label</label>
          <input
            value={form.categoryLabel}
            onChange={(e) => set('categoryLabel', e.target.value)}
            placeholder="Kids, Over 40, Over 50"
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">URL slug</label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="first-team"
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Section label</label>
          <input
            value={form.sectionLabel}
            onChange={(e) => set('sectionLabel', e.target.value)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Headline</label>
          <input
            value={form.headline}
            onChange={(e) => set('headline', e.target.value)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CTA label</label>
          <input
            value={form.ctaLabel}
            onChange={(e) => set('ctaLabel', e.target.value)}
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CTA href</label>
          <input
            value={form.ctaHref}
            onChange={(e) => set('ctaHref', e.target.value)}
            placeholder="/team/first-team"
            className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
        />
        <span className="text-sm text-gray-700">Active on site</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-shrink-0 h-14 rounded-xl bg-violet-100 hover:bg-violet-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-semibold text-violet-700">
            {saving ? 'Saving…' : group?.id ? 'Update group' : 'Create group'}
          </span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="font-semibold text-blue-700">Cancel</span>
        </button>
      </div>
    </form>
  );
}
