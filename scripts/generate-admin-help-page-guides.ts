/**
 * Generate Admin Help page guides from the admin UI code.
 *
 * For every admin page group (one guide per Admin Help route-map feature, or per
 * /admin/<segment> when the route map has no entry) this script:
 *   1. collects the page.tsx files and the admin UI components they import (2 levels),
 *   2. extracts what an admin sees: headings, labels, buttons, help text, placeholders,
 *      accepted file types, limits, status messages, tab names,
 *   3. asks Bedrock to write a section-by-section how-to guide from only those facts,
 *   4. writes src/lib/adminHelp/knowledge/generated/pageGuides.generated.json.
 *
 * Each guide stores a hash of its source files. `--check` recomputes the hashes without
 * calling Bedrock and exits 1 when a guide is stale or missing, so CI can catch drift.
 *
 * Usage:
 *   npx tsx scripts/generate-admin-help-page-guides.ts            # generate stale/missing guides
 *   npx tsx scripts/generate-admin-help-page-guides.ts --check    # verify only (no Bedrock)
 *   npx tsx scripts/generate-admin-help-page-guides.ts --list     # print page groups and sizes
 *   npx tsx scripts/generate-admin-help-page-guides.ts --dump school-site  # print what the model sees
 *   npx tsx scripts/generate-admin-help-page-guides.ts --only manage-events,media --force
 *
 * Needs AWS credentials that can call Bedrock (same as the help chat): the default AWS
 * credential chain, BEDROCK_REGION and BEDROCK_MODEL_ID (defaults us-east-1 and the help model).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ADMIN_HELP_CHUNKS } from '../src/lib/adminHelp/knowledge';
import { MANUAL_PAGE_GUIDES } from '../src/lib/adminHelp/knowledge/pageGuides';
import { resolveRouteEntry } from '../src/lib/adminHelp/knowledge/routeMap';
import type { AdminHelpPageGuideSection } from '../src/lib/adminHelp/types';

/** Bump when extraction or prompt changes so every guide is regenerated. */
const GENERATOR_VERSION = 3;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_DIR = path.join(ROOT, 'src', 'app', 'admin');
const OUT_FILE = path.join(ROOT, 'src', 'lib', 'adminHelp', 'knowledge', 'generated', 'pageGuides.generated.json');
const MAX_EXTRACT_CHARS = 40_000;
const IMPORT_DEPTH = 2;
/** Components imported by more groups than this are shared chrome (nav, layout) and skipped. */
const SHARED_COMPONENT_LIMIT = 4;
const CONCURRENCY = 3;

type Group = {
  featureKey: string;
  title: string;
  prefix: string;
  platformOnly: boolean;
  routes: string[];
  pageFiles: string[];
  sourceFiles: string[];
  sourceHash: string;
};

export type GeneratedGuide = {
  featureKey: string;
  title: string;
  pathPrefixes: string[];
  routes: string[];
  sourceFiles: string[];
  sourceHash: string;
  platformOnly?: boolean;
  sections: AdminHelpPageGuideSection[];
};

type GeneratedFile = {
  generatorVersion: number;
  model: string;
  guides: GeneratedGuide[];
};

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === 'page.tsx') out.push(full);
  }
  return out;
}

function routeOf(pageFile: string): string {
  const segs = path
    .relative(path.join(ROOT, 'src', 'app'), path.dirname(pageFile))
    .split(path.sep)
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  return `/${segs.join('/')}`;
}

