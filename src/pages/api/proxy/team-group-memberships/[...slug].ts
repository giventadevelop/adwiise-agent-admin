import { createProxyHandler } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default createProxyHandler({
  backendPath: '/api/team-group-memberships',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});