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
import { toggleTenantOrganizationStatus } from './ApiServerActions';

interface OrganizationActiveStatusButtonProps {
  organizationId: number;
  organizationName: string;
  isActive: boolean;
  /** Stretch to the parent width. List rows pass false so the button sizes to its label. */
  fullWidth?: boolean;
  /** Called after a successful change so a client list can reload its own rows. */
  onChanged?: () => void;
}

export default function OrganizationActiveStatusButton({
  organizationId,
  organizationName,
  isActive,
  fullWidth = true,
  onChanged,
}: OrganizationActiveStatusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextActive = !isActive;

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) setError(null);
  };

  const applyStatus = async () => {
    setBusy(true);
    setError(null);
    try {
      await toggleTenantOrganizationStatus(organizationId, nextActive);
      setOpen(false);
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization status');
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = isActive
    ? 'bg-amber-100 hover:bg-amber-200'
    : 'bg-green-100 hover:bg-green-200';
  const iconClass = isActive ? 'bg-amber-200 text-amber-600' : 'bg-green-200 text-green-600';
  const labelClass = isActive ? 'text-amber-700' : 'text-green-700';
  const label = isActive ? 'Make inactive' : 'Make active';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${fullWidth ? 'w-full' : ''} flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4 ${buttonClass}`}
        title={label}
        aria-label={`${label} ${organizationName}`}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
          {isActive ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={`font-semibold ${labelClass}`}>{label}</span>
      </button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent
          className="max-w-lg"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{isActive ? 'Make this organization inactive?' : 'Make this organization active?'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {isActive ? (
                  <p>
                    This keeps <span className="font-semibold text-foreground">{organizationName}</span>, its tenant
                    settings, email addresses, satellite domains, and onboarding requests. The organization is marked
                    inactive and can be made active again. Cascade delete is the action that removes those records.
                  </p>
                ) : (
                  <p>
                    This marks <span className="font-semibold text-foreground">{organizationName}</span> active again.
                    Tenant settings and onboarding requests stay as they are.
                  </p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
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
              <span className="font-semibold text-blue-700">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void applyStatus();
              }}
              disabled={busy}
              className={`flex-1 flex-shrink-0 h-14 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${buttonClass}`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
                {busy ? (
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : isActive ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`font-semibold ${labelClass}`}>{busy ? 'Saving...' : label}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
