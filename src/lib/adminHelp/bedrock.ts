import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { adminHelpSystemPrompt, buildAdminHelpUserPayload } from './prompt';
import { chunkTopicMatches, tokenizeAdminHelpQuestion } from './retrieve';
import type { AdminHelpChunk, AdminHelpPageContext, AdminHelpRetrieveResult } from './types';

const DEFAULT_MODEL_ID = 'us.anthropic.claude-sonnet-5-5';
const DEFAULT_REGION = 'us-east-1';
const MAX_TOKENS = 1200;

export type AdminHelpBedrockSettings = {
  enabled: boolean;
  region: string;
  modelId: string;
};

/**
 * Bedrock is on by default for Admin Help (local/dev/prod).
 * Set BEDROCK_ENABLED=false (or ADMIN_HELP_BEDROCK_ENABLED=false) to force stub-only answers.
 */
export function getAdminHelpBedrockSettings(): AdminHelpBedrockSettings {
  const raw = String(
    process.env.BEDROCK_ENABLED ?? process.env.ADMIN_HELP_BEDROCK_ENABLED ?? 'true',
  )
    .trim()
    .toLowerCase();
  const enabled = raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no';
  return {
    enabled,
    region: (process.env.BEDROCK_REGION || process.env.ADMIN_HELP_BEDROCK_REGION || DEFAULT_REGION).trim(),
    modelId: (process.env.BEDROCK_MODEL_ID || process.env.ADMIN_HELP_BEDROCK_MODEL_ID || DEFAULT_MODEL_ID).trim(),
  };
}

function isAnthropicModel(modelId: string): boolean {
  return (modelId || '').includes('anthropic.');
}

function buildBody(
  modelId: string,
  system: string,
  userText: string,
): Record<string, unknown> {
  if (isAnthropicModel(modelId)) {
    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userText }],
    };
  }
  return {
    schemaVersion: 'messages-v1',
    system: [{ text: system }],
    messages: [{ role: 'user', content: [{ text: userText }] }],
    inferenceConfig: { maxTokens: MAX_TOKENS, temperature: 0 },
  };
}

export function extractAdminHelpText(modelId: string, payload: Record<string, unknown>): string {
  if (isAnthropicModel(modelId)) {
    // Newer Claude models can return a thinking block before the text block, so
    // content[0] is not always the answer. Join every text block instead.
    const content = payload.content as Array<{ type?: string; text?: string }> | undefined;
    const text = (content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('\n')
      .trim();
    if (text) return text;
    const types = (content ?? []).map((block) => block.type).join(', ') || 'none';
    throw new Error(`Bedrock Anthropic response missing text (blocks: ${types}, stop_reason: ${String(payload.stop_reason)})`);
  }
  const output = payload.output as { message?: { content?: Array<{ text?: string }> } } | undefined;
  const text = output?.message?.content?.[0]?.text;
  if (typeof text === 'string') return text.trim();
  throw new Error('Bedrock response missing text');
}

export const ADMIN_HELP_OFFLINE_NOTE =
  'AI help is not available right now, so this is the closest saved help text.';

const STUB_BODY_LIMIT = 1600;

/**
 * Deterministic fallback when Bedrock is off or fails.
 *
 * Only quotes a chunk whose title or keywords match the question. A chunk that ranked
 * first merely because it belongs to the current page is not treated as an answer;
 * instead the user gets the page's section list so they can see where to look.
 */
export function stubAdminHelpAnswer(
  question: string,
  retrieved: AdminHelpRetrieveResult,
): string {
  const tokens = tokenizeAdminHelpQuestion(question);
  const candidates: AdminHelpChunk[] = [...retrieved.chunks];
  const relevant = candidates
    .map((chunk, index) => ({ chunk, index, hits: chunkTopicMatches(chunk, tokens) }))
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.index - b.index);

  const best = relevant[0]?.chunk;
  if (best) {
    const body = best.body.length > STUB_BODY_LIMIT ? `${best.body.slice(0, STUB_BODY_LIMIT)}…` : best.body;
    const more = relevant
      .filter((row) => row.chunk !== best && !row.chunk.id.startsWith('hub:'))
      .slice(0, 2)
      .map((row) => row.chunk.title)
      .filter(Boolean);
    const related = more.length ? `\n\nRelated: ${more.join('; ')}.` : '';
    return `${ADMIN_HELP_OFFLINE_NOTE}\n\n${best.title}\n${body}${related}`;
  }

  if (retrieved.pageGuide) {
    const headings = retrieved.pageGuide.sections.map((s) => `- ${s.heading}`).join('\n');
    return `AI help is not available right now, and no saved help matches “${question.trim()}” directly. ${retrieved.pageGuide.title} covers:\n${headings}\n\nTry asking with one of these topics.`;
  }
  if (retrieved.route) {
    return `AI help is not available right now, and no saved help matches “${question.trim()}” directly. You are on ${retrieved.route.label}: ${retrieved.route.summary} Related: ${retrieved.route.relatedRoutes.join(', ')}.`;
  }
  return `I could not find admin help for “${question.trim()}”. Open Admin Home and search for the feature tile, or try a more specific question.`;
}

export async function invokeAdminHelpBedrock(
  question: string,
  page: AdminHelpPageContext,
  retrieved: AdminHelpRetrieveResult,
  settings: AdminHelpBedrockSettings = getAdminHelpBedrockSettings(),
): Promise<string> {
  const system = adminHelpSystemPrompt(page.isPlatformSuperAdmin);
  const userText = buildAdminHelpUserPayload(question, page, retrieved);
  const body = buildBody(settings.modelId, system, userText);

  const client = new BedrockRuntimeClient({ region: settings.region });
  const response = await client.send(
    new InvokeModelCommand({
      modelId: settings.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    }),
  );

  const raw = response.body ? Buffer.from(response.body).toString('utf8') : '';
  const payload = JSON.parse(raw) as Record<string, unknown>;
  return extractAdminHelpText(settings.modelId, payload);
}
