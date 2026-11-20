import type { RetailerTypeDTO } from '@/types/accessCatalog';

const PACK_LABELS: Record<string, string> = {
  GAS_STATION: 'Gas station',
  LIQUOR_STORE: 'Liquor store',
  DUNKIN_DONUTS: 'Dunkin Donuts',
  SEVEN_ELEVEN: 'Seven-Eleven',
  RESTAURANT: 'Restaurant',
  CLINIC: 'Clinic',
};

export function retailPacks(packs: RetailerTypeDTO[]): RetailerTypeDTO[] {
  return packs.filter(
    (pack) => pack.isActive !== false && (pack.siteTypeCode == null || pack.siteTypeCode === 'RETAIL')
  );
}

export function packLabel(code: string | null | undefined, packs: RetailerTypeDTO[]): string | null {
  const trimmed = code?.trim();
  if (!trimmed) return null;
  const match = packs.find((pack) => pack.code === trimmed);
  return match?.label || PACK_LABELS[trimmed] || trimmed;
}
