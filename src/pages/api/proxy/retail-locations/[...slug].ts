import { createProxyHandler } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Read only. Adding, changing, and deleting a location go through the server actions in
// src/app/admin/retail/retailServer.ts, which check the caller's role. This route does not.
export default createProxyHandler({ backendPath: '/api/retail-locations', allowedMethods: ['GET'] });
