import { ADMIN_HELP_CHUNKS, resolvePageGuide, resolveRouteInfo } from './knowledge';
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
  'here',
  'please',
  'there',
]);

export function tokenizeAdminHelpQuestion(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9/\s-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * How many question tokens hit a chunk's title or keywords (not body, not page boosts).
 * Used to tell a genuinely relevant chunk from one that only matched the current page.
 */
export function chunkTopicMatches(chunk: AdminHelpChunk, tokens: string[]): number {
  const keywords = chunk.keywords.map((k) => k.toLowerCase());
  const title = chunk.title.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (keywords.some((k) => k === token || k.split(/\s+/).includes(token)) || title.split(/[^a-z0-9]+/).includes(token)) {
      hits += 1;
    }
  }
  return hits;
}

const haystackCache = new WeakMap<AdminHelpChunk, string>();
function haystackOf(chunk: AdminHelpChunk): string {
  let hay = haystackCache.get(chunk);
  if (!hay) {
    hay = `${chunk.title} ${chunk.body} ${chunk.keywords.join(' ')}`.toLowerCase();
    haystackCache.set(chunk, hay);
  }
  return hay;
}

const weightCache = new Map<string, number>();
/** Inverse document frequency over the knowledge pack, scaled to about 0.3–1.5. */
function tokenWeight(token: string): number {
  const cached = weightCache.get(token);
  if (cached !== undefined) return cached;
  const total = ADMIN_HELP_CHUNKS.length;
  let df = 0;
  for (const chunk of ADMIN_HELP_CHUNKS) if (haystackOf(chunk).includes(token)) df += 1;
  const weight = Math.min(1.5, Math.max(0.3, Math.log(total / (1 + df)) / 3));
  weightCache.set(token, weight);
  return weight;
}

const CONCEPT_QUESTION_RE =
  /\b(what\s+(is|are|does)|difference|mean|meaning|explain|relationship|can\s+(one|an?|the|my)|how\s+many|multiple|many)\b/i;

function scoreChunk(
  chunk: AdminHelpChunk,
  tokens: string[],
  pathname: string,
  featureKey: string | null,
  conceptual = false,
): number {
  let score = 0;
  const hay = haystackOf(chunk);

  for (const token of tokens) {
    // Rare words ("sponsors", "logo") count more than common ones ("manage", "add").
    const weight = tokenWeight(token);
    if (chunk.keywords.some((k) => k.toLowerCase().includes(token) || token.includes(k.toLowerCase()))) {
      score += 4 * weight;
    } else if (hay.includes(token)) {
      score += 2 * weight;
    }
  }

  // Concept chunks (organization, tenant, site type, locations) apply on every page.
  // Boost them like a page chunk, but only for "what is / can one ..." questions or when
  // two or more question words hit their title/keywords, so a passing word like
  // "tenant" in "tenant logo" does not pull them above the real how-to.
  // Page boosts below only apply to chunks that matched the question at all; chunks
  // for the current page that matched nothing are still added later as fillers.
  if (score === 0) return 0;

  if (chunk.featureKey === 'concepts') {
    const hits = chunkTopicMatches(chunk, tokens);
    if (conceptual && hits > 0) score += 20;
    else if (hits >= 2) score += 12;
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
  const tokens = tokenizeAdminHelpQuestion(question);
  const conceptual = CONCEPT_QUESTION_RE.test(question);
  const featureKey = route?.featureKey ?? null;

  const visible = ADMIN_HELP_CHUNKS.filter((chunk) => {
    if (chunk.platformOnly && !page.isPlatformSuperAdmin) return false;
    if (route?.platformOnly && !page.isPlatformSuperAdmin && chunk.featureKey === route.featureKey) {
      return false;
    }
    return true;
  });

  const ranked = visible
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens, pathname, featureKey, conceptual) }))
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

  const guide = resolvePageGuide(pathname);
  const pageGuide = guide && (!guide.platformOnly || page.isPlatformSuperAdmin) ? guide : null;

  return {
    route,
    pageGuide,
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
