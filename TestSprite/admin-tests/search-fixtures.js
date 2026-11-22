/**
 * Idempotent search fixtures for tenant_demo_002.
 * Creates one known row per searchable admin list when that exact name is missing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_TENANT = 'tenant_demo_002';
export const SEARCH_PHRASE = 'ai based solutions';

export const SEARCH_FIXTURES = {
  sponsor: 'E2E Image Search Sponsor',
  album: 'E2E Image Search Album',
  focusGroup: 'E2E Image Search Group',
  focusSlug: 'e2e-image-search-group',
  performer: 'E2E Search Performer',
  director: 'E2E Search Director',
  contact: 'E2E Search Contact',
  email: 'e2e-search@example.com',
};

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return env;
}

function envValue(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return '';
}

function rowsOf(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  if (data && data._embedded && typeof data._embedded === 'object') {
    const list = Object.values(data._embedded).find((value) => Array.isArray(value));
    if (list) return list;
  }
  return [];
}

async function api(base, token, tenant, resourcePath, options = {}) {
  const response = await fetch(`${base}${resourcePath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenant,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`${options.method || 'GET'} ${resourcePath} ${response.status} ${detail.slice(0, 300)}`);
  }
  return data;
}

async function findRow(base, token, tenant, resource, field, value) {
  const params = new URLSearchParams({
    page: '0',
    size: '5',
    'tenantId.equals': tenant,
    [`${field}.equals`]: value,
  });
  const data = await api(base, token, tenant, `/api/${resource}?${params.toString()}`);
  return rowsOf(data)[0] || null;
}

async function ensureRow(base, token, tenant, spec) {
  const existing = await findRow(base, token, tenant, spec.resource, spec.field, spec.value);
  const now = new Date().toISOString();
  if (existing?.id && spec.patchWhen) {
    const patch = spec.patchWhen(existing);
    if (patch) {
      await api(base, token, tenant, `/api/${spec.resource}/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ id: existing.id, ...patch, updatedAt: now }),
      });
      console.log(`search fixture patched ${spec.label} id=${existing.id}`);
      return;
    }
  }
  if (existing) {
    console.log(`search fixture exists ${spec.label} id=${existing.id}`);
    return;
  }
  const created = await api(base, token, tenant, `/api/${spec.resource}`, {
    method: 'POST',
    body: JSON.stringify({
      ...spec.body,
      tenantId: tenant,
      createdAt: now,
      updatedAt: now,
    }),
  });
  console.log(`search fixture created ${spec.label} id=${created?.id ?? 'unknown'}`);
}

function hasPhrase(row) {
  return String(row?.ocrText || '').toLowerCase().includes(SEARCH_PHRASE)
    && String(row?.searchText || '').toLowerCase().includes(SEARCH_PHRASE);
}

export async function ensureSearchFixtures(tenantId = DEMO_TENANT) {
  if (tenantId !== DEMO_TENANT) {
    console.log(`Skipping search fixtures; suite tenant is ${tenantId}`);
    return;
  }

  const env = {
    ...readEnvFile(path.join(__dirname, '../../.env.local')),
    ...readEnvFile(path.join(__dirname, '../../.env')),
  };
  const base = envValue(env, ['NEXT_PUBLIC_API_BASE_URL', 'AMPLIFY_NEXT_PUBLIC_API_BASE_URL']) || 'http://localhost:8080';
  const user = envValue(env, ['API_JWT_USER', 'NEXT_PUBLIC_API_JWT_USER', 'AMPLIFY_API_JWT_USER', 'AMPLIFY_NEXT_PUBLIC_API_JWT_USER']);
  const pass = envValue(env, ['API_JWT_PASS', 'NEXT_PUBLIC_API_JWT_PASS', 'AMPLIFY_API_JWT_PASS', 'AMPLIFY_NEXT_PUBLIC_API_JWT_PASS']);
  if (!user || !pass) {
    throw new Error('Search fixtures need API JWT credentials in .env.local');
  }

  const auth = await fetch(`${base}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass, rememberMe: true }),
  });
  if (!auth.ok) {
    throw new Error(`Search fixture auth failed: ${auth.status}`);
  }
  const token = (await auth.json()).id_token;
  const phrase = SEARCH_PHRASE;
  const imagePatch = (searchText) => (row) => (hasPhrase(row) ? null : { ocrText: phrase, searchText });

  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.sponsor,
    resource: 'event-sponsors',
    field: 'name',
    value: SEARCH_FIXTURES.sponsor,
    patchWhen: imagePatch(`${SEARCH_FIXTURES.sponsor} ${phrase}`.toLowerCase()),
    body: {
      name: SEARCH_FIXTURES.sponsor,
      type: 'Media Partner',
      isActive: true,
      priorityRanking: 1,
      ocrText: phrase,
      searchText: `${SEARCH_FIXTURES.sponsor} ${phrase}`.toLowerCase(),
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.album,
    resource: 'gallery-albums',
    field: 'title',
    value: SEARCH_FIXTURES.album,
    patchWhen: imagePatch(`${SEARCH_FIXTURES.album} ${phrase}`.toLowerCase()),
    body: {
      title: SEARCH_FIXTURES.album,
      description: '',
      isPublic: true,
      displayOrder: 0,
      ocrText: phrase,
      searchText: `${SEARCH_FIXTURES.album} ${phrase}`.toLowerCase(),
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.focusGroup,
    resource: 'focus-groups',
    field: 'name',
    value: SEARCH_FIXTURES.focusGroup,
    patchWhen: imagePatch(`${SEARCH_FIXTURES.focusGroup} ${SEARCH_FIXTURES.focusSlug} ${phrase}`.toLowerCase()),
    body: {
      name: SEARCH_FIXTURES.focusGroup,
      slug: SEARCH_FIXTURES.focusSlug,
      description: '',
      isActive: true,
      ocrText: phrase,
      searchText: `${SEARCH_FIXTURES.focusGroup} ${SEARCH_FIXTURES.focusSlug} ${phrase}`.toLowerCase(),
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.performer,
    resource: 'event-featured-performers',
    field: 'name',
    value: SEARCH_FIXTURES.performer,
    body: {
      name: SEARCH_FIXTURES.performer,
      isHeadliner: false,
      isActive: true,
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.director,
    resource: 'event-program-directors',
    field: 'name',
    value: SEARCH_FIXTURES.director,
    body: {
      name: SEARCH_FIXTURES.director,
      bio: 'E2E search fixture',
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.contact,
    resource: 'event-contacts',
    field: 'name',
    value: SEARCH_FIXTURES.contact,
    body: {
      name: SEARCH_FIXTURES.contact,
      phone: '555-0100',
    },
  });
  await ensureRow(base, token, tenantId, {
    label: SEARCH_FIXTURES.email,
    resource: 'event-emails',
    field: 'email',
    value: SEARCH_FIXTURES.email,
    body: {
      email: SEARCH_FIXTURES.email,
    },
  });
}
