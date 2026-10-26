import type { TenantSettingsDTO } from '@/types';

export interface SiteTypePresetSettings {
  showEventsSectionInHomePage?: boolean;
  showTeamMembersSectionInHomePage?: boolean;
  showExecutiveCommitteeSectionInHomePage?: boolean;
  showSponsorsSectionInHomePage?: boolean;
  showPublicProfileHeroSection?: boolean;
  showProfileWritingsSection?: boolean;
  showProfileAchievementsSection?: boolean;
  showProfileAffiliationsSection?: boolean;
  showProfileMediaDownloadsSection?: boolean;
  showProfileContactSection?: boolean;
  showProfileProjectsSection?: boolean;
  showProfileServicesSection?: boolean;
  showProfileFamilySection?: boolean;
  showHeaderHome?: boolean;
  showHeaderAbout?: boolean;
  showHeaderEvents?: boolean;
  showHeaderFeatures?: boolean;
  showHeaderCalendar?: boolean;
  showHeaderGallery?: boolean;
  showHeaderContact?: boolean;
  showHeaderNews?: boolean;
  showHeaderDownloads?: boolean;
  showHeaderLinks?: boolean;
  showHeaderServices?: boolean;
  showHeaderAchievements?: boolean;
  showHeaderAffiliations?: boolean;
  showHeaderProjects?: boolean;
  showHeaderFamily?: boolean;
  showHeaderTournament?: boolean;
}

const EVENT_ORG_PRESET: SiteTypePresetSettings = {
  showEventsSectionInHomePage: true,
  showTeamMembersSectionInHomePage: false,
  showExecutiveCommitteeSectionInHomePage: false,
  showSponsorsSectionInHomePage: true,
  showPublicProfileHeroSection: false,
  showProfileWritingsSection: false,
  showProfileAchievementsSection: false,
  showProfileAffiliationsSection: false,
  showProfileMediaDownloadsSection: false,
  showProfileContactSection: false,
  showProfileProjectsSection: false,
  showProfileServicesSection: false,
  showProfileFamilySection: false,
  showHeaderHome: true,
  showHeaderAbout: true,
  showHeaderEvents: true,
  showHeaderFeatures: true,
  showHeaderCalendar: true,
  showHeaderGallery: true,
  showHeaderContact: true,
  showHeaderNews: false,
  showHeaderDownloads: false,
  showHeaderLinks: false,
  showHeaderServices: false,
  showHeaderAchievements: false,
  showHeaderAffiliations: false,
  showHeaderProjects: false,
  showHeaderFamily: false,
  showHeaderTournament: false,
};

const SPORTS_PRESET: SiteTypePresetSettings = {
  ...EVENT_ORG_PRESET,
  showTeamMembersSectionInHomePage: true,
  showHeaderTournament: true,
};

const CHURCH_PRESET: SiteTypePresetSettings = {
  ...EVENT_ORG_PRESET,
  showExecutiveCommitteeSectionInHomePage: true,
  showSponsorsSectionInHomePage: false,
};

const PERSONAL_PROFILE_PRESET: SiteTypePresetSettings = {
  showEventsSectionInHomePage: false,
  showTeamMembersSectionInHomePage: false,
  showExecutiveCommitteeSectionInHomePage: false,
  showSponsorsSectionInHomePage: false,
  showPublicProfileHeroSection: true,
  showProfileWritingsSection: true,
  showProfileAchievementsSection: true,
  showProfileAffiliationsSection: true,
  showProfileMediaDownloadsSection: true,
  showProfileContactSection: true,
  showProfileProjectsSection: true,
  showProfileServicesSection: true,
  showProfileFamilySection: true,
  showHeaderHome: true,
  showHeaderAbout: true,
  showHeaderEvents: false,
  showHeaderFeatures: false,
  showHeaderCalendar: false,
  showHeaderGallery: true,
  showHeaderContact: true,
  showHeaderNews: true,
  showHeaderDownloads: true,
  showHeaderLinks: true,
  showHeaderServices: true,
  showHeaderAchievements: true,
  showHeaderAffiliations: true,
  showHeaderProjects: true,
  showHeaderFamily: true,
  showHeaderTournament: false,
};

const HYBRID_PRESET: SiteTypePresetSettings = {
  ...PERSONAL_PROFILE_PRESET,
  showEventsSectionInHomePage: true,
  showSponsorsSectionInHomePage: true,
  showHeaderEvents: true,
  showHeaderFeatures: true,
  showHeaderCalendar: true,
};

// GAS_STATION tenants are dashboard-first: no public homepage sections.
const GAS_STATION_PRESET: SiteTypePresetSettings = {
  showEventsSectionInHomePage: false,
  showTeamMembersSectionInHomePage: false,
  showExecutiveCommitteeSectionInHomePage: false,
  showSponsorsSectionInHomePage: false,
  showPublicProfileHeroSection: false,
  showProfileWritingsSection: false,
  showProfileAchievementsSection: false,
  showProfileAffiliationsSection: false,
  showProfileMediaDownloadsSection: false,
  showProfileContactSection: false,
  showProfileProjectsSection: false,
  showProfileServicesSection: false,
  showProfileFamilySection: false,
  showHeaderHome: true,
  showHeaderAbout: false,
  showHeaderEvents: false,
  showHeaderFeatures: false,
  showHeaderCalendar: false,
  showHeaderGallery: false,
  showHeaderContact: false,
  showHeaderNews: false,
  showHeaderDownloads: false,
  showHeaderLinks: false,
  showHeaderServices: false,
  showHeaderAchievements: false,
  showHeaderAffiliations: false,
  showHeaderProjects: false,
  showHeaderFamily: false,
  showHeaderTournament: false,
};

export function getSiteTypePresetSettings(siteType: string, moduleKey?: string | null): SiteTypePresetSettings {
  const moduleName = (moduleKey || '').trim().toUpperCase();
  if (
    moduleName === 'GAS_STATION' ||
    moduleName === 'RETAIL' ||
    siteType === 'GAS_STATION' ||
    siteType === 'GAS_STATION_ENT' ||
    siteType === 'LIQUOR_STORE' ||
    siteType === 'DUNKIN_DONUTS' ||
    siteType === 'SEVEN_ELEVEN'
  ) {
    return GAS_STATION_PRESET;
  }
  switch (moduleName || siteType) {
    case 'SPORTS':
    case 'SPORTS_TEAM':
      return SPORTS_PRESET;
    case 'MUSIC':
    case 'MUSIC_BAND':
      return { ...SPORTS_PRESET, showHeaderTournament: false };
    case 'CHURCH':
    case 'CHURCH_ORG':
      return CHURCH_PRESET;
    case 'PROFILE':
    case 'PERSONAL_PROFILE':
      return PERSONAL_PROFILE_PRESET;
    case 'HYBRID':
      return HYBRID_PRESET;
    case 'EVENT':
    case 'EVENT_ORG':
    default:
      return EVENT_ORG_PRESET;
  }
}

export function applySiteTypePresetsToSettings(
  siteType: string,
  current: Partial<TenantSettingsDTO>
): Partial<TenantSettingsDTO> {
  return {
    ...current,
    ...getSiteTypePresetSettings(siteType),
  };
}

export function isProfileSiteType(siteType?: string | null, moduleKey?: string | null): boolean {
  const moduleName = (moduleKey || '').trim().toUpperCase();
  if (moduleName === 'PROFILE' || moduleName === 'HYBRID') return true;
  return siteType === 'PERSONAL_PROFILE' || siteType === 'HYBRID';
}
