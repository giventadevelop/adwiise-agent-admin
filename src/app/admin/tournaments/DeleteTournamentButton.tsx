'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTenantTournamentServer } from './ApiServerActions';

export default function DeleteTournamentButton({ id, label, tenantId }: { id: number; label: string; tenantId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete ${label}?`)) return;
    setBusy(true);
    const result = await deleteTenantTournamentServer(id, tenantId);
    setBusy(false);
    if (!result.ok) {
      window.alert(result.error || 'Delete failed');
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50"
      title="Delete tournament"
      aria-label="Delete tournament"
    >
      <svg className="w-6 h-6 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
