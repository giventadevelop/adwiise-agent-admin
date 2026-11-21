-- Test data for the Retail card on the platform billing page. Local database only.
-- Safe to run more than once. Run from the repo root:
--   docker exec -i adwiise_agent_db-postgresql-1 psql -U postgres -d adwiise_agent_db -v tenant=kcnj_parsippany_8 < scripts/platform-billing/retail-test-data.sql

-- Two $1.00 retail plans. They start unpublished, like the event-site test plans.
-- The same two rows are seeded by adwiise_agent_Latest_Schema.sql in the database repo.
INSERT INTO public.platform_billing_plan (product, name, code, billing_mode, billing_interval, interval_count, list_price_usd, published, feature_summary)
SELECT 'RETAIL', 'Retail test every day', 'retail-test-every-day', 'RECURRING', 'DAY', 1, 1.00, false, 'Unpublished Stripe test-mode plan. Charges each included location once a day.'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_billing_plan WHERE product = 'RETAIL' AND code = 'retail-test-every-day');

INSERT INTO public.platform_billing_plan (product, name, code, billing_mode, billing_interval, interval_count, list_price_usd, published, feature_summary)
SELECT 'RETAIL', 'Retail test monthly', 'retail-test-monthly', 'RECURRING', 'MONTH', 1, 1.00, false, 'Unpublished Stripe test-mode plan. Charges each included location once a month.'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_billing_plan WHERE product = 'RETAIL' AND code = 'retail-test-monthly');

-- Three locations for the test tenant. Two are counted in the fee. One is left out.
INSERT INTO public.retail_location (tenant_id, location_name, location_code, retailer_type_code, city, state_province, zip_code, country, is_active, included_in_subscription)
SELECT :'tenant', v.location_name, v.location_code, 'GAS_STATION', v.city, 'NJ', v.zip_code, 'US', true, v.included
FROM (VALUES
    ('Billing test Route 46', 'BILL-TEST-01', 'Parsippany', '07054', true),
    ('Billing test Littleton Road', 'BILL-TEST-02', 'Parsippany', '07054', true),
    ('Billing test Lake Hiawatha', 'BILL-TEST-03', 'Lake Hiawatha', '07034', false)
) AS v(location_name, location_code, city, zip_code, included)
WHERE NOT EXISTS (
    SELECT 1 FROM public.retail_location existing
    WHERE existing.tenant_id = :'tenant' AND existing.location_code = v.location_code
);

SELECT id, product, name, code, billing_interval, list_price_usd, published FROM public.platform_billing_plan WHERE code LIKE 'retail-test-%' ORDER BY id;
SELECT id, location_name, location_code, is_active, included_in_subscription FROM public.retail_location WHERE tenant_id = :'tenant' ORDER BY id;
