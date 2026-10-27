'use client';

import React, { useEffect, useState } from 'react';
import { useAdminTenantId } from '../AdminTenantContext';
import { fetchNewsAdVisibility, saveNewsAdVisibility } from './ApiServerActions';
import AdminBackButton from '@/components/admin/AdminBackButton';
import {
  MD_STRIKERS_NEWS_AD_SLOTS,
  MD_STRIKERS_TENANT_ID,
  type NewsAdVisibility,
} from './newsAdSlots';

function Switch({
  on,
  onToggle,
  onLabel,
  offLabel,
  disabled,
  compact = false,
}: {
  on: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? 'justify-start gap-3' : 'justify-center gap-4'}`}>
      {!compact && (
        <span className={`text-lg font-semibold transition-colors duration-300 ${!on ? 'text-purple-600' : 'text-purple-300'}`}>
          {offLabel}
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
          on ? 'bg-blue-500 focus:ring-blue-500' : 'bg-purple-500 focus:ring-purple-500'
        }`}
        title={on ? `Switch to ${offLabel}` : `Switch to ${onLabel}`}
        aria-label={on ? `Switch to ${offLabel}` : `Switch to ${onLabel}`}
        aria-checked={on}
      >
        <span
          className={`inline-flex items-center justify-center h-8 w-8 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
            on ? 'translate-x-7' : 'translate-x-1'
          }`}
        >
          {on ? (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
      </button>
      {!compact && (
        <span className={`text-lg font-semibold transition-colors duration-300 ${on ? 'text-blue-600' : 'text-blue-300'}`}>
          {onLabel}
        </span>
      )}
    </div>
  );
}

export default function NewsAdvertisementsClient() {
  const tenantId = useAdminTenantId();
  const isMdStrikers = tenantId === MD_STRIKERS_TENANT_ID;
  const [settings, setSettings] = useState<NewsAdVisibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isMdStrikers) {
      setSettings(null);
      setStatus(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNewsAdVisibility(tenantId).then((result) => {
      if (cancelled) return;
      setSettings(result.settings);
      setStatus(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isMdStrikers, tenantId]);

  async function persist(next: NewsAdVisibility) {
    setSettings(next);
    setSaving(true);
    setStatus(null);
    const result = await saveNewsAdVisibility(tenantId, next);
    setSaving(false);
    if (result.error || !result.settings) {
      setStatus(result.error || 'Could not save news advertisement switches.');
      return;
    }
    setSettings(result.settings);
    setStatus('Saved for MD Strikers.');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8" style={{ paddingTop: '120px' }}>
      <div className="mb-6">
        <AdminBackButton href={`/admin?tenant=${MD_STRIKERS_TENANT_ID}`} label="Back to admin home" />
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-indigo-800">News advertisements</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          MD Strikers only. The highlighted switch controls the whole news page. The table below turns each ad slot on or off. Sidebar is listed twice because those are two different ads.
        </p>
      </div>

      {!isMdStrikers && (
        <div className="bg-white rounded-lg shadow-md p-6 text-gray-700">
          Select tenant {MD_STRIKERS_TENANT_ID} to change news advertisements. This page does not change any other organization.
        </div>
      )}

      {isMdStrikers && loading && (
        <div className="bg-white rounded-lg shadow-md p-6 text-gray-600">Loading news advertisement switches...</div>
      )}

      {isMdStrikers && !loading && settings && (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 shadow-lg">
            <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
              <div className="text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-100">Master switch</p>
                <h2 className="mt-1 text-2xl font-bold">News advertisements</h2>
                <p className="mt-2 max-w-xl text-sm text-sky-100">
                  {settings.adsEnabled
                    ? 'Advertisements are allowed on the news page. Use the table to hide a single slot.'
                    : 'Every news advertisement is off. Slot switches stay hidden until this is turned on.'}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
                <Switch
                  on={settings.adsEnabled}
                  disabled={saving}
                  offLabel="Off"
                  onLabel="On"
                  onToggle={() => persist({ ...settings, adsEnabled: !settings.adsEnabled })}
                />
              </div>
            </div>
          </section>

          {settings.adsEnabled && (
            <section className="overflow-hidden rounded-lg bg-white shadow-md">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Ad slots</h2>
                <p className="text-sm text-gray-500">One row for each advertisement already on the news page.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Position</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {MD_STRIKERS_NEWS_AD_SLOTS.map((slot) => {
                      const key = String(slot.id);
                      const shown = settings.slots[key] !== false;
                      return (
                        <tr key={key} className="hover:bg-sky-50/60">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">{slot.id}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                            <span className="font-medium">{slot.label}</span>
                            <span className="ml-2 text-gray-500">{slot.position}</span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                shown ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {shown ? 'Shown' : 'Hidden'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <Switch
                              compact
                              on={shown}
                              disabled={saving}
                              offLabel="Hidden"
                              onLabel="Shown"
                              onToggle={() =>
                                persist({
                                  ...settings,
                                  slots: { ...settings.slots, [key]: !shown },
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(status || saving) && (
            <p className={`text-sm ${status?.startsWith('Saved') ? 'text-emerald-700' : status ? 'text-red-600' : 'text-gray-500'}`}>
              {saving ? 'Saving...' : status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
