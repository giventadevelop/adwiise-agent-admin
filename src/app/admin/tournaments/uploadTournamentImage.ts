export type TournamentImageKind = 'hero' | 'fixtures' | 'chief-guest';

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadTournamentImage(
  file: File,
  tenantId: string,
  kind: TournamentImageKind
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File size must be less than 10MB');
  }
  const formData = new FormData();
  formData.append('file', file);
  const params = new URLSearchParams({ tenantId, kind });
  const response = await fetch(`/api/proxy/tenant-tournaments/upload/image?${params.toString()}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Upload failed (${response.status})`);
  }
  const result = await response.json();
  const url = result.url || result.imageUrl || '';
  if (!url) {
    throw new Error('Upload succeeded but no image URL was returned');
  }
  return url;
}