function staticPrefix(route: string): string {
  const out: string[] = [];
  for (const seg of route.split('/').filter(Boolean)) {
    if (seg.startsWith('[')) break;
    out.push(seg);
  }
  return `/${out.join('/')}`;
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const IMPORT_RE = /(?:import|export)\s[^'"`]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

/** Admin UI files only: pages and components, not lib/api/types code. */
function isUiFile(file: string): boolean {
  const r = rel(file);
  if (!/\.(tsx|ts)$/.test(r)) return false;
  if (/\/(types|constants)\.ts$/.test(r)) return r.includes('/admin/');
  return r.startsWith('src/app/admin/') || r.startsWith('src/components/admin/') || (r.startsWith('src/components/') && r.endsWith('.tsx'));
}

function collectImports(pageFiles: string[]): string[] {
  const seen = new Set<string>(pageFiles);
  let frontier = [...pageFiles];
  for (let depth = 0; depth < IMPORT_DEPTH; depth += 1) {
    const next: string[] = [];
    for (const file of frontier) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(IMPORT_RE)) {
        const target = resolveImport(file, m[1] || m[2]);
        if (target && !seen.has(target) && isUiFile(target)) {
          seen.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function buildGroups(): Group[] {
  const pages = walk(ADMIN_DIR).sort();
  const byKey = new Map<string, Omit<Group, 'sourceFiles' | 'sourceHash'>>();
  for (const pageFile of pages) {
    const route = routeOf(pageFile);
    if (route === '/admin') continue; // Admin Home is covered by the hub guides.
    const entry = resolveRouteEntry(staticPrefix(route));
    let featureKey: string;
    let title: string;
    let prefix: string;
    let platformOnly = false;
    if (entry && entry.prefix !== '/admin') {
      featureKey = entry.info.featureKey;
      title = entry.info.label;
      prefix = entry.prefix;
      platformOnly = Boolean(entry.info.platformOnly);
    } else {
      const seg = route.split('/')[2];
      featureKey = seg;
      title = titleCase(seg);
      prefix = `/admin/${seg}`;
    }
    const groupKey = `${featureKey}|${prefix}`;
    const g = byKey.get(groupKey) ?? { featureKey, title, prefix, platformOnly, routes: [], pageFiles: [] };
    g.routes.push(route);
    g.pageFiles.push(pageFile);
    byKey.set(groupKey, g);
  }

  // Two prefixes can share one featureKey (e.g. /admin/membership and /admin/membership/plans
  // map separately); keep featureKey unique by suffixing the later ones.
  const usedKeys = new Set<string>();
  const draft = [...byKey.values()].map((g) => {
    let key = g.featureKey;
    if (usedKeys.has(key)) key = `${key}--${g.prefix.split('/').slice(2).join('-')}`;
    usedKeys.add(key);
    return { ...g, featureKey: key, imports: collectImports(g.pageFiles) };
  });

  const useCount = new Map<string, number>();
  for (const g of draft) for (const f of g.imports) useCount.set(f, (useCount.get(f) ?? 0) + 1);

  return draft.map((g) => {
    const sourceFiles = g.imports
      .filter((f) => g.pageFiles.includes(f) || (useCount.get(f) ?? 0) <= SHARED_COMPONENT_LIMIT)
      .sort();
    const hash = createHash('sha256');
    hash.update(`v${GENERATOR_VERSION}\n`);
    for (const f of sourceFiles) {
      hash.update(rel(f));
      hash.update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
    }
    return {
      featureKey: g.featureKey,
      title: g.title,
      prefix: g.prefix,
      platformOnly: g.platformOnly,
      routes: g.routes.sort(),
      pageFiles: g.pageFiles,
      sourceFiles,
      sourceHash: hash.digest('hex').slice(0, 16),
    };
  });
}

// ---------- extraction ----------

const ATTR_RE =
  /\b(label|title|placeholder|aria-label|description|helperText|hint|alt|emptyMessage|confirmText|tooltip|subtitle|heading|buttonText|text)\s*=\s*(?:"([^"]{2,200})"|'([^']{2,200})'|\{\s*['"`]([^'"`$]{2,200})['"`]\s*\})/g;
const JSX_TEXT_RE = />\s*([^<>{}=;]*[A-Za-z][^<>{}=;]*?)\s*</g;
const LITERAL_RE = /(['"`])((?:(?!\1)[^\\\n$]){12,220})\1/g;
const ACCEPT_RE = /\baccept\s*=\s*["'{]([^"'}]+)["'}]/g;
const EXPORT_FN_RE = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;

function looksLikeUiText(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return false;
  if (/^[a-z0-9_.-]+$/.test(t) && !t.includes(' ')) return false; // identifiers, css tokens
  if (/(className|https?:|\/api\/|^\/|\.tsx?$|^[\w-]+:[\w-]+|^\w+\(|=>|&&|\|\|)/.test(t)) return false;
  if (/^(flex|grid|text-|bg-|border|px-|py-|mt-|mb-|w-|h-|rounded|items-|justify-|gap-|space-|font-|hover:|focus:)/.test(t)) return false;
  if (/\b(bg|text|border|rounded|px|py|mt|mb|w|h|gap)-\S+\s+\b(bg|text|border|rounded|px|py|mt|mb|w|h|gap)-/.test(t)) return false;
  return /[A-Za-z]{2}/.test(t);
}

function extractFile(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(ATTR_RE)) {
    const v = (m[2] || m[3] || m[4] || '').trim();
    if (looksLikeUiText(v)) out.add(`${m[1]}: ${v}`);
  }
  for (const m of src.matchAll(JSX_TEXT_RE)) {
    const v = m[1].replace(/\s+/g, ' ').trim();
    if (looksLikeUiText(v) && v.length <= 300) out.add(v);
  }
  for (const m of src.matchAll(LITERAL_RE)) {
    const v = m[2].trim();
    if (v.includes(' ') && /^[A-Z]/.test(v) && looksLikeUiText(v)) out.add(v);
  }
  // Config-driven forms/tabs: object literals such as { name: 'x', label: 'Category', kind: 'select', required: true }.
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (t.length <= 240 && /\b(label|title|heading|description|placeholder|summary|hint)\s*:\s*['"`][^'"`$]{2,}/.test(t)) {
      out.add(`config: ${t.replace(/,\s*$/, '')}`);
    }
  }
  for (const m of src.matchAll(ACCEPT_RE)) out.add(`accepted files: ${m[1].trim()}`);
  for (const m of src.matchAll(EXPORT_FN_RE)) {
    if (/Action$|^(create|update|delete|upload|save|fetch|patch|remove|send|approve|reject)/i.test(m[1])) {
      out.add(`action: ${m[1]}`);
    }
  }
  return [...out];
}

function buildExtract(group: Group): string {
  const parts: string[] = [];
  parts.push(`Page group: ${group.title}`);
  parts.push(`Routes (dynamic segments like [id] mean a specific record):\n${group.routes.map((r) => `- ${r}`).join('\n')}`);

  const curated = ADMIN_HELP_CHUNKS.filter(
    (c) => c.featureKey === group.featureKey && !c.id.startsWith('page:'),
  );
  if (curated.length) {
    parts.push(
      `Existing curated help notes (trusted, keep consistent):\n${curated.map((c) => `- ${c.title}: ${c.body}`).join('\n')}`,
    );
  }

  const pageFirst = [...group.sourceFiles].sort(
    (a, b) => Number(!group.pageFiles.includes(a)) - Number(!group.pageFiles.includes(b)),
  );
  let used = parts.join('\n\n').length;
  for (const file of pageFirst) {
    const lines = extractFile(file);
    if (!lines.length) continue;
    const block = `UI text from ${rel(file)}:\n${lines.map((l) => `- ${l}`).join('\n')}`;
    if (used + block.length > MAX_EXTRACT_CHARS) {
      parts.push(`(Remaining files omitted for length: ${rel(file)} and later.)`);
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join('\n\n');
}

// ---------- Bedrock ----------

const SYSTEM_PROMPT = `You write the in-app help manual for one page group of the Adwiise Agent admin dashboard. Readers are non-technical organization admins.

You receive the routes of the page group, any existing curated help notes, and UI text extracted from the page code: headings, labels, buttons, placeholders, help text, accepted file types, status and error messages, and the names of the actions the page calls.

Write a guide as JSON with 5 to 14 sections:
- The first section has slug "overview" and explains what the page is for and where things are (tabs, panels, lists, main buttons, related routes).
- Then one section per task an admin does here (create, edit, delete, upload, replace, search, filter, export, send, approve, configure, and so on), plus one for any limits or rules (file types, sizes, maximum counts, required fields, what saves immediately vs on Save).

Rules:
- Use only facts supported by the extract. Do not invent buttons, fields, limits, or behavior. Leave out anything you are unsure of.
- Never say something cannot be done here, or is done by someone else or elsewhere, unless the extract says so. If a button exists in the extract (for example an "Add ..." button), describe how to use it; if it may be limited to some roles, say "if you see the ... button".
- Terms: an organization is the client (company, institution, or person) that signs up; a tenant is one website of that organization, identified by its website tenant ID. One organization can own many tenants. Never use organization and tenant as synonyms: a "Tenant ID" filter or column picks a website (tenant), not an organization.
- Quote on-screen labels exactly, in double quotes, and say where they are (tab, section, list row action).
- Steps are numbered inline: "1) ... 2) ...".
- No code identifiers, file paths, API names, environment variables, or component names. Translate action names into what the button does.
- Each body is 2 to 8 sentences. Plain text, no Markdown.
- keywords: 5 to 12 lowercase words or short phrases a person would type, including everyday synonyms (for example "picture" for image, "remove" for delete).
- slug: short kebab-case, unique in this guide.

Call the write_guide tool with the guide.`;

const WRITE_GUIDE_TOOL = {
  name: 'write_guide',
  description: 'Save the help guide for this page group.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            heading: { type: 'string' },
            body: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
          },
          required: ['slug', 'heading', 'body', 'keywords'],
        },
      },
    },
    required: ['title', 'sections'],
  },
};

function bedrockSettings() {
  return {
    region: (process.env.BEDROCK_REGION || 'us-east-1').trim(),
    modelId: (process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-5-5').trim(),
  };
}

async function generateGuide(client: BedrockRuntimeClient, modelId: string, group: Group): Promise<GeneratedGuide> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await generateGuideOnce(client, modelId, group);
    } catch (err) {
      lastError = err;
      console.warn(`retry ${group.featureKey} (attempt ${attempt}): ${(err as Error).message}`);
    }
  }
  throw lastError;
}

