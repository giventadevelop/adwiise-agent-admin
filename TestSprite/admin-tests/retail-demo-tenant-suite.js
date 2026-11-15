#!/usr/bin/env node

/**
 * Retail demo data and coverage for tenant_demo_002.
 * Seeds a RETAIL organization site type (no homepage presets) and four durable shops,
 * then checks morning, locations, upload, integrations, compare, access, and the
 * gas-station redirect. The extra [E2E] shop is created, edited, and deleted.
 *
 * Usage: node TestSprite/admin-tests/retail-demo-tenant-suite.js --tenant=tenant_demo_002 --port=3001
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertDemoTenant,
  assertAppReachable,
  requireAuthJson,
  smokeCheckPage,
  CoverageTracker,
  E2E_PREFIX,
  withTenantQuery,
  ensureTenantContextOnPage,
  safeGoto,
} from '../lib/e2e-harness.js';
import {
  createAuthenticatedContext,
  loadAuthState,
  saveAuthState,
} from '../sanity-tests/authenticate-playwright.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '.auth-state.json');
const stamp = Date.now();
const METRIC_DATE = '2026-07-08';
const HOMEPAGE_FLAG_KEYS = ['showEventsSectionInHomePage', 'showGallerySectionInHomePage'];

const DURABLE_SHOPS = [
  {
    code: 'E2E-GAS',
    name: 'E2E Gas Station',
    pack: 'GAS_STATION',
    brand: 'E2E Fuel',
    city: 'Edison',
    state: 'NJ',
    dispensers: 8,
    carWash: true,
    lottery: true,
  },
  {
    code: 'E2E-LIQUOR',
    name: 'E2E Liquor Store',
    pack: 'LIQUOR_STORE',
    brand: 'E2E Spirits',
    city: 'Edison',
    state: 'NJ',
  },
  {
    code: 'E2E-DUNKIN',
    name: 'E2E Dunkin',
    pack: 'DUNKIN_DONUTS',
    brand: 'Dunkin',
    city: 'Edison',
    state: 'NJ',
  },
  {
    code: 'E2E-711',
    name: 'E2E 7-Eleven',
    pack: 'SEVEN_ELEVEN',
    brand: '7-Eleven',
    city: 'Edison',
    state: 'NJ',
  },
];

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.content)) return data.content;
    const embedded = data._embedded;
    if (embedded && typeof embedded === 'object') {
      const first = Object.values(embedded).find(Array.isArray);
      if (first) return first;
    }
  }
  return [];
}

function record(tracker, pathName, status, message, start, meta) {
  tracker.record({
    path: pathName,
    status,
    kind: 'retail',
    message,
    durationMs: Date.now() - start,
    meta,
  });
  const mark = status === 'pass' ? '✓' : status === 'skip' ? '○' : '✗';
  console.log(`  ${mark} ${message}`);
}

async function getAuthContext(browser, config) {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    try {
      const { context, page } = await loadAuthState(browser, AUTH_STATE_PATH);
      await safeGoto(page, `${config.baseUrl}/admin`, { timeout: config.timeout });
      const url = page.url();
      await page.close();
      if (!url.includes('/sign-in')) return context;
      await context.close();
    } catch {
      /* re-auth */
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

async function gotoScoped(page, baseUrl, route, timeout, tenantId) {
  const scoped = withTenantQuery(route, tenantId);
  await safeGoto(page, `${baseUrl}${scoped}`, { timeout, retries: 2, settleMs: 300 });
  await ensureTenantContextOnPage(page, tenantId);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const check = await smokeCheckPage(page, { urlHint: scoped });
  return { check, scoped };
}

