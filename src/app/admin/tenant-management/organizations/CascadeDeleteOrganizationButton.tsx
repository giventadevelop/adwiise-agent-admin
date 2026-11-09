'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  cascadeDeleteTenantOrganizationServer,
  type CascadeDeleteTenantOrganizationResult,
} from './ApiServerActions';

interface CascadeDeleteOrganizationButtonProps {
  organizationId: number;
  tenantId: string;
  organizationName: string;
}

export default function CascadeDeleteOrganizationButton({
  organizationId,
  tenantId,
  organizationName,
}: CascadeDeleteOrganizationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CascadeDeleteTenantOrganizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmationMatches = confirmText.trim() === tenantId.trim();

  const reset = () => {
    setConfirmText('');
    setBusy(false);
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) reset();
  };

  const runCascadeDelete = async () => {
    if (!confirmationMatches) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await cascadeDeleteTenantOrganizationServer(organizationId, tenantId);
      setResult(res);
      if (res.ok) {
        setTimeout(() => {
          router.push('/admin/tenant-management/organizations');
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cascade delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
        title="Cascade delete organization and related tenant rows"
        aria-label="Cascade delete organization"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <span className="font-semibold text-red-700">Cascade Delete</span>
      </button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cascade delete organization?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This permanently removes{' '}
                  <span className="font-semibold text-foreground">{organizationName}</span> and
                  related rows for tenant{' '}
                  <span className="font-mono font-semibold text-foreground">{tenantId}</span> (org
                  PK <span className="font-mono">{organizationId}</span>).
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Satellite domains</li>
                  <li>Tenant email addresses</li>
                  <li>Tenant settings</li>
                  <li>Organization portfolios where this tenant is primary</li>
                  <li>The tenant organization row</li>
                </ul>
                <p className="text-red-700 font-medium">
                  This cannot be undone. User profiles, events, and onboarding request history are
                  not deleted — create a new onboarding request (or a fresh approve path) after
                  re-provisioning.
                </p>
                <div>
                  <label htmlFor="cascade-confirm-tenant" className="block text-sm font-medium text-foreground mb-1">
                    Type the tenant ID to confirm
                  </label>
                  <input
                    id="cascade-confirm-tenant"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={tenantId}
                    disabled={busy || !!result?.ok}
                    className="mt-1 block w-full border border-gray-400 rounded-xl px-4 py-3 text-base font-mono disabled:bg-gray-100"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {result && (
                  <div
                    className={`rounded-lg border p-3 text-xs font-mono whitespace-pre-wrap ${
                      result.ok
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {result.ok ? 'Cascade delete completed.' : `Failed: ${result.error || 'unknown error'}`}
                    {'\n'}
                    {result.steps
                      .map((s) => `${s.ok ? 'OK' : 'FAIL'} ${s.resource} #${s.id}${s.detail ? ` (${s.detail})` : ''}`)
                      .join('\n')}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              disabled={busy}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">{result?.ok ? 'Close' : 'Keep organization'}</span>
            </AlertDialogCancel>
            {!result?.ok && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void runCascadeDelete();
                }}
                disabled={!confirmationMatches || busy}
                className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                  {busy ? (
                    <svg className="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-red-700">
                  {busy ? 'Deleting...' : 'Cascade delete now'}
                </span>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