async function generateGuideOnce(client: BedrockRuntimeClient, modelId: string, group: Group): Promise<GeneratedGuide> {
  const extract = buildExtract(group);
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [WRITE_GUIDE_TOOL],
    messages: [{ role: 'user', content: extract }],
  };
  const res = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    }),
  );
  const payload = JSON.parse(Buffer.from(res.body!).toString('utf8')) as {
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
    stop_reason?: string;
  };
  const call = payload.content?.find((c) => c.type === 'tool_use' && c.name === 'write_guide');
  if (!call) throw new Error(`model did not call write_guide (stop_reason ${payload.stop_reason})`);
  const parsed = call.input as { title?: string; sections?: AdminHelpPageGuideSection[] | string };
  if (typeof parsed.sections === 'string') parsed.sections = JSON.parse(parsed.sections) as AdminHelpPageGuideSection[];
  if (payload.stop_reason === 'max_tokens') throw new Error('guide was cut off at max_tokens');
  const sections = ((parsed.sections as AdminHelpPageGuideSection[] | undefined) ?? [])
    .filter((s) => s && s.slug && s.heading && s.body)
    .map((s) => ({
      slug: String(s.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      heading: String(s.heading).trim(),
      body: String(s.body).trim(),
      keywords: (s.keywords ?? []).map((k) => String(k).toLowerCase().trim()).filter((k) => k.length > 1),
    }));
  if (sections.length < 2) throw new Error(`model returned ${sections.length} sections`);
  return {
    featureKey: group.featureKey,
    title: group.title,
    pathPrefixes: [group.prefix],
    routes: group.routes,
    sourceFiles: group.sourceFiles.map(rel),
    sourceHash: group.sourceHash,
    ...(group.platformOnly ? { platformOnly: true } : {}),
    sections,
  };
}

