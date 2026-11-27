#!/usr/bin/env node

/**
 * Inventory-driven smoke crawl for all routes (or a kind filter).
 *
 * Usage:
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js --kind=admin
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js --kind=mosc-redesign
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js --kind=public,mosc,mosc-redesign
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js --exclude=mosc-old
 *   node TestSprite/sanity-tests/run-inventory-smoke-crawl.js --limit=50
 *
 * Admin kinds require auth.json. Public/MOSC kinds do not.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertDemoTenant,
  assertAppReachable,
  loadInventory,
  resolveBaseUrl,
  requireAuthJson,
  loadAuthJson,
  discoverDemoIds,
  discoverAdminRecordIds,
  resolveDynamicPath,
  smokeCheckPage,
  attachRuntimeErrorCollector,
  CoverageTracker,
  ADMIN_HOME_BUTTONS,
  withTenantQuery,
  ensureTenantContextOnPage,
  safeGoto,
  shouldSkipSmokePath,
} from '../lib/e2e-harness.js';
import {
  createAuthenticatedContext,
  loadAuthState,
  saveAuthState,
} from './authenticate-playwright.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '../admin-tests/.auth-state.json');
/** Log a heartbeat while a single route is still loading (ms). */
const ROUTE_HEARTBEAT_MS = 15000;

function startRouteHeartbeat(tested, total, target, start) {
  return setInterval(() => {
    const sec = Math.round((Date.now() - start) / 1000);
    console.log(`  … still on (${tested}/${total}) ${target} (${sec}s)`);
  }, ROUTE_HEARTBEAT_MS);
}

