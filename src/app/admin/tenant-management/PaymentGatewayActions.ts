'use server';

import { resolveAdminMutationTenantId } from '@/app/admin/adminAccessServer';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getApiBaseUrl } from '@/lib/env';

export type PaymentGatewayOption = {
  code: string;
  label: string;
  hint?: string | null;
  checkoutMode?: string | null;
};

export type PaymentUseCaseOption = {
  code: string;
  label: string;
  hint?: string | null;
};

export type TenantGatewayRow = {
  id?: number | null;
  providerName: string;
  paymentUseCase: string;
  publishableKey: string;
  configurationJson: string;
  isActive: boolean;
  fallbackOrder: number;
  apiKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
};

function asRows(data: unknown): TenantGatewayRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: typeof row.id === 'number' ? row.id : null,
      providerName: String(row.providerName || ''),
      paymentUseCase: row.paymentUseCase ? String(row.paymentUseCase) : '',
      publishableKey: String(row.publishableKey || ''),
      configurationJson: String(row.configurationJson || ''),
      isActive: row.isActive !== false,
      fallbackOrder: Number(row.fallbackOrder || 0),
      apiKeyConfigured: Boolean(row.apiKeyConfigured),
      secretKeyConfigured: Boolean(row.secretKeyConfigured),
      webhookSecretConfigured: Boolean(row.webhookSecretConfigured),
    };
  });
}

export async function fetchTenantPaymentGatewaysServer(tenantId: string): Promise<{
  gateways: PaymentGatewayOption[];
  useCases: PaymentUseCaseOption[];
  rows: TenantGatewayRow[];
}> {
  const scopedTenantId = await resolveAdminMutationTenantId(tenantId);
  const headers = { 'X-Tenant-ID': scopedTenantId };
  const [gatewayRes, useCaseRes, rowRes] = await Promise.all([
    fetchWithJwtRetry(`${getApiBaseUrl()}/api/payment-gateways`, { cache: 'no-store' }),
    fetchWithJwtRetry(`${getApiBaseUrl()}/api/payment-use-cases`, { cache: 'no-store' }),
    fetchWithJwtRetry(
      `${getApiBaseUrl()}/api/payment-gateway-credentials?tenantId=${encodeURIComponent(scopedTenantId)}`,
      { cache: 'no-store', headers }
    ),
  ]);
  const gateways = gatewayRes.ok ? ((await gatewayRes.json()) as PaymentGatewayOption[]) : [];
  const useCases = useCaseRes.ok ? ((await useCaseRes.json()) as PaymentUseCaseOption[]) : [];
  const rows = rowRes.ok ? asRows(await rowRes.json()) : [];
  return {
    gateways: Array.isArray(gateways) ? gateways : [],
    useCases: Array.isArray(useCases) ? useCases : [],
    rows,
  };
}

export async function saveTenantPaymentGatewayServer(input: {
  tenantId: string;
  providerName: string;
  paymentUseCase: string;
  publishableKey: string;
  configurationJson: string;
  isActive: boolean;
  fallbackOrder: number;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
}): Promise<TenantGatewayRow> {
  const tenantId = await resolveAdminMutationTenantId(input.tenantId);
  const res = await fetchWithJwtRetry(`${getApiBaseUrl()}/api/payment-gateway-credentials`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
    body: JSON.stringify({
      tenantId,
      providerName: input.providerName,
      paymentUseCase: input.paymentUseCase || null,
      publishableKey: input.publishableKey,
      configurationJson: input.configurationJson,
      isActive: input.isActive,
      fallbackOrder: input.fallbackOrder,
      apiKey: input.apiKey,
      secretKey: input.secretKey,
      webhookSecret: input.webhookSecret,
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || 'Could not save the payment gateway');
  }
  const saved = asRows([await res.json()])[0];
  return saved;
}
