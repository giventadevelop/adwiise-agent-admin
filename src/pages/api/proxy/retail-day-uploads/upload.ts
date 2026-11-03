import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiBaseUrl, getTenantIdOptional } from '@/lib/env';
import { getRawBody } from '@/lib/getRawBody';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Owner Upload day multipart proxy. Lives under /api/proxy so Amplify/Clerk
 * treat it like the other admin API routes (outside /api/proxy those return 404 on dem).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const contentType = req.headers['content-type'];
  if (!contentType || !String(contentType).toLowerCase().includes('multipart/form-data')) {
    return res.status(400).json({ message: 'A register file upload is required' });
  }

  const tenantQuery = req.query.tenantId ?? req.query.tenant;
  const tenantFromQuery = Array.isArray(tenantQuery) ? tenantQuery[0] : tenantQuery;
  const tenantHeader =
    (typeof tenantFromQuery === 'string' && tenantFromQuery.trim()) ||
    getTenantIdOptional() ||
    '';

  const raw = await getRawBody(req);
  const response = await fetchWithJwtRetry(
    `${getApiBaseUrl()}/api/retail-day-uploads`,
    {
      method: 'POST',
      headers: {
        'Content-Type': String(contentType),
        ...(tenantHeader ? { 'X-Tenant-ID': tenantHeader } : {}),
      },
      body: raw,
      // Engine day upload does S3 + post; default 30s proxy timeout is too short.
      timeout: 120000,
    },
    'retail-day-uploads-POST'
  );
  const text = await response.text();
  if (!text || !text.trim()) {
    return res.status(502).json({
      accepted: false,
      message: `Retail day upload returned an empty body (HTTP ${response.status}).`,
    });
  }
  res.status(response.status);
  try {
    return res.json(JSON.parse(text));
  } catch {
    return res.status(response.ok ? 502 : response.status).json({
      accepted: false,
      message: text.slice(0, 500) || 'Retail day upload failed',
    });
  }
}
