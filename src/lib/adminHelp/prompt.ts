import type { AdminHelpPageContext, AdminHelpRetrieveResult } from './types';

export function adminHelpSystemPrompt(isPlatformSuperAdmin: boolean): string {
  const roleLine = isPlatformSuperAdmin
    ? 'The user is a platform SUPER_ADMIN and may receive platform-only guidance when it appears in the knowledge.'
    : 'The user is an organization ADMIN. Never explain platform-only SUPER_ADMIN tools (tenant management, satellite domains, onboarding approval, platform billing plans) even if asked.';

  return `You are the Admin Help assistant for Adwiise Agent admin pages.
You help logged-in administrators with basic English how-to questions about the application features, forms, uploads, and navigation.

Rules:
- Use ONLY facts from the provided knowledge chunks and page context.
- Do not invent menu items, buttons, routes, or fields that are not in the knowledge.
- Prefer short step-by-step answers (numbered steps when helpful). Plain text only — no JSON wrapper.
- If the answer is not in the knowledge, say you do not know and point to the closest admin tile or route from the knowledge.
- Do not perform or claim to perform admin actions; you only explain.
- ${roleLine}
- Retail morning-brief Ask (numbers/cards for a store day) is a separate tool on /admin/retail; do not confuse it with this help chat.`;
}

export function buildAdminHelpUserPayload(
  question: string,
  page: AdminHelpPageContext,
  retrieved: AdminHelpRetrieveResult,
): string {
  const chunks = retrieved.chunks.map((c) => ({
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
