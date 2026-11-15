/**
 * Shared denormalized search_text builders + OCR merge helpers.
 */

function joinSearchParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function mergeOcrText(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string {
  const existingTrimmed = (existing || '').trim();
  const incomingTrimmed = (incoming || '').trim();
  if (!incomingTrimmed) return existingTrimmed;
  if (!existingTrimmed) return incomingTrimmed;

  const existingLower = existingTrimmed.toLowerCase();
  if (existingLower.includes(incomingTrimmed.toLowerCase())) {
    return existingTrimmed;
  }

  return `${existingTrimmed}\n${incomingTrimmed}`.replace(/\n{3,}/g, '\n\n').trim();
}

export function buildSponsorSearchText(fields: {
  name?: string | null;
  companyName?: string | null;
  tagline?: string | null;
  description?: string | null;
  type?: string | null;
  ocrText?: string | null;
}): string {
  return joinSearchParts([
    fields.name,
    fields.companyName,
    fields.tagline,
    fields.description,
    fields.type,
    fields.ocrText,
  ]);
}

export function buildEventSearchText(fields: {
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  location?: string | null;
  ocrText?: string | null;
}): string {
  return joinSearchParts([
    fields.title,
    fields.caption,
    fields.description,
    fields.location,
    fields.ocrText,
  ]);
}

export function buildGalleryAlbumSearchText(fields: {
  title?: string | null;
  description?: string | null;
  eventLocation?: string | null;
  ocrText?: string | null;
}): string {
  return joinSearchParts([
    fields.title,
    fields.description,
    fields.eventLocation,
    fields.ocrText,
  ]);
}

export function buildFocusGroupSearchText(fields: {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  ocrText?: string | null;
}): string {
  return joinSearchParts([
    fields.name,
    fields.slug,
    fields.description,
    fields.ocrText,
  ]);
}
