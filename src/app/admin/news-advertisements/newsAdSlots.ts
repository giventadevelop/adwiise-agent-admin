/** News advertisement switches for MD Strikers. Rows come from the live Strapi ad slots. */
export const MD_STRIKERS_TENANT_ID = 'md_strikers_10';

export type NewsAdSlotRow = {
  id: number;
  documentId: string;
  position: string;
  label: string;
  priority: number;
};

export type NewsAdVisibility = {
  adsEnabled: boolean;
  slots: Record<string, boolean>;
};

const POSITION_LABELS: Record<string, string> = {
  top: 'Top',
  between_sections: 'Between sections',
  sidebar: 'Sidebar',
};

export function newsAdPositionLabel(position: string): string {
  return POSITION_LABELS[position] || position;
}

export function defaultNewsAdVisibility(): NewsAdVisibility {
  return { adsEnabled: true, slots: {} };
}

export function normalizeNewsAdVisibility(value: unknown, slotIds: string[] = []): NewsAdVisibility {
  const defaults = defaultNewsAdVisibility();
  if (!value || typeof value !== 'object') {
    const slots: Record<string, boolean> = {};
    for (const id of slotIds) slots[id] = true;
    return { ...defaults, slots };
  }
  const record = value as Partial<NewsAdVisibility>;
  const saved = record.slots && typeof record.slots === 'object' ? record.slots : {};
  const slots: Record<string, boolean> = {};
  const ids = new Set([...slotIds, ...Object.keys(saved)]);
  for (const id of ids) {
    slots[id] = typeof saved[id] === 'boolean' ? saved[id] : true;
  }
  return {
    adsEnabled: record.adsEnabled !== false,
    slots,
  };
}

/** What the news page should show: master switch and the row switch both have to be on. */
export function slotIsShown(settings: NewsAdVisibility, slotId: number): boolean {
  if (!settings.adsEnabled) return false;
  return settings.slots[String(slotId)] !== false;
}
