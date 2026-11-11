'use client';

import { useEffect, useState } from 'react';
import {
  fetchTenantPaymentGatewaysServer,
  saveTenantPaymentGatewayServer,
  type PaymentGatewayOption,
  type PaymentUseCaseOption,
  type TenantGatewayRow,
} from '../PaymentGatewayActions';

const emptyDraft = (providerName = ''): TenantGatewayRow & { apiKey: string; secretKey: string; webhookSecret: string } => ({
  providerName,
  paymentUseCase: '',
  publishableKey: '',
  configurationJson: '',
  isActive: true,
  fallbackOrder: 0,
  apiKeyConfigured: false,
  secretKeyConfigured: false,
  webhookSecretConfigured: false,
  apiKey: '',
  secretKey: '',
  webhookSecret: '',
});

export default function TenantPaymentGateways({ tenantId }: { tenantId?: string }) {
  const [gateways, setGateways] = useState<PaymentGatewayOption[]>([]);
  const [useCases, setUseCases] = useState<PaymentUseCaseOption[]>([]);
  const [rows, setRows] = useState<TenantGatewayRow[]>([]);
  const [draft, setDraft] = useState(emptyDraft());
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload(nextTenantId: string) {
    const result = await fetchTenantPaymentGatewaysServer(nextTenantId);
    setGateways(result.gateways);
    setUseCases(result.useCases);
    setRows(result.rows);
    setDraft(emptyDraft(result.gateways[0]?.code || ''));
  }

  useEffect(() => {
    if (!tenantId) return;
    reload(tenantId).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Could not load payment gateways');
    });
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-medium text-gray-900">Payment gateways</h4>
        <p className="text-sm text-gray-600 mt-2">Select a tenant organization on the General tab before connecting a gateway.</p>
      </div>
    );
  }

  async function onSubmit(event?: React.SyntheticEvent) {
    event?.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveTenantPaymentGatewayServer({
        tenantId,
        providerName: draft.providerName,
        paymentUseCase: draft.paymentUseCase,
        publishableKey: draft.publishableKey,
        configurationJson: draft.configurationJson,
        isActive: draft.isActive,
        fallbackOrder: Number(draft.fallbackOrder || 0),
        apiKey: draft.apiKey,
        secretKey: draft.secretKey,
        webhookSecret: draft.webhookSecret,
      });
      await reload(tenantId);
      setMessage('Payment gateway saved. Secret fields stay on the server.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the payment gateway');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div>
        <h4 className="text-md font-medium text-gray-900">Payment gateways</h4>
        <p className="text-sm text-gray-600 mt-1">
          This tenant collects on its own merchant account. Choose All payments to use one gateway for every product, or pick a use case such as tickets, donations, or school fees. Leave a secret blank to keep the saved value.
        </p>
      </div>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <button
              key={`${row.providerName}-${row.paymentUseCase}`}
              type="button"
              onClick={() => setDraft({ ...emptyDraft(row.providerName), ...row, apiKey: '', secretKey: '', webhookSecret: '' })}
              className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">{row.providerName}</span>
              <span className="text-sm text-gray-600"> · {row.paymentUseCase || 'All payments'}</span>
              <span className="text-sm text-gray-500"> · {row.isActive ? 'Active' : 'Inactive'} · order {row.fallbackOrder}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">No gateway is connected for this tenant yet.</p>
      )}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || (event.target as HTMLElement).tagName === 'TEXTAREA') return;
          event.preventDefault();
          event.stopPropagation();
          if (!saving && draft.providerName) void onSubmit(event);
        }}
      >
        <label className="block text-sm font-medium text-gray-700">
          Gateway
          <select
            value={draft.providerName}
            onChange={(event) => setDraft((current) => ({ ...current, providerName: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          >
            {gateways.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Use case
          <select
            value={draft.paymentUseCase}
            onChange={(event) => setDraft((current) => ({ ...current, paymentUseCase: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          >
            <option value="">All payments</option>
            {useCases.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Publishable key
          <input
            value={draft.publishableKey}
            onChange={(event) => setDraft((current) => ({ ...current, publishableKey: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fallback order
          <input
            type="number"
            value={draft.fallbackOrder}
            onChange={(event) => setDraft((current) => ({ ...current, fallbackOrder: Number(event.target.value || 0) }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          API key {draft.apiKeyConfigured ? '(saved)' : ''}
          <input
            type="password"
            autoComplete="new-password"
            value={draft.apiKey}
            onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Secret key {draft.secretKeyConfigured ? '(saved)' : ''}
          <input
            type="password"
            autoComplete="new-password"
            value={draft.secretKey}
            onChange={(event) => setDraft((current) => ({ ...current, secretKey: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Webhook secret {draft.webhookSecretConfigured ? '(saved)' : ''}
          <input
            type="password"
            autoComplete="new-password"
            value={draft.webhookSecret}
            onChange={(event) => setDraft((current) => ({ ...current, webhookSecret: event.target.value }))}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-8">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>
        <label className="block text-sm font-medium text-gray-700 md:col-span-2">
          Public configuration JSON
          <textarea
            value={draft.configurationJson}
            onChange={(event) => setDraft((current) => ({ ...current, configurationJson: event.target.value }))}
            rows={3}
            className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 font-mono text-sm"
            placeholder='{"currency":"USD","merchantId":"","orderUrl":""}'
          />
        </label>
        {message ? <p className="text-sm text-gray-700 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <button
            type="button"
            disabled={saving || !draft.providerName}
            onClick={(event) => void onSubmit(event)}
            className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-6 font-semibold text-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save gateway'}
          </button>
        </div>
      </div>
    </div>
  );
}
