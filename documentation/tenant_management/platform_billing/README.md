# Tenant platform billing

This folder is the plan for charging **tenant organizations** (event sites and gas stations) to use this platform. It is not the plan for ticket sales or member dues.

## Decision

Stay on the Stripe account this app already uses. Use Stripe Checkout for the pay page, Stripe Billing for recurring plans, and the Stripe Customer Portal for invoices and for updating a card or a US bank account. Do not add Zoho Billing (sometimes called SOHO in conversation) as a second payment system.

A new tenant uses the platform for free until a platform super-admin turns a charge switch on at `/admin/platform-billing/{tenantId}`. `{tenantId}` is that website’s tenant id. From `/admin/platform-billing`, open the organization, then open the tenant id. Use the **Charge switch** and confirm. The switch does not turn itself on when a reminder date arrives, and saving does not charge the card. The website admin pays on `/admin/billing`.

## Read these in order

1. [PLATFORM_BILLING_STATUS.html](PLATFORM_BILLING_STATUS.html) — what is built, what is test-only, and what is still not a live price. Start here.
2. [PLATFORM_TENANT_BILLING_GUIDE.md](PLATFORM_TENANT_BILLING_GUIDE.md) — who pays, the charge switch, plans, custom fees, cards and bank payments, and the steps an admin and a tenant follow. Same content as a web page: [PLATFORM_TENANT_BILLING_GUIDE.html](PLATFORM_TENANT_BILLING_GUIDE.html).
3. [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md) — why Stripe, and when Zoho would still be the wrong payment desk.
4. [BUILD_PLAN.md](BUILD_PLAN.md) — the original build phases. What shipped is on the status page.

## Related payments

Ticket Checkout and membership renewal stay separate from software billing. Do not write a tenant software fee onto those records.

| Already built | Who pays | How it relates |
| --- | --- | --- |
| Event ticket Checkout, Apple Pay, Google Pay | A person buying tickets | Leave it alone. A ticket payment must not become a platform charge. |
| Membership auto-renewal | A person joining as a member | Leave it alone. Do not store the software fee on a membership row. |
| Platform software billing | The organization that runs the website | Live screens: `/admin/platform-billing` (ledger), `/admin/platform-billing/{tenantId}` (charge switch; super-admin only), `/admin/platform-billing/plans` (catalog), `/admin/billing` (Pay and the Customer Portal). `monthlyFeeUsd` is the organization monthly amount. `stripeCustomerId` is the Stripe customer on the organization. `subscriptionPlan` stays an access label, not the Stripe price. |
| Gas-station location billing note in the mosc-temp repo | Gas-station owners, per location | Use the quantity idea; this folder is the source of truth going forward |

## Cursor rule

[.cursor/rules/platform_tenant_billing.mdc](../../../.cursor/rules/platform_tenant_billing.mdc) tells future work to follow this folder and not to mix tenant fees with ticket or membership payments.