function readExisting(): GeneratedFile {
  if (!fs.existsSync(OUT_FILE)) return { generatorVersion: GENERATOR_VERSION, model: '', guides: [] };
  return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) as GeneratedFile;
}

function writeOut(file: GeneratedFile) {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  file.guides.sort((a, b) => a.featureKey.localeCompare(b.featureKey));
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const list = args.includes('--list');
  const force = args.includes('--force');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',')) : null;

  const manualKeys = new Set(MANUAL_PAGE_GUIDES.map((g) => g.featureKey));
  const groups = buildGroups().filter((g) => !manualKeys.has(g.featureKey));
  const existing = readExisting();
  const byKey = new Map(existing.guides.map((g) => [g.featureKey, g]));

  const dumpIdx = args.indexOf('--dump');
  if (dumpIdx >= 0) {
    const g = groups.find((x) => x.featureKey === args[dumpIdx + 1]);
    console.log(g ? buildExtract(g) : `No page group ${args[dumpIdx + 1]}`);
    return;
  }

  if (list) {
    for (const g of groups) {
      console.log(`${g.featureKey.padEnd(34)} ${g.prefix.padEnd(44)} pages=${g.pageFiles.length} files=${g.sourceFiles.length} extract=${buildExtract(g).length}`);
    }
    console.log(`\n${groups.length} page groups (manual guides: ${[...manualKeys].join(', ')})`);
    return;
  }

  const stale = groups.filter((g) => {
    const cur = byKey.get(g.featureKey);
    return !cur || cur.sourceHash !== g.sourceHash || existing.generatorVersion !== GENERATOR_VERSION;
  });
  const removed = existing.guides.filter((g) => !groups.some((x) => x.featureKey === g.featureKey));

  if (check) {
    for (const g of stale) console.log(`STALE   ${g.featureKey} (${g.prefix})`);
    for (const g of removed) console.log(`REMOVED ${g.featureKey} (page group no longer exists)`);
    if (stale.length || removed.length) {
      console.log(`\n${stale.length} stale, ${removed.length} removed. Run: npx tsx scripts/generate-admin-help-page-guides.ts`);
      process.exit(1);
    }
    console.log(`All ${groups.length} admin page guides are up to date.`);
    return;
  }

  const todo = (force ? groups : stale).filter((g) => !only || only.has(g.featureKey));
  const { region, modelId } = bedrockSettings();
  const client = new BedrockRuntimeClient({ region });
  const out: GeneratedFile = {
    generatorVersion: GENERATOR_VERSION,
    model: modelId,
    guides: existing.guides.filter((g) => !removed.includes(g)),
  };
  console.log(`Generating ${todo.length} of ${groups.length} guides with ${modelId} in ${region}...`);

  let failures = 0;
  let index = 0;
  async function worker() {
    while (index < todo.length) {
      const group = todo[index++];
      const started = Date.now();
      try {
        const guide = await generateGuide(client, modelId, group);
        out.guides = out.guides.filter((g) => g.featureKey !== guide.featureKey).concat(guide);
        writeOut(out);
        console.log(`OK   ${group.featureKey} (${guide.sections.length} sections, ${Math.round((Date.now() - started) / 1000)}s)`);
      } catch (err) {
        failures += 1;
        console.error(`FAIL ${group.featureKey}: ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeOut(out);
  console.log(`\nDone. ${todo.length - failures} generated, ${failures} failed. Output: ${rel(OUT_FILE)}`);
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
