import type { NextApiRequest, NextApiResponse } from 'next';

/** Legacy path. Dem only serves multipart under /api/proxy; redirect callers there. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(308).setHeader('Location', '/api/proxy/retail-day-uploads/upload').end();
}
