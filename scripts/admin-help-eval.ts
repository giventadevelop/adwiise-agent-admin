/**
 * Admin Help evaluation over real questions (scripts/admin-help-eval.json).
 *
 * Offline (default, no AWS needed): for each case, retrieval must put a chunk from
 * `expectFeature` in the top 3, and the top 5 chunks plus the current page guide must
 * mention every `mustMention` term.
 * --live: also asks Bedrock and checks the reply is a model answer that mentions every term.
 *
 * Run: npx tsx scripts/admin-help-eval.ts [--live] [--only id1,id2]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerAdminHelpQuestion, retrieveAdminHelpKnowledge } from '../src/lib/adminHelp';

type EvalCase = {
  id: string;
  pathname: string;
  question: string;
  superAdmin?: boolean;
  expectFeature: string;
  mustMention: string[];
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = (JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'admin-help-eval.json'), 'utf8')) as { cases: EvalCase[] }).cases;

const featureMatches = (featureKey: string, expected: string) =>
  featureKey === expected || featureKey.startsWith(`${expected}--`);

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',')) : null;
  const selected = cases.filter((c) => !only || only.has(c.id));

  let failed = 0;
  for (const c of selected) {
    const page = { pathname: c.pathname, isPlatformSuperAdmin: Boolean(c.superAdmin) };
    const r = retrieveAdminHelpKnowledge(c.question, page);
    const problems: string[] = [];

    const top3 = r.chunks.slice(0, 3);
    if (!top3.some((ch) => featureMatches(ch.featureKey, c.expectFeature))) {
      problems.push(`expected ${c.expectFeature} in top 3, got ${top3.map((ch) => ch.id).join(', ') || 'nothing'}`);
    }

    const context = [
      ...r.chunks.slice(0, 5).map((ch) => `${ch.title} ${ch.body}`),
      ...(r.pageGuide ? r.pageGuide.sections.map((s) => `${s.heading} ${s.body}`) : []),
    ]
      .join(' ')
      .toLowerCase();
    const missing = c.mustMention.filter((t) => !context.includes(t.toLowerCase()));
    if (missing.length) problems.push(`context missing ${missing.map((m) => `"${m}"`).join(', ')}`);

    if (live) {
      const answer = await answerAdminHelpQuestion(c.question, page);
      if (answer.backend !== 'bedrock') problems.push(`live answer came from ${answer.backend} (${answer.fallbackReason ?? ''})`);
      const replyMissing = c.mustMention.filter((t) => !answer.reply.toLowerCase().includes(t.toLowerCase()));
      if (replyMissing.length) problems.push(`reply missing ${replyMissing.map((m) => `"${m}"`).join(', ')}`);
    }

    if (problems.length) {
      failed += 1;
      console.log(`FAIL ${c.id}: ${problems.join('; ')}`);
    } else {
      console.log(`PASS ${c.id}`);
    }
  }
  console.log(`\n${selected.length - failed}/${selected.length} admin help eval cases passed${live ? ' (live)' : ''}.`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
