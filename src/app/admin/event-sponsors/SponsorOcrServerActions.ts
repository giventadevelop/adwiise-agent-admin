'use server';

import { refreshImageSearchText } from '@/lib/search/refreshImageSearchText';

export async function extractAndPersistSponsorImageTextServer(
  sponsorId: number,
  file: File,
): Promise<{ ok: boolean; ocrChars?: number; error?: string }> {
  if (!sponsorId || !file) {
    return { ok: false, error: 'Missing sponsorId or file' };
  }

  try {
    const words = await refreshImageSearchText('event_sponsors', sponsorId);
    return { ok: true, ocrChars: words };
  } catch (error) {
    console.error(`[SponsorOCR] Failed for sponsor ${sponsorId}:`, error);
    return { ok: false, error: String(error) };
  }
}
