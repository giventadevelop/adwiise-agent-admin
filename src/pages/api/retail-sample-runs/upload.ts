import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiBaseUrl } from '@/lib/env';
import { getRawBody } from '@/lib/getRawBody';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const contentType = req.headers['content-type'];
  if (!contentType || !String(contentType).toLowerCase().includes('multipart/form-data')) {
    return res.status(400).json({ message: 'A register file upload is required' });
  }
  const raw = await getRawBody(req);
  const response = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/retail-sample-runs`, {
    method: 'POST',
    headers: { 'Content-Type': String(contentType) },
    body: raw,
  });
  const text = await response.text();
  res.status(response.status);
  try {
    return res.json(JSON.parse(text));
  } catch {
    return res.json({ message: text || 'Retail sample run failed' });
  }
}
