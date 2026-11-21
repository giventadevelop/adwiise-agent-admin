import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Ask the backend to read saved images with Bedrock and store spaced search words.
 */
export async function refreshImageSearchText(entityType: string, entityId: number): Promise<number> {
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/image-search-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Image search text failed');
  }
  const data = (await response.json()) as { words?: number };
  return Number(data.words || 0);
}
