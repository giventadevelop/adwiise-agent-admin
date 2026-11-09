import { createProxyHandler } from '@/lib/proxyHandler';

export default createProxyHandler({ backendPath: '/api/payment-use-cases' });

export const config = { api: { bodyParser: false } };
