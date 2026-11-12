# Full-site E2E (event-site-manager / platform admin)

Inventory-driven Playwright loop with **tenant as a parameter**, JSON + HTML coverage reports.

## Port (default **3001**)

event-site-manager usually runs on **port 3001**. That is the harness default.

| Override | Example |
|----------|---------|
| CLI port | `--port=3001` (default) or `--port=3000` |
| CLI URL | `--base-url=http://localhost:3001` |
| Env URL | `TEST_BASE_URL=http://localhost:3001` |
| Env port | `TEST_PORT=3001` |
| auth.json | `"baseUrl": "http://localhost:3001"` |

Priority: `--base-url=` / `--port=` → `TEST_BASE_URL` / `TEST_PORT` → `auth.json` → **`http://localhost:3001`**.

If the preferred URL is down, the harness retries and falls back across `auth.json` and ports **3001 → 3000 → 3002**.

## Tenant parameter (platform admin)

Admin UI scopes data with `?tenant=<id>` (`AdminTenantContext`). Resolve order:

1. `--tenant=<id>` CLI  
2. `TEST_TENANT_ID` or `E2E_TENANT_ID` env  
3. `auth.json` → `tenantId`  
4. Default `tenant_demo_002`

Hard-check vs `E2E_EXPECTED_TENANT` (default `tenant_demo_002`). Bypass with `E2E_ALLOW_ANY_TENANT=1`.

Proxy REST calls use `/api/proxy/*` (JWT + auto `tenantId` injection). Do **not** add `tenantId.equals` on proxy queries (see `.cursor/rules/nextjs_api_routes.mdc`).

## Quick start

```bat
npm run test:install-playwright
REM auth.json: copy TestSprite/admin-tests/auth.json.example → auth.json
REM Keep baseUrl on :3001 (or match your npm run dev port)

REM Default port 3001 — recommended for this project
cmd /c "set TEST_TENANT_ID=tenant_demo_002&& set E2E_EXPECTED_TENANT=tenant_demo_002&& set TEST_BASE_URL=http://localhost:3001&& npm run test:e2e:quick -- --tenant=tenant_demo_002"
```

Or CLI only (still defaults to :3001 if you omit URL/port):

```bat
cmd /c "set TEST_BASE_URL=http://localhost:3001&& node TestSprite\run-e2e-full.js --quick --tenant=tenant_demo_002"
```

Same with explicit `--port=`:

```bat
node TestSprite\run-e2e-full.js --quick --tenant=tenant_demo_002 --port=3001
```

If the app is on **3000** instead:

```bat
cmd /c "set TEST_BASE_URL=http://localhost:3000&& node TestSprite\run-e2e-full.js --quick --tenant=tenant_demo_002 --port=3000"
```

### Do not confuse with `test:admin:all`

| Command | What it runs | Report |
|---------|--------------|--------|
| `npm run test:admin:all` | Comprehensive + dynamic admin only (~31 cases) | `TestSprite/admin-tests/admin-test-report.html` |
| `npm run test:e2e:quick` | Inventory → public dynamic → CRUD → smoke admin/public | `TestSprite/reports/coverage-*.html` + `LOOP_LOG.md` |

`--quick` **skips** comprehensive admin. Seeing only `admin-test-report.html` means you ran `test:admin` / `test:admin:all`, not the orchestrator.

## Scripts

| Script | Purpose |
|--------|---------|
| `test:inventory` | Build `TestSprite/generated/route-inventory.json` |
| `test:smoke:inventory` | Smoke every inventory route (`--kind=`, `--exclude=`, `--limit=`, `--tenant=`) |
| `test:smoke:admin` | Admin routes + home buttons (`?tenant=`) |
| `test:smoke:public` | Core public routes |
| `test:public:dynamic` | Public pages with discovered demo IDs via `/api/proxy` |
| `test:admin:crud` | `[E2E]` create/update/delete on scoped tenant |
| `test:coverage:html` | Regenerate HTML from existing `coverage-*.json` |
| `test:coverage:consolidated` | Global rollup → `coverage-global-latest.html` |
| `test:e2e:full` | Orchestrated full loop (includes legacy comprehensive + dynamic) |
| `test:e2e:quick` | Inventory + public dynamic + CRUD + admin/public smoke (**no** comprehensive) |

Pass port through npm:

```bat
npm run test:e2e:quick -- --tenant=tenant_demo_002 --port=3001
npm run test:admin:all -- --port=3001
```

## Reports

Each harness suite writes:

- `TestSprite/reports/coverage-<suite>-<stamp>.json`
- `TestSprite/reports/coverage-<suite>-<stamp>.html` — pass/fail, wall clock, per-module timings
- **`TestSprite/reports/coverage-global-latest.html`** — consolidated overall SUCCESS/FAILED + all suites (also `coverage-global-consolidated-<stamp>.html`). Written at the end of `run-e2e-full.js` / `npm run test:coverage:consolidated`.
- `TestSprite/reports/LOOP_LOG.md`

Console prints `[harness] HTML report: …`.

**Rotation:** on each write, old coverage files are pruned — keep newest `E2E_REPORT_KEEP` per suite (default **5**), delete files older than `E2E_REPORT_MAX_AGE_DAYS` (default **5**). `LOOP_LOG.md` and `coverage-global-latest.html` are kept. The folder is gitignored.

**Note:** `TestSprite/admin-tests/admin-test-report.html` is only from `test:admin` / comprehensive — not the harness `reports/` folder. If you chain steps with all `&&` and comprehensive fails, CRUD/smoke never run and nothing new appears under `reports/`.

## Recommended ladder (admin + public)

```bat
cmd /c "set TEST_TENANT_ID=tenant_demo_002&& set E2E_TENANT_ID=tenant_demo_002&& set E2E_EXPECTED_TENANT=tenant_demo_002&& set TEST_BASE_URL=http://localhost:3001&& node TestSprite\tools\generate-route-inventory.js & node TestSprite\admin-tests\comprehensive-admin-test-suite.js --port=3001 & node TestSprite\admin-tests\admin-crud-demo-tenant-suite.js --tenant=tenant_demo_002 --port=3001 & node TestSprite\sanity-tests\run-inventory-smoke-crawl.js --kind=admin,public --tenant=tenant_demo_002 --port=3001 & node TestSprite\tools\write-consolidated-coverage-report.js"
```

Or the quick orchestrator (default port **3001**):

```bat
cmd /c "set TEST_BASE_URL=http://localhost:3001&& node TestSprite\run-e2e-full.js --quick --tenant=tenant_demo_002 --port=3001"
```

That ends with `coverage-global-latest.html` automatically.

Use `&` between Node steps in the manual ladder so CRUD/smoke continue if comprehensive exits non-zero.

How the ladder runs (Playwright Chromium, clicks, and live data): [documentation/e2e_testing/ADMIN_PUBLIC_TEST_LADDER_HOW_IT_WORKS.html](../documentation/e2e_testing/ADMIN_PUBLIC_TEST_LADDER_HOW_IT_WORKS.html).

## Safety

- Mutations only on entities named with `[E2E]` when possible
- Manage usage / Test Stripe are read-only smoke
- No live Stripe payment capture
- Unauthenticated public routes that redirect to sign-in are recorded as **pass** (`auth-gated`)
