# Build plan: tenant platform billing

This is the order to build the design in [PLATFORM_TENANT_BILLING_GUIDE.md](PLATFORM_TENANT_BILLING_GUIDE.md). Do the phases in order. Do not start phase 2 until phase 1 can show a tenant as complimentary with the charge switch off.

The payment choice is already made: Stripe, not Zoho. See [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md).

## Rules for every phase

- Platform fees are not membership subscriptions and not ticket payments. New tables and new pages. Do not add columns to membership subscription records to mean “this tenant’s software fee.”
- Only a platform super-admin can change the charge switch, the catalog, the custom fee, or grace days. Enforce that on the server, not only by hiding a button.
- While the charge switch is off, do not call Stripe.
- A review-by date never creates a charge.
- Ticket and membership webhook branches must skip events with metadata `billingScope=platform_tenant`.
- Show money with two decimal places.
- Server calls to the backend use `getApiBaseUrl()` and `fetchWithJwtRetry`. Do not invent a new JWT helper.
- Browser calls to this app use relative `/api/...` URLs.

## Phase 1 — Catalog and the charge switch (no money)

Goal: an admin can describe plans and can see that a tenant is free. Nobody can be charged yet.

Steps:

1. Add a platform-plan record: name, product (`EVENT_SITE` or `GAS_STATION`), allowed modes (recurring, one-time, or both), interval (month or year), list price, published flag, feature summary, and for gas stations an optional graduated tier definition.
2. Add a tenant-product billing record, one row per tenant per product: switch (default off), status (`COMPLIMENTARY`), catalog plan id, custom fee (empty), review-by date, grace days (default 14), notes.
3. Keep using `tenant_organization.stripeCustomerId` for the Stripe customer. Leave it empty until phase 2.
4. Super-admin screens: plan list and plan form; on the tenant organization page, a billing section with the switch, custom fee, review-by date, and status. Turning the switch on sets payment due and a grace end. The payer still has to open Pay. Checkout is live in phase 2.
5. Seed nothing that charges. Placeholder catalog rows are fine if they are unpublished.
6. Do not add Stripe env vars in this phase beyond what ticket and membership flows already use.

Done when: a super-admin can create an unpublished plan, set a custom fee and a review-by date on a tenant, leave the switch off, and the tenant admin sees no pay wall.

## Phase 2 — Turn charging on

Goal: turning the switch on leads to a real card or US bank payment, and the status becomes active only after Stripe says the payment succeeded.

Steps:

1. In the Stripe Dashboard, create the two products and the shared prices described in the analysis note. Store the Price ids in server env vars (Amplify-prefixed as well as plain, declared in `next.config.mjs`).
2. When a custom fee is set, create a Stripe Price for that tenant at the moment the pay link is created. Save the Price id on the tenant-product row. Do not edit the shared catalog Price.
3. Turning the switch on sets status to `PAYMENT_DUE`, sets grace end to today plus grace days, and still does not charge by itself. The tenant opens a billing page and chooses the allowed mode.
4. The server creates a Stripe Customer if `stripeCustomerId` is empty, then a Checkout Session. Mode `subscription` or `payment`. Payment method types `card` and `us_bank_account`. Metadata must include `billingScope=platform_tenant`, tenant id, product, and billing mode.
5. Success return URL and the webhook both write Stripe ids and set status to `ACTIVE` only when the payment has succeeded. An ACH payment that is still processing stays `PAYMENT_DUE`.
6. Recurring success stores `stripeSubscriptionId`. One-time success stores the payment id and a paid-through date. Do not create a Stripe subscription for a one-time plan.
7. “Manage billing” opens a Stripe Customer Portal session.
8. Add the new webhook branch beside the existing ticket and membership branches. Do not fold tenant updates into `processMembershipSubscriptionFromPaymentIntent` or `createTransactionFromPaymentIntent`.

Done when: a test-mode tenant can pay a catalog price and a custom price, by card and by a Stripe test bank account, and a ticket payment in the same Stripe account still creates a ticket transaction and not a tenant bill.

## Phase 3 — Gas-station location count

Goal: the gas-station subscription quantity matches included locations, unless a custom flat fee is set.

Steps:

1. A location can be marked included in the subscription. Default included when the location is active.
2. Billable count is the number of active included locations. Do not store the count as a typed field.
3. The pay page shows the graduated total before Checkout. Checkout quantity is that count.
4. After they are subscribed, changing which locations are included updates the Stripe subscription quantity and prorates.
5. If a custom flat fee is set, quantity stays 1 and the graduated tiers are not used.
6. One Stripe subscription for the gas-station product. Never one subscription per location.

Done when: adding a fourth included location changes the preview from 3 × tier-one to the graduated total, and the Stripe subscription quantity matches after save.

## Phase 4 — Grace and lock

Goal: a tenant who was told to pay, and did not, loses paid admin tools. A complimentary tenant never does. This check is implemented on billing-page load and in the platform billing webhook.

Steps:

1. A daily check (or a check on admin page load, plus a scheduled job) moves `PAYMENT_DUE` to `LOCKED` when grace end is in the past and there is no successful payment.
2. `PAST_DUE` comes from Stripe’s invoice payment failed / subscription updated events. Do not invent a second retry schedule.
3. Locked tenants can open the billing page and the pay link. Other paid admin modules for that product show a short explanation and a link to pay.
4. Complimentary tenants are not locked.
5. Turning the switch off sets status back to `COMPLIMENTARY` and cancels a live Stripe subscription the way the admin confirmed (end of period, or now).
6. One-time plans lock when the paid-through date has passed and the switch is still on. They do not auto-charge.

Done when: a tenant with the switch off can keep working past the review-by date, and a tenant with the switch on and grace expired cannot open the paid tools until they pay.

## Phase 5 — Only if the business asks

Do not build this with phases 1–4.

- Stripe Tax, or a merchant-of-record such as Paddle, if we must file sales tax in many countries. Re-read the analysis before switching. ACH and custom prices are the reason we stayed on Stripe.
- A Zoho Books export or a one-way invoice copy for a bookkeeper. Zoho must not turn the charge switch or mark a tenant paid.

## Suggested first screens

- Platform admin: `/admin/platform-billing/plans` for the catalog.
- Platform admin: a “Platform billing” section on the existing tenant organization page, not a new membership screen.
- Tenant admin: `/admin/billing` for the pay button, location include toggles (gas station), status, and “Manage billing.”

Platform-only catalog editing follows the same super-admin guard as Tenant Management (`assertPlatformSuperAdmin` / `isPlatformOnlyAdminPath`). The tenant billing page is available to that tenant’s admin.

## Test list before calling a phase done

Use Stripe test mode.

- New tenant, switch off, no Stripe customer created after they use the admin.
- Review-by date in the past, switch off, still complimentary.
- Switch on, custom fee $10.00, card succeeds, status active, shared catalog price unchanged.
- Switch on, catalog plan, US test bank account, status stays payment due until the test payment succeeds.
- A membership signup and a ticket purchase in the same test, afterward: membership row and ticket transaction exist, tenant billing row unchanged.
- Webhook retried twice: still one tenant billing row, not two subscriptions.
- Gas station: custom flat fee ignores location count.
- Grace expired: tenant admin is sent to the pay page; public event page still loads.

## Out of scope

- Changing ticket or membership Checkout.
- Charging the tenant a percent of ticket sales (the existing platform fee percentage on tenant settings is a different setting; do not silently turn it into this subscription).
- Deleting a tenant when they do not pay.
- Building a card form ourselves.
