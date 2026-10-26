import { createProxyHandler } from '@/lib/proxyHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default createProxyHandler({
  backendPath: '/api/achievement-categories',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
