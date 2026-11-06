import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createTenantOrganization } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { applySiteTypePresetsForTenant } from '@/app/admin/tenant-management/settings/ApiServerActions';
import TenantOrganizationForm from '@/app/admin/tenant-management/components/TenantOrganizationForm';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { TenantOrganizationFormDTO } from '@/app/admin/tenant-management/types';
import { adminPageTopStyle } from '@/lib/admin/adminPageLayout';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';

export default function NewTenantOrganizationPage() {
  async function handleSubmit(data: TenantOrganizationFormDTO) {
    'use server';

    try {
      await createTenantOrganization(data);
      if (data.siteType && data.siteType !== 'EVENT_ORG') {
        // Best-effort: settings row may not exist yet for a brand-new tenant
        await applySiteTypePresetsForTenant(data.tenantId, data.siteType);
      }
      redirect('/admin/tenant-management/organizations');
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={adminPageTopStyle}>
      {/* Breadcrumb Navigation */}
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/admin"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <Link
                href="/admin/tenant-management/organizations"
                className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
              >
                Organizations
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                New Organization
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Organization</h1>
        <div className="mt-4">
          <AdminTenantIdBanner contextLine="Creating a new organization — Tenant ID is generated when you save the form below." />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Add a new tenant organization to the system. Tenant IDs are auto-generated from your name prefix plus the next sequence number (e.g. ford_motors_1).
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Organization Information</h2>
        </div>
        <div className="px-6 py-6">
          <TenantOrganizationForm
            mode="create"
            onSubmit={handleSubmit}
            initialData={{
              organizationName: '',
              tenantId: '',
              domain: '',
              description: '',
              contactEmail: '',
              contactPhone: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              stateProvince: '',
              zipCode: '',
              country: '',
              websiteUrl: '',
              primaryColor: '#3B82F6',
              secondaryColor: '#1E40AF',
              logoUrl: '',
              subscriptionStatus: 'TRIAL',
              subscriptionPlan: 'BASIC',
              isActive: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}