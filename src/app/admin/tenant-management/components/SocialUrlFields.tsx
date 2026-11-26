'use client';

import type { IconType } from 'react-icons';
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaTwitter, FaWhatsapp, FaYoutube } from 'react-icons/fa';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { TenantSettingsFormDTO } from '@/app/admin/tenant-management/types';

export type SocialUrlKey =
  | 'facebookUrl'
  | 'instagramUrl'
  | 'twitterUrl'
  | 'linkedinUrl'
  | 'youtubeUrl'
  | 'tiktokUrl'
  | 'whatsappUrl';

type SocialLink = {
  key: SocialUrlKey;
  label: string;
  placeholder: string;
  color: string;
  icon: IconType;
};

export const SOCIAL_LINKS: SocialLink[] = [
  { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://www.facebook.com/...', color: '#1877F2', icon: FaFacebook },
  { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://www.instagram.com/...', color: '#E1306C', icon: FaInstagram },
  { key: 'twitterUrl', label: 'X', placeholder: 'https://x.com/...', color: '#111827', icon: FaTwitter },
  { key: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/...', color: '#0A66C2', icon: FaLinkedin },
  { key: 'youtubeUrl', label: 'YouTube', placeholder: 'https://www.youtube.com/...', color: '#FF0000', icon: FaYoutube },
  { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://www.tiktok.com/...', color: '#111827', icon: FaTiktok },
  { key: 'whatsappUrl', label: 'WhatsApp', placeholder: 'https://api.whatsapp.com/send?phone=9188934773', color: '#25D366', icon: FaWhatsapp },
];

export function SocialUrlInputs({
  register,
  errors,
}: {
  register: UseFormRegister<TenantSettingsFormDTO>;
  errors: FieldErrors<TenantSettingsFormDTO>;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-md font-medium text-gray-900">Social links</h4>
      {SOCIAL_LINKS.map((link) => {
        const Icon = link.icon;
        const error = errors[link.key];
        return (
          <div key={link.key} className="flex items-start gap-3">
            <span
              className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: link.color }}
              aria-hidden="true"
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={link.key}>
                {link.label} URL
              </label>
              <input
                id={link.key}
                type="url"
                {...register(link.key, {
                  maxLength: { value: 1024, message: `${link.label} URL must be 1024 characters or less` },
                })}
                className="block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder={link.placeholder}
              />
              {error?.message ? <p className="mt-1 text-sm text-red-600">{String(error.message)}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SocialUrlList({
  values,
}: {
  values: Partial<Record<SocialUrlKey, string | null | undefined>>;
}) {
  return (
    <div className="sm:col-span-2 space-y-3">
      <h4 className="text-md font-medium text-gray-900">Social links</h4>
      {SOCIAL_LINKS.map((link) => {
        const Icon = link.icon;
        const url = (values[link.key] || '').trim();
        return (
          <div key={link.key} className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: link.color }}
              aria-hidden="true"
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <dt className="text-sm font-medium text-gray-500">{link.label}</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 underline">
                    {url}
                  </a>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
          </div>
        );
      })}
    </div>
  );
}
