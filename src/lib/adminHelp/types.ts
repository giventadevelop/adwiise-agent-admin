/** Shared types for Admin Help Chat (knowledge pack + Bedrock ask). */

export type AdminHelpChunk = {
  id: string;
  /** Hub tile key, feature area, or guide slug. */
  featureKey: string;
  title: string;
  body: string;
  keywords: string[];
  /** When true, omit from retrieval for non–SUPER_ADMIN callers. */
  platformOnly?: boolean;
  /** Path prefixes this chunk is especially relevant for. */
  pathPrefixes?: string[];
};

export type AdminHelpRouteInfo = {
  featureKey: string;
  label: string;
  summary: string;
  commonTasks: string[];
  relatedRoutes: string[];
  suggestedChips: string[];
  platformOnly?: boolean;
};

export type AdminHelpPageContext = {
  pathname: string;
  isPlatformSuperAdmin: boolean;
  siteType?: string | null;
  tenantId?: string | null;
};

export type AdminHelpPageGuideSection = {
  /** Stable slug; chunk id is page:{featureKey}:{slug}. */
  slug: string;
  heading: string;
  body: string;
  keywords: string[];
};

/** Full manual for one admin page, sent whole when the user is on that page. */
export type AdminHelpPageGuide = {
  featureKey: string;
  title: string;
  pathPrefixes: string[];
  /** Code the guide was written from; review the guide when these change. */
  sourceFiles: string[];
  sections: AdminHelpPageGuideSection[];
  platformOnly?: boolean;
};

export type AdminHelpRetrieveResult = {
  route: AdminHelpRouteInfo | null;
  /** Guide for the page the user is on, when one exists and they may see it. */
  pageGuide: AdminHelpPageGuide | null;
  chunks: AdminHelpChunk[];
};
