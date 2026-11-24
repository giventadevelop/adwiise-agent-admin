/**
 * Compare Admin Home tile keys with Admin Help hub guides.
 * Prints each tile summary and flags keys the help chat cannot retrieve.
 *
 * Usage: node scripts/check-admin-help-coverage.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageSrc = fs.readFileSync(path.join(root, 'src/app/admin/page.tsx'), 'utf8');
const guideSrc = fs.readFileSync(path.join(root, 'src/lib/adminHelp/knowledge/hubGuides.ts'), 'utf8');
const routeSrc = fs.readFileSync(path.join(root, 'src/lib/adminHelp/knowledge/routeMap.ts'), 'utf8');

function keysIn(source, field) {
  const pattern = new RegExp(`\\b${field}:\\s*'([^']+)'`, 'g');
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function tilesFromPage(source) {
  const tiles = [];
  const parts = source.split(/\n\s*\{/);
  for (const part of parts) {
    const key = part.match(/\bkey:\s*'([^']+)'/);
    if (!key) continue;
    const href = part.match(/\bhref:\s*'([^']+)'/);
    const label = part.match(/\blabel:\s*'([^']*)'/);
    const summary = part.match(/\bsummary:\s*'([^']*)'/);
    tiles.push({
      key: key[1],
      href: href ? href[1] : '',
      label: label ? label[1] : key[1],
      summary: summary ? summary[1] : '',
    });
  }
  return tiles;
}

const tiles = tilesFromPage(pageSrc);
const guideKeys = new Set(keysIn(guideSrc, 'key'));
const routeKeys = new Set(keysIn(routeSrc, 'featureKey'));
const routePrefixes = [...routeSrc.matchAll(/\bprefix:\s*'([^']+)'/g)].map((match) => match[1]);

function routeCovers(tile) {
  if (routeKeys.has(tile.key)) return true;
  const tilePath = (tile.href || '').split('#')[0];
  if (!tilePath) return false;
  return routePrefixes.some(
    (prefix) => tilePath === prefix || tilePath.startsWith(`${prefix}/`) || prefix.startsWith(`${tilePath}/`) || prefix === tilePath,
  );
}
const seen = new Set();
const unique = [];
for (const tile of tiles) {
  if (seen.has(tile.key)) continue;
  seen.add(tile.key);
  unique.push(tile);
}

console.log('Admin Help coverage');
console.log(`Tiles: ${unique.length}  Hub guides: ${guideKeys.size}  Route feature keys: ${routeKeys.size}`);
console.log('');

let missing = 0;
for (const tile of unique) {
  const inGuide = guideKeys.has(tile.key);
  const inRoute = routeCovers(tile);
  const status = inGuide && inRoute ? 'ok' : 'MISSING';
  if (status === 'MISSING') missing += 1;
  console.log(`${status}  ${tile.key}`);
  console.log(`  ${tile.label}  ${tile.href}`);
  console.log(`  ${tile.summary || '(no summary)'}`);
  if (!inGuide) console.log('  hub guide: absent');
  if (!inRoute) console.log('  route map: absent');
}

console.log('');
if (missing === 0) {
  console.log('Every Admin Home tile has a hub guide and a route-map feature key.');
  process.exit(0);
}
console.log(`${missing} tile(s) are missing from Admin Help. Add a hub guide and a route entry before shipping the page.`);
process.exit(1);
