import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { adminHelpSystemPrompt, buildAdminHelpUserPayload } from './prompt';
import type { AdminHelpPageContext, AdminHelpRetrieveResult } from './types';

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

function extractText(modelId: string, payload: Record<string, unknown>): string {
  if (isAnthropicModel(modelId)) {
    const content = payload.content as Array<{ text?: string }> | undefined;
    const text = content?.[0]?.text;
    if (typeof text === 'string') return text.trim();
    throw new Error('Bedrock Anthropic response missing text');
  }
  const output = payload.output as { message?: { content?: Array<{ text?: string }> } } | undefined;
  const text = output?.message?.content?.[0]?.text;
  if (typeof text === 'string') return text.trim();
  throw new Error('Bedrock response missing text');
}

/** Deterministic fallback when Bedrock is off or fails. */
export function stubAdminHelpAnswer(
  question: string,
  retrieved: AdminHelpRetrieveResult,
): string {
  const top = retrieved.chunks[0];
  if (top) {
    const steps = top.body.length > 480 ? `${top.body.slice(0, 480)}…` : top.body;
    return `${top.title}: ${steps}`;
  }
  if (retrieved.route) {
    return `${retrieved.route.label}: ${retrieved.route.summary} Related: ${retrieved.route.relatedRoutes.join(', ')}.`;
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
  return extractText(settings.modelId, payload);
}
