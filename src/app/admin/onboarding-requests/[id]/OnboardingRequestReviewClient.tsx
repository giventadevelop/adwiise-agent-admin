'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminNavigation from '@/components/AdminNavigation';
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
  ONBOARDING_STATUS_STYLES,
  ONBOARDING_SITE_TYPE_OPTIONS,
  SATELLITE_KEY_PATTERN,
  TENANT_ID_PATTERN,
  normalizeOnboardingHostname,
  stripWww,
  suggestSatelliteKey,
  validateOnboardingSubmit,
} from '@/lib/onboarding/onboardingShared';
import {
  buildCursorEnvHandoffText,
  buildManualStepsText,
  buildOrganizationDetailsText,
  domainOwnershipLabel,
  siteTypeLabel,
  suggestFolderFromHostname,
} from '@/lib/onboarding/onboardingApprovedHandoff';
import {
  extractTenantIdSequence,
  suggestTenantIdPrefixFromName,
} from '@/lib/tenantIdGeneration';
import { useDomainOwnershipOptions } from '@/lib/onboarding/useDomainOwnershipOptions';
import type { TenantOnboardingRequestDTO, TenantSiteType } from '@/types';
import type { TenantOrganizationDTO } from '@/app/admin/tenant-management/types';
import { searchTenantOrganizationsForSelectServer } from '@/app/admin/tenant-management/organizations/organizationSelectServerActions';
import { fetchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import OnboardingRequestFields, { onboardingInputClass, type OnboardingFieldValues } from '../OnboardingRequestFields';
import {
  mapTenantOrganizationToOnboardingFields,
  readOnboardingSourceTenant,
  rememberOnboardingSourceTenant,
} from '../onboardingOrgPrefill';
import TenantOrganizationSearchSelect from '@/app/admin/tenant-management/components/TenantOrganizationSearchSelect';
import { resolveClientOrganizationId } from '@/app/admin/tenant-management/organizations/websiteActions';
import {
  readOnboardingSiteDraft,
  type OnboardingSiteProvisionDraft,
} from '../onboardingSiteProvisionDraft';
import AdminBackButton from '@/components/admin/AdminBackButton';
import CopyInstructionsButton from '@/components/admin/CopyInstructionsButton';
import {
  approveOnboardingRequestServer,
  checkOnboardingAvailabilityServer,
  previewOnboardingTenantIdServer,
  rejectOnboardingRequestServer,
  updateOnboardingRequestServer,
  type OnboardingAvailability,
} from '../ApiServerActions';
import { applyComplimentaryPlatformBilling } from '@/app/admin/platform-billing/ApiServerActions';
import { patchTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { isComplimentarySubscriptionPlan } from '@/lib/platformBilling/complimentaryPlan';

interface ProvisioningValues {
  tenantPrefix: string;
  tenantId: string;
  satelliteKey: string;
  hostname: string;
  organizationDomain: string;
  displayName: string;
  contactEmail: string;
  infoEmail: string;
  noreplyEmail: string;
  adminSourceTenantId: string;
  cloneAdmins: boolean;
  notifySubmitter: boolean;
  adminComments: string;
  ownerTenantId: string;
}

function toFieldValues(r: TenantOnboardingRequestDTO): OnboardingFieldValues {
  return {
    organizationName: r.organizationName ?? '',
    requestedHostname: r.requestedHostname ?? '',
    siteType: r.siteType ?? 'EVENT_ORG',
    domainOwnership: r.domainOwnership ?? 'CUSTOMER_REGISTRAR',
    registrarNotes: r.registrarNotes ?? '',
    description: r.description ?? '',
    contactFirstName: r.contactFirstName ?? '',
    contactLastName: r.contactLastName ?? '',
    contactEmail: r.contactEmail ?? '',
    contactPhone: r.contactPhone ?? '',
    addressLine1: r.addressLine1 ?? '',
    addressLine2: r.addressLine2 ?? '',
    city: r.city ?? '',
    stateProvince: r.stateProvince ?? '',
    zipCode: r.zipCode ?? '',
    country: r.country ?? '',
    primaryColor: r.primaryColor ?? '',
    secondaryColor: r.secondaryColor ?? '',
    logoUrl: r.logoUrl ?? '',
    wantsPayments: !!r.wantsPayments,
    customerNotes: r.customerNotes ?? '',
  };
}

function initialProvisioning(r: TenantOnboardingRequestDTO): ProvisioningValues {
  const hostname = normalizeOnboardingHostname(r.requestedHostname);
  return {
    tenantPrefix: suggestTenantIdPrefixFromName(r.organizationName ?? ''),
    tenantId: r.assignedTenantId ?? '',
    satelliteKey: r.satelliteKey ?? suggestSatelliteKey(hostname),
    hostname,
    organizationDomain: stripWww(hostname),
    displayName: r.organizationName ?? '',
    contactEmail: r.contactEmail ?? '',
    infoEmail: '',
    noreplyEmail: r.noreplyEmail ?? '',
    adminSourceTenantId: '',
    cloneAdmins: true,
    notifySubmitter: true,
    adminComments: r.adminComments ?? '',
    ownerTenantId: '',
  };
}

function parseResult(raw?: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Only send fields the reviewer actually changed. */
function diffFields(original: OnboardingFieldValues, current: OnboardingFieldValues): Partial<TenantOnboardingRequestDTO> {
  const patch: Record<string, unknown> = {};
  (Object.keys(current) as (keyof OnboardingFieldValues)[]).forEach((key) => {
    if (current[key] !== original[key]) {
      const value = current[key];
      if (key === 'registrarNotes' && typeof value === 'string') {
        patch[key] = value.trim();
      } else {
        patch[key] = typeof value === 'string' ? value.trim() || null : value;
      }
    }
  });
  return patch as Partial<TenantOnboardingRequestDTO>;
}

export default function OnboardingRequestReviewClient({
  initialRequest,
}: {
  initialRequest: TenantOnboardingRequestDTO;
}) {
  const ownershipOptions = useDomainOwnershipOptions('server');
  const [request, setRequest] = useState(initialRequest);
  const [savedFields, setSavedFields] = useState(() => toFieldValues(initialRequest));
  const [fields, setFields] = useState(() => toFieldValues(initialRequest));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [prov, setProv] = useState(() => initialProvisioning(initialRequest));
  const [provErrors, setProvErrors] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<OnboardingAvailability | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'suggest' | 'check' | 'approve' | 'reject'>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success' | 'warning'; text: string } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveSuccessOpen, setApproveSuccessOpen] = useState(false);
  const [approveSuccessText, setApproveSuccessText] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  /** Existing org selected for prefilling (empty = brand-new organization). */
  const [sourceOrgTenantId, setSourceOrgTenantId] = useState('');
  const [siteDraft, setSiteDraft] = useState<OnboardingSiteProvisionDraft | null>(null);
  const [provisionedOrg, setProvisionedOrg] = useState<TenantOrganizationDTO | null>(null);
  const [provisionedOrgError, setProvisionedOrgError] = useState<string | null>(null);

  const editable = request.status === 'PENDING' || request.status === 'FAILED';
  const result = useMemo(() => parseResult(request.provisioningResult), [request.provisioningResult]);
  const dirty = useMemo(() => Object.keys(diffFields(savedFields, fields)).length > 0, [savedFields, fields]);
  const requireContactDetails = !sourceOrgTenantId.trim();
  const organizationIdFromResult = result?.tenantOrganizationId as number | undefined;

  const applySourceTenantToProvisioning = useCallback(
    (sourceTenantId: string) => {
      const tid = sourceTenantId.trim();
      if (!tid) return;
      setSourceOrgTenantId(tid);
      setProv((prev) => ({
        ...prev,
        adminSourceTenantId: tid,
        cloneAdmins: true,
        ownerTenantId: tid,
      }));
    },
    []
  );

  useEffect(() => {
    if (request.status !== 'APPROVED' || organizationIdFromResult == null) {
      setProvisionedOrg(null);
      setProvisionedOrgError(null);
      return;
    }
    let cancelled = false;
    async function loadOrg() {
      try {
        const org = await fetchTenantOrganization(organizationIdFromResult!);
        if (!cancelled) {
          setProvisionedOrg(org);
          setProvisionedOrgError(org ? null : 'Organization record was not found.');
        }
      } catch (error) {
        if (!cancelled) {
          setProvisionedOrg(null);
          setProvisionedOrgError(error instanceof Error ? error.message : 'Failed to load organization');
        }
      }
    }
    void loadOrg();
    return () => {
      cancelled = true;
    };
  }, [request.status, organizationIdFromResult]);

  useEffect(() => {
    if (!editable || !request.id) return;
    let cancelled = false;

    async function hydrateSourceOrg() {
      const draft = readOnboardingSiteDraft(request.id!);
      if (!cancelled && draft) {
        setSiteDraft(draft);
        setProv((prev) => ({
          ...prev,
          tenantPrefix: draft.tenantPrefix || prev.tenantPrefix,
          tenantId: draft.tenantId || prev.tenantId,
        }));
      }

      const remembered =
        draft?.sourceTenantId?.trim() || readOnboardingSourceTenant(request.id!);
      if (remembered) {
        if (!cancelled) applySourceTenantToProvisioning(remembered, fields.organizationName);
        return;
      }
      const orgName = fields.organizationName?.trim();
      if (!orgName) return;
      try {
        const matches = await searchTenantOrganizationsForSelectServer(orgName);
        if (cancelled) return;
        const exact = matches.find(
          (org) => org.organizationName?.trim().toLowerCase() === orgName.toLowerCase()
        );
        if (exact?.tenantId) {
          rememberOnboardingSourceTenant(request.id!, exact.tenantId);
          applySourceTenantToProvisioning(exact.tenantId, orgName);
        }
      } catch (error) {
        console.error('[onboarding-requests] source org hydrate failed', error);
      }
    }

    void hydrateSourceOrg();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount for this request id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, editable]);

  const onSelectExistingOrganization = useCallback(
    (org: TenantOrganizationDTO) => {
      setFields((prev) => mapTenantOrganizationToOnboardingFields(org, prev));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.organizationName;
        delete next.contactEmail;
        delete next.contactFirstName;
        delete next.contactLastName;
        delete next.contactPhone;
        return next;
      });
      if (org.tenantId && request.id) {
        rememberOnboardingSourceTenant(request.id, org.tenantId);
        applySourceTenantToProvisioning(org.tenantId, org.organizationName);
      }
      setProv((prev) => ({
        ...prev,
        displayName: org.organizationName?.trim() || prev.displayName,
        contactEmail: org.contactEmail?.trim() || prev.contactEmail,
        tenantPrefix: suggestTenantIdPrefixFromName(org.organizationName ?? prev.displayName),
      }));
    },
    [applySourceTenantToProvisioning, request.id]
  );

  const onClearExistingOrganization = useCallback(() => {
    setSourceOrgTenantId('');
    setProv((prev) => ({ ...prev, adminSourceTenantId: '', ownerTenantId: '' }));
  }, []);

  const onFieldChange = (name: keyof OnboardingFieldValues, value: string | boolean) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const onFieldBlur = (name: keyof OnboardingFieldValues) => {
    const { errors } = validateOnboardingSubmit(
      { ...fields },
      { requireContactDetails }
    );
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (errors[name]) next[name] = errors[name];
      else delete next[name];
      return next;
    });
  };

  const setProvField = <K extends keyof ProvisioningValues>(name: K, value: ProvisioningValues[K]) => {
    if (provErrors[name]) {
      setProvErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setAvailability(null);
    setProv((prev) => ({ ...prev, [name]: value }));
  };

  const saveFields = async (): Promise<boolean> => {
    const { errors } = validateOnboardingSubmit(
      { ...fields },
      { requireContactDetails }
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({ kind: 'error', text: 'Fix the highlighted request fields first.' });
      return false;
    }
    const patch = diffFields(savedFields, fields);
    if (Object.keys(patch).length === 0) return true;
    setBusy('save');
    const res = await updateOnboardingRequestServer(request.id!, patch);
    setBusy(null);
    if (!res.ok) {
      setMessage({ kind: 'error', text: res.error });
      return false;
    }
    setRequest(res.data);
    const refreshed = toFieldValues(res.data);
    setSavedFields(refreshed);
    setFields(refreshed);
    setMessage({ kind: 'success', text: 'Changes saved.' });
    return true;
  };

  const suggestTenantId = async () => {
    setBusy('suggest');
    const suggestion = await previewOnboardingTenantIdServer(prov.tenantPrefix);
    setBusy(null);
    if (!suggestion) {
      setProvErrors((prev) => ({ ...prev, tenantPrefix: 'Prefix must use letters, numbers and underscores and end with a letter' }));
      return;
    }
    setProvField('tenantId', suggestion);
  };

  const validateProvisioning = (): boolean => {
    const errs: Record<string, string> = {};
    if (!TENANT_ID_PATTERN.test(prov.tenantId.trim())) {
      errs.tenantId =
        'Use lowercase letters, numbers, and underscores only (e.g. bst_school_demo_1). Hyphens are not allowed.';
    }
    if (!SATELLITE_KEY_PATTERN.test(prov.satelliteKey.trim())) errs.satelliteKey = 'Satellite key is required (lowercase letters, numbers, hyphens)';
    if (!normalizeOnboardingHostname(prov.hostname)) errs.hostname = 'Hostname is required';
    setProvErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const runAvailability = async (): Promise<OnboardingAvailability | null> => {
    if (!validateProvisioning()) return null;
    setBusy('check');
    const res = await checkOnboardingAvailabilityServer({
      tenantId: prov.tenantId,
      organizationDomain: prov.organizationDomain,
      satelliteKey: prov.satelliteKey,
      hostname: prov.hostname,
    });
    setBusy(null);
    setAvailability(res);
    return res;
  };

  const openApprove = async () => {
    setMessage(null);
    if (dirty && !(await saveFields())) return;
    const res = await runAvailability();
    if (!res) return;
    if (res.tenantIdTaken || res.organizationDomainTaken || res.satelliteKeyTaken || res.hostnameTaken) {
      setMessage({ kind: 'error', text: 'Some values are already in use. Change them before approving.' });
      return;
    }
    setApproveOpen(true);
  };

  const confirmApprove = async () => {
    setBusy('approve');
    const res = await approveOnboardingRequestServer(
      request.id!,
      {
        tenantId: prov.tenantId.trim(),
        satelliteKey: prov.satelliteKey.trim(),
        hostname: normalizeOnboardingHostname(prov.hostname),
        organizationDomain: prov.organizationDomain.trim() || undefined,
        displayName: prov.displayName.trim() || undefined,
        contactEmail: prov.contactEmail.trim() || undefined,
        infoEmail: prov.infoEmail.trim() || undefined,
        noreplyEmail: prov.noreplyEmail.trim() || undefined,
        adminSourceTenantId: prov.adminSourceTenantId.trim() || undefined,
        cloneAdmins: prov.cloneAdmins,
        notifySubmitter: prov.notifySubmitter,
        adminComments: prov.adminComments.trim() || undefined,
        parentOrganizationId: prov.ownerTenantId.trim()
          ? await resolveClientOrganizationId(prov.ownerTenantId.trim())
          : undefined,
      },
      (fields.siteType || null) as TenantSiteType | null
    );
    setBusy(null);
    setApproveOpen(false);
    if (!res.ok) {
      setMessage({ kind: 'error', text: res.error });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setRequest(res.data.request);

    // Apply subscription intent from onboarding /new draft (not on approve DTO).
    const draftForPatch = siteDraft || (request.id ? readOnboardingSiteDraft(request.id) : null);
    const createdOrgId = (parseResult(res.data.request.provisioningResult)?.tenantOrganizationId ??
      null) as number | null;
    if (createdOrgId && draftForPatch) {
      const fee = Number.parseFloat(draftForPatch.monthlyFeeUsd || '0');
      const hasSubscriptionIntent =
        !!(
          draftForPatch.subscriptionPlan ||
          draftForPatch.subscriptionStatus ||
          draftForPatch.subscriptionStartDate ||
          draftForPatch.subscriptionEndDate ||
          draftForPatch.stripeCustomerId ||
          (Number.isFinite(fee) && fee > 0)
        );
      if (hasSubscriptionIntent) {
        try {
          await patchTenantOrganization(createdOrgId, {
            subscriptionPlan: draftForPatch.subscriptionPlan || undefined,
            subscriptionStatus: draftForPatch.subscriptionStatus || undefined,
            subscriptionStartDate: draftForPatch.subscriptionStartDate || undefined,
            subscriptionEndDate: draftForPatch.subscriptionEndDate || undefined,
            monthlyFeeUsd: Number.isFinite(fee) ? fee : 0,
            stripeCustomerId: draftForPatch.stripeCustomerId || undefined,
          });
          const tenantForBilling = res.data.request.assignedTenantId || prov.tenantId;
          if (isComplimentarySubscriptionPlan(draftForPatch.subscriptionPlan) && tenantForBilling) {
            await applyComplimentaryPlatformBilling(tenantForBilling);
          }
        } catch (error) {
          console.error('[onboarding-requests] subscription patch after approve failed', error);
          res.data.warnings.push(
            'Tenant was created, but subscription fields from the onboarding draft could not be saved. Update them on Tenant Settings.',
          );
        }
      }
    }

    const successText =
      res.data.warnings.length > 0
        ? `Approved. Tenant ${res.data.request.assignedTenantId || prov.tenantId} was created. ${res.data.warnings.join(' ')}`
        : `Approved. Tenant ${res.data.request.assignedTenantId || prov.tenantId} was created.`;
    setMessage({ kind: res.data.warnings.length > 0 ? 'warning' : 'success', text: successText });
    setApproveSuccessText(successText);
    setApproveSuccessOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required. It is emailed to the customer.');
      return;
    }
    setBusy('reject');
    const res = await rejectOnboardingRequestServer(request.id!, {
      adminComments: rejectReason.trim(),
      notifySubmitter: prov.notifySubmitter,
    });
    setBusy(null);
    if (!res.ok) {
      setRejectError(res.error);
      return;
    }
    setRejectOpen(false);
    setRequest(res.data);
    setMessage({ kind: 'success', text: 'Request rejected.' });
  };

  const takenBadge = (taken?: boolean) =>
    availability == null ? null : taken ? (
      <span className="text-xs font-semibold text-red-600 ml-2">Already in use</span>
    ) : (
      <span className="text-xs font-semibold text-green-600 ml-2">Available</span>
    );

  const messageStyles = {
    error: 'bg-red-50 border-red-300 text-red-700',
    success: 'bg-green-50 border-green-300 text-green-700',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
  };

  const tenantIdForLinks = request.assignedTenantId ?? (result?.tenantId as string | undefined);
  const settingsId = result?.tenantSettingsId as number | undefined;
  const organizationId = organizationIdFromResult;
  const clonedAdmins = Array.isArray(result?.clonedAdmins) ? (result?.clonedAdmins as { email?: string; userRole?: string }[]) : [];
  const siteTypeDisplay = siteTypeLabel(request.siteType);
  const ownershipMatch = ownershipOptions.find((o) => o.value === request.domainOwnership);
  const domainOwnershipDisplay = ownershipMatch
    ? `${ownershipMatch.label} (${ownershipMatch.value})`
    : domainOwnershipLabel(request.domainOwnership);
  const domainOwnershipHint = ownershipMatch?.label || request.domainOwnership || 'Not set';
  const siteTypeHint =
    ONBOARDING_SITE_TYPE_OPTIONS.find((o) => o.value === request.siteType)?.hint || '';
  const manualStepsText = buildManualStepsText(request, tenantIdForLinks);
  const orgDetailsText = provisionedOrg ? buildOrganizationDetailsText(provisionedOrg) : '';
  const cursorEnvText = buildCursorEnvHandoffText(request, tenantIdForLinks);
  const wwwHost = request.requestedHostname || 'www.example.com';
  const folderHint = suggestFolderFromHostname(wwwHost);
  const orgSequence = provisionedOrg?.tenantId ? extractTenantIdSequence(provisionedOrg.tenantId) : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8" style={{ paddingTop: '180px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNavigation
          currentPage="onboarding-requests"
          contextLine="Review and provision this tenant onboarding request."
        />

        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <AdminBackButton href="/admin/onboarding-requests" label="Back to onboarding requests" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{request.organizationName}</h1>
                <p className="text-gray-600 font-mono text-sm">{request.requestCode}</p>
              </div>
              {request.status && (
                <span className={`inline-flex px-3 py-1 rounded-full border text-sm font-semibold ${ONBOARDING_STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-900">{request.source === 'ADMIN_MANUAL' ? 'Entered by admin' : 'Public form'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd className="text-gray-900">{formatDate(request.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reviewed</dt>
                <dd className="text-gray-900">
                  {formatDate(request.reviewedAt)}
                  {request.reviewedByEmail ? ` by ${request.reviewedByEmail}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitter IP</dt>
                <dd className="text-gray-900 font-mono">{request.submitterIp || '—'}</dd>
              </div>
            </dl>
            {request.adminComments && !editable && (
              <p className="mt-4 text-sm text-gray-700">
                <span className="font-semibold">Reviewer comments:</span> {request.adminComments}
              </p>
            )}
          </div>

          {message && (
            <div className={`p-4 border rounded-lg ${messageStyles[message.kind]}`} role="status">
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {request.status === 'FAILED' && result?.error != null && (
            <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
              <p className="text-sm font-semibold text-orange-800">Last approval attempt failed and was rolled back:</p>
              <p className="text-sm text-orange-800 mt-1">{String(result.error)}</p>
              <p className="text-xs text-orange-700 mt-2">Fix the values below and approve again.</p>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Tenant created</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Tenant ID</dt><dd className="font-mono text-gray-900">{tenantIdForLinks}</dd></div>
                <div><dt className="text-gray-500">Satellite key</dt><dd className="font-mono text-gray-900">{request.satelliteKey}</dd></div>
                <div><dt className="text-gray-500">Hostname</dt><dd className="font-mono text-gray-900">{request.requestedHostname}</dd></div>
                <div><dt className="text-gray-500">No-reply email</dt><dd className="font-mono text-gray-900">{request.noreplyEmail || '—'}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Admins copied</dt>
                  <dd className="text-gray-900">
                    {clonedAdmins.length === 0 ? 'None' : clonedAdmins.map((a) => `${a.email} (${a.userRole})`).join(', ')}
                  </dd>
                </div>
              </dl>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {organizationId != null && (
                  <Link href={`/admin/tenant-management/organizations/${organizationId}`} className="w-full flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105" title="View Organization" aria-label="View Organization">
                    <span className="font-semibold text-green-700">View Organization</span>
                  </Link>
                )}
                {settingsId != null && (
                  <Link href={`/admin/tenant-management/settings/${settingsId}/edit`} className="w-full flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105" title="Edit Settings" aria-label="Edit Settings">
                    <span className="font-semibold text-blue-700">Edit Tenant Settings</span>
                  </Link>
                )}
                <Link href="/admin/satellite-domains" className="w-full flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105" title="Satellite Domains" aria-label="Satellite Domains">
                  <span className="font-semibold text-indigo-700">Satellite Domains</span>
                </Link>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <h3 className="font-semibold text-blue-900">Remaining manual steps</h3>
                  <CopyInstructionsButton
                    text={manualStepsText}
                    label="Copy instructions"
                    title="Copy remaining manual steps for application deployment"
                  />
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-900">
                  <div>
                    <dt className="font-semibold">Site type</dt>
                    <dd>{siteTypeDisplay}{siteTypeHint ? ` — ${siteTypeHint}` : ''}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Domain ownership</dt>
                    <dd>{domainOwnershipDisplay}</dd>
                    <dd className="text-blue-800 mt-1 text-xs">
                      {request.domainOwnership === 'PLATFORM_REGISTERS' && (
                        <>Register the apex in Route 53, create a hosted zone, then attach Amplify custom domain.</>
                      )}
                      {request.domainOwnership === 'CUSTOMER_REGISTRAR' && (
                        <>
                          DNS-only handoff from the customer’s registrar (NS to Route 53, or CNAME/ALIAS to Amplify).
                          Do not assume a hosted zone already exists unless the platform owns DNS.
                        </>
                      )}
                      {request.domainOwnership === 'ALREADY_IN_PLATFORM' && (
                        <>Confirm the existing Route 53 hosted zone and Amplify domain mapping before changing DNS.</>
                      )}
                      {!request.domainOwnership && <>{domainOwnershipHint}</>}
                      {request.registrarNotes?.trim() && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-blue-950">{request.registrarNotes}</p>
                      )}
                    </dd>
                  </div>
                </dl>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-900">
                  <li>DNS: point <span className="font-mono">{request.requestedHostname}</span> (and the bare domain <span className="font-mono">{stripWww(request.requestedHostname || '')}</span>) at the satellite Amplify app.</li>
                  <li>Amplify: add the custom domain, then set <span className="font-mono">NEXT_PUBLIC_TENANT_ID={tenantIdForLinks}</span> and the site env vars on the satellite app.</li>
                  <li>Clerk: add the hostname as a satellite domain on the production instance and verify its DNS records.</li>
                  <li>Email: verify the sending domain for <span className="font-mono">{request.noreplyEmail || 'the no-reply address'}</span> in SES.</li>
                  <li>Payments (if requested): set up Stripe keys in Tenant Settings.</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">Organization Details</h3>
                  {orgDetailsText ? (
                    <CopyInstructionsButton
                      text={orgDetailsText}
                      label="Copy org details"
                      title="Copy organization database details"
                    />
                  ) : null}
                </div>
                {provisionedOrgError && (
                  <p className="text-sm text-red-600">{provisionedOrgError}</p>
                )}
                {!provisionedOrg && !provisionedOrgError && organizationId != null && (
                  <p className="text-sm text-gray-600">Loading organization record…</p>
                )}
                {organizationId == null && (
                  <p className="text-sm text-gray-600">No organization ID in the provisioning result.</p>
                )}
                {provisionedOrg && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Organization Name</dt>
                      <dd className="text-gray-900 font-medium">{provisionedOrg.organizationName || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Website Tenant ID</dt>
                      <dd className="font-mono text-gray-900">{provisionedOrg.tenantId || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Tenant ID Sequence</dt>
                      <dd className="font-mono text-gray-900">{orgSequence != null ? orgSequence : 'Not parsed'}</dd>
                    </div>
                  </dl>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-indigo-900">Frontend clone / Cursor rule handoff</h3>
                    <p className="text-xs text-indigo-800 mt-1">
                      Paste into Cursor with{' '}
                      <span className="font-mono">Copy_FrontendProjectFrom_Template.mdc</span>. Env pattern
                      reference: <span className="font-mono">F:\project_workspace\kcnj-prod\.env.local</span> (no secrets copied here).
                    </p>
                  </div>
                  <CopyInstructionsButton
                    text={cursorEnvText}
                    label="Copy Cursor prompt"
                    title="Copy Cursor rule prompt and satellite env checklist"
                  />
                </div>
                <pre className="text-xs sm:text-sm text-indigo-950 bg-white/70 border border-indigo-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
{`Copy F:\\project_workspace\\kcnj-temp to F:\\project_workspace\\${folderHint}.
Include .env.local. Change the domain to ${wwwHost}.
Optional: tenant id ${tenantIdForLinks || '<tenant_id>'}, local port 3003.
Follow .cursor/rules/Copy_FrontendProjectFrom_Template.mdc

NEXT_PUBLIC_APP_URL=https://${wwwHost}
NEXT_PUBLIC_CLERK_IS_SATELLITE=true
NEXT_PUBLIC_CLERK_DOMAIN=${wwwHost}
NEXT_PUBLIC_TENANT_ID=${tenantIdForLinks || '<tenant_id>'}
NEXT_PUBLIC_API_BASE_URL=<leave as template / set per environment>`}
                </pre>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Request details</h2>
              {editable && (
                <button
                  type="button"
                  onClick={() => { setMessage(null); void saveFields(); }}
                  disabled={!dirty || busy !== null}
                  className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === 'save' ? 'Saving...' : 'Save changes'}
                </button>
              )}
            </div>
            <OnboardingRequestFields
              values={fields}
              errors={fieldErrors}
              disabled={!editable}
              onChange={onFieldChange}
              onBlurField={onFieldBlur}
              onSelectExistingOrganization={onSelectExistingOrganization}
              onClearExistingOrganization={onClearExistingOrganization}
              requireContactDetails={false}
              hideCrmFields
              selectExistingOnly={editable}
              tenantIdForLogoUpload={prov.tenantId || request.assignedTenantId || undefined}
            />
          </div>

          {editable && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Provisioning</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Approve creates the organization, tenant settings, contact/info/no-reply email addresses, the satellite domain and copies the
                  platform admins, all in one transaction. Empty optional fields use defaults.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tenantPrefix" className="block text-sm font-medium text-gray-700">Tenant ID prefix</label>
                  <div className="flex gap-2">
                    <input id="tenantPrefix" type="text" value={prov.tenantPrefix} onChange={(e) => setProvField('tenantPrefix', e.target.value)} className={onboardingInputClass(!!provErrors.tenantPrefix)} />
                    <button type="button" onClick={suggestTenantId} disabled={busy !== null} className="mt-1 px-4 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm whitespace-nowrap disabled:opacity-50">
                      {busy === 'suggest' ? '...' : 'Suggest ID'}
                    </button>
                  </div>
                  {provErrors.tenantPrefix && <div className="text-red-500 text-sm mt-1">{provErrors.tenantPrefix}</div>}
                </div>
                <div>
                  <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">Tenant ID *{takenBadge(availability?.tenantIdTaken)}</label>
                  <input
                    id="tenantId"
                    type="text"
                    value={prov.tenantId}
                    onChange={(e) => setProvField('tenantId', e.target.value.trim().toLowerCase())}
                    placeholder="bst_school_demo_1"
                    className={onboardingInputClass(!!provErrors.tenantId)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Example: <span className="font-mono">bst_school_demo_1</span>. Use underscores only — hyphens (-) are not allowed in the tenant ID.
                  </p>
                  {provErrors.tenantId && <div className="text-red-500 text-sm mt-1">{provErrors.tenantId}</div>}
                </div>
                <div>
                  <label htmlFor="satelliteKey" className="block text-sm font-medium text-gray-700">Satellite key *{takenBadge(availability?.satelliteKeyTaken)}</label>
                  <input id="satelliteKey" type="text" value={prov.satelliteKey} onChange={(e) => setProvField('satelliteKey', e.target.value.trim().toLowerCase())} className={onboardingInputClass(!!provErrors.satelliteKey)} />
                  {provErrors.satelliteKey && <div className="text-red-500 text-sm mt-1">{provErrors.satelliteKey}</div>}
                </div>
                <div>
                  <label htmlFor="hostname" className="block text-sm font-medium text-gray-700">Hostname *{takenBadge(availability?.hostnameTaken)}</label>
                  <input id="hostname" type="text" value={prov.hostname} onChange={(e) => setProvField('hostname', e.target.value)} className={onboardingInputClass(!!provErrors.hostname)} />
                  {provErrors.hostname && <div className="text-red-500 text-sm mt-1">{provErrors.hostname}</div>}
                </div>
                <div>
                  <label htmlFor="organizationDomain" className="block text-sm font-medium text-gray-700">Organization domain{takenBadge(availability?.organizationDomainTaken)}</label>
                  <input id="organizationDomain" type="text" value={prov.organizationDomain} onChange={(e) => setProvField('organizationDomain', e.target.value.trim().toLowerCase())} className={onboardingInputClass()} />
                </div>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display name</label>
                  <input id="displayName" type="text" value={prov.displayName} onChange={(e) => setProvField('displayName', e.target.value)} className={onboardingInputClass()} />
                </div>
                <div>
                  <label htmlFor="contactEmailProv" className="block text-sm font-medium text-gray-700">Contact email (site)</label>
                  <input id="contactEmailProv" type="email" value={prov.contactEmail} onChange={(e) => setProvField('contactEmail', e.target.value)} className={onboardingInputClass()} />
                </div>
                <div>
                  <label htmlFor="infoEmail" className="block text-sm font-medium text-gray-700">Info email</label>
                  <input id="infoEmail" type="email" value={prov.infoEmail} onChange={(e) => setProvField('infoEmail', e.target.value)} placeholder="Defaults to contact email" className={onboardingInputClass()} />
                </div>
                <div>
                  <label htmlFor="noreplyEmail" className="block text-sm font-medium text-gray-700">No-reply email</label>
                  <input id="noreplyEmail" type="email" value={prov.noreplyEmail} onChange={(e) => setProvField('noreplyEmail', e.target.value)} placeholder={`noreply@${prov.organizationDomain || 'domain'}`} className={onboardingInputClass()} />
                </div>
                <div>
                  <label htmlFor="adminSourceTenantId" className="block text-sm font-medium text-gray-700">Copy admins from tenant</label>
                  <input id="adminSourceTenantId" type="text" value={prov.adminSourceTenantId} onChange={(e) => setProvField('adminSourceTenantId', e.target.value.trim())} placeholder="Platform default" disabled={!prov.cloneAdmins} className={onboardingInputClass()} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="ownerTenantId" className="block text-sm font-medium text-gray-700">Add under organization</label>
                  <TenantOrganizationSearchSelect
                    value={prov.ownerTenantId}
                    onChange={(tenantId) => setProvField('ownerTenantId', tenantId)}
                  />
                  <p className="text-sm text-gray-500 mt-1">Optional. Leave empty when this website is its own client. The new site keeps its own tenant ID, domain, and satellite.</p>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="adminComments" className="block text-sm font-medium text-gray-700">Reviewer comments (internal)</label>
                  <textarea id="adminComments" rows={2} value={prov.adminComments} onChange={(e) => setProvField('adminComments', e.target.value)} className={onboardingInputClass()} />
                </div>
                <label className="flex items-center gap-3 text-gray-800">
                  <input type="checkbox" checked={prov.cloneAdmins} onChange={(e) => setProvField('cloneAdmins', e.target.checked)} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                  <span>Copy platform ADMIN / SUPER_ADMIN profiles</span>
                </label>
                <label className="flex items-center gap-3 text-gray-800">
                  <input type="checkbox" checked={prov.notifySubmitter} onChange={(e) => setProvField('notifySubmitter', e.target.checked)} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                  <span>Email the customer about the decision</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => void runAvailability()} disabled={busy !== null} className="flex-1 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="font-semibold text-indigo-700">{busy === 'check' ? 'Checking...' : 'Check availability'}</span>
                </button>
                {request.status === 'PENDING' && (
                  <button type="button" onClick={() => { setRejectError(null); setRejectOpen(true); }} disabled={busy !== null} className="flex-1 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="font-semibold text-red-700">Reject</span>
                  </button>
                )}
                <button type="button" onClick={() => void openApprove()} disabled={busy !== null} className="flex-1 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-semibold text-green-700">{request.status === 'FAILED' ? 'Retry approval' : 'Approve'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={(open) => busy !== 'approve' && setApproveOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve and create tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates tenant <span className="font-mono font-semibold">{prov.tenantId}</span> for{' '}
              <span className="font-semibold">{fields.organizationName}</span> on{' '}
              <span className="font-mono">{normalizeOnboardingHostname(prov.hostname)}</span>. If any step fails, nothing is created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel disabled={busy === 'approve'} className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Cancel</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmApprove(); }}
              disabled={busy === 'approve'}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                {busy === 'approve' ? (
                  <svg className="animate-spin w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-green-700">{busy === 'approve' ? 'Creating...' : 'Approve'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={approveSuccessOpen} onOpenChange={setApproveSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approval successful</AlertDialogTitle>
            <AlertDialogDescription>{approveSuccessText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogAction
              onClick={() => setApproveSuccessOpen(false)}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-semibold text-green-700">Done</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={(open) => busy !== 'reject' && setRejectOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
            <AlertDialogDescription>
              {prov.notifySubmitter ? 'The reason below is emailed to the customer.' : 'The customer will not be emailed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setRejectError(null); }}
              placeholder="Reason for rejecting"
              className={onboardingInputClass(!!rejectError)}
            />
            {rejectError && <div className="text-red-500 text-sm mt-1">{rejectError}</div>}
          </div>
          <AlertDialogFooter className="flex flex-row gap-3 sm:gap-4">
            <AlertDialogCancel disabled={busy === 'reject'} className="flex-1 flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105">
              <span className="font-semibold text-blue-700">Keep request</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmReject(); }}
              disabled={busy === 'reject'}
              className="flex-1 flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="font-semibold text-red-700">{busy === 'reject' ? 'Rejecting...' : 'Reject request'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
