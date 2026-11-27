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
import type { TenantSuspensionFlags } from '@/types/tenantSuspension';
import { saveOrganizationSuspension, saveTenantSuspension } from './ApiServerActions';

export type SuspensionTarget =
  | { kind: 'tenant'; settingsId: number; tenantId: string }
  | { kind: 'organization'; organizationId: number; organizationName: string };

interface SuspensionDialogButtonProps {
  target: SuspensionTarget;
  current: TenantSuspensionFlags | null | undefined;
  /** Stretch to the parent width. */
  fullWidth?: boolean;
  /** Smaller button for table rows. */
  compact?: boolean;
  onSaved?: () => void;
}

function isSuspended(flags: TenantSuspensionFlags | null | undefined): boolean {
  return flags?.websiteSuspended === true || flags?.dashboardSuspended === true;
}

export default function SuspensionDialogButton({
  target,
  current,
  fullWidth = false,
  compact = false,
  onSaved,
}: SuspensionDialogButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState(current?.websiteSuspended === true);
  const [dashboard, setDashboard] = useState(current?.dashboardSuspended === true);
  const [reason, setReason] = useState(current?.suspensionReason ?? '');
  const suspended = isSuspended(current);
  const name = target.kind === 'tenant' ? target.tenantId : target.organizationName;
  const scope =
    target.kind === 'tenant'
      ? 'this tenant ID only. Other tenant IDs in the same organization keep working'
      : 'every tenant ID in this organization at once, including ones added later. To suspend only some of them, use Suspend on those rows in the tenant ID list instead';

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (next) {
      setWebsite(current?.websiteSuspended === true);
      setDashboard(current?.dashboardSuspended === true);
      setReason(current?.suspensionReason ?? '');
    }
    setOpen(next);
    if (!next) setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const input = { websiteSuspended: website, dashboardSuspended: dashboard, reason };
      if (target.kind === 'tenant') {
        await saveTenantSuspension(target.settingsId, input);
      } else {
        await saveOrganizationSuspension(target.organizationId, input);
      }
      setOpen(false);
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The suspension could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = suspended ? 'bg-red-100 hover:bg-red-200' : 'bg-orange-100 hover:bg-orange-200';
  const iconClass = suspended ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700';
  const labelClass = suspended ? 'text-red-700' : 'text-orange-700';
  const label = suspended ? 'Suspended: change' : 'Suspend';
  const willChange =
    website !== (current?.websiteSuspended === true) ||
    dashboard !== (current?.dashboardSuspended === true) ||
    reason.trim() !== (current?.suspensionReason ?? '').trim();

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={`${fullWidth ? 'w-full' : ''} flex-shrink-0 ${compact ? 'h-14 px-4' : 'h-14 px-6'} rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 ${buttonClass}`}
        title={suspended ? `Change the suspension for ${name}` : `Suspend ${name}`}
        aria-label={suspended ? `Change the suspension for ${name}` : `Suspend ${name}`}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className={`font-semibold ${labelClass}`}>{label}</span>
      </button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent
          className="max-w-lg"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  This applies to <span className="font-semibold text-foreground">{scope}</span>. Nothing is deleted.
                  Turn a switch off again to bring access back. Platform super admins are never locked out.
                </p>
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={website}
                    disabled={busy}
                    onChange={(event) => setWebsite(event.target.checked)}
                  />
                  <span>
                    <span className="block font-semibold text-foreground">Turn off the public website</span>
                    Visitors see a page saying the site is temporarily unavailable. Sign-in still works.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={dashboard}
                    disabled={busy}
                    onChange={(event) => setDashboard(event.target.checked)}
                  />
                  <span>
                    <span className="block font-semibold text-foreground">Turn off dashboard access</span>
                    Tenant admins and retail users see a notice in place of the admin and retail dashboards. The
                    Billing page stays open so they can pay.
                  </span>
                </label>
                <div>
                  <label htmlFor="suspension-reason" className="block font-semibold text-foreground">
                    Internal note (optional)
                  </label>
                  <textarea
                    id="suspension-reason"
                    rows={2}
                    maxLength={500}
                    disabled={busy}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="For example: two missed monthly payments"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900"
                  />
                  <p className="mt-1 text-xs">Only super admins see this note. Visitors and tenant admins do not.</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel
              disabled={busy}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              <span className="font-semibold text-blue-700">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void save();
              }}
              disabled={busy || !willChange}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-orange-100 hover:bg-orange-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="font-semibold text-orange-700">{busy ? 'Saving...' : 'Save'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SuspensionBadges({
  website,
  dashboard,
  source,
}: {
  website: boolean;
  dashboard: boolean;
  source?: 'tenant' | 'organization' | null;
}) {
  if (!website && !dashboard) {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Live</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {website && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Website off</span>
      )}
      {dashboard && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Dashboard off</span>
      )}
      {source === 'organization' && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">By organization</span>
      )}
    </span>
  );
}
