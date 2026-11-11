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
  toggleTenantOrganizationStatus,
  type CascadeDeleteTenantOrganizationResult,
} from './ApiServerActions';

interface CascadeDeleteOrganizationButtonProps {
  organizationId: number;
  tenantId: string;
  organizationName: string;
  isActive?: boolean;
  /** Stretch to the parent width. List rows pass false so the button sizes to its label. */
  fullWidth?: boolean;
  /** Called after a successful delete so a client list can reload instead of navigating away. */
  onDeleted?: () => void;
  /** Called after "Make inactive instead" so a client list can reload its own rows. */
  onChanged?: () => void;
}

export default function CascadeDeleteOrganizationButton({
  organizationId,
  tenantId,
  organizationName,
  isActive = true,
  fullWidth = true,
  onDeleted,
  onChanged,
}: CascadeDeleteOrganizationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState<null | 'delete' | 'inactive'>(null);
  const [result, setResult] = useState<CascadeDeleteTenantOrganizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmationMatches = confirmText.trim() === tenantId.trim();

  const reset = () => {
    setConfirmText('');
    setBusy(null);
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (busy || result) return;
    setOpen(next);
    if (!next) reset();
  };

  const acknowledgeReport = () => {
    const succeeded = result?.ok === true;
    setOpen(false);
    reset();
    if (succeeded) {
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/admin/tenant-management/organizations');
        router.refresh();
      }
    }
  };

  const makeInactiveInstead = async () => {
    setBusy('inactive');
    setError(null);
    try {
      await toggleTenantOrganizationStatus(organizationId, false);
      setOpen(false);
      reset();
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make the organization inactive');
      setBusy(null);
    }
  };

  const runCascadeDelete = async () => {
    if (!confirmationMatches) return;
    setBusy('delete');
    setError(null);
    setResult(null);
    try {
      const res = await cascadeDeleteTenantOrganizationServer(organizationId, tenantId);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cascade delete failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${fullWidth ? 'w-full' : ''} flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4`}
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
        <AlertDialogContent
          className="max-w-lg"
          onEscapeKeyDown={(event) => {
            if (busy || result) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy || result) event.preventDefault();
          }}
        >
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
                  <li>The tenant organization row. Websites that belong to it become their own organizations.</li>
                </ul>
                <p className="text-red-700 font-medium">
                  This cannot be undone. Onboarding requests are kept. User profiles and events are
                  kept. To keep this organization, its tenant settings, email addresses, and satellite
                  domains, choose Make inactive instead.
                </p>
                {isActive && !result && (
                  <button
                    type="button"
                    onClick={() => void makeInactiveInstead()}
                    disabled={busy !== null}
                    className="w-full flex-shrink-0 h-14 rounded-xl bg-amber-100 hover:bg-amber-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Make inactive instead of deleting"
                    aria-label="Make inactive instead of deleting"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                      {busy === 'inactive' ? (
                        <svg className="animate-spin w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold text-amber-700">
                      {busy === 'inactive' ? 'Saving...' : 'Make inactive instead'}
                    </span>
                  </button>
                )}
                <div>
                  <label htmlFor={`cascade-confirm-tenant-${organizationId}`} className="block text-sm font-medium text-foreground mb-1">
                    Type the tenant ID to confirm
                  </label>
                  <input
                    id={`cascade-confirm-tenant-${organizationId}`}
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={tenantId}
                    disabled={busy !== null || !!result?.ok}
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
            {result ? (
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  acknowledgeReport();
                }}
                className="flex-1 flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-semibold text-green-700">OK</span>
              </AlertDialogAction>
            ) : (
            <AlertDialogCancel
              disabled={busy !== null}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Keep organization</span>
            </AlertDialogCancel>
            )}
            {!result && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void runCascadeDelete();
                }}
                disabled={!confirmationMatches || busy !== null}
                className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                  {busy === 'delete' ? (
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
                  {busy === 'delete' ? 'Deleting...' : 'Cascade delete now'}
                </span>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
