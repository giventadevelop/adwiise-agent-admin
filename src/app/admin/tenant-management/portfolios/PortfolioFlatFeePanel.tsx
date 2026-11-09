'use client';

import { useEffect, useState } from 'react';
import { loadPortfolioFlatFee, savePortfolioFlatFee, type PortfolioFlatFee } from './ApiServerActions';

const money = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function PortfolioFlatFeePanel({
  portfolioId,
  primaryTenantId,
}: {
  portfolioId: number;
  primaryTenantId: string;
}) {
  const [fee, setFee] = useState<PortfolioFlatFee | null>(null);
  const [displayAmount, setDisplayAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPortfolioFlatFee(portfolioId, primaryTenantId)
      .then((loaded) => {
        if (cancelled) return;
        setFee(loaded);
        setDisplayAmount(loaded.monthlyUsd != null ? loaded.monthlyUsd.toFixed(2) : '');
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Could not load the portfolio charge');
      });
    return () => {
      cancelled = true;
    };
  }, [portfolioId, primaryTenantId]);

  async function save(amount: number) {
    setBusy(true);
    setMessage('');
    try {
      const saved = await savePortfolioFlatFee({ portfolioId, primaryTenantId, monthlyUsd: amount });
      setFee(saved);
      setDisplayAmount(saved.monthlyUsd != null ? saved.monthlyUsd.toFixed(2) : amount.toFixed(2));
      setMessage(
        amount > 0
          ? `One monthly charge of ${money(amount)} is set on the primary organization. Member tenants are covered and are not charged separately.`
          : 'Portfolio charge is off. Member tenants can be billed on their own again.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the portfolio charge');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!fee?.billingId) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/platform-billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingId: fee.billingId,
          tenantId: primaryTenantId,
          mode: 'RECURRING',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-indigo-900">One monthly charge for this portfolio</h3>
        <p className="text-sm text-indigo-800 mt-1">
          Stripe bills the primary organization once. Every tenant in the portfolio stays complimentary so it is not invoiced again.
          Checkout accepts a card or a US bank account.
        </p>
      </div>
      <label className="block text-sm text-gray-700">
        Monthly amount (USD)
        <input
          type="text"
          inputMode="decimal"
          value={displayAmount}
          onChange={(event) => {
            let next = event.target.value;
            if (next.startsWith('.')) next = `0${next}`;
            setDisplayAmount(next);
          }}
          onBlur={() => {
            const parsed = Number.parseFloat(displayAmount);
            if (!Number.isFinite(parsed)) {
              setDisplayAmount(fee?.monthlyUsd != null ? fee.monthlyUsd.toFixed(2) : '');
              return;
            }
            setDisplayAmount(parsed.toFixed(2));
          }}
          placeholder="0.00"
          className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => save(Number.parseFloat(displayAmount) || 0)}
          className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 px-4 font-semibold text-blue-700 disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save portfolio charge'}
        </button>
        <button
          type="button"
          disabled={busy || !fee?.billingId || !fee.chargeEnabled}
          onClick={() => void pay()}
          className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-4 font-semibold text-green-700 disabled:opacity-50"
        >
          Pay monthly
        </button>
      </div>
      {fee?.status && (
        <p className="text-sm text-gray-700">
          Status: <span className="font-semibold">{fee.status}</span>
          {fee.monthlyUsd != null ? ` · ${money(fee.monthlyUsd)}` : ''}
        </p>
      )}
      {message && <p className="text-sm text-gray-800">{message}</p>}
    </div>
  );
}
