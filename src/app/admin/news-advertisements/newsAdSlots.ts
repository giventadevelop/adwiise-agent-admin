/** News advertisement slots for the selected tenant. Rows come from Strapi. */
export type NewsAdSlotRow = {
  id: number;
  documentId: string;
  position: string;
  label: string;
  priority: number;
  isVisible: boolean;
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
