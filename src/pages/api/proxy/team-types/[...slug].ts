import { createProxyHandler } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default createProxyHandler({
  backendPath: '/api/team-types',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
