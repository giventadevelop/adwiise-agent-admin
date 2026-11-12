'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantOrganizationForm from '@/app/admin/tenant-management/components/TenantOrganizationForm';
import SaveStatusDialog, { type SaveStatus } from '@/components/SaveStatusDialog';
import { updateTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import type { TenantOrganizationDTO, TenantOrganizationFormDTO } from '@/app/admin/tenant-management/types';

interface OrganizationEditClientProps {
  organizationId: number;
  organization: TenantOrganizationDTO;
}

export default function OrganizationEditClient({
  organizationId,
  organization,
}: OrganizationEditClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  async function handleSubmit(data: TenantOrganizationFormDTO) {
    setLoading(true);
    setSaveStatus('saving');
    setSaveMessage('Please wait while we save this organization.');

    try {
      await updateTenantOrganization(organizationId, data);
      setSaveStatus('success');
      setSaveMessage('The organization has been updated. Redirecting to the organization page...');
      setTimeout(() => {
        router.push(`/admin/tenant-management/organizations/${organizationId}`);
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to update the organization. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TenantOrganizationForm
        mode="edit"
        onSubmit={handleSubmit}
        initialData={organization}
        loading={loading}
      />
      <SaveStatusDialog
        isOpen={saveStatus !== 'idle'}
        status={saveStatus}
        message={saveMessage}
        onClose={() => {
          if (saveStatus === 'error') {
            setSaveStatus('idle');
            setSaveMessage('');
          }
        }}
      />
    </>
  );
}
