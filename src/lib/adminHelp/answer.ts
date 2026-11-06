import {
  getAdminHelpBedrockSettings,
  invokeAdminHelpBedrock,
  stubAdminHelpAnswer,
} from './bedrock';
import { isPlatformOnlyQuestionBlocked, retrieveAdminHelpKnowledge } from './retrieve';
import type { AdminHelpPageContext } from './types';

export type AdminHelpAnswerResult = {
  reply: string;
  backend: 'bedrock' | 'stub';
  featureKey?: string;
  chunkIds: string[];
};

const PLATFORM_ONLY_REFUSAL =
  'That topic is limited to platform SUPER_ADMIN tools. If you need satellite domains, tenant creation, or onboarding approval, ask a platform super admin.';

/**
 * Grounded admin how-to answer from curated knowledge (+ Bedrock when enabled).
 */
export async function answerAdminHelpQuestion(
  question: string,
  page: AdminHelpPageContext,
): Promise<AdminHelpAnswerResult> {
  const q = question.trim();
  if (!q) {
    return { reply: 'Ask a question about an admin feature, form, or upload.', backend: 'stub', chunkIds: [] };
  }

  if (isPlatformOnlyQuestionBlocked(q, page.isPlatformSuperAdmin)) {
    return { reply: PLATFORM_ONLY_REFUSAL, backend: 'stub', chunkIds: [] };
  }

  const retrieved = retrieveAdminHelpKnowledge(q, page);
  const settings = getAdminHelpBedrockSettings();

  if (settings.enabled) {
    try {
      const reply = await invokeAdminHelpBedrock(q, page, retrieved, settings);
      if (reply) {
        return {
          reply,
          backend: 'bedrock',
          featureKey: retrieved.route?.featureKey,
          chunkIds: retrieved.chunks.map((c) => c.id),
        };
      }
    } catch (error) {
      console.error('[adminHelp] Bedrock invoke failed; using stub', error);
    }
  }

  return {
    reply: stubAdminHelpAnswer(q, retrieved),
    backend: 'stub',
    featureKey: retrieved.route?.featureKey,
    chunkIds: retrieved.chunks.map((c) => c.id),
  };
}
