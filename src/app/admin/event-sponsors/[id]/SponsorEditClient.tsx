'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa';
import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminNavigation from '@/components/AdminNavigation';
import SponsorImageUploadDialog from '@/components/sponsors/SponsorImageUploadDialog';
import SponsorMediaGallery from '@/components/sponsors/SponsorMediaGallery';
import SponsorImageUploadArea from '@/components/sponsors/SponsorImageUploadArea';
import type { EventSponsorsDTO, EventMediaDTO } from '@/types';
import { updateEventSponsorServer, fetchSponsorMediaServer } from '../ApiServerActions';
import PaginatedMediaList from './PaginatedMediaList';
import { useAdminTenantId } from '../../AdminTenantContext';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';
import SuccessDialog from '@/components/SuccessDialog';

interface SponsorEditClientProps {
  sponsor: EventSponsorsDTO;
  bannerPreviewUrl?: string;
  logoPreviewUrl?: string;
  heroPreviewUrl?: string;
  initialMediaList: EventMediaDTO[];
  totalMediaCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export default function SponsorEditClient({
  sponsor: initialSponsor,
  bannerPreviewUrl,
  logoPreviewUrl,
  heroPreviewUrl,
  initialMediaList,
  totalMediaCount,
  currentPage,
  pageSize,
  totalPages,
}: SponsorEditClientProps) {
  const router = useRouter();
  const tenantId = useAdminTenantId();
  const [sponsor, setSponsor] = useState<EventSponsorsDTO>(initialSponsor);
  const [formData, setFormData] = useState<Partial<EventSponsorsDTO>>(initialSponsor);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Upload dialog states (kept for backward compatibility, but not used in new UI)
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [heroUploadOpen, setHeroUploadOpen] = useState(false);
  const [bannerUploadOpen, setBannerUploadOpen] = useState(false);

  // Media refresh state
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  React.useEffect(() => {
    setShowSuccessDialog(false);
  }, [initialSponsor.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsor.id) return;

    try {
      setLoading(true);
      const updatedSponsor = await updateEventSponsorServer(sponsor.id, formData, tenantId);
      setSponsor(updatedSponsor);
      setShowSuccessDialog(true);

      // Refresh media list after update in case URLs changed
      setMediaRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to update sponsor' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUploadSuccess = (imageUrl: string, imageType: 'logo' | 'hero' | 'banner', _ocrChars?: number) => {
    const urlField = imageType === 'logo' ? 'logoUrl' : imageType === 'hero' ? 'heroImageUrl' : 'bannerImageUrl';
    const updatedSponsor = { ...sponsor, [urlField]: imageUrl };
    setSponsor(updatedSponsor);
    setFormData({ ...formData, [urlField]: imageUrl });
    // The upload area shows the confirmation or error dialog. Keep this handler to the saved URL.

    // Refresh media list
    setMediaRefreshKey(prev => prev + 1);

    // Dialog will be closed by the component itself
  };

  const sponsorTypes = [
    'Diamond',
    'Platinum',
    'Gold',
    'Silver',
    'Bronze',
    'Community Partner',
    'Media Partner',
    'Food & Beverage',
    'Entertainment',
    'Other'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingTop: '180px' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <AdminBackButton href="/admin/event-sponsors" label="Back to Sponsors" />
        </div>
      </div>

      <h1 className="font-heading font-semibold text-3xl text-foreground mb-2">Edit Sponsor</h1>
      <p className="font-body text-muted-foreground mb-2">
        {sponsor.name || 'Sponsor Details'}
      </p>
      <AdminTenantIdBanner
        tenantId={sponsor.tenantId}
        entityLabel="sponsor"
        className="mb-8"
      />

      <AdminNavigation currentPage="event-sponsors" />

      {/* Toast Message */}
      {toastMessage && (
        <div className={`mb-4 p-4 rounded-lg sacred-shadow ${
          toastMessage.type === 'success'
            ? 'bg-success/10 border border-success/20 text-success-foreground'
            : 'bg-destructive/10 border border-destructive/20 text-destructive-foreground'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-card rounded-lg sacred-shadow p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="font-heading font-semibold text-lg text-blue-800">Sponsor details</h3>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sponsor Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                required
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="Enter sponsor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type || ''}
                onChange={handleChange}
                required
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
              >
                <option value="">Select sponsor type</option>
                {sponsorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Priority Ranking *
              </label>
              <input
                type="number"
                name="priorityRanking"
                value={formData.priorityRanking || 1}
                onChange={handleChange}
                min="1"
                required
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="Enter priority ranking (1 = highest priority)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lower numbers indicate higher priority (1 = highest priority)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="Enter contact email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="Enter contact phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Website URL
              </label>
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://example.com"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive || false}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
              />
              <label className="ml-2 block text-sm text-foreground">
                Active Sponsor
              </label>
            </div>
          </div>
          </section>

          <section className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </div>
              <h3 className="font-heading font-semibold text-lg text-teal-800">Description</h3>
            </div>
          <div>
            <label className="block text-sm font-medium text-teal-800 mb-1">
              Tagline
            </label>
            <input
              type="text"
              name="tagline"
              value={formData.tagline || ''}
              onChange={handleChange}
              maxLength={500}
              className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
              placeholder="Enter sponsor tagline (max 500 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
              placeholder="Enter detailed description about the sponsor"
            />
          </div>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-heading font-semibold text-lg text-sky-800">Social links</h3>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" /></svg>
                </span>
                Facebook URL
              </label>
              <input
                type="url"
                name="facebookUrl"
                value={formData.facebookUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://facebook.com/sponsor"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-sky-800 mb-1">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-sky-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7.5c-.6.3-1.2.4-1.9.5.7-.4 1.2-1 1.4-1.8-.6.4-1.3.6-2.1.8A3.3 3.3 0 0012 9.3c0 .3 0 .5.1.8-2.7-.1-5.1-1.4-6.7-3.4-.3.5-.4 1-.4 1.6 0 1.1.6 2.1 1.5 2.7-.5 0-1-.2-1.5-.4 0 1.6 1.1 2.9 2.6 3.2-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.2 3 2.3A6.6 6.6 0 014 17.6 9.3 9.3 0 009.1 19c6.1 0 9.5-5.1 9.5-9.5v-.4c.6-.5 1.2-1 1.4-1.6z" /></svg>
                </span>
                Twitter URL
              </label>
              <input
                type="url"
                name="twitterUrl"
                value={formData.twitterUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://twitter.com/sponsor"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-800" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9H4V20h2.5V9zM5.2 4C4.3 4 3.6 4.7 3.6 5.6S4.3 7.2 5.2 7.2 6.9 6.5 6.9 5.6 6.2 4 5.2 4zM20 20h-2.5v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H11V9h2.4v1.5h.1c.3-.6 1.2-1.3 2.5-1.3 2.6 0 3.1 1.7 3.1 4V20z" /></svg>
                </span>
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://linkedin.com/company/sponsor"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-pink-800 mb-1">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-pink-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" strokeWidth={2} /><circle cx="12" cy="12" r="3.5" strokeWidth={2} /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
                </span>
                Instagram URL
              </label>
              <input
                type="url"
                name="instagramUrl"
                value={formData.instagramUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://instagram.com/sponsor"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-fuchsia-800 mb-1">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-fuchsia-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-fuchsia-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h2.2c.2 1.4 1 2.6 2.2 3.4 0 .6 1.4 1.2 2.1 1.3v2.3a6.3 6.3 0 01-3.6-1.1v6.4A5.4 5.4 0 1111 10.1v2.5a2.9 2.9 0 102 2.7V3z" /></svg>
                </span>
                TikTok URL
              </label>
              <input
                type="url"
                name="tiktokUrl"
                value={formData.tiktokUrl || ''}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring reverent-transition"
                placeholder="https://www.tiktok.com/@sponsor"
              />
            </div>
          </div>
          </section>

          <div className="space-y-4">
            <SponsorImageUploadArea
              sponsorId={sponsor.id!}
              imageType="banner"
              currentImageUrl={sponsor.bannerImageUrl || bannerPreviewUrl}
              onUploadSuccess={(imageUrl, ocrChars) => handleImageUploadSuccess(imageUrl, 'banner', ocrChars)}
              disabled={loading || !sponsor.id}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SponsorImageUploadArea
                sponsorId={sponsor.id!}
                imageType="logo"
                currentImageUrl={sponsor.logoUrl || logoPreviewUrl}
                onUploadSuccess={(imageUrl, ocrChars) => handleImageUploadSuccess(imageUrl, 'logo', ocrChars)}
                disabled={loading || !sponsor.id}
              />
              <SponsorImageUploadArea
                sponsorId={sponsor.id!}
                imageType="hero"
                currentImageUrl={sponsor.heroImageUrl || heroPreviewUrl}
                onUploadSuccess={(imageUrl, ocrChars) => handleImageUploadSuccess(imageUrl, 'hero', ocrChars)}
                disabled={loading || !sponsor.id}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin/event-sponsors')}
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
              title="Cancel"
              aria-label="Cancel"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-semibold text-blue-700">Cancel</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={loading ? 'Saving...' : 'Update Sponsor'}
              aria-label={loading ? 'Saving...' : 'Update Sponsor'}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                {loading ? (
                  <FaSpinner className="animate-spin w-6 h-6 text-blue-600" />
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-blue-700">{loading ? 'Saving...' : 'Update Sponsor'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Overview Section with Paginated Media Files */}
      <div className="bg-card rounded-lg sacred-shadow p-6">
        <h2 className="font-heading font-semibold text-2xl text-foreground mb-4">Overview</h2>
        <p className="font-body text-muted-foreground mb-6">
          Media files associated with this sponsor. Files are sorted by priority ranking (lower = higher priority).
        </p>

        <PaginatedMediaList
          sponsorId={sponsor.id!}
          initialMediaList={initialMediaList}
          totalCount={totalMediaCount}
          currentPage={currentPage}
          tenantId={sponsor.tenantId}
          pageSize={pageSize}
          totalPages={totalPages}
          refreshKey={mediaRefreshKey}
        />
      </div>

      {/* Image Upload Dialogs */}
      {sponsor.id && (
        <>
          <SponsorImageUploadDialog
            sponsor={sponsor}
            imageType="logo"
            isOpen={logoUploadOpen}
            onClose={() => setLogoUploadOpen(false)}
            onUploadSuccess={(imageUrl) => handleImageUploadSuccess(imageUrl, 'logo')}
            eventId={0} // Use 0 for main sponsor page
          />
          <SponsorImageUploadDialog
            sponsor={sponsor}
            imageType="hero"
            isOpen={heroUploadOpen}
            onClose={() => setHeroUploadOpen(false)}
            onUploadSuccess={(imageUrl) => handleImageUploadSuccess(imageUrl, 'hero')}
            eventId={0} // Use 0 for main sponsor page
          />
          <SponsorImageUploadDialog
            sponsor={sponsor}
            imageType="banner"
            isOpen={bannerUploadOpen}
            onClose={() => setBannerUploadOpen(false)}
            onUploadSuccess={(imageUrl) => handleImageUploadSuccess(imageUrl, 'banner')}
            eventId={0} // Use 0 for main sponsor page
          />
        </>
      )}

      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Sponsor updated"
        message={`${sponsor.name || 'Sponsor'} was saved successfully.`}
        buttonText="OK"
        showRefreshButton={false}
      />
    </div>
  );
}

