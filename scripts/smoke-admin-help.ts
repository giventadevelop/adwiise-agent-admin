/**
 * Smoke tests for Admin Help retrieval + platform-only refusal (no Bedrock call).
 * Run: npx tsx scripts/smoke-admin-help.ts
 */
import assert from 'node:assert/strict';
import {
  answerAdminHelpQuestion,
  isPlatformOnlyQuestionBlocked,
  resolveRouteInfo,
  retrieveAdminHelpKnowledge,
  suggestedChipsForPath,
} from '../src/lib/adminHelp';
import { getAdminHelpBedrockSettings, stubAdminHelpAnswer } from '../src/lib/adminHelp/bedrock';

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`PASS ${name}`);
}

async function main() {
  {
    const r = retrieveAdminHelpKnowledge('How do I upload media for an event?', {
      pathname: '/admin',
      isPlatformSuperAdmin: false,
    });
    assert.ok(r.chunks.length > 0, 'hub media question should retrieve chunks');
    assert.ok(
      r.chunks.some((c) => c.featureKey === 'media-management' || c.id.includes('media')),
      'should include media-related chunk',
    );
    const stub = stubAdminHelpAnswer('How do I upload media for an event?', r);
    assert.ok(stub.length > 20, 'stub answer non-empty');
    ok('hub media upload retrieval');
  }

  {
    const route = resolveRouteInfo('/admin/manage-events');
    assert.equal(route?.featureKey, 'manage-events');
    const r = retrieveAdminHelpKnowledge('How do I create a new event?', {
      pathname: '/admin/manage-events',
      isPlatformSuperAdmin: false,
    });
    assert.ok(r.chunks.some((c) => c.featureKey === 'manage-events'));
    ok('manage-events path + create event');
  }

  {
    const route = resolveRouteInfo('/admin/manage-usage');
    assert.equal(route?.featureKey, 'manage-usage');
    const r = retrieveAdminHelpKnowledge('How do I promote someone to ADMIN?', {
      pathname: '/admin/manage-usage',
      isPlatformSuperAdmin: false,
    });
    assert.ok(
      r.chunks.some((c) => c.featureKey === 'manage-usage' || c.id.includes('promote')),
      'promote question should hit manage-usage knowledge',
    );
    ok('manage-usage promote retrieval');
  }

  {
    assert.equal(isPlatformOnlyQuestionBlocked('How do I add a satellite domain?', false), true);
    assert.equal(isPlatformOnlyQuestionBlocked('How do I add a satellite domain?', true), false);
    const blocked = await answerAdminHelpQuestion('How do I add a satellite domain?', {
      pathname: '/admin',
      isPlatformSuperAdmin: false,
    });
    assert.match(blocked.reply, /SUPER_ADMIN/i);
    assert.equal(blocked.backend, 'stub');
    ok('platform-only refusal for ADMIN');
  }

  {
    const r = retrieveAdminHelpKnowledge('satellite domain hostname clerk', {
      pathname: '/admin',
      isPlatformSuperAdmin: false,
    });
    assert.ok(!r.chunks.some((c) => c.platformOnly), 'ADMIN must not receive platformOnly chunks');
    const rSuper = retrieveAdminHelpKnowledge('satellite domain hostname clerk', {
      pathname: '/admin/satellite-domains',
      isPlatformSuperAdmin: true,
    });
    assert.ok(
      rSuper.chunks.some((c) => c.platformOnly || c.featureKey === 'satellite-domains'),
      'SUPER_ADMIN should retrieve satellite guidance',
    );
    ok('platformOnly chunk filtering');
  }

  {
    const chips = suggestedChipsForPath('/admin/media', false);
    assert.ok(chips.length >= 1);
    ok('suggested chips for /admin/media');
  }

  {
    const prev = process.env.BEDROCK_ENABLED;
    delete process.env.BEDROCK_ENABLED;
    delete process.env.ADMIN_HELP_BEDROCK_ENABLED;
    const settings = getAdminHelpBedrockSettings();
    assert.equal(settings.enabled, true, 'Bedrock should default on');
    assert.equal(settings.region, 'us-east-1');
    assert.match(settings.modelId, /anthropic|claude/i);
    if (prev !== undefined) process.env.BEDROCK_ENABLED = prev;
    ok('Bedrock defaults enabled for all environments');
  }

  {
    process.env.BEDROCK_ENABLED = 'false';
    assert.equal(getAdminHelpBedrockSettings().enabled, false);
    delete process.env.BEDROCK_ENABLED;
    ok('BEDROCK_ENABLED=false forces stub mode');
  }

  console.log(`\n${passed} smoke checks passed.`);
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
