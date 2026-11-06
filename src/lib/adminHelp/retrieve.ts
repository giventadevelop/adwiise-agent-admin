import { ADMIN_HELP_CHUNKS, resolveRouteInfo } from './knowledge';
import type { AdminHelpChunk, AdminHelpPageContext, AdminHelpRetrieveResult } from './types';

const STOP = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'on',
  'in',
  'is',
  'are',
  'do',
  'i',
  'how',
  'what',
  'where',
  'when',
  'why',
  'can',
  'my',
  'me',
  'and',
  'or',
  'with',
  'this',
  'that',
  'it',
  'be',
  'about',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9/\s-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreChunk(
  chunk: AdminHelpChunk,
  tokens: string[],
  pathname: string,
  featureKey: string | null,
): number {
  let score = 0;
  const hay = `${chunk.title} ${chunk.body} ${chunk.keywords.join(' ')}`.toLowerCase();

  for (const token of tokens) {
    if (chunk.keywords.some((k) => k.toLowerCase().includes(token) || token.includes(k.toLowerCase()))) {
      score += 4;
    } else if (hay.includes(token)) {
      score += 2;
    }
  }

  if (featureKey && chunk.featureKey === featureKey) {
    score += 8;
  }

  if (chunk.pathPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    score += 6;
  }

  return score;
}

/**
 * Retrieve top knowledge chunks for a question + page context.
 * Platform-only chunks are omitted unless the caller is SUPER_ADMIN.
 */
export function retrieveAdminHelpKnowledge(
  question: string,
  page: AdminHelpPageContext,
  limit = 8,
): AdminHelpRetrieveResult {
  const pathname = (page.pathname || '').split('?')[0] || '/admin';
  const route = resolveRouteInfo(pathname);
  const tokens = tokenize(question);
  const featureKey = route?.featureKey ?? null;

  const visible = ADMIN_HELP_CHUNKS.filter((chunk) => {
    if (chunk.platformOnly && !page.isPlatformSuperAdmin) return false;
    if (route?.platformOnly && !page.isPlatformSuperAdmin && chunk.featureKey === route.featureKey) {
      return false;
    }
    return true;
  });

  const ranked = visible
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, pathname, featureKey) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  // Always include route-matched hub/howto slices even if keyword score was weak.
  const byId = new Map<string, AdminHelpChunk>();
  for (const row of ranked) {
    byId.set(row.chunk.id, row.chunk);
  }
  if (featureKey) {
    for (const chunk of visible) {
      if (chunk.featureKey === featureKey && !byId.has(chunk.id)) {
        byId.set(chunk.id, chunk);
      }
    }
  }

  // Prefer scored order, then feature-matched fillers.
  const ordered: AdminHelpChunk[] = [];
  for (const row of ranked) {
    if (ordered.length >= limit) break;
    ordered.push(row.chunk);
  }
  if (ordered.length < limit && featureKey) {
    for (const chunk of visible) {
      if (ordered.length >= limit) break;
      if (chunk.featureKey !== featureKey) continue;
      if (ordered.some((c) => c.id === chunk.id)) continue;
      ordered.push(chunk);
    }
  }

  // Fallback: top hub guides if nothing matched (empty question edge case handled by API).
  if (ordered.length === 0) {
    for (const chunk of visible) {
      if (ordered.length >= Math.min(4, limit)) break;
      if (chunk.id.startsWith('hub:')) ordered.push(chunk);
    }
  }

  return {
    route,
    chunks: ordered.slice(0, limit),
  };
}

/** True when the question looks like a platform-only topic for a non–SUPER_ADMIN. */
export function isPlatformOnlyQuestionBlocked(
  question: string,
  isPlatformSuperAdmin: boolean,
): boolean {
  if (isPlatformSuperAdmin) return false;
  const q = question.toLowerCase();
  const needles = [
    'satellite domain',
    'satellite domains',
    'onboarding request',
    'create a tenant',
    'create tenant',
    'tenant management',
    'platform billing plan',
    'organization portfolio',
    'all tenants',
    'super admin only',
  ];
  return needles.some((n) => q.includes(n));
}
