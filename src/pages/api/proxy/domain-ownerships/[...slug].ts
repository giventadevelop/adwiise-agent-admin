import { createProxyHandler } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default createProxyHandler({
  backendPath: '/api/domain-ownerships',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
