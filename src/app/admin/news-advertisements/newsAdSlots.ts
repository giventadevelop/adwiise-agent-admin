/** News advertisement rows for MD Strikers only. Ids and positions match the existing ad list. */
export const MD_STRIKERS_TENANT_ID = 'md_strikers_10';

export const MD_STRIKERS_NEWS_AD_SLOTS = [
  { id: 35, position: 'sidebar', label: 'Sidebar' },
  { id: 33, position: 'top', label: 'Top' },
  { id: 34, position: 'between_sections', label: 'Between sections' },
  { id: 36, position: 'sidebar', label: 'Sidebar' },
] as const;

export type NewsAdSlotId = (typeof MD_STRIKERS_NEWS_AD_SLOTS)[number]['id'];

export type NewsAdVisibility = {
  adsEnabled: boolean;
  slots: Record<string, boolean>;
};

export function defaultNewsAdVisibility(): NewsAdVisibility {
  const slots: Record<string, boolean> = {};
  for (const slot of MD_STRIKERS_NEWS_AD_SLOTS) {
    slots[String(slot.id)] = true;
  }
  return { adsEnabled: true, slots };
}

export function normalizeNewsAdVisibility(value: unknown): NewsAdVisibility {
  const defaults = defaultNewsAdVisibility();
  if (!value || typeof value !== 'object') return defaults;
  const record = value as Partial<NewsAdVisibility>;
  const slots = { ...defaults.slots };
  if (record.slots && typeof record.slots === 'object') {
    for (const slot of MD_STRIKERS_NEWS_AD_SLOTS) {
      const key = String(slot.id);
      if (typeof record.slots[key] === 'boolean') {
        slots[key] = record.slots[key];
      }
    }
  }
  return {
    adsEnabled: record.adsEnabled !== false,
    slots,
  };
}