function parseListArg(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return null;
  return arg
    .slice(prefix.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseKinds() {
  return parseListArg('--kind=');
}

function parseExclude() {
  return parseListArg('--exclude=') || [];
}

function parseLimit() {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  if (!arg) return Infinity;
  const n = parseInt(arg.slice('--limit='.length), 10);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}

function needsAuth(kinds, exclude) {
  // Full run (no --kind) includes admin unless excluded
  if (!kinds) return !exclude.includes('admin');
  return kinds.includes('admin');
}

async function getAuthContext(browser, config) {
  const fs = await import('fs');
  if (fs.existsSync(AUTH_STATE_PATH)) {
    try {
      const { context, page } = await loadAuthState(browser, AUTH_STATE_PATH);
      await safeGoto(page, `${config.baseUrl}/admin`, {
        timeout: config.timeout,
      });
      const url = page.url();
      await page.close();
      if (!url.includes('/sign-in')) {
        console.log('[smoke] Reusing saved auth state');
        return context;
      }
      await context.close();
      console.log('[smoke] Saved auth invalid — re-authenticating');
    } catch (err) {
      console.log(`[smoke] Could not load auth state: ${err.message}`);
    }
  }

  const { context, page } = await createAuthenticatedContext(browser, config.baseUrl, {
    email: config.email,
    password: config.password,
  });
  await page.close();
  await saveAuthState(context, AUTH_STATE_PATH);
  return context;
}

/**
 * Visit each admin home destination without overlapping navigations.
 * Prefer tile click when the link exists; otherwise (or on miss) use safeGoto.
 */
async function runAdminHomeButtons(page, baseUrl, tracker, timeout, tenantId) {
  console.log(`\n[smoke] Admin home button destinations (tenant=${tenantId})…`);
  const adminHome = `${baseUrl}${withTenantQuery('/admin', tenantId)}`;

  for (const btn of ADMIN_HOME_BUTTONS) {
    const start = Date.now();
    const pathOnly = btn.href.split('?')[0].replace(/\/$/, '') || '/admin';
    const href = withTenantQuery(btn.href, tenantId);
    const targetUrl = `${baseUrl}${href}`;

    try {
      // Land on admin home first so we can exercise the tile when present
      await safeGoto(page, adminHome, { timeout, settleMs: 350 });
      await ensureTenantContextOnPage(page, tenantId);

      const link = page
        .locator(`a[href="${btn.href}"], a[href^="${btn.href}?"], a[href="${btn.href}/"]`)
        .first();
      const hasLink = (await link.count()) > 0 && (await link.isVisible().catch(() => false));

      if (hasLink && pathOnly !== '/admin') {
        await link.click({ timeout: 10000 });
        await page
          .waitForURL(
            (u) => {
              const p = (u.pathname || '').replace(/\/$/, '');
              return p === pathOnly || p.startsWith(`${pathOnly}/`);
            },
            { timeout: Math.min(timeout, 20000) }
          )
          .catch(() => {});
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(300);

        const landed =
          page.url().includes(pathOnly) ||
          new URL(page.url()).pathname.replace(/\/$/, '') === pathOnly;
        if (!landed) {
          await safeGoto(page, targetUrl, { timeout, settleMs: 350 });
        }
      } else {
        // Admin Home tile (already there) or missing link → direct navigation
        if (pathOnly !== '/admin' || !page.url().includes('/admin')) {
          await safeGoto(page, targetUrl, { timeout, settleMs: 350 });
        }
      }

      await ensureTenantContextOnPage(page, tenantId);
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      const check = await smokeCheckPage(page, { urlHint: href });
      tracker.record({
        path: btn.href,
        status: check.skip ? 'skip' : check.ok ? 'pass' : 'fail',
        kind: 'admin-home-button',
        message: check.ok
          ? check.skip
            ? `Button: ${btn.label}: ${check.message}`
            : `Button: ${btn.label}${hasLink ? ' (clicked)' : ' (direct)'}`
          : check.message,
        durationMs: Date.now() - start,
        meta: { label: btn.label, tenantId, via: hasLink ? 'click' : 'goto' },
      });
      console.log(`  ${check.skip ? '○' : check.ok ? '✓' : '✗'} ${btn.label} → ${href}${check.skip || !check.ok ? ` (${check.message})` : ''}`);

      // Pace tiles so Next.js / Clerk aren't flooded
      await page.waitForTimeout(250);
    } catch (err) {
      tracker.record({
        path: btn.href,
        status: 'fail',
        kind: 'admin-home-button',
        message: err.message,
        durationMs: Date.now() - start,
        meta: { label: btn.label, tenantId },
      });
      console.log(`  ✗ ${btn.label}: ${err.message}`);
      await page.waitForTimeout(400);
    }
  }
}

/**
 * Click-through flows a super admin uses on organization pages. These are client-side
 * navigations (no HTTP status), so a crash only shows as the Next.js error overlay or a
 * pageerror, which smokeCheckPage now reports.
 *   1. Organizations list → View Organization on a row
 *   2. Organization view → Edit Organization
 *   3. Tenant Settings view → View Organization
 *   4. Admin Home → Move a tenant ID → pick page
 */
async function runSuperAdminOrganizationFlows(page, baseUrl, tracker, timeout, tenantId, ids) {
  console.log('\n[smoke] Super admin organization flows…');
  const steps = [];

  async function record(path, label, run) {
    const start = Date.now();
    try {
      const outcome = await run();
      const check = outcome?.check ?? (await smokeCheckPage(page, { urlHint: outcome?.urlHint || path }));
      const status = outcome?.skipMessage ? 'skip' : check.skip ? 'skip' : check.ok ? 'pass' : 'fail';
      const message = outcome?.skipMessage || check.message;
      tracker.record({
        path,
        status,
        kind: 'super-admin-flow',
        message: `${label}: ${message}`,
        durationMs: Date.now() - start,
        meta: { resolved: page.url(), tenantId },
      });
      console.log(`  ${status === 'pass' ? '✓' : status === 'skip' ? '○' : '✗'} ${label} → ${page.url()}${status === 'pass' ? '' : ` — ${message}`}`);
      steps.push(status);
      return status;
    } catch (err) {
      tracker.record({
        path,
        status: 'fail',
        kind: 'super-admin-flow',
        message: `${label}: ${err.message}`,
        durationMs: Date.now() - start,
        meta: { resolved: page.url(), tenantId },
      });
      console.log(`  ✗ ${label}: ${err.message}`);
      steps.push('fail');
      return 'fail';
    }
  }

  async function clickAndWait(locator, urlPattern) {
    await locator.first().click({ timeout: 10000 });
    await page.waitForURL(urlPattern, { timeout: Math.min(timeout, 30000) });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  }

  const listPath = '/admin/tenant-management/organizations';
  const listStatus = await record(listPath, 'Organizations list', async () => {
    await safeGoto(page, `${baseUrl}${listPath}`, { timeout, settleMs: 500 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    return { urlHint: listPath };
  });
  if (listStatus !== 'pass') {
    console.log('  ○ Skipping organization click-through (list did not render for this user)');
    return;
  }

  await record('/admin/tenant-management/organizations/[id]', 'List → View Organization', async () => {
    const view = page.locator('a[title="View Organization"][href*="/admin/tenant-management/organizations/"]');
    if ((await view.count()) === 0) return { skipMessage: 'No organization rows to open' };
    await clickAndWait(view, /\/admin\/tenant-management\/organizations\/\d+(\?|#|$)/);
    return { urlHint: new URL(page.url()).pathname };
  });

  await record('/admin/tenant-management/organizations/[id]/edit', 'Organization → Edit Organization', async () => {
    const edit = page.locator('a[title="Edit Organization"][href$="/edit"]');
    if ((await edit.count()) === 0) return { skipMessage: 'Edit Organization link not on the page' };
    await clickAndWait(edit, /\/admin\/tenant-management\/organizations\/\d+\/edit/);
    return { urlHint: new URL(page.url()).pathname };
  });

  await record('/admin/tenant-management/settings/[id] → organization', 'Tenant Settings → View Organization', async () => {
    if (ids?.tenantSettingsId == null) return { skipMessage: 'No tenant settings id discovered' };
    const settingsPath = `/admin/tenant-management/settings/${ids.tenantSettingsId}`;
    await safeGoto(page, `${baseUrl}${settingsPath}`, { timeout, settleMs: 500 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const settingsCheck = await smokeCheckPage(page, { urlHint: settingsPath });
    if (!settingsCheck.ok || settingsCheck.skip) return { check: settingsCheck };
    const view = page.locator('a[title="View Organization"][href*="/admin/tenant-management/organizations/"]');
    if ((await view.count()) === 0) return { skipMessage: 'Settings row has no organization link' };
    await clickAndWait(view, /\/admin\/tenant-management\/organizations\/\d+(\?|#|$)/);
    return { urlHint: new URL(page.url()).pathname };
  });

  await record('/admin/tenant-management/organizations/move-tenant', 'Admin Home → Move a tenant ID', async () => {
    await safeGoto(page, `${baseUrl}${withTenantQuery('/admin', tenantId)}`, { timeout, settleMs: 500 });
    const tile = page.locator('a[href="/admin/tenant-management/organizations/move-tenant"]');
    if ((await tile.count()) === 0) return { skipMessage: 'Move a tenant ID tile not on Admin Home' };
    await clickAndWait(tile, /\/admin\/tenant-management\/organizations\/move-tenant/);
    return { urlHint: '/admin/tenant-management/organizations/move-tenant' };
  });

  const failed = steps.filter((s) => s === 'fail').length;
  console.log(`  Super admin organization flows: ${steps.length - failed}/${steps.length} without failures`);
}

async function main() {
  const tenantId = assertDemoTenant();
  const kinds = parseKinds();
  const exclude = parseExclude();
  const limit = parseLimit();
  const inventory = loadInventory();
  const authFile = loadAuthJson();
  const baseUrl = resolveBaseUrl(authFile?.baseUrl || 'http://localhost:3001');
  await assertAppReachable(baseUrl);
  console.log(`[smoke] Using tenantId=${tenantId} (pass --tenant= or TEST_TENANT_ID to override)`);

  const suiteLabel = kinds
    ? `smoke-${kinds.filter((k) => !exclude.includes(k)).join('+') || 'none'}`
    : exclude.length
      ? `smoke-all-except-${exclude.join('+')}`
      : 'smoke-all';
  const tracker = new CoverageTracker(suiteLabel);

  let routes = inventory.routes;
  if (kinds) {
    routes = routes.filter((r) => kinds.includes(r.kind));
  }
  if (exclude.length) {
    routes = routes.filter((r) => !exclude.includes(r.kind));
    console.log(`[smoke] Excluding kinds: ${exclude.join(', ')}`);
  }

  const authNeeded = needsAuth(kinds, exclude);
  let config = {
    baseUrl,
    timeout: 45000,
    headless: true,
    email: authFile?.email,
    password: authFile?.password,
    tenantId,
  };
  if (authNeeded) {
    config = { ...requireAuthJson(), baseUrl, timeout: 45000, tenantId };
  }

  const ids = await discoverDemoIds(baseUrl);
  // Prefer event id for generic [id] on event-ish paths
  const idBag = {
    ...ids,
    id: ids.eventId || ids.planId || ids.pollId || ids.sponsorId,
    slug: ids.focusGroupSlug || 'demo',
  };

  const browser = await chromium.launch({ headless: config.headless !== false });
  let context;
  try {
    if (authNeeded) {
      context = await getAuthContext(browser, config);
    } else {
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
    }

    if (authNeeded) {
      await discoverAdminRecordIds(context, baseUrl, ids);
    }

    const page = await context.newPage();
    attachRuntimeErrorCollector(page);

    if ((!kinds || kinds.includes('admin')) && !exclude.includes('admin')) {
      await runAdminHomeButtons(page, baseUrl, tracker, config.timeout, tenantId);
      await runSuperAdminOrganizationFlows(page, baseUrl, tracker, config.timeout, tenantId, ids);
    }

    let tested = 0;
    const totalPlanned = Number.isFinite(limit)
      ? Math.min(routes.length, limit)
      : routes.length;
    console.log(
      `\n[smoke] Crawling ${routes.length} routes (limit=${limit}, planned≈${totalPlanned})…`
    );
    console.log(
      `[smoke] Progress: log every route; heartbeat every ${ROUTE_HEARTBEAT_MS / 1000}s while waiting`
    );

    for (const route of routes) {
      if (tested >= limit) break;

      if (shouldSkipSmokePath(route.path)) {
        tracker.record({
          path: route.path,
          status: 'skip',
          kind: route.kind,
          message: 'Excluded from smoke (redirect / non-content route)',
          meta: { tenantId },
        });
        console.log(`  ○ skip ${route.path}`);
        continue;
      }

      let target = route.path;
      if (route.dynamic) {
        // Prefer event id for /events/[id] and /admin/events/[id]
        const localIds = { ...idBag };
        if (route.path.includes('/tenant-management/organizations/')) {
          localIds.id = ids.organizationId ?? '';
        } else if (route.path.includes('/tenant-management/settings/')) {
          localIds.id = ids.tenantSettingsId ?? '';
        } else if (route.path.includes('/membership/subscribe')) {
          localIds.id = ids.planId;
          localIds.planId = ids.planId;
        } else if (route.path.includes('/polls/')) {
          localIds.id = ids.pollId;
        } else if (route.path.includes('/sponsors/')) {
          localIds.id = ids.sponsorId;
        } else if (route.path.includes('/focus-groups/')) {
          localIds.slug = ids.focusGroupSlug || 'demo';
        } else if (route.path.includes('/events/') || route.path.includes('/admin/events')) {
          localIds.id = ids.eventId;
          localIds.eventId = ids.eventId;
        }

        target = resolveDynamicPath(route.path, localIds);
        if (!target) {
          tracker.record({
            path: route.path,
            status: 'skip',
            kind: route.kind,
            message: 'Missing demo ID for dynamic segment',
          });
          console.log(`  ○ skip ${route.path} (missing demo ID)`);
          continue;
        }
      }

      // Platform-admin: scope admin routes with ?tenant=
      if (route.kind === 'admin') {
        target = withTenantQuery(target, tenantId);
      }

      // Skip heavy nested QR / downloads without real IDs already handled
      const start = Date.now();
      tested += 1;
      console.log(`  → (${tested}/${totalPlanned}) ${target}`);
      const heartbeat = startRouteHeartbeat(tested, totalPlanned, target, start);
      try {
        // Pace requests to avoid saturating the Next.js dev server
        if (tested > 1) {
          await page.waitForTimeout(200);
        }

        const allowSignIn =
          route.kind === 'public' ||
          target.includes('/sign-in') ||
          target.includes('/sign-up') ||
          target.includes('/pricing') ||
          target.includes('/profile') ||
          target.includes('/dashboard') ||
          target.includes('/membership/manage') ||
          target.includes('/auth/') ||
          target.includes('/sso-callback');

        const response = await safeGoto(page, `${baseUrl}${target}`, {
          timeout: Math.min(config.timeout, 30000),
          retries: 2,
          settleMs: 200,
        });

        if (route.kind === 'admin') {
          await ensureTenantContextOnPage(page, tenantId);
        }

        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

        const status = response?.status?.() ?? 0;
        const durationMs = Date.now() - start;
        if (status >= 500) {
          tracker.record({
            path: route.path,
            status: 'fail',
            kind: route.kind,
            message: `HTTP ${status}`,
            durationMs,
            meta: { resolved: target, tenantId },
          });
          console.log(`  ✗ (${tested}/${totalPlanned}) [${status}] ${target} (${durationMs}ms)`);
          continue;
        }

        // Unauthenticated public crawl: redirect to sign-in counts as covered (auth gate)
        const finalUrl = page.url();
        if (
          route.kind === 'public' &&
          finalUrl.includes('/sign-in') &&
          !target.includes('/sign-in')
        ) {
          tracker.record({
            path: route.path,
            status: 'pass',
            kind: route.kind,
            message: 'auth-gated (redirect to sign-in)',
            durationMs,
            meta: { resolved: target, http: status },
          });
          console.log(
            `  ✓ (${tested}/${totalPlanned}) ${target} [auth-gated] (${durationMs}ms)`
          );
          continue;
        }

        const check = await smokeCheckPage(page, {
          allowSignInRedirect: allowSignIn,
          urlHint: target,
        });
        tracker.record({
          path: route.path,
          status: check.skip ? 'skip' : check.ok ? 'pass' : 'fail',
          kind: route.kind,
          message: check.message,
          durationMs,
          meta: { resolved: target, http: status, tenantId },
        });
        console.log(
          `  ${check.skip ? '○' : check.ok ? '✓' : '✗'} (${tested}/${totalPlanned}) ${target} (${durationMs}ms)${
            check.skip || !check.ok ? ` — ${check.message}` : ''
          }`
        );
      } catch (err) {
        const durationMs = Date.now() - start;
        tracker.record({
          path: route.path,
          status: 'fail',
          kind: route.kind,
          message: err.message,
          durationMs,
          meta: { resolved: target, tenantId },
        });
        console.log(
          `  ✗ (${tested}/${totalPlanned}) ${target}: ${err.message} (${durationMs}ms)`
        );
      } finally {
        clearInterval(heartbeat);
      }
    }

    await page.close();
  } finally {
    if (context) await context.close();
    await browser.close();
  }

  tracker.write();
  const s = tracker.summary();
  if (s.fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
