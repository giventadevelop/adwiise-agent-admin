'use server';

import type { EventSponsorsDTO } from '@/types';
import { extractTextFromFile } from '@/lib/search/extractImageText';
import { buildSponsorSearchText, mergeOcrText } from '@/lib/search/buildSearchText';
import { fetchEventSponsorServer, updateEventSponsorServer } from './ApiServerActions';

export async function extractAndPersistSponsorImageTextServer(
  sponsorId: number,
  file: File,
): Promise<{ ok: boolean; ocrChars?: number; error?: string }> {
  if (!sponsorId || !file) {
    return { ok: false, error: 'Missing sponsorId or file' };
  }

  try {
    const extracted = await extractTextFromFile(file, `sponsor-${sponsorId}`);
    if (!extracted) {
      return { ok: true, ocrChars: 0 };
    }

    const sponsor = (await fetchEventSponsorServer(sponsorId)) as EventSponsorsDTO;
    if (!sponsor?.id) {
      return { ok: false, error: 'Sponsor not found' };
    }

    const ocrText = mergeOcrText(sponsor.ocrText, extracted);
    const searchText = buildSponsorSearchText({
      name: sponsor.name,
      companyName: sponsor.companyName,
      tagline: sponsor.tagline,
      description: sponsor.description,
      type: sponsor.type,
      ocrText,
    });

    await updateEventSponsorServer(sponsorId, {
      ocrText,
      searchText,
      updatedAt: new Date().toISOString(),
    });

    return { ok: true, ocrChars: extracted.length };
  } catch (error) {
    console.error(`[SponsorOCR] Failed for sponsor ${sponsorId}:`, error);
    return { ok: false, error: String(error) };
  }
}