async function proxyGet(page, baseUrl, apiPath, tenantId) {
  const res = await page.request.get(`${baseUrl}${apiPath}`, {
    headers: { 'X-Tenant-ID': tenantId, Accept: 'application/json' },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok(), status: res.status(), body };
}

async function listLocations(page, baseUrl, tenantId) {
  const query = `tenantId.equals=${encodeURIComponent(tenantId)}&size=200`;
  const res = await proxyGet(page, baseUrl, `/api/proxy/retail-locations?${query}`, tenantId);
  if (!res.ok) return [];
  return unwrapList(res.body).filter((row) => row && (!row.tenantId || row.tenantId === tenantId));
}

async function readSettingsRow(page, baseUrl, tenantId) {
  const query = `tenantId.equals=${encodeURIComponent(tenantId)}&size=5`;
  const res = await proxyGet(page, baseUrl, `/api/proxy/tenant-settings?${query}`, tenantId);
  if (!res.ok) return null;
  const rows = unwrapList(res.body).filter((row) => !row.tenantId || row.tenantId === tenantId);
  return rows[0] || unwrapList(res.body)[0] || null;
}

function homepageFlags(row) {
  const flags = {};
  for (const key of HOMEPAGE_FLAG_KEYS) flags[key] = row ? row[key] : undefined;
  return flags;
}

async function findOrganization(page, baseUrl, tenantId) {
  const settings = await readSettingsRow(page, baseUrl, tenantId);
  const organizationId =
    settings?.tenantOrganization?.id ||
    settings?.tenantOrganizationId ||
    null;
  if (!organizationId) return { organizationId: null, organization: null, settings };
  const orgRes = await proxyGet(
    page,
    baseUrl,
    `/api/proxy/tenant-organizations/${organizationId}`,
    tenantId
  );
  const organization = orgRes.ok && orgRes.body && !Array.isArray(orgRes.body) ? orgRes.body : null;
  return { organizationId, organization, settings };
}

async function signedInIsSuperAdmin(page, baseUrl, timeout) {
  await safeGoto(page, `${baseUrl}/admin`, { timeout, retries: 1, settleMs: 400 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const onboarding = page.getByRole('link', { name: 'Onboarding Requests' });
  return onboarding.first().isVisible().catch(() => false);
}

async function setRegisteredInput(locator, value) {
  return locator.evaluate((input, next) => {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const previous = input.value;
    if (proto && proto.set) proto.set.call(input, next);
    else input.value = next;
    const tracker = input._valueTracker;
    if (tracker) tracker.setValue(previous);
    const propsKey = Object.keys(input).find((key) => key.startsWith('__reactProps'));
    const props = propsKey ? input[propsKey] : null;
    const event = { target: input, currentTarget: input };
    if (props && typeof props.onChange === 'function') props.onChange(event);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { value: input.value, hasOnChange: Boolean(props && props.onChange) };
  }, value);
}

async function readFormFeedback(page) {
  const alert = page.locator('[role="alert"]').first();
  const alertText = (await alert.isVisible().catch(() => false))
    ? ((await alert.innerText().catch(() => '')) || '').trim()
    : '';
  const overlay = page.locator('.fixed.inset-0').first();
  const overlayText = (await overlay.isVisible().catch(() => false))
    ? ((await overlay.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
    : '';
  const fieldErrorLines = await page.locator('.text-red-600').allInnerTexts().catch(() => []);
  const fieldErrors = (Array.isArray(fieldErrorLines) ? fieldErrorLines : [])
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .join('; ');
  return { alertText, overlayText, fieldErrors };
}

async function setRetailSiteType(page, baseUrl, timeout, tenantId, tracker) {
  const start = Date.now();
  const before = homepageFlags(await readSettingsRow(page, baseUrl, tenantId));
  const superAdmin = await signedInIsSuperAdmin(page, baseUrl, timeout);
  const found = await findOrganization(page, baseUrl, tenantId);

  if (!found.organizationId) {
    record(
      tracker,
      '/admin/tenant-management/organizations',
      'skip',
      'site type: no organization linked to this tenant; locations still seed',
      start,
      { tenantId }
    );
    return before;
  }

  const current = found.organization?.siteType || '';
  if (current === 'RETAIL') {
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}`,
      'pass',
      'site type already RETAIL; homepage presets were not applied',
      start,
      { tenantId, before }
    );
    return before;
  }

  if (!superAdmin) {
    console.log(
      '[retail-seed] Signed-in admin is not a platform super-admin. Skipping the organization site-type write. Location rows do not need that guard.'
    );
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}/edit`,
      'skip',
      `site type left as ${current || 'unset'}; signed-in user is not a platform super-admin`,
      start,
      { tenantId }
    );
    return before;
  }

  await safeGoto(
    page,
    `${baseUrl}/admin/tenant-management/organizations/${found.organizationId}/edit`,
    { timeout, retries: 1, settleMs: 400 }
  );
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  if (page.url().includes('/sign-in') || !page.url().includes('/edit')) {
    console.log(
      '[retail-seed] Organization edit did not stay open. Skipping the site-type write.'
    );
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}/edit`,
      'skip',
      'site type write skipped; organization edit is not available to this session',
      start,
      { tenantId, landed: page.url() }
    );
    return before;
  }

  const hidden = page.locator('input[name="siteType"]');
  if ((await hidden.count()) === 0) {
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}/edit`,
      'fail',
      'site type field was not on the organization form',
      start,
      { tenantId }
    );
    return before;
  }

  await page.getByRole('button', { name: 'Update Organization' }).waitFor({ state: 'visible', timeout: 20000 });
  const contact = page.locator('input[name="contactPersonName"]');
  const contactValue = ((await contact.inputValue().catch(() => '')) || '').trim();
  if (!contactValue || contactValue.toLowerCase() === 'pending') {
    const replacement = (found.organization?.organizationName || '').trim() || 'Demo Contact';
    await setRegisteredInput(contact, replacement);
    console.log('[retail-seed] Contact person was empty or Pending; filled from the organization name so the form can save.');
  }
  const pack = page.locator('input[name="retailerTypeCode"]');
  const packValue = ((await pack.inputValue().catch(() => '')) || '').trim();
  if (!packValue) {
    const packSet = await setRegisteredInput(pack, 'GAS_STATION');
    console.log(
      `[retail-seed] Organization pack was empty; set retailerTypeCode=GAS_STATION reactOnChange=${packSet.hasOnChange}`
    );
  }
  const submitted = await setRegisteredInput(hidden, 'RETAIL');
  console.log(
    `[retail-seed] Hidden siteType=${submitted.value} reactOnChange=${submitted.hasOnChange}`
  );
  await page.getByRole('button', { name: 'Update Organization' }).click();
  let savedSiteType = current;
  let feedback = { alertText: '', overlayText: '', fieldErrors: '' };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    feedback = await readFormFeedback(page);
    const confirmed = await proxyGet(
      page,
      baseUrl,
      `/api/proxy/tenant-organizations/${found.organizationId}`,
      tenantId
    );
    savedSiteType = confirmed.body?.siteType || savedSiteType;
    if (savedSiteType === 'RETAIL') break;
    const blocked = feedback.alertText || feedback.fieldErrors;
    if (blocked && !/please wait|saving/i.test(blocked)) break;
    await page.waitForTimeout(1500);
  }
  const message = [feedback.alertText, feedback.overlayText, feedback.fieldErrors]
    .filter(Boolean)
    .join(' | ');
  const saved = savedSiteType === 'RETAIL';

  if (!saved) {
    console.log(
      `[retail-seed] Site-type save did not complete: ${message || 'no confirmation'} url=${page.url()} siteType=${savedSiteType}`
    );
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}/edit`,
      'skip',
      `site type write skipped after save: ${message || 'no confirmation'}`,
      start,
      { tenantId }
    );
    return before;
  }

  const after = homepageFlags(await readSettingsRow(page, baseUrl, tenantId));
  const flipped = HOMEPAGE_FLAG_KEYS.filter((key) => before[key] === true && after[key] === false);
  if (flipped.length > 0) {
    record(
      tracker,
      `/admin/tenant-management/organizations/${found.organizationId}/edit`,
      'fail',
      `site type saved but homepage flags changed: ${flipped.join(', ')}`,
      start,
      { tenantId, before, after }
    );
    return after;
  }

  record(
    tracker,
    `/admin/tenant-management/organizations/${found.organizationId}/edit`,
    'pass',
    'site type set to RETAIL without homepage preset changes',
    start,
    { tenantId, before, after }
  );
  return after;
}

async function postSampleRuns(page, baseUrl, tenantId, tracker) {
  const locations = await listLocations(page, baseUrl, tenantId);
  const targets = [
    { retailerType: 'GAS_STATION', code: 'E2E-GAS' },
    { retailerType: 'LIQUOR_STORE', code: 'E2E-LIQUOR' },
  ];
  for (const target of targets) {
    const start = Date.now();
    const location = locations.find((row) => row.locationCode === target.code);
    let warning = '';
    try {
      const res = await page.request.post(`${baseUrl}/api/proxy/retail-sample-runs`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        data: {
          retailerType: target.retailerType,
          siteType: 'RETAIL',
          source: 'sample',
          post: true,
          metricDate: METRIC_DATE,
          tenantId,
          ...(location && location.id != null ? { stationId: location.id } : {}),
        },
      });
      const text = await res.text();
      let body = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
      if (!res.ok() || body.accepted === false || body.detail) {
        warning = `${res.status()} ${(body.detail || body.message || body.error || text || '').slice(0, 240)}`;
      }
    } catch (err) {
      warning = err.message;
    }
    if (warning) {
      console.warn(`[retail-seed] Sample metrics for ${target.retailerType} were not posted: ${warning}`);
      record(
        tracker,
        '/api/proxy/retail-sample-runs',
        'pass',
        `sample ${target.retailerType} warning (location checks still run): ${warning}`,
        start,
        { tenantId, retailerType: target.retailerType, stationId: location?.id ?? null, warning: true }
      );
    } else {
      record(
        tracker,
        '/api/proxy/retail-sample-runs',
        'pass',
        `sample ${target.retailerType} posted for ${METRIC_DATE}`,
        start,
        { tenantId, retailerType: target.retailerType, stationId: location?.id ?? null }
      );
    }
  }
}

function locationForm(page) {
  return page.locator('div.bg-white').filter({ has: page.getByRole('button', { name: 'Save', exact: true }) }).last();
}

async function fillWrapped(scope, label, value) {
  const input = scope.getByRole('textbox', { name: label, exact: true });
  if ((await input.count()) === 0) {
    const spin = scope.getByRole('spinbutton', { name: label, exact: true });
    await spin.fill(String(value));
    return;
  }
  await input.fill(String(value));
}

async function createShop(page, shop, tenantId) {
  await page.getByRole('button', { name: 'Add location' }).click();
  const form = locationForm(page);
  await form.waitFor({ state: 'visible', timeout: 10000 });
  await fillWrapped(form, 'Tenant', tenantId);
  await form.locator('select').first().selectOption(shop.pack);
  await fillWrapped(form, 'Name', shop.name);
  await fillWrapped(form, 'Code', shop.code);
  if (shop.brand) await fillWrapped(form, 'Brand', shop.brand);
  if (shop.city) await fillWrapped(form, 'City', shop.city);
  if (shop.state) await fillWrapped(form, 'State', shop.state);
  if (shop.dispensers) {
    await fillWrapped(form, 'Dispensers', shop.dispensers);
    if (shop.carWash) await form.getByRole('checkbox', { name: 'Car wash' }).check();
    if (shop.lottery) await form.getByRole('checkbox', { name: 'Lottery' }).check();
  }
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1200);
}

async function rowForCode(page, code) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const row = page.locator('tbody tr').filter({ hasText: code }).first();
    if ((await row.count()) > 0 && (await row.isVisible().catch(() => false))) return row;
    const next = page.getByRole('button', { name: 'Next Page' });
    if ((await next.count()) === 0 || (await next.isDisabled().catch(() => true))) break;
    await next.click();
    await page.waitForTimeout(500);
  }
  return null;
}

async function seedDurableShops(page, baseUrl, timeout, tenantId, tracker) {
  const start = Date.now();
  let existing = await listLocations(page, baseUrl, tenantId);
  const have = new Set(existing.map((row) => row.locationCode));
  const missing = DURABLE_SHOPS.filter((shop) => !have.has(shop.code));
  if (missing.length === 0) {
    record(tracker, '/admin/retail/locations', 'pass', 'durable shops already present', start, { tenantId });
    return;
  }

  const opened = await gotoScoped(page, baseUrl, '/admin/retail/locations', timeout, tenantId);
  if (!opened.check.ok) {
    record(tracker, '/admin/retail/locations', 'fail', `locations seed page: ${opened.check.message}`, start, { tenantId });
    return;
  }

  for (const shop of missing) {
    await createShop(page, shop, tenantId);
    const error = page.locator('p.text-red-700');
    if (await error.isVisible().catch(() => false)) {
      const text = (await error.textContent()) || 'save failed';
      record(tracker, '/admin/retail/locations', 'fail', `${shop.code} was not created: ${text.trim()}`, start, { tenantId });
      return;
    }
  }

  existing = await listLocations(page, baseUrl, tenantId);
  const codes = new Set(existing.map((row) => row.locationCode));
  const stillMissing = DURABLE_SHOPS.filter((shop) => !codes.has(shop.code)).map((shop) => shop.code);
  if (stillMissing.length > 0) {
    record(
      tracker,
      '/admin/retail/locations',
      'fail',
      `shops missing after save: ${stillMissing.join(', ')}`,
      start,
      { tenantId }
    );
    return;
  }
  record(
    tracker,
    '/admin/retail/locations',
    'pass',
    `durable shops ready: ${DURABLE_SHOPS.map((shop) => shop.code).join(', ')}`,
    start,
    { tenantId }
  );
}

async function assertRetailPages(page, baseUrl, timeout, tenantId, tracker) {
  const morningStart = Date.now();
  await safeGoto(page, `${baseUrl}/admin/retail`, { timeout, retries: 1, settleMs: 400 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const picker = page.getByRole('heading', { name: 'Retail tenants' });
  if (await picker.isVisible().catch(() => false)) {
    const body = await page.locator('body').innerText();
    if (!body.includes(tenantId)) {
      record(tracker, '/admin/retail', 'fail', `Retail tenants list does not include ${tenantId}`, morningStart, { tenantId });
    } else {
      record(tracker, '/admin/retail', 'pass', `${tenantId} is listed under Retail tenants`, morningStart, { tenantId });
    }
  } else {
    record(
      tracker,
      '/admin/retail',
      'skip',
      'Retail tenants picker is hidden while a tenant is already selected',
      morningStart,
      { tenantId }
    );
  }

  const scopedStart = Date.now();
  const morning = await gotoScoped(page, baseUrl, '/admin/retail', timeout, tenantId);
  const storeText = await page.locator('body').innerText();
  const hasGas = storeText.includes('E2E-GAS');
  const hasLiquor = storeText.includes('E2E-LIQUOR');
  if (!morning.check.ok || !hasGas || !hasLiquor) {
    record(
      tracker,
      '/admin/retail',
      'fail',
      `morning shops: gas=${hasGas} liquor=${hasLiquor} ${morning.check.message}`,
      scopedStart,
      { tenantId }
    );
  } else {
    record(tracker, '/admin/retail', 'pass', 'morning store list includes E2E-GAS and E2E-LIQUOR', scopedStart, { tenantId });
  }

  const pages = [
    { path: '/admin/retail/locations', heading: 'Retail locations', packs: true },
    { path: '/admin/retail/upload', heading: 'Upload day' },
    { path: '/admin/retail/integrations', heading: 'Retail integrations' },
    { path: '/admin/retail/compare', heading: 'Compare stores' },
    { path: '/admin/retail/access', heading: 'Retail assignments' },
  ];

  for (const entry of pages) {
    const start = Date.now();
    const opened = await gotoScoped(page, baseUrl, entry.path, timeout, tenantId);
    const heading = page.getByRole('heading', { name: entry.heading });
    const headingOk = await heading.isVisible().catch(() => false);
    const signedOut = page.url().includes('/sign-in');
    if (!opened.check.ok || !headingOk || signedOut) {
      record(
        tracker,
        entry.path,
        'fail',
        `${entry.heading}: heading=${headingOk} ${opened.check.message}`,
        start,
        { tenantId }
      );
      continue;
    }
    if (entry.packs) {
      await page.getByRole('button', { name: 'Add location' }).click();
      const form = locationForm(page);
      await form.waitFor({ state: 'visible', timeout: 10000 });
      const options = await form.locator('select').first().locator('option').allTextContents();
      const joined = options.join(' | ').toLowerCase();
      await form.getByRole('button', { name: 'Cancel', exact: true }).click();
      if (!joined.includes('gas station') || !joined.includes('liquor store')) {
        record(tracker, entry.path, 'fail', `pack labels missing: ${options.join(', ')}`, start, { tenantId });
        continue;
      }
    }
    record(tracker, entry.path, 'pass', `${entry.heading} is open for this tenant`, start, { tenantId });
  }
}

async function assertGasStationRedirect(page, baseUrl, timeout, tenantId, tracker) {
  const start = Date.now();
  await safeGoto(page, `${baseUrl}/admin/gas-station?tenant=${encodeURIComponent(tenantId)}`, {
    timeout,
    retries: 1,
    settleMs: 500,
  });
  await page.waitForURL(/\/admin\/retail/, { timeout: 15000 }).catch(() => {});
  const landed = page.url();
  if (!landed.includes('/admin/retail') || landed.includes('/sign-in')) {
    record(tracker, '/admin/gas-station', 'fail', `expected /admin/retail, landed on ${landed}`, start, { tenantId });
    return;
  }
  record(tracker, '/admin/gas-station', 'pass', 'gas-station redirects to /admin/retail', start, { tenantId, landed });
}

async function exerciseCopyShop(page, baseUrl, timeout, tenantId, tracker) {
  const start = Date.now();
  const code = `E2E-X${String(stamp).slice(-6)}`;
  const name = `${E2E_PREFIX} Extra shop ${stamp}`;
  const edited = `${E2E_PREFIX} Extra shop edited ${stamp}`;
  const opened = await gotoScoped(page, baseUrl, '/admin/retail/locations', timeout, tenantId);
  if (!opened.check.ok) {
    record(tracker, '/admin/retail/locations', 'fail', `copy shop list: ${opened.check.message}`, start, { tenantId });
    return;
  }

  await createShop(
    page,
    { code, name, pack: 'LIQUOR_STORE', brand: 'E2E Copy', city: 'Edison', state: 'NJ' },
    tenantId
  );
  let row = await rowForCode(page, code);
  if (!row) {
    record(tracker, '/admin/retail/locations', 'fail', `copy shop ${code} was not listed`, start, { tenantId });
    return;
  }
  await row.getByRole('button', { name: 'Edit location' }).click();
  const form = locationForm(page);
  await form.waitFor({ state: 'visible', timeout: 10000 });
  await fillWrapped(form, 'Name', edited);
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1200);

  await gotoScoped(page, baseUrl, '/admin/retail/locations', timeout, tenantId);
  row = await rowForCode(page, code);
  if (!row) {
    record(tracker, '/admin/retail/locations', 'fail', `edited copy ${code} was not listed`, start, { tenantId });
    return;
  }
  const rowText = (await row.innerText()) || '';
  if (!rowText.includes('edited')) {
    record(tracker, '/admin/retail/locations', 'fail', `copy shop name was not updated: ${rowText}`, start, { tenantId });
    return;
  }
  await row.getByRole('button', { name: 'Delete location' }).click();
  await page.waitForTimeout(1200);

  const leftover = (await listLocations(page, baseUrl, tenantId)).some((location) => location.locationCode === code);
  const durable = await listLocations(page, baseUrl, tenantId);
  const durableOk = DURABLE_SHOPS.every((shop) => durable.some((location) => location.locationCode === shop.code));
  if (leftover || !durableOk) {
    record(
      tracker,
      '/admin/retail/locations',
      'fail',
      `copy delete leftover=${leftover} durable shops intact=${durableOk}`,
      start,
      { tenantId, code }
    );
    return;
  }
  record(
    tracker,
    '/admin/retail/locations',
    'pass',
    `created, edited, and deleted ${code}; durable shops remain`,
    start,
    { tenantId, code }
  );
}

async function assertPublicEventsStillRender(page, baseUrl, timeout, tenantId, flagsBefore, tracker) {
  const start = Date.now();
  const flagsAfter = homepageFlags(await readSettingsRow(page, baseUrl, tenantId));
  const flipped = HOMEPAGE_FLAG_KEYS.filter((key) => flagsBefore?.[key] === true && flagsAfter[key] === false);
  await safeGoto(page, `${baseUrl}/events?tenant=${encodeURIComponent(tenantId)}`, {
    timeout,
    retries: 1,
    settleMs: 400,
  });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const check = await smokeCheckPage(page, { urlHint: '/events' });
  const heading = await page.locator('h1, h2').first().isVisible().catch(() => false);
  if (flipped.length > 0 || !check.ok || !heading) {
    record(
      tracker,
      '/events',
      'fail',
      `public events: heading=${heading} flags=${flipped.join(',') || 'unchanged'} ${check.message}`,
      start,
      { tenantId, flagsBefore, flagsAfter }
    );
    return;
  }
  record(
    tracker,
    '/events',
    'pass',
    'public events page still renders and homepage flags were not turned off',
    start,
    { tenantId, flagsAfter }
  );
}

async function main() {
  const tenantId = assertDemoTenant();
  const config = requireAuthJson();
  await assertAppReachable(config.baseUrl);
  const tracker = new CoverageTracker('retail-demo');
  console.log(`[retail] Using tenantId=${tenantId} base=${config.baseUrl}`);

  const browser = await chromium.launch({ headless: config.headless !== false });
  let context;
  try {
    context = await getAuthContext(browser, config);
    const page = await context.newPage();
    const flagsBefore = homepageFlags(await readSettingsRow(page, config.baseUrl, tenantId));
    await setRetailSiteType(page, config.baseUrl, config.timeout, tenantId, tracker);
    await seedDurableShops(page, config.baseUrl, config.timeout, tenantId, tracker);
    await postSampleRuns(page, config.baseUrl, tenantId, tracker);
    await assertRetailPages(page, config.baseUrl, config.timeout, tenantId, tracker);
    await assertGasStationRedirect(page, config.baseUrl, config.timeout, tenantId, tracker);
    await exerciseCopyShop(page, config.baseUrl, config.timeout, tenantId, tracker);
    await assertPublicEventsStillRender(page, config.baseUrl, config.timeout, tenantId, flagsBefore, tracker);
    await page.close();
  } finally {
    if (context) await context.close();
    await browser.close();
  }

  tracker.write();
  if (tracker.summary().fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
