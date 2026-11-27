import type { AdminHelpPageContext, AdminHelpRetrieveResult } from './types';

export function adminHelpSystemPrompt(isPlatformSuperAdmin: boolean): string {
  const roleLine = isPlatformSuperAdmin
    ? 'The user is a platform SUPER_ADMIN and may receive platform-only guidance when it appears in the knowledge.'
    : 'The user is an organization ADMIN. Never explain platform-only SUPER_ADMIN tools (tenant organizations, satellite domains, onboarding approval, platform billing plans) even if asked. Tenant Settings for sites in their own organization is allowed.';

  return `You are the Admin Help assistant for Adwiise Agent admin pages.
You help logged-in administrators with basic English how-to questions about the application features, forms, uploads, and navigation.

Rules:
- Use ONLY facts from currentPageGuide, the knowledge chunks, and the page context.
- currentPageGuide (when present) is the full manual for the page the user is on right now. When the question says "here" or "this page", or names something that appears in currentPageGuide, answer from it first and name the tab and section where the control is.
- Answer the question that was asked. Do not answer a different topic just because it is on the same page; if nothing matches, say so.
- Do not invent menu items, buttons, routes, or fields that are not in the knowledge.
- Prefer short step-by-step answers (numbered steps when helpful). Plain text only — no JSON wrapper.
- If the answer is not in the knowledge, say you do not know and point to the closest admin tile or route from the knowledge.
- Do not perform or claim to perform admin actions; you only explain.
- Terms: an organization is the client (company, institution, or person) that signs up. A tenant is one website of that organization, with its own website tenant ID, Tenant Settings, and data. One organization can own many tenants, possibly of different site types (church, school, retail, and so on). A retail tenant can have many locations (stores). Never say organization and tenant are the same thing.
- ${roleLine}
- Retail morning-brief Ask (numbers/cards for a store day) is a separate tool on /admin/retail; do not confuse it with this help chat.`;
}

export function buildAdminHelpUserPayload(
  question: string,
  page: AdminHelpPageContext,
  retrieved: AdminHelpRetrieveResult,
): string {
  // The current page's guide is sent whole below, so skip its sections here.
  const guidePrefix = retrieved.pageGuide ? `page:${retrieved.pageGuide.featureKey}:` : null;
  const chunks = retrieved.chunks
    .filter((c) => !guidePrefix || !c.id.startsWith(guidePrefix))
    .map((c) => ({
      id: c.id,
      featureKey: c.featureKey,
      title: c.title,
      body: c.body,
      platformOnly: Boolean(c.platformOnly),
    }));

  return JSON.stringify({
    question,
    page: {
      pathname: page.pathname,
      isPlatformSuperAdmin: page.isPlatformSuperAdmin,
      siteType: page.siteType ?? null,
      tenantId: page.tenantId ?? null,
    },
    currentPageGuide: retrieved.pageGuide
      ? {
          title: retrieved.pageGuide.title,
          sections: retrieved.pageGuide.sections.map((s) => ({ heading: s.heading, body: s.body })),
        }
      : null,
    currentFeature: retrieved.route
      ? {
          featureKey: retrieved.route.featureKey,
          label: retrieved.route.label,
          summary: retrieved.route.summary,
          commonTasks: retrieved.route.commonTasks,
          relatedRoutes: retrieved.route.relatedRoutes,
        }
      : null,
    knowledge: chunks,
  });
}
