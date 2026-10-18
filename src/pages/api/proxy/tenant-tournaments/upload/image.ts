import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';

const IMAGE_KINDS = new Set(['hero', 'fixtures', 'chief-guest']);

function resolveTenantIdForUpload(req: NextApiRequest): string {
  const q = req.query.tenantId;
  const fromQuery = Array.isArray(q) ? q[0] : q;
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.trim();
  }
  return getTenantId();
}

function resolveKind(req: NextApiRequest): string {
  const q = req.query.kind;
  const kind = Array.isArray(q) ? q[0] : q;
  return typeof kind === 'string' ? kind.trim() : '';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const kind = resolveKind(req);
  if (!IMAGE_KINDS.has(kind)) {
    res.status(400).json({ error: 'Image kind must be hero, fixtures, or chief-guest' });
    return;
  }

  try {
    if (!API_BASE_URL) {
      res.status(500).json({ error: 'API base URL not configured' });
      return;
    }

    let token = await getCachedApiJwt();
    if (!token) {
      token = await generateApiJwt();
    }

    const tenantId = resolveTenantIdForUpload(req);
    const url = `${API_BASE_URL}/api/tenant-tournaments/upload/image?kind=${encodeURIComponent(kind)}&tenantId=${encodeURIComponent(tenantId)}`;

    const fetch = (await import('node-fetch')).default;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    };
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }
    if (req.headers['content-length']) {
      headers['content-length'] = req.headers['content-length'];
    }

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: req,
      duplex: 'half',
    });

    if (apiRes.status >= 200 && apiRes.status < 300) {
      const data = await apiRes.text();
      res.status(apiRes.status).send(data);
    } else if (apiRes.status === 401) {
      token = await generateApiJwt();
      headers.Authorization = `Bearer ${token}`;
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: req,
        duplex: 'half',
      });
      const data = await retryRes.text();
      res.status(retryRes.status).send(data);
    } else {
      const errorText = await apiRes.text();
      res.status(apiRes.status).json({ error: errorText });
    }
  } catch (err) {
    console.error('Tournament image upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}
