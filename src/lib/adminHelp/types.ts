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

export type AdminHelpRetrieveResult = {
  route: AdminHelpRouteInfo | null;
  chunks: AdminHelpChunk[];
};
