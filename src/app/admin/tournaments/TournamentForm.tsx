'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TenantTournamentDTO, TenantTournamentStatus } from '@/types';
import { saveTenantTournamentServer } from './ApiServerActions';
import { uploadTournamentImage, type TournamentImageKind } from './uploadTournamentImage';
import SaveStatusDialog, { type SaveStatus } from '@/components/SaveStatusDialog';

function readableSaveError(raw: string): string {
  const text = raw.trim();
  if (!text) return 'Save failed. Please try again.';
  try {
    const parsed = JSON.parse(text) as { title?: string; detail?: string; message?: string; error?: string };
    const detail = parsed.detail || parsed.message || parsed.error || parsed.title || '';
    if (detail.includes('ux_tenant_tournament__one_header')) {
      return 'Another tournament is already shown in the header. Save again so this one replaces it.';
    }
    if (detail && detail.length <= 280) return detail;
    if (parsed.title) return parsed.title;
  } catch {
    if (text.length <= 280) return text;
  }
  return 'Save failed. Please try again.';
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STATUSES: TenantTournamentStatus[] = ['UPCOMING', 'IN_PROGRESS', 'COMPLETED'];

export default function TournamentForm({
  initial,
  tenantId,
  listHref,
}: {
  initial?: TenantTournamentDTO | null;
  tenantId?: string;
  listHref: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TenantTournamentDTO>({
    title: initial?.title || '',
    shortLabel: initial?.shortLabel || '',
    editionYear: initial?.editionYear ?? undefined,
    slug: initial?.slug || '',
    status: initial?.status || 'UPCOMING',
    showInHeader: initial?.showInHeader ?? false,
    isPublished: initial?.isPublished ?? false,
    startDate: initial?.startDate || '',
    endDate: initial?.endDate || '',
    welcomeText: initial?.welcomeText || '',
    aboutText: initial?.aboutText || '',
    detailsText: initial?.detailsText || '',
    ageGroupLabel: initial?.ageGroupLabel || '',
    chiefGuestName: initial?.chiefGuestName || '',
    chiefGuestImageUrl: initial?.chiefGuestImageUrl || '',
    heroImageUrl: initial?.heroImageUrl || '',
    fixturesImageUrl: initial?.fixturesImageUrl || '',
    registrationEmail: initial?.registrationEmail || '',
    externalResultsUrl: initial?.externalResultsUrl || '',
    externalResultsLabel: initial?.externalResultsLabel || '',
    legacyPageUrl: initial?.legacyPageUrl || '',
    winnerName: initial?.winnerName || '',
    runnerUpName: initial?.runnerUpName || '',
    thirdPlaceName: initial?.thirdPlaceName || '',
    id: initial?.id,
    tenantId: initial?.tenantId || tenantId,
    createdAt: initial?.createdAt,
  });
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const set = (name: keyof TenantTournamentDTO, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fail = (message: string) => {
      setSaveStatus('error');
      setSaveMessage(message);
    };
    if (!form.shortLabel.trim()) {
      fail('Short label is required');
      return;
    }
    if (form.shortLabel.trim().length > 40) {
      fail('Short label must be 40 characters or fewer');
      return;
    }
    if (!form.title.trim()) {
      fail('Title is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      fail('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }
    setSaving(true);
    setError('');
    setSaveStatus('saving');
    setSaveMessage('Please wait while the tournament is saved.');
    const result = await saveTenantTournamentServer(
      {
        ...form,
        title: form.title.trim(),
        shortLabel: form.shortLabel.trim(),
        slug: form.slug.trim(),
        editionYear: form.editionYear ? Number(form.editionYear) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      },
      tenantId
    );
    setSaving(false);
    if (!result.ok) {
      fail(readableSaveError(result.error));
      return;
    }
    setSaveStatus('success');
    setSaveMessage('Tournament saved. Returning to the list.');
    setTimeout(() => {
      router.push(listHref);
      router.refresh();
    }, 1500);
  }

  async function onImageSelected(
    name: 'chiefGuestImageUrl' | 'heroImageUrl' | 'fixturesImageUrl',
    kind: TournamentImageKind,
    file: File | undefined
  ) {
    if (!file) return;
    const scope = form.tenantId || tenantId;
    if (!scope) {
      setError('Select a tenant before uploading an image');
      return;
    }
    setUploadingField(name);
    setError('');
    try {
      const url = await uploadTournamentImage(file, scope, kind);
      const next = { ...form, [name]: url };
      setForm(next);
      if (next.id) {
        const result = await saveTenantTournamentServer(next, scope);
        if (!result.ok) {
          setError(result.error);
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed');
    } finally {
      setUploadingField(null);
    }
  }

  const imageField = (
    name: 'chiefGuestImageUrl' | 'heroImageUrl' | 'fixturesImageUrl',
    kind: TournamentImageKind,
    label: string
  ) => {
    const url = String(form[name] ?? '');
    const busy = uploadingField === name;
    return (
      <div className="block md:col-span-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-xs text-gray-500 mt-1">
          {form.id
            ? 'Upload stores the image and saves its URL on this tournament.'
            : 'Upload an image, then save the tournament to keep the URL.'}
        </p>
        {url.startsWith('http') && (
          <img src={url} alt="" className="mt-2 max-h-40 w-auto rounded-lg border border-gray-200 object-contain bg-gray-50" />
        )}
        <input
          type="text"
          readOnly
          value={url}
          placeholder="No image uploaded yet"
          className="mt-2 block w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-800"
          aria-label={`${label} URL`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="h-11 px-4 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold inline-flex items-center cursor-pointer">
            {busy ? 'Uploading...' : 'Upload image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void onImageSelected(name, kind, file);
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              className="h-11 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
              onClick={() => {
                const next = { ...form, [name]: '' };
                setForm(next);
                const scope = form.tenantId || tenantId;
                if (next.id && scope) {
                  void saveTenantTournamentServer(next, scope).then((result) => {
                    if (!result.ok) setError(result.error);
                  });
                }
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  const field = (name: keyof TenantTournamentDTO, label: string, opts?: { textarea?: boolean; type?: string }) => (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {opts?.textarea ? (
        <textarea
          value={String(form[name] ?? '')}
          onChange={(e) => set(name, e.target.value)}
          rows={4}
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base"
        />
      ) : (
        <input
          type={opts?.type || 'text'}
          value={String(form[name] ?? '')}
          onChange={(e) => set(name, opts?.type === 'number' ? Number(e.target.value) : e.target.value)}
          onBlur={
            name === 'shortLabel' || name === 'title'
              ? () => {
                  if (!form.slug) set('slug', slugify(String(form.shortLabel || form.title)));
                }
              : undefined
          }
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base"
        />
      )}
    </label>
  );

  return (
    <>
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('shortLabel', 'Short label (menu item, unique)')}
        {field('title', 'Page title')}
        {field('editionYear', 'Year (optional)', { type: 'number' })}
        {field('slug', 'Slug')}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {field('startDate', 'Start date', { type: 'date' })}
        {field('endDate', 'End date', { type: 'date' })}
      </div>
      <div className="flex flex-col gap-4">
        <label htmlFor="tournament-published" className="flex items-center gap-3 cursor-pointer">
          <span className="relative flex items-center justify-center">
            <input
              id="tournament-published"
              type="checkbox"
              className="custom-checkbox custom-checkbox--yellow"
              checked={!!form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="custom-checkbox-tick">
              {form.isPublished && (
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                </svg>
              )}
            </span>
          </span>
          <span className="text-sm font-medium text-gray-700 select-none">Published</span>
        </label>
        <label htmlFor="tournament-show-in-header" className="flex items-start gap-3 cursor-pointer">
          <span className="relative flex items-center justify-center mt-0.5">
            <input
              id="tournament-show-in-header"
              type="checkbox"
              className="custom-checkbox custom-checkbox--yellow"
              checked={!!form.showInHeader}
              onChange={(e) => set('showInHeader', e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="custom-checkbox-tick">
              {form.showInHeader && (
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                </svg>
              )}
            </span>
          </span>
          <span className="text-sm font-medium text-gray-700 select-none">
            Show this tournament in the header. The short label is the menu item. Saving with this checked turns it off for every other tournament of this tenant.
          </span>
        </label>
      </div>
      {field('welcomeText', 'Welcome text', { textarea: true })}
      {field('aboutText', 'About text', { textarea: true })}
      {field('detailsText', 'Details text', { textarea: true })}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('ageGroupLabel', 'Age group label')}
        {field('chiefGuestName', 'Chief guest name')}
        {imageField('chiefGuestImageUrl', 'chief-guest', 'Chief guest image')}
        {imageField('heroImageUrl', 'hero', 'Hero image')}
        {imageField('fixturesImageUrl', 'fixtures', 'Fixtures image')}
        {field('registrationEmail', 'Registration email')}
        {field('externalResultsUrl', 'External results URL (Tournify)')}
        {field('externalResultsLabel', 'External results link label')}
        {field('legacyPageUrl', 'Legacy page URL')}
        {field('winnerName', 'Winner')}
        {field('runnerUpName', 'Runner-up')}
        {field('thirdPlaceName', 'Third place')}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save tournament'}
        </button>
        <a href={listHref} className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 px-6 font-semibold text-gray-700 inline-flex items-center">
          Cancel
        </a>
      </div>
    </form>
    <SaveStatusDialog
      isOpen={saveStatus !== 'idle'}
      status={saveStatus}
      title={saveStatus === 'success' ? 'Saved Successfully!' : saveStatus === 'error' ? 'Save Failed' : 'Saving...'}
      message={saveMessage}
      onClose={() => {
        if (saveStatus === 'error') {
          setSaveStatus('idle');
          setSaveMessage('');
        }
      }}
    />
    </>
  );
}
