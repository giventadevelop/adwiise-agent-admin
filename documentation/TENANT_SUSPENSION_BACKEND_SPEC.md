# Backend change: tenant and organization suspension

The admin app now lets a platform super admin turn off a tenant's public website and/or its
admin and retail dashboards (for example after missed payments), per tenant ID or for a whole
organization. The admin side is built (`src/lib/tenantSuspension`, `/admin/tenant-management/suspensions`).
The backend and database changes are written (2026-11-27), committed locally, not yet deployed:
- adwiise-agent-database-repo: `SQLS/Current_Sqls/20261127_tenant_suspension.sql` and the canonical schema file
- adwiise-agent-service: Liquibase `20261127120000_tenant_suspension.xml`, entity, DTO, criteria filters, and
  `TenantOrganizationServiceImpl.update` keeps stored suspension fields when a PUT omits them
- adwiise-agent-batch-jobs: no change (it only reads these tables)
Until the service is deployed, saving shows "The backend did not save the suspension" and every site stays live.

## 1. Columns

Same four columns on both tables:

| Column | Type | Null | Default |
|---|---|---|---|
| `website_suspended` | boolean | not null | false |
| `dashboard_suspended` | boolean | not null | false |
| `suspension_reason` | varchar(500) | null | |
| `suspended_at` | timestamp (Instant) | null | |

Tables: `tenant_settings` (one row per website tenant ID) and `tenant_organization` (the client).

Liquibase changeset (adjust author/id to your convention):

```xml
<changeSet id="20261127-tenant-suspension" author="adwiise">
  <addColumn tableName="tenant_settings">
    <column name="website_suspended" type="boolean" defaultValueBoolean="false"><constraints nullable="false"/></column>
    <column name="dashboard_suspended" type="boolean" defaultValueBoolean="false"><constraints nullable="false"/></column>
    <column name="suspension_reason" type="varchar(500)"/>
    <column name="suspended_at" type="timestamp"/>
  </addColumn>
  <addColumn tableName="tenant_organization">
    <column name="website_suspended" type="boolean" defaultValueBoolean="false"><constraints nullable="false"/></column>
    <column name="dashboard_suspended" type="boolean" defaultValueBoolean="false"><constraints nullable="false"/></column>
    <column name="suspension_reason" type="varchar(500)"/>
    <column name="suspended_at" type="timestamp"/>
  </addColumn>
</changeSet>
```

Plain SQL equivalent (PostgreSQL):

```sql
ALTER TABLE tenant_settings
  ADD COLUMN website_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN dashboard_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN suspension_reason varchar(500),
  ADD COLUMN suspended_at timestamp;
ALTER TABLE tenant_organization
  ADD COLUMN website_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN dashboard_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN suspension_reason varchar(500),
  ADD COLUMN suspended_at timestamp;
```

## 2. Entity, DTO, mapper

- `TenantSettings` and `TenantOrganization` entities: add `Boolean websiteSuspended`, `Boolean dashboardSuspended`,
  `String suspensionReason` (`@Size(max = 500)`), `Instant suspendedAt`.
- `TenantSettingsDTO` and `TenantOrganizationDTO`: the same four fields, JSON names exactly
  `websiteSuspended`, `dashboardSuspended`, `suspensionReason`, `suspendedAt`.
- MapStruct mappers pick them up automatically if names match. `partialUpdate` (PATCH,
  `application/merge-patch+json`) must apply them. The admin app sends `false` (not null) to lift a
  suspension and an empty string to clear the note, because null is ignored by partial update.
- If `TenantSettingsDTO.tenantOrganization` is a full nested DTO, the four fields come along for free.
  The admin app also falls back to `GET /api/tenant-organizations/{id}` if they are missing.

## 3. Criteria filters

Add `BooleanFilter websiteSuspended` and `BooleanFilter dashboardSuspended` to `TenantSettingsCriteria`
and `TenantOrganizationCriteria` (and the matching `buildSpecification` lines) so the Suspensions page can
call `GET /api/tenant-settings?websiteSuspended.equals=true`. The admin app filters again on its side, so a
backend without the filters still shows the right list, just less efficiently.

## 4. Security

The admin app only lets platform super admins change these fields, and regular settings and organization
saves now carry the stored values through untouched. The backend is reached with the app's service JWT,
so no new backend role check is strictly needed. If tenant admins can ever call the backend directly,
reject changes to these four fields from anyone but a platform super admin.

## 5. What the admin app does with them

- Public website (root layout): if the deployment's tenant ID (or its organization) has
  `websiteSuspended = true`, every public page shows "This website is temporarily unavailable".
  `/admin`, sign-in, sign-up and `/api` keep working.
- Dashboards (admin layout): if the tenant being viewed (or its organization) has
  `dashboardSuspended = true`, tenant admins and retail users see "Dashboard access is paused" with links
  to Billing. Platform super admins are never blocked. `/admin/billing` stays open.
- The hub's own tenant ID cannot be suspended from that hub.
- Answers are cached for 30 seconds per server, so changes reach live sites within about a minute.
