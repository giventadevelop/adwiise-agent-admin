'use client';

import Link from 'next/link';
import AdminHelpDialog from '@/components/admin/AdminHelpDialog';

const DOCUMENTATION_URL = '/documentation/satellite_domains/SATELLITE_DOMAINS_ADMIN_GUIDELINES.html';

export type SatelliteDomainsGuidanceContext = 'settings' | 'edit-settings' | 'organizations' | 'general';

export interface SatelliteDomainsGuidanceProps {
  /** Show the ? help dialog trigger */
  showHelp?: boolean;
  /** Show compact inline guideline banner */
  showBanner?: boolean;
  /** Short context line under the banner title */
  context?: SatelliteDomainsGuidanceContext;
  className?: string;
}

const CONTEXT_INTRO: Record<SatelliteDomainsGuidanceContext, string> = {
  organizations:
    'After the company organization exists, create the website Tenant ID and hostname under Onboarding → Add Request. Then register the custom domain as a satellite so sign-in works on that URL.',
  settings:
    'When onboarding a tenant, register their public hostname under Satellite Domains so Clerk login and tenant branding work on their custom URL.',
  'edit-settings':
    'Use the same Tenant ID here when you add or update the matching record under Satellite Domains.',
  general:
    'Custom tenant URLs need a satellite domain record for authentication, branding, and correct tenant data.',
};

function SatelliteDomainsGuidanceBanner({ context }: { context: SatelliteDomainsGuidanceContext }) {
  return (
    <div
      className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-4"
      role="note"
      aria-label="Satellite domains setup guideline"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <svg className="h-5 w-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1 text-sm text-indigo-900 dark:text-indigo-100">
          <p className="font-semibold text-indigo-950 dark:text-indigo-50 mb-1">
            Satellite domains &amp; login — setup reminder
          </p>
          <p className="text-indigo-800 dark:text-indigo-200 mb-2">{CONTEXT_INTRO[context]}</p>
          <ol className="list-decimal list-inside space-y-1 text-indigo-800 dark:text-indigo-200 mb-2">
            <li>Create or confirm the <strong>organization</strong> and note its <code className="text-xs bg-indigo-100 dark:bg-indigo-900 px-1 rounded">tenantId</code>.</li>
            <li>Configure <strong>tenant settings</strong> (logo, features) with the same <code className="text-xs bg-indigo-100 dark:bg-indigo-900 px-1 rounded">tenantId</code>.</li>
            <li>
              Add the custom hostname at{' '}
              <Link href="/admin/satellite-domains" className="font-semibold underline hover:text-indigo-600">
                Admin → Satellite Domains
              </Link>{' '}
              — required for sign-in/sign-up on that URL.
            </li>
          </ol>
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            Click the <strong>?</strong> help icon for DNS, Clerk, and field details. The primary domain must stay deployed for satellite authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable satellite-domain onboarding guidance: ? help dialog + optional inline banner.
 * Informational only — no workflow or API changes.
 */
export default function SatelliteDomainsGuidance({
  showHelp = true,
  showBanner = false,
  context = 'general',
  className = '',
}: SatelliteDomainsGuidanceProps) {
  return (
    <div className={className}>
      {showHelp && (
        <AdminHelpDialog
          title="Satellite Domains — Setup Guidelines"
          ariaLabel="Satellite domains setup guidelines and login workflow"
          documentationUrl={DOCUMENTATION_URL}
          accent="blue"
        />
      )}
      {showBanner && (
        <div className={showHelp ? 'mt-3' : undefined}>
          <SatelliteDomainsGuidanceBanner context={context} />
        </div>
      )}
    </div>
  );
}
